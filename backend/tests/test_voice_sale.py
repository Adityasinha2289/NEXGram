"""Hearing "do packet doodh" and taking two milk off the shelf.

The parser is tested separately from the matcher because they fail differently:
a parser bug mishears the quantity, a matcher bug deducts the wrong product.
The second is the one that loses a shopkeeper's trust, so the tests below are
as interested in what it *refuses* to do as in what it gets right.
"""

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_retailer, get_current_user
from app.main import app
from app.models.profiles import RetailerProfile
from app.models.retail import StockMovement
from app.models.users import User
from app.modules.inventory import service, voice

client = TestClient(app)


@pytest.fixture(autouse=True)
def signed_in(db):
    app.dependency_overrides[get_current_retailer] = (
        lambda: db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
    )
    app.dependency_overrides[get_current_user] = (
        lambda: db.query(User).filter_by(id="usr_ret_1").first()
    )
    yield


@pytest.fixture
def retailer(db, seed_data):
    return db.query(RetailerProfile).filter_by(id="ret_ramesh").first()


@pytest.fixture
def shelf(db, retailer):
    """A small kirana shelf: milk, paneer and atta."""
    milk = service.add_stock(
        db, retailer, product_variant_id="var_milk_500ml",
        quantity=40, unit_cost=22.0, selling_price=28.0,
    )
    paneer = service.add_stock(
        db, retailer, product_variant_id="var_paneer_200g",
        quantity=15, unit_cost=55.0, selling_price=70.0,
    )
    atta = service.add_stock(
        db, retailer, product_variant_id="var_atta_5kg",
        quantity=10, unit_cost=210.0, selling_price=250.0,
    )
    return {"milk": milk, "paneer": paneer, "atta": atta}


class TestParsingNumbers:
    """No audio involved - just the sentence the phone hands over."""

    @pytest.mark.parametrize("said,expected", [
        ("do packet doodh", 2),
        ("2 packet doodh", 2),
        ("ek packet doodh", 1),
        ("teen packet doodh", 3),
        ("paanch packet doodh", 5),
        ("das packet doodh", 10),
        ("two packets of doodh", 2),
        ("दो packet doodh", 2),
    ])
    def test_reads_the_count_however_it_was_said(self, said, expected):
        parsed = voice.parse_transcript(said)
        assert parsed[0]["quantity"] == expected

    def test_a_sale_with_no_number_is_one_not_none(self):
        """"doodh bech diya" is a sale of one, not a sale of nothing."""
        assert voice.parse_transcript("doodh bech diya")[0]["quantity"] == 1

    def test_a_dozen_multiplies(self):
        assert voice.parse_transcript("do dozen anda")[0]["quantity"] == 24

    def test_a_pack_size_in_the_name_is_not_read_as_a_count(self):
        """"500 ml doodh" is one item, not five hundred."""
        parsed = voice.parse_transcript("ek 500 ml doodh")
        assert parsed[0]["quantity"] == 1

    def test_unit_and_filler_words_are_stripped_from_the_product(self):
        parsed = voice.parse_transcript("do packet doodh de do")
        assert parsed[0]["phrase"] == "doodh"

    def test_a_sentence_of_only_units_still_keeps_something_to_match_on(self):
        parsed = voice.parse_transcript("do packet")
        assert parsed and parsed[0]["phrase"]

    def test_an_empty_transcript_yields_nothing(self):
        assert voice.parse_transcript("") == []
        assert voice.parse_transcript("   ") == []


class TestParsingMultipleItems:
    def test_two_items_joined_by_aur(self):
        parsed = voice.parse_transcript("do packet doodh aur ek kilo atta")

        assert len(parsed) == 2
        assert (parsed[0]["quantity"], parsed[0]["phrase"]) == (2, "doodh")
        assert parsed[1]["quantity"] == 1

    def test_two_items_joined_by_and(self):
        assert len(voice.parse_transcript("two doodh and three paneer")) == 2

    def test_two_items_separated_by_a_comma(self):
        assert len(voice.parse_transcript("do doodh, ek paneer")) == 2


