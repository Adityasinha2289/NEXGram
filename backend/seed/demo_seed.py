"""Demo dataset for NEXGram.

Builds the synthetic corpus the intelligence layer needs in order to produce
anything at all: three villages in Kangra district, 8 distributors, 25 retailers,
~45 products, and 60 days of order history.

The numbers here are engineered, not random. The headline demo signal is paneer
in Palampur Market: 14 retailers asking for it, two distributors listing it and
only one able to fulfil. That combination is what drives a Strong-tier score with
High confidence, while the deliberately thin third village (Thural) produces a
Low-confidence result so the cold-start state is demonstrable rather than
theoretical.

Kept separate from initial_seed.py on purpose: tests/conftest.py imports that
module's four functions as fixtures, so it must keep its current shape.

Run with:  python -m seed.demo_seed
"""

from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import (
    Category,
    DistributorCatalogueItem,
    DistributorProfile,
    Location,
    Product,
    ProductVariant,
    RetailerProfile,
    User,
)
from app.models.commerce import Order, OrderItem, OrderStatusHistory, RetailerDistributorRelationship

DEMO_PASSWORD = "demo1234"

# Every demo account shares one password, so the (deliberately slow) bcrypt hash
# is computed once and reused rather than 33 times.
_PASSWORD_HASH = None


def password_hash() -> str:
    global _PASSWORD_HASH
    if _PASSWORD_HASH is None:
        _PASSWORD_HASH = get_password_hash(DEMO_PASSWORD)
    return _PASSWORD_HASH


# --------------------------------------------------------------------------
# Geography
# --------------------------------------------------------------------------

LOCATIONS = [
    # id,             district,  area,               village,          pincode,  lat,      lon
    ("loc_palampur", "Kangra", "Palampur Market", "Palampur", "176061", 32.1109, 76.5363),
    ("loc_baijnath", "Kangra", "Baijnath", "Baijnath", "176125", 32.0553, 76.6469),
    ("loc_thural", "Kangra", "Thural", "Thural", "176107", 31.9667, 76.5000),
    ("loc_kangra", "Kangra", "Kangra Town", "Kangra", "176001", 32.0998, 76.2691),
]


# --------------------------------------------------------------------------
# Catalogue
# --------------------------------------------------------------------------

# Category names must match the strings retailers use in demanded_categories,
# because DemandEngine resolves them with a case-insensitive exact name match.
CATEGORIES = [
    "Dairy",
    "Staples",
    "Pulses",
    "Edible Oils",
    "Beverages",
    "Tea & Coffee",
    "Snacks",
    "Confectionery",
    "Bakery",
    "Spices",
    "Household",
    "Personal Care",
]

