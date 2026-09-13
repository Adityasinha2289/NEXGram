"""Turning "do packet doodh" into a stock deduction.

The phone does the listening. The browser's own SpeechRecognition API produces
the transcript for free, on-device, with no audio ever reaching us - which is
both the fastest thing to build and the only version a shopkeeper would leave
switched on all day. This module is the half that has to be right: taking one
noisy Hinglish sentence and deciding which row on the shelf it means.

Three things make that tractable:

* The vocabulary is tiny. A counter sale is a number, a unit word and a product.
  There is no grammar to parse, so there is no parser - just a scan.
* The candidate set is tiny. It matches against *this shop's* stock, a few
  dozen rows, not a national catalogue. "doodh" is unambiguous in a shop that
  stocks one milk.
* A wrong guess is worse than no guess. Below the confidence threshold nothing
  is deducted and the candidates go back for a tap, because a shopkeeper who
  finds phantom deductions turns the feature off and never turns it on again.
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Optional

from sqlalchemy.orm import Session

from app.models.catalogue import Product, ProductVariant
from app.models.profiles import RetailerProfile
from app.models.retail import RetailerInventory

# Spoken numbers. Devanagari and Latin spellings both appear in the same
# transcript depending on how the phone's recogniser is feeling, so both are
# listed rather than transliterated at runtime.
NUMBER_WORDS = {
    "ek": 1, "एक": 1, "one": 1, "a": 1, "an": 1,
    "do": 2, "दो": 2, "two": 2, "teen": 3, "तीन": 3, "three": 3,
    "char": 4, "chaar": 4, "चार": 4, "four": 4,
    "paanch": 5, "panch": 5, "पांच": 5, "पाँच": 5, "five": 5,
    "chhe": 6, "che": 6, "chah": 6, "छह": 6, "six": 6,
    "saat": 7, "सात": 7, "seven": 7,
    "aath": 8, "आठ": 8, "eight": 8,
    "nau": 9, "नौ": 9, "nine": 9,
    "das": 10, "दस": 10, "ten": 10,
    "gyarah": 11, "ग्यारह": 11, "eleven": 11,
    "barah": 12, "बारह": 12, "twelve": 12,
    "pandrah": 15, "पंद्रह": 15, "fifteen": 15,
    "bees": 20, "बीस": 20, "twenty": 20,
    "pachas": 50, "पचास": 50, "fifty": 50,
    "sau": 100, "सौ": 100, "hundred": 100,
    # A dozen is a count, not a unit, and is how eggs are actually sold.
    "dozen": 12, "darjan": 12, "दर्जन": 12,
}

# What a kirana product is actually called out loud.
#
# The catalogue is in English because that is what a distributor lists; the
# shopkeeper says "doodh". Without this bridge the feature cannot work at all in
# the shops it is built for - "do packet doodh" matched nothing in a shop whose
# milk is spelled "Milk". Keyed by the canonical English name, lowercased.
PRODUCT_ALIASES = {
    "milk": ["doodh", "dudh", "दूध"],
    "paneer": ["panir", "cottage cheese", "पनीर"],
    "curd": ["dahi", "yoghurt", "yogurt", "दही"],
    "butter": ["makhan", "मक्खन"],
    "ghee": ["घी"],
    "cheese": ["cheez"],
    "atta": ["aata", "flour", "gehu", "gehun", "आटा"],
    "rice": ["chawal", "chaawal", "चावल"],
    "sugar": ["chini", "cheeni", "shakkar", "चीनी"],
    "salt": ["namak", "नमक"],
    "oil": ["tel", "cooking oil", "तेल"],
    "tea": ["chai", "chaipatti", "चाय"],
    "coffee": ["कॉफ़ी"],
    "biscuit": ["biscuits", "biscuit", "बिस्कुट", "बिस्किट"],
    "bread": ["double roti", "ब्रेड"],
    "egg": ["anda", "ande", "अंडा", "अंडे"],
    "onion": ["pyaz", "pyaaz", "प्याज"],
    "potato": ["aloo", "alu", "आलू"],
    "tomato": ["tamatar", "टमाटर"],
    "lentils": ["dal", "daal", "pulses", "दाल"],
    "soap": ["sabun", "साबुन"],
    "shampoo": ["शैम्पू"],
    "detergent": ["surf", "washing powder"],
    "matchbox": ["maachis", "machis", "माचिस"],
}


def aliases_for(name: str) -> list:
    """Spoken names for a catalogue product.

    Matched on any word of the product name, so "Amul Toned Milk" still picks up
    "doodh" without every brand needing its own entry.
    """
    tokens = set(normalise(name).split())
    found = []
    for canonical, spoken in PRODUCT_ALIASES.items():
        if canonical in tokens:
            found.extend(spoken)
    return found


# Words that describe packaging or amount rather than the product. Stripped
# before matching so "packet" in the sentence cannot out-score the product name.
UNIT_WORDS = {
    "packet", "packets", "paket", "pack", "packs", "pkt", "पैकेट",
    "kg", "kilo", "kilos", "kilogram", "किलो",
    "g", "gram", "grams", "gm", "ग्राम",
    "l", "ltr", "litre", "litres", "liter", "liters", "लीटर",
    "ml", "मिली",
    "bottle", "bottles", "botal", "बोतल",
    "dabba", "dibba", "डिब्बा", "box", "boxes", "carton", "cartons",
    "piece", "pieces", "pcs", "adad", "nag", "नग",
    "bag", "bags", "pouch", "pouches", "sachet",
    "tin", "tins", "jar", "strip", "strips",
}

# Verbs and filler around a sale. Removing them keeps a long sentence from
# diluting the token overlap that decides the match.
#
# Listed in both scripts. With the recogniser set to hi-IN the phone returns
# Devanagari, so a Latin-only list left "पनीर दे दो" scoring 0.41 - over the
# candidate floor but under the confidence threshold, which turns an ordinary
# sentence into a confirmation prompt.
#
# "दो" is safe to strip here even though it also means "two": the quantity is
# taken before this runs, so only a *leftover* one reaches the phrase.
FILLER_WORDS = {
    "de", "do", "diya", "diye", "dena", "bech", "becha", "bechi", "bech diya",
    "le", "liya", "li", "gaya", "gayi", "gaye", "hua", "hui", "ho",
    "sold", "sell", "sale", "give", "gave", "take", "took", "out",
    "customer", "grahak", "ko", "ne", "se", "ka", "ki", "ke", "hai", "tha",
    "please", "plz", "kar", "karo", "kardo", "nikal", "nikalo", "minus",
    "add", "aur",  # "aur" is also the separator; removed after splitting
    # Devanagari
    "दे", "दो", "दिया", "दिये", "दीजिये", "देना", "बेच", "बेचा", "बेची",
    "ले", "लिया", "ली", "गया", "गयी", "गये", "हुआ", "हुई", "हो",
    "को", "ने", "से", "का", "की", "के", "है", "था", "ग्राहक",
    "कर", "करो", "कर दो", "निकाल", "निकालो", "और",
}

# One sentence can carry several lines: "do packet doodh aur ek kilo chini".
# Applied to the raw sentence, because `normalise` strips the comma that is
# itself one of the separators.
#
# The joining words require whitespace on both sides rather than a word
# boundary: "aur" unanchored also splits "aurangabad", and the punctuation
# alternatives need no anchoring at all.
SEPARATORS = re.compile(
    r"\s*[,+]\s*|\s+(?:aur|और|and|plus)\s+",
    re.IGNORECASE,
)

# A count word that multiplies whatever came before it ("do dozen" = 24).
MULTIPLIER_WORDS = {"dozen", "darjan", "दर्जन"}

# Matching is only trusted above this. Chosen against the shape of the data
# rather than a feeling: a correct phrase scores ~0.85-1.0 against its own
# product name, while the nearest wrong row in a mixed kirana catalogue sits
# well below 0.6. The gap is wide because the candidate set is one shop's
# shelf, so the threshold sits in the middle of it.
CONFIDENCE_THRESHOLD = 0.62

# Below this a candidate is not worth offering at all - it is noise, and a list
# of three unrelated products is harder to dismiss than an empty result.
CANDIDATE_FLOOR = 0.35


# Devanagari digits, so a spoken pack size compares against a Latin variant
# name: "२००" has to reach "200g" or the size hint silently never matches.
_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

# Characters worth keeping: letters, the combining marks that build a
# Devanagari syllable, and digits. Everything else is separation.
_KEEP_CATEGORIES = {"L", "M", "N"}


def normalise(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace.

    Filtered by Unicode *category* rather than by script range. The obvious
    version - keep word characters plus the Devanagari block - keeps the danda
    (U+0964) too, because Devanagari's full stop lives inside its own block. A
    phrase recognised as "पनीर।" then scored 0.27 against the product "पनीर"
    and fell under the candidate floor, so a correctly heard sentence reported
    "yeh product aapki inventory mein nahi mila".

    Going by category also covers the double danda, the abbreviation sign, and
    the punctuation of every other script, rather than listing them one by one.
    """
    text = unicodedata.normalize("NFKC", text or "").lower()
    text = text.translate(_DEVANAGARI_DIGITS)
    text = "".join(
        ch if unicodedata.category(ch)[0] in _KEEP_CATEGORIES else " "
        for ch in text
    )
    return re.sub(r"\s+", " ", text).strip()