class TestMatchingAgainstTheShelf:
    def test_a_clear_phrase_matches_its_product(self, db, retailer, shelf):
        reading = voice.interpret(db, retailer, "do packet doodh")

        line = reading["lines"][0]
        assert line["name"].startswith("Milk")
        assert line["confident"] is True
        assert line["quantity"] == 2

    def test_the_english_name_matches_too(self, db, retailer, shelf):
        reading = voice.interpret(db, retailer, "two packet milk")
        assert reading["lines"][0]["inventoryId"] == shelf["milk"].id

    def test_a_product_the_shop_does_not_stock_is_not_guessed_at(self, db, retailer, shelf):
        reading = voice.interpret(db, retailer, "do packet shampoo")

        line = reading["lines"][0]
        assert line["confident"] is False
        assert "nahi mila" in line["reason"]

    def test_a_quantity_beyond_stock_is_flagged_rather_than_applied(self, db, retailer, shelf):
        reading = voice.interpret(db, retailer, "pachas packet paneer")  # only 15 on the shelf

        line = reading["lines"][0]
        assert line["inStock"] is False
        assert line["confident"] is False
        assert "15" in line["reason"]

    def test_candidates_come_back_for_a_tap(self, db, retailer, shelf):
        reading = voice.interpret(db, retailer, "do packet shampoo")
        assert isinstance(reading["lines"][0]["candidates"], list)

    def test_reading_a_sentence_changes_no_stock(self, db, retailer, shelf):
        voice.interpret(db, retailer, "do packet doodh")

        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 40


class TestApplyingASale:
    def test_a_confident_sale_comes_off_the_shelf(self, db, retailer, shelf):
        result = voice.apply_sale(db, retailer, "do packet doodh")

        assert result["understood"] == 1
        assert result["applied"][0]["quantity"] == 2
        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 38

    def test_the_sale_is_valued_at_the_shelf_price(self, db, retailer, shelf):
        result = voice.apply_sale(db, retailer, "do packet doodh")
        assert result["totalValue"] == 56.0  # 2 x 28

    def test_the_sentence_is_kept_on_the_movement(self, db, retailer, shelf):
        """A wrong deduction has to be explainable, not just reversible."""
        voice.apply_sale(db, retailer, "do packet doodh")

        movement = db.query(StockMovement).filter_by(
            inventory_id=shelf["milk"].id, reason="sale_voice"
        ).one()
        assert movement.source_text == "do packet doodh"

    def test_two_items_in_one_sentence_both_apply(self, db, retailer, shelf):
        result = voice.apply_sale(db, retailer, "do packet doodh aur ek paneer")

        assert result["understood"] == 2
        db.refresh(shelf["milk"])
        db.refresh(shelf["paneer"])
        assert shelf["milk"].quantity == 38
        assert shelf["paneer"].quantity == 14

    def test_an_unknown_product_deducts_nothing(self, db, retailer, shelf):
        result = voice.apply_sale(db, retailer, "do packet shampoo")

        assert result["understood"] == 0
        assert result["unresolved"] == 1
        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 40

    def test_the_certain_half_of_a_sentence_still_applies(self, db, retailer, shelf):
        """Otherwise the shopkeeper has to say the whole thing again."""
        result = voice.apply_sale(db, retailer, "do packet doodh aur ek shampoo")

        assert result["understood"] == 1
        assert result["unresolved"] == 1
        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 38

    def test_a_confirmed_line_applies_on_the_second_pass(self, db, retailer, shelf):
        first = voice.apply_sale(db, retailer, "do packet shampoo")
        phrase = first["needsConfirmation"][0]["phrase"]

        result = voice.apply_sale(
            db, retailer, "do packet shampoo",
            confirmations={phrase: shelf["milk"].id},
        )

        assert result["understood"] == 1
        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 38

    def test_a_confirmation_cannot_reach_another_shop_stock(self, db, retailer, shelf):
        """The confirmed id is re-checked against this shop, not trusted."""
        result = voice.apply_sale(
            db, retailer, "do packet shampoo",
            confirmations={"shampoo": "some-other-shops-row"},
        )

        assert result["understood"] == 0
        assert result["unresolved"] == 1


class TestVoiceApi:
    def test_preview_reports_without_applying(self, db, retailer, shelf):
        response = client.post("/api/inventory/voice-sale/preview", json={
            "transcript": "do packet doodh",
        })

        assert response.status_code == 200
        assert response.json()["allConfident"] is True
        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 40

    def test_the_sale_endpoint_applies_it(self, db, retailer, shelf):
        response = client.post("/api/inventory/voice-sale", json={
            "transcript": "teen packet doodh",
        })

        assert response.status_code == 200
        assert response.json()["understood"] == 1
        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 37

    def test_an_empty_transcript_is_rejected_by_validation(self, db, retailer, shelf):
        assert client.post("/api/inventory/voice-sale", json={"transcript": ""}).status_code == 422

    def test_the_movement_shows_up_in_the_ledger(self, db, retailer, shelf):
        client.post("/api/inventory/voice-sale", json={"transcript": "do packet doodh"})

        ledger = client.get("/api/inventory/movements").json()
        voice_sales = [m for m in ledger if m["reason"] == "sale_voice"]
        assert voice_sales and voice_sales[0]["quantityDelta"] == -2