# (product_key, category, canonical_name, [(variant_key, variant_name, pack_size, unit)])
PRODUCTS = [
    ("paneer", "Dairy", "Paneer", [("200g", "200g", "200", "g"), ("1kg", "1kg", "1", "kg")]),
    ("milk", "Dairy", "Milk", [("500ml", "500ml", "500", "ml")]),
    ("butter", "Dairy", "Butter", [("100g", "100g", "100", "g")]),
    ("curd", "Dairy", "Curd", [("400g", "400g", "400", "g")]),
    ("ghee", "Dairy", "Ghee", [("1l", "1L", "1", "l")]),
    ("cheese", "Dairy", "Cheese", [("200g", "200g", "200", "g")]),

    ("atta", "Staples", "Atta", [("5kg", "5kg", "5", "kg"), ("10kg", "10kg", "10", "kg")]),
    ("rice", "Staples", "Rice", [("5kg", "5kg", "5", "kg")]),
    ("sugar", "Staples", "Sugar", [("1kg", "1kg", "1", "kg")]),
    ("salt", "Staples", "Salt", [("1kg", "1kg", "1", "kg")]),
    ("maida", "Staples", "Maida", [("1kg", "1kg", "1", "kg")]),
    ("poha", "Staples", "Poha", [("500g", "500g", "500", "g")]),

    ("toor_dal", "Pulses", "Toor Dal", [("1kg", "1kg", "1", "kg")]),
    ("chana_dal", "Pulses", "Chana Dal", [("1kg", "1kg", "1", "kg")]),
    ("moong_dal", "Pulses", "Moong Dal", [("1kg", "1kg", "1", "kg")]),
    ("rajma", "Pulses", "Rajma", [("1kg", "1kg", "1", "kg")]),

    ("mustard_oil", "Edible Oils", "Mustard Oil", [("1l", "1L", "1", "l")]),
    ("refined_oil", "Edible Oils", "Refined Oil", [("1l", "1L", "1", "l")]),
    ("vanaspati", "Edible Oils", "Vanaspati", [("1l", "1L", "1", "l")]),

    ("water", "Beverages", "Packaged Drinking Water", [("1l", "1L", "1", "l"), ("20l", "20L Can", "20", "l")]),
    ("soft_drink", "Beverages", "Soft Drink", [("2l", "2L", "2", "l")]),
    ("juice", "Beverages", "Fruit Juice", [("1l", "1L", "1", "l")]),

    ("tea", "Tea & Coffee", "Tea Leaves", [("250g", "250g", "250", "g")]),
    ("coffee", "Tea & Coffee", "Instant Coffee", [("50g", "50g", "50", "g")]),
    ("green_tea", "Tea & Coffee", "Green Tea", [("25bags", "25 bags", "25", "bags")]),

    ("biscuits", "Snacks", "Biscuits", [("box", "Box of 12", "12", "packs")]),
    ("namkeen", "Snacks", "Namkeen", [("400g", "400g", "400", "g")]),
    ("chips", "Snacks", "Chips", [("52g", "52g", "52", "g")]),
    ("rusk", "Snacks", "Rusk", [("300g", "300g", "300", "g")]),

    ("toffee", "Confectionery", "Toffee", [("jar", "Jar of 100", "100", "pieces")]),
    ("chocolate", "Confectionery", "Chocolate", [("40g", "40g", "40", "g")]),
    ("candy", "Confectionery", "Candy", [("jar", "Jar of 150", "150", "pieces")]),

    ("bread", "Bakery", "Bread", [("400g", "400g", "400", "g")]),
    ("buns", "Bakery", "Buns", [("pack6", "Pack of 6", "6", "pieces")]),

    ("turmeric", "Spices", "Turmeric Powder", [("200g", "200g", "200", "g")]),
    ("chilli", "Spices", "Chilli Powder", [("200g", "200g", "200", "g")]),
    ("cumin", "Spices", "Cumin Seeds", [("100g", "100g", "100", "g")]),
    ("garam_masala", "Spices", "Garam Masala", [("100g", "100g", "100", "g")]),

    ("detergent", "Household", "Detergent Powder", [("1kg", "1kg", "1", "kg")]),
    ("dish_soap", "Household", "Dish Soap", [("500g", "500g", "500", "g")]),
    ("floor_cleaner", "Household", "Floor Cleaner", [("1l", "1L", "1", "l")]),
    ("phenyl", "Household", "Phenyl", [("1l", "1L", "1", "l")]),

    ("bath_soap", "Personal Care", "Bath Soap", [("125g", "125g", "125", "g")]),
    ("shampoo", "Personal Care", "Shampoo", [("180ml", "180ml", "180", "ml")]),
    ("toothpaste", "Personal Care", "Toothpaste", [("100g", "100g", "100", "g")]),
    ("hair_oil", "Personal Care", "Hair Oil", [("200ml", "200ml", "200", "ml")]),
]

# Wholesale rate per variant, in rupees.
PRICES = {
    "paneer:200g": 62, "paneer:1kg": 295, "milk:500ml": 27, "butter:100g": 54,
    "curd:400g": 38, "ghee:1l": 610, "cheese:200g": 118,
    "atta:5kg": 215, "atta:10kg": 410, "rice:5kg": 340, "sugar:1kg": 44,
    "salt:1kg": 22, "maida:1kg": 38, "poha:500g": 32,
    "toor_dal:1kg": 148, "chana_dal:1kg": 92, "moong_dal:1kg": 118, "rajma:1kg": 132,
    "mustard_oil:1l": 158, "refined_oil:1l": 142, "vanaspati:1l": 128,
    "water:1l": 14, "water:20l": 68, "soft_drink:2l": 82, "juice:1l": 96,
    "tea:250g": 128, "coffee:50g": 165, "green_tea:25bags": 142,
    "biscuits:box": 240, "namkeen:400g": 86, "chips:52g": 18, "rusk:300g": 42,
    "toffee:jar": 118, "chocolate:40g": 36, "candy:jar": 96,
    "bread:400g": 34, "buns:pack6": 28,
    "turmeric:200g": 48, "chilli:200g": 62, "cumin:100g": 74, "garam_masala:100g": 68,
    "detergent:1kg": 88, "dish_soap:500g": 46, "floor_cleaner:1l": 92, "phenyl:1l": 58,
    "bath_soap:125g": 32, "shampoo:180ml": 124, "toothpaste:100g": 58, "hair_oil:200ml": 96,
}