def _tokens(text: str) -> list:
    return [t for t in normalise(text).split() if t]


def extract_quantity(tokens: list) -> tuple:
    """Pulls the count out of a phrase, returning (quantity, remaining tokens).

    Only the *first* number is the count. A second one belongs to the product
    ("ek 500 ml doodh" is one packet, not five hundred), and multiplying them
    turned a single sale into an order for the whole shelf. Multiplication is
    reserved for an explicit "dozen".
    """
    quantity = None
    rest = []

    for token in tokens:
        if token in MULTIPLIER_WORDS:
            quantity = (quantity or 1) * 12
            continue

        value = None
        if token.isdigit():
            value = int(token)
        elif token in NUMBER_WORDS:
            value = NUMBER_WORDS[token]

        if value is not None:
            if quantity is None:
                quantity = value
            else:
                # Part of the product name, e.g. the 500 in "500 ml".
                rest.append(token)
            continue

        rest.append(token)

    return (quantity if quantity and quantity > 0 else 1), rest


def strip_noise(tokens: list) -> tuple:
    """Splits a phrase into what names the product and what sizes it.

    Bare numbers are pulled out as a size hint rather than left in the phrase:
    "500 doodh" overlaps a product called "Milk" on only half its tokens, which
    is enough to drop a correct match below the threshold. The hint is kept
    because it is the only thing separating two variants of the same product.
    """
    kept, sizes = [], []
    for token in tokens:
        if token.isdigit():
            sizes.append(token)
        elif token not in UNIT_WORDS and token not in FILLER_WORDS:
            kept.append(token)

    # If that removed everything, the tokens *were* the product ("packet" in a
    # shop that stocks one packeted thing), so fall back rather than match
    # nothing against an empty phrase.
    return (kept or [t for t in tokens if t not in FILLER_WORDS] or tokens), sizes