class TestDevanagariScript:
    """Sentences as the phone's recogniser actually returns them.

    Set to hi-IN, Chrome hands back Devanagari with a danda (U+0964) closing the
    sentence. The danda lives *inside* the Devanagari Unicode block, so a filter
    written as "keep word characters plus Devanagari" kept the full stop: the
    phrase became "पनीर।", scored 0.27 against the product
    "पनीर", fell under the candidate floor, and a correctly heard
    sentence reported "yeh product aapki inventory mein nahi mila".
    """

    PANEER = "पनीर"          # पनीर
    DOODH = "दूध"                  # दूध
    DAHI = "दही"                   # दही
    DO_PACKET = "दो पैकेट"   # दो पैकेट
    DANDA = "।"                              # ।
    AUR = "और"                          # और
    EK = "एक"                           # एक

    def test_a_trailing_danda_is_not_part_of_the_product(self):
        parsed = voice.parse_transcript(f"{self.DO_PACKET} {self.PANEER}{self.DANDA}")

        assert parsed[0]["quantity"] == 2
        assert parsed[0]["phrase"] == self.PANEER

    def test_a_double_danda_is_stripped_too(self):
        parsed = voice.parse_transcript(f"{self.DO_PACKET} {self.PANEER}॥")
        assert parsed[0]["phrase"] == self.PANEER

    def test_devanagari_digits_are_read_as_numbers(self):
        # "२ पैकेट पनीर"
        parsed = voice.parse_transcript(f"२ पैकेट {self.PANEER}")
        assert parsed[0]["quantity"] == 2
        assert parsed[0]["phrase"] == self.PANEER

    def test_a_devanagari_sentence_still_splits_on_aur(self):
        parsed = voice.parse_transcript(
            f"{self.DO_PACKET} {self.DOODH} {self.AUR} {self.EK} {self.DAHI}{self.DANDA}"
        )

        assert len(parsed) == 2
        assert parsed[0]["phrase"] == self.DOODH
        assert parsed[1]["phrase"] == self.DAHI

    def test_the_reported_sentence_matches_its_product(self, db, retailer, shelf):
        reading = voice.interpret(db, retailer, f"{self.DO_PACKET} {self.PANEER}{self.DANDA}")

        line = reading["lines"][0]
        assert line["name"].startswith("Paneer")
        assert line["confident"] is True
        assert line["quantity"] == 2

    def test_the_reported_sentence_comes_off_the_shelf(self, db, retailer, shelf):
        result = voice.apply_sale(db, retailer, f"{self.DO_PACKET} {self.PANEER}{self.DANDA}")

        assert result["understood"] == 1
        db.refresh(shelf["paneer"])
        assert shelf["paneer"].quantity == 13  # was 15

    def test_devanagari_milk_matches_the_english_product(self, db, retailer, shelf):
        reading = voice.interpret(db, retailer, f"{self.DO_PACKET} {self.DOODH}{self.DANDA}")
        assert reading["lines"][0]["inventoryId"] == shelf["milk"].id

    def test_an_english_sentence_ending_in_a_full_stop_also_works(self):
        # The same class of bug, one script over.
        assert voice.parse_transcript("do packet doodh.")[0]["phrase"] == "doodh"

    def test_devanagari_verbs_do_not_dilute_the_product(self, db, retailer, shelf):
        """"पनीर दे दो" is an ordinary way to say it.

        The filler list was Latin-only, so the verbs stayed in the phrase and
        the match landed at 0.41 - over the candidate floor but under the
        confidence threshold, turning a normal sentence into a prompt.
        """
        DE_DO = "दे दो"      # दे दो
        parsed = voice.parse_transcript(f"{self.DO_PACKET} {self.PANEER} {DE_DO}{self.DANDA}")

        assert parsed[0]["quantity"] == 2
        assert parsed[0]["phrase"] == self.PANEER

    def test_a_whole_devanagari_sentence_applies_without_a_prompt(self, db, retailer, shelf):
        # "ग्राहक को दो पैकेट दूध दे दिया।"
        sentence = (
            "ग्राहक को "
            f"{self.DO_PACKET} {self.DOODH} "
            "दे दिया" + self.DANDA
        )
        reading = voice.interpret(db, retailer, sentence)

        line = reading["lines"][0]
        assert line["name"].startswith("Milk")
        assert line["confident"] is True

    def test_two_devanagari_items_with_different_units(self, db, retailer, shelf):
        # "तीन किलो आटा और दो पैकेट पनीर।"
        sentence = (
            "तीन किलो आटा "
            f"{self.AUR} {self.DO_PACKET} {self.PANEER}{self.DANDA}"
        )
        result = voice.apply_sale(db, retailer, sentence)

        assert result["understood"] == 2
        db.refresh(shelf["atta"])
        db.refresh(shelf["paneer"])
        assert shelf["atta"].quantity == 7    # was 10
        assert shelf["paneer"].quantity == 13  # was 15