# --------------------------------------------------------------------------
# Distributors
# --------------------------------------------------------------------------

# The paneer story lives here. In Palampur two distributors list paneer
# (dist_sharma, dist_fresh) but only dist_sharma can fulfil, so the gap sees
# supplier_count=2 and available_supplier_count=1. dist_himachal is the demo
# account: dairy-focused, in the right area, and carrying no paneer at all.
DISTRIBUTORS = [
    {
        "key": "dist_sharma", "delivery": ["own", "staff"], "name": "Sharma Distributors", "owner": "Rakesh Sharma",
        "mobile": "9100000001", "location": "loc_palampur", "business_category": "Dairy",
        "categories": ["Dairy"], "radius": "10-20 km", "min_order": "5000-10000",
        "coverage": "20-50 retailers", "stock_level": "high",
        "stock": [("paneer:200g", 140, "available"), ("paneer:1kg", 45, "available"),
                  ("milk:500ml", 300, "available"), ("butter:100g", 90, "available"),
                  ("curd:400g", 120, "available")],
    },
    {
        "key": "dist_himachal", "delivery": ["own"], "name": "Himachal Dairy Co", "owner": "Anil Thakur",
        "mobile": "9100000002", "location": "loc_palampur", "business_category": "Dairy",
        "categories": ["Dairy"], "radius": "10-20 km", "min_order": "3000-5000",
        "coverage": "20-50 retailers", "stock_level": "medium",
        "stock": [("milk:500ml", 260, "available"), ("curd:400g", 95, "available"),
                  ("ghee:1l", 40, "available")],
    },
    {
        "key": "dist_fresh", "delivery": ["pickup"], "name": "Palampur Fresh Foods", "owner": "Suresh Kumar",
        "mobile": "9100000003", "location": "loc_palampur", "business_category": "Dairy",
        "categories": ["Dairy"], "radius": "5-10 km", "min_order": "3000-5000",
        "coverage": "10-20 retailers", "stock_level": "low",
        # Lists paneer but cannot fulfil — this is what separates listing from supplying.
        "stock": [("paneer:200g", 0, "out_of_stock"), ("cheese:200g", 30, "available"),
                  ("butter:100g", 25, "low_stock")],
    },
    {
        "key": "dist_general", "delivery": ["own", "transport"], "name": "Kangra General Traders", "owner": "Vijay Mehra",
        "mobile": "9100000004", "location": "loc_palampur", "business_category": "Staples",
        "categories": ["Staples", "Household", "Pulses"], "radius": "10-20 km",
        "min_order": "5000-10000", "coverage": "50+ retailers", "stock_level": "high",
        "stock": [("atta:5kg", 200, "available"), ("atta:10kg", 120, "available"),
                  ("rice:5kg", 180, "available"), ("sugar:1kg", 260, "available"),
                  ("salt:1kg", 300, "available"), ("toor_dal:1kg", 140, "available"),
                  ("detergent:1kg", 160, "available"), ("dish_soap:500g", 110, "available")],
    },
    {
        "key": "dist_baijnath", "delivery": ["transport"], "name": "Baijnath Supply Co", "owner": "Mohan Lal",
        "mobile": "9100000005", "location": "loc_baijnath", "business_category": "Staples",
        "categories": ["Staples", "Beverages", "Edible Oils"], "radius": "10-20 km",
        "min_order": "3000-5000", "coverage": "20-50 retailers", "stock_level": "medium",
        "stock": [("atta:5kg", 150, "available"), ("rice:5kg", 130, "available"),
                  ("mustard_oil:1l", 95, "available"), ("water:1l", 400, "available"),
                  ("water:20l", 80, "available"), ("soft_drink:2l", 110, "available")],
    },
    {
        "key": "dist_verma", "delivery": ["own", "pickup"], "name": "Verma Traders", "owner": "Deepak Verma",
        "mobile": "9100000006", "location": "loc_baijnath", "business_category": "Snacks",
        "categories": ["Snacks", "Confectionery", "Household"], "radius": "5-10 km",
        "min_order": "1000-3000", "coverage": "10-20 retailers", "stock_level": "medium",
        "stock": [("biscuits:box", 90, "available"), ("namkeen:400g", 140, "available"),
                  ("chips:52g", 300, "available"), ("toffee:jar", 60, "available"),
                  ("chocolate:40g", 200, "available"), ("phenyl:1l", 70, "available")],
    },
    {
        "key": "dist_thural", "delivery": ["pickup"], "name": "Thural Kirana Supply", "owner": "Ramesh Chand",
        "mobile": "9100000007", "location": "loc_thural", "business_category": "Staples",
        "categories": ["Staples"], "radius": "0-5 km", "min_order": "1000-3000",
        "coverage": "less than 10 retailers", "stock_level": "low",
        "stock": [("atta:5kg", 40, "available"), ("sugar:1kg", 60, "available"),
                  ("salt:1kg", 55, "low_stock")],
    },
    {
        "key": "dist_wholesale", "delivery": ["transport", "staff"], "name": "Kangra Wholesale Mart", "owner": "Sanjay Gupta",
        "mobile": "9100000008", "location": "loc_kangra", "business_category": "Staples",
        "categories": ["Staples", "Spices", "Personal Care", "Tea & Coffee"],
        "radius": "20+ km", "min_order": "10000+", "coverage": "50+ retailers",
        "stock_level": "high",
        "stock": [("atta:10kg", 300, "available"), ("rice:5kg", 250, "available"),
                  ("turmeric:200g", 180, "available"), ("chilli:200g", 170, "available"),
                  ("cumin:100g", 140, "available"), ("garam_masala:100g", 130, "available"),
                  ("tea:250g", 200, "available"), ("coffee:50g", 90, "available"),
                  ("bath_soap:125g", 260, "available"), ("shampoo:180ml", 140, "available"),
                  ("toothpaste:100g", 180, "available")],
    },
]