def parse_transcript(transcript: str) -> list:
    """Splits one spoken sentence into {quantity, phrase, size} lines."""
    if not transcript or not transcript.strip():
        return []

    parsed = []
    # Split the raw sentence: `normalise` removes the comma that separates
    # "do doodh, ek paneer", which collapsed two items into one.
    for chunk in SEPARATORS.split(transcript.lower()):
        tokens = _tokens(chunk or "")
        if not tokens:
            continue
        quantity, rest = extract_quantity(tokens)
        phrase_tokens, sizes = strip_noise(rest)
        phrase = " ".join(phrase_tokens).strip()
        if not phrase:
            continue
        parsed.append({
            "quantity": quantity,
            "phrase": phrase,
            "size": sizes[0] if sizes else None,
            "heard": normalise(chunk),
        })
    return parsed


def _similarity(phrase: str, candidate: str) -> float:
    """How well a spoken phrase names a product.

    Token overlap decides it, with a character-level ratio as a tiebreak.
    Overlap leads because speech drops and reorders words - "doodh packet" and
    "packet doodh" name the same thing - while a pure character ratio would
    rank "Doodh Masala" above "Doodh" for the phrase "doodh".
    """
    phrase_tokens = set(phrase.split())
    candidate_tokens = set(normalise(candidate).split())
    if not phrase_tokens or not candidate_tokens:
        return 0.0

    overlap = len(phrase_tokens & candidate_tokens) / len(phrase_tokens)
    ratio = SequenceMatcher(None, phrase, normalise(candidate)).ratio()

    # A phrase fully contained in the product name is a strong signal on its
    # own: "doodh" should match "Doodh" outright even though the character
    # ratio against "Doodh Full Cream" is mediocre.
    if phrase_tokens <= candidate_tokens:
        overlap = 1.0

    return round(0.7 * overlap + 0.3 * ratio, 3)