# --------------------------------------------------------------------------
# Retailers
# --------------------------------------------------------------------------

BUSINESS_TYPES = ["Kirana Store", "General Store", "Dairy Shop", "Provision Store"]
SALES_RANGES = ["under-50000", "50000-100000", "100000-200000", "200000+"]
BUDGETS = ["10000-25000", "25000-50000", "50000-100000", "under-10000"]

# Demand is assigned, not randomised, so the resulting scores are reproducible.
#
#   Palampur: 14 retailers, every one of them short of paneer -> the headline gap
#   Baijnath:  7 retailers, 5 short of paneer -> a second, weaker gap
#   Thural:    4 retailers, 2 short of paneer -> Low confidence, the cold-start case
RETAILERS = []


def _retailer(idx, name, owner, location, categories, unmet_cats, unmet_other, requirements):
    RETAILERS.append({
        "key": f"ret_{idx:02d}",
        "mobile": f"90000000{idx:02d}",
        "name": name,
        "owner": owner,
        "location": location,
        "business_type": BUSINESS_TYPES[idx % len(BUSINESS_TYPES)],
        "monthly_sales_range": SALES_RANGES[idx % len(SALES_RANGES)],
        "investment_budget": BUDGETS[idx % len(BUDGETS)],
        "demanded_categories": categories,
        "unmet_needs": {"categories": unmet_cats, "other": unmet_other},
        "requirements": requirements,
    })