def shop_vocabulary(db: Session, retailer_id: str) -> list:
    """Everything this shop stocks, with the names it might be called by.

    Scoped to the shop deliberately. A national product table would make
    "doodh" ambiguous between forty dairy SKUs; one shop's shelf usually has
    exactly one.
    """
    rows = db.query(RetailerInventory).filter(
        RetailerInventory.retailer_id == retailer_id,
        RetailerInventory.is_active == True,  # noqa: E712
    ).all()

    vocabulary = []
    for row in rows:
        product = row.product or db.query(Product).filter(Product.id == row.product_id).first()
        variant = row.variant or db.query(ProductVariant).filter(
            ProductVariant.id == row.product_variant_id
        ).first()
        if not product:
            continue

        names = [product.canonical_name]
        if product.normalized_name:
            names.append(product.normalized_name)
        if product.brand:
            names.append(f"{product.brand} {product.canonical_name}")
        if variant and variant.variant_name:
            names.append(f"{product.canonical_name} {variant.variant_name}")
        # What it is actually called out loud - "doodh" for Milk.
        names.extend(aliases_for(product.canonical_name))

        vocabulary.append({
            "inventory": row,
            "names": names,
            "variantName": variant.variant_name if variant else "",
            "label": f"{product.canonical_name}"
                     + (f" {variant.variant_name}" if variant and variant.variant_name else ""),
        })
    return vocabulary


def match_phrase(phrase: str, vocabulary: list, size: Optional[str] = None) -> list:
    """Ranks the shop's stock against one spoken phrase.

    A spoken pack size only ever breaks a tie. It is a small nudge rather than a
    filter because "500" is said far less reliably than the product name, and a
    shop stocking one milk should match it whether or not the size was heard.
    """
    scored = []
    for entry in vocabulary:
        score = max((_similarity(phrase, name) for name in entry["names"]), default=0.0)
        if size and size in normalise(entry["variantName"]):
            score = min(1.0, score + 0.15)
        if score >= CANDIDATE_FLOOR:
            scored.append({"entry": entry, "score": round(score, 3)})
    scored.sort(key=lambda s: -s["score"])
    return scored


def interpret(db: Session, retailer: RetailerProfile, transcript: str) -> dict:
    """Reads a sentence against one shop's shelf, without changing anything.

    Separate from applying it so the same logic backs both the confirmation
    screen and the automatic path, and so a caller can preview a sentence
    without risking a deduction.
    """
    vocabulary = shop_vocabulary(db, retailer.id)
    lines = []

    for parsed in parse_transcript(transcript):
        candidates = match_phrase(parsed["phrase"], vocabulary, parsed.get("size"))
        best = candidates[0] if candidates else None

        # Two near-identical scores mean the sentence genuinely did not pick one
        # ("doodh" in a shop stocking two milks), so neither is auto-applied.
        ambiguous = (
            len(candidates) > 1
            and candidates[0]["score"] - candidates[1]["score"] < 0.08
        )
        confident = bool(best) and best["score"] >= CONFIDENCE_THRESHOLD and not ambiguous

        row = best["entry"]["inventory"] if best else None
        in_stock = bool(row and row.quantity >= parsed["quantity"])

        lines.append({
            "heard": parsed["heard"],
            "phrase": parsed["phrase"],
            "quantity": parsed["quantity"],
            "matched": bool(best),
            "confident": confident and in_stock,
            "ambiguous": ambiguous,
            "inStock": in_stock,
            "inventoryId": row.id if row else None,
            "name": best["entry"]["label"] if best else None,
            "available": row.quantity if row else None,
            "unitPrice": row.selling_price if row else None,
            "confidence": best["score"] if best else 0.0,
            "reason": _reason(best, ambiguous, in_stock, parsed["quantity"], row),
            "candidates": [
                {
                    "inventoryId": c["entry"]["inventory"].id,
                    "name": c["entry"]["label"],
                    "confidence": c["score"],
                    "available": c["entry"]["inventory"].quantity,
                }
                for c in candidates[:4]
            ],
        })

    return {
        "transcript": transcript,
        "lines": lines,
        "allConfident": bool(lines) and all(line["confident"] for line in lines),
    }


def _reason(best, ambiguous: bool, in_stock: bool, wanted: int, row) -> str:
    """Says, in one sentence, why a line will or will not be applied."""
    if not best:
        return "Yeh product aapki inventory mein nahi mila."
    if ambiguous:
        return "Ek se zyada product match hue - kaunsa tha?"
    if not in_stock:
        return f"Sirf {row.quantity if row else 0} stock mein hain, {wanted} maange gaye."
    if best["score"] < CONFIDENCE_THRESHOLD:
        return "Pakka nahi hai - confirm karein."
    return "Match mil gaya."


def apply_sale(
    db: Session,
    retailer: RetailerProfile,
    transcript: str,
    *,
    confirmations: Optional[dict] = None,
) -> dict:
    """Records a counter sale heard from the shop's microphone.

    Applies only the lines it is sure of. An uncertain line comes back with its
    candidates for a one-tap confirmation instead of being guessed at, and a
    caller that has already confirmed one passes `confirmations` mapping the
    heard phrase to the inventory row the shopkeeper picked.

    All-or-nothing within a sentence is deliberately *not* the rule: "do packet
    doodh aur ek kilo chini" where only the sugar is ambiguous should still
    deduct the milk, or the shopkeeper has to repeat the whole sentence.
    """
    from app.modules.inventory import service

    reading = interpret(db, retailer, transcript)
    confirmations = confirmations or {}

    applied, pending = [], []
    for line in reading["lines"]:
        chosen_id = confirmations.get(line["phrase"]) or confirmations.get(line["heard"])

        if chosen_id:
            row = db.query(RetailerInventory).filter(
                RetailerInventory.id == chosen_id,
                RetailerInventory.retailer_id == retailer.id,
            ).first()
            if not row:
                line["reason"] = "Confirm kiya gaya product nahi mila."
                pending.append(line)
                continue
            if row.quantity < line["quantity"]:
                line["reason"] = f"Sirf {row.quantity} stock mein hain."
                pending.append(line)
                continue
        elif line["confident"]:
            row = db.query(RetailerInventory).filter(
                RetailerInventory.id == line["inventoryId"]
            ).first()
        else:
            pending.append(line)
            continue

        result = service.consume_stock(
            db, row, line["quantity"], "sale_voice",
            unit_price=row.selling_price,
            source_text=transcript,
            commit=False,
        )
        applied.append({
            "inventoryId": row.id,
            "name": line["name"] or (row.product.canonical_name if row.product else "Unknown"),
            "quantity": line["quantity"],
            "remaining": result["remaining"],
            "unitPrice": row.selling_price,
            "lineTotal": round((row.selling_price or 0) * line["quantity"], 2),
        })

    # One commit for the sentence: two items spoken together either both land
    # or the failure is reported before anything is written.
    if applied:
        db.commit()

    return {
        "transcript": transcript,
        "applied": applied,
        "needsConfirmation": pending,
        "totalValue": round(sum(a["lineTotal"] for a in applied), 2),
        "understood": len(applied),
        "unresolved": len(pending),
    }