# --- Palampur Market: 14 shops, all reporting unmet paneer demand -------------
_palampur = [
    ("Gupta Kirana Store", "Ashok Gupta", "paneer aur butter customers roz maangte hain, nahi milta"),
    ("Sharma General Store", "Naveen Sharma", "paneer ki demand bahut hai, supplier nahi hai"),
    ("New Bharat Store", "Pankaj Rana", "paneer nahi milta, biscuits bhi kam padte hain"),
    ("Krishna Provision", "Mukesh Kumar", "paneer chahiye regular, detergent bhi"),
    ("Himalaya Kirana", "Rajeev Sood", "paneer aur curd ki kami hai"),
    ("Balaji Store", "Sunil Dutt", "paneer stock nahi milta kabhi"),
    ("Shiv Shakti Kirana", "Vinod Kumar", "paneer roz ki demand hai, water bhi chahiye"),
    ("Ganesh General Store", "Praveen Attri", "paneer nahi aata, namkeen bhi"),
    ("Om Provision Store", "Rakesh Thakur", "paneer ke liye Kangra jaana padta hai"),
    ("Maa Durga Kirana", "Sandeep Jaswal", "paneer aur ghee ki supply nahi hai"),
    ("Kangra Fresh Mart", "Ravi Chauhan", "paneer chahiye, chips bhi kam hain"),
    ("Verma Kirana", "Dinesh Verma", "paneer milta hi nahi, soap bhi"),
    ("Sai Provision", "Anup Sharma", "paneer regular chahiye"),
    ("Dhauladhar Store", "Manoj Katoch", "paneer aur cheese dono nahi milte"),
]

for i, (shop, owner, unmet) in enumerate(_palampur, start=1):
    _retailer(
        i, shop, owner, "loc_palampur",
        categories=["Dairy", "Staples"],
        unmet_cats=["Dairy"],
        unmet_other=unmet,
        requirements=["daily fresh stock", "credit terms"],
    )

# --- Baijnath: 7 shops, 5 of them short of paneer ----------------------------
_baijnath = [
    ("Baijnath Kirana", "Sanjay Kumar", "paneer nahi milta yahan"),
    ("Mandir Road Store", "Ashwani Kumar", "paneer aur milk chahiye"),
    ("Shakti Provision", "Lekh Raj", "paneer ki demand badh rahi hai"),
    ("Neelkanth Store", "Pawan Kumar", "paneer chahiye customers ko"),
    ("Bhagwati Kirana", "Rohit Sharma", "paneer nahi aata"),
    ("Sunrise General Store", "Ajay Pathania", "chips aur namkeen kam padte hain"),
    ("Gopal Provision", "Krishan Lal", "atta aur rice ki supply slow hai"),
]

for i, (shop, owner, unmet) in enumerate(_baijnath, start=15):
    _retailer(
        i, shop, owner, "loc_baijnath",
        categories=["Dairy", "Snacks"] if i <= 19 else ["Snacks", "Staples"],
        unmet_cats=["Dairy"] if i <= 19 else ["Snacks"],
        unmet_other=unmet,
        requirements=["weekly delivery"],
    )

# --- Thural: 4 shops only, thin signal on purpose ----------------------------
_thural = [
    ("Thural Kirana", "Suresh Kumar", "paneer kabhi nahi milta"),
    ("Village Store Thural", "Nek Ram", "paneer chahiye par door hai supplier"),
    ("Shri Ram Provision", "Bansi Lal", "atta aur sugar chahiye"),
    ("Nanda Store", "Jagdish Chand", "salt aur tea ki kami hai"),
]

for i, (shop, owner, unmet) in enumerate(_thural, start=22):
    _retailer(
        i, shop, owner, "loc_thural",
        categories=["Dairy", "Staples"] if i <= 23 else ["Staples", "Tea & Coffee"],
        unmet_cats=["Dairy"] if i <= 23 else ["Staples"],
        unmet_other=unmet,
        requirements=["monthly bulk order"],
    )


# --------------------------------------------------------------------------
# Builders
# --------------------------------------------------------------------------

def build_locations(db):
    for loc_id, district, area, village, pincode, lat, lon in LOCATIONS:
        db.add(Location(
            id=loc_id, state="Himachal Pradesh", district=district, block=district,
            area=area, village_town_city=village, pincode=pincode,
            latitude=lat, longitude=lon,
        ))
    db.commit()


def build_catalogue(db):
    """Creates the category tree, products and variants.

    Returns {"variant_key": ProductVariant} where variant_key is "product:variant",
    matching the keys used in the distributor stock lists and PRICES.
    """
    root = Category(id="cat_fmcg", name="FMCG", slug="fmcg", level=0)
    db.add(root)
    db.commit()

    categories = {}
    for name in CATEGORIES:
        slug = name.lower().replace(" & ", "-").replace(" ", "-")
        cat = Category(id=f"cat_{slug.replace('-', '_')}", parent_id=root.id,
                       name=name, slug=slug, level=1)
        db.add(cat)
        categories[name] = cat
    db.commit()

    variants = {}
    for product_key, category_name, canonical, variant_specs in PRODUCTS:
        product = Product(
            id=f"prod_{product_key}",
            category_id=categories[category_name].id,
            canonical_name=canonical,
            normalized_name=canonical.lower(),
        )
        db.add(product)
        db.flush()

        for variant_key, variant_name, pack_size, unit in variant_specs:
            variant = ProductVariant(
                id=f"var_{product_key}_{variant_key}",
                product_id=product.id,
                variant_name=variant_name,
                pack_size=pack_size,
                unit=unit,
            )
            db.add(variant)
            variants[f"{product_key}:{variant_key}"] = variant
    db.commit()
    return variants


def build_distributors(db, variants):
    profiles = {}
    for spec in DISTRIBUTORS:
        user = User(
            id=f"user_{spec['key']}", role="distributor", name=spec["owner"],
            mobile=spec["mobile"], email=f"{spec['key']}@nexgram.demo",
            password_hash=password_hash(), is_active=True,
        )
        db.add(user)

        profile = DistributorProfile(
            id=spec["key"], user_id=user.id, location_id=spec["location"],
            business_name=spec["name"],
            business_category=spec["business_category"],
            product_categories=spec["categories"],
            service_radius=spec["radius"],
            minimum_order_range=spec["min_order"],
            retailer_coverage=spec["coverage"],
            verification_status="verified",
            delivery_capabilities=spec["delivery"],
            stock_capacity={"level": spec["stock_level"], "customDescription": ""},
        )
        db.add(profile)
        profiles[spec["key"]] = profile
        db.flush()

        for variant_key, stock, status in spec["stock"]:
            variant = variants[variant_key]
            price = PRICES[variant_key]
            db.add(DistributorCatalogueItem(
                id=f"cat_{spec['key']}_{variant_key.replace(':', '_')}",
                distributor_id=profile.id,
                product_id=variant.product_id,
                product_variant_id=variant.id,
                selling_price=float(price),
                minimum_order_quantity=5 if price < 100 else 2,
                available_stock=stock,
                stock_status=status,
                delivery_time="1-2 days",
                is_available=status != "out_of_stock",
                is_active=True,
            ))
    db.commit()
    return profiles


def build_retailers(db):
    profiles = {}
    for spec in RETAILERS:
        user = User(
            id=f"user_{spec['key']}", role="retailer", name=spec["owner"],
            mobile=spec["mobile"], email=f"{spec['key']}@nexgram.demo",
            password_hash=password_hash(), is_active=True,
        )
        db.add(user)

        profile = RetailerProfile(
            id=spec["key"], user_id=user.id, location_id=spec["location"],
            business_name=spec["name"],
            business_type=spec["business_type"],
            business_age="2-5 years",
            monthly_sales_range=spec["monthly_sales_range"],
            investment_budget=spec["investment_budget"],
            customer_volume="50-100 daily",
            purchase_frequency="weekly",
            existing_supplier_type="local distributor",
            demanded_categories=spec["demanded_categories"],
            unmet_needs=spec["unmet_needs"],
            requirements=spec["requirements"],
        )
        db.add(profile)
        profiles[spec["key"]] = profile
    db.commit()
    return profiles


def build_order_history(db, retailers, distributors):
    """Sixty days of completed orders, so reorder intelligence has a baseline.

    Pairs each retailer with the distributors that serve their area and walks
    backwards from today in a fixed rhythm; no randomness, so the demo shows the
    same history on every reseed.
    """
    by_location = {}
    for spec in DISTRIBUTORS:
        by_location.setdefault(spec["location"], []).append(spec)

    today = datetime.utcnow()
    order_seq = 0
    relationships = set()

    for r_index, spec in enumerate(RETAILERS):
        local = by_location.get(spec["location"]) or by_location["loc_kangra"]

        # Three orders each for the first twelve shops, one for the rest:
        # enough history to compute against without inflating the dataset.
        order_count = 3 if r_index < 12 else 1

        # A kirana shop buys from the same distributor again and again, so keep
        # the supplier fixed per retailer. That repetition is what gives reorder
        # intelligence a cadence to measure.
        primary = local[r_index % len(local)]
        items = [(k, s, st) for k, s, st in primary["stock"][:3] if st != "out_of_stock"]
        if not items:
            continue

        for n in range(order_count):
            dist_spec = primary

            order_seq += 1
            days_ago = 5 + (r_index * 2) + (n * 18)
            if days_ago > 60:
                continue
            placed = today - timedelta(days=days_ago)

            # Leave a few orders mid-flight so distributors open the app with
            # something to act on, rather than a screen of finished business.
            if order_seq % 9 == 0:
                status = "requested"
            elif order_seq % 7 == 0:
                status = "accepted"
            else:
                status = "completed"

            order = Order(
                id=f"order_{order_seq:03d}",
                retailer_id=spec["key"],
                distributor_id=dist_spec["key"],
                order_number=f"NXG-{placed.strftime('%y%m')}-{order_seq:04d}",
                status=status,
                created_at=placed,
                accepted_at=placed + timedelta(hours=4) if status in ("accepted", "completed") else None,
                completed_at=placed + timedelta(days=2) if status == "completed" else None,
            )
            db.add(order)
            db.flush()

            subtotal = 0.0
            for variant_key, _stock, _status in items:
                price = float(PRICES[variant_key])
                quantity = 10 if price < 100 else 4
                line_total = price * quantity
                subtotal += line_total
                db.add(OrderItem(
                    id=f"oi_{order_seq:03d}_{variant_key.replace(':', '_')}",
                    order_id=order.id,
                    product_id=f"prod_{variant_key.split(':')[0]}",
                    product_variant_id=f"var_{variant_key.replace(':', '_')}",
                    catalogue_item_id=f"cat_{dist_spec['key']}_{variant_key.replace(':', '_')}",
                    quantity=quantity,
                    unit_price=price,
                    line_total=line_total,
                ))

            order.subtotal = subtotal
            order.total = subtotal

            transitions = [("draft", "requested"), ("requested", "accepted"), ("accepted", "completed")]
            reached = {"requested": 1, "accepted": 2, "completed": 3}[status]
            for previous, new in transitions[:reached]:
                db.add(OrderStatusHistory(
                    id=f"osh_{order_seq:03d}_{new}",
                    order_id=order.id,
                    previous_status=previous,
                    new_status=new,
                    reason="Seeded demo history",
                ))

            pair = (spec["key"], dist_spec["key"])
            if pair not in relationships:
                relationships.add(pair)
                db.add(RetailerDistributorRelationship(
                    retailer_id=spec["key"],
                    distributor_id=dist_spec["key"],
                    status="active",
                ))

    db.commit()
    return order_seq


def run_seed():
    db = SessionLocal()
    try:
        if db.query(Category).count() > 0:
            print("Database already seeded — nothing to do.")
            return

        print("Seeding demo dataset...")
        build_locations(db)
        variants = build_catalogue(db)
        distributors = build_distributors(db, variants)
        retailers = build_retailers(db)
        orders = build_order_history(db, retailers, distributors)

        print(f"  locations    {len(LOCATIONS)}")
        print(f"  categories   {len(CATEGORIES)}")
        print(f"  products     {len(PRODUCTS)}  ({len(variants)} variants)")
        print(f"  distributors {len(DISTRIBUTORS)}")
        print(f"  retailers    {len(RETAILERS)}")
        print(f"  orders       {orders}")
        print(f"\nAll demo accounts use password: {DEMO_PASSWORD}")
        print("  retailer   9000000001   (Gupta Kirana Store, Palampur)")
        print("  distributor 9100000002  (Himachal Dairy Co, Palampur)")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
