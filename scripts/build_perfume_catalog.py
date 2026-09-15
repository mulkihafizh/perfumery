#!/usr/bin/env python3
"""
build_perfume_catalog.py — Hybrid Perfume Reference Catalog Builder

Ingests a Kaggle Fragrantica CSV dump, cleans & standardizes brand/model names,
auto-categorizes houses into 4 target taxonomies, and enriches the dataset with
an extensive curated catalog of Indonesian Local Brands and Middle Eastern houses.

Output: perfume_catalog.json (compatible with reddit_extractor.py & build-unified-leaderboard.js)

Usage:
    python build_perfume_catalog.py                      # Auto-detect CSV in project root
    python build_perfume_catalog.py fra_cleaned.csv       # Explicit CSV path
    python build_perfume_catalog.py --output custom.json  # Custom output path
"""

import csv
import json
import os
import re
import sys
import glob
import unicodedata
from collections import Counter, OrderedDict

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════
# 1. CONFIGURATION & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════

OUTPUT_FILE = "perfume_catalog.json"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # scripts/ → root

# CSV auto-detection patterns (priority order)
CSV_PATTERNS = [
    "fra_cleaned.csv",
    "fra*.csv",
    "*fragrantica*.csv",
    "*perfume*.csv",
]

# Country → Region & CountryCode mapping
COUNTRY_MAP = {
    # Western Europe
    "france":       ("France",        "FR"),
    "italy":        ("Italy",         "IT"),
    "spain":        ("Spain",         "ES"),
    "germany":      ("Germany",       "DE"),
    "uk":           ("United Kingdom","GB"),
    "united kingdom":("United Kingdom","GB"),
    "netherlands":  ("Netherlands",   "NL"),
    "switzerland":  ("Switzerland",   "CH"),
    "sweden":       ("Sweden",        "SE"),
    "greece":       ("Greece",        "GR"),
    "poland":       ("Poland",        "PL"),
    "portugal":     ("Portugal",      "PT"),
    "austria":      ("Austria",       "AT"),
    "belgium":      ("Belgium",       "BE"),
    "denmark":      ("Denmark",       "DK"),
    "norway":       ("Norway",        "NO"),
    "finland":      ("Finland",       "FI"),
    "ireland":      ("Ireland",       "IE"),
    "czech republic":("Czech Republic","CZ"),
    "hungary":      ("Hungary",       "HU"),
    "croatia":      ("Croatia",       "HR"),
    "romania":      ("Romania",       "RO"),
    "serbia":       ("Serbia",        "RS"),
    "luxembourg":   ("Luxembourg",    "LU"),
    # Americas
    "usa":          ("United States", "US"),
    "united states":("United States", "US"),
    "canada":       ("Canada",        "CA"),
    "brazil":       ("Brazil",        "BR"),
    "argentina":    ("Argentina",     "AR"),
    "mexico":       ("Mexico",        "MX"),
    "colombia":     ("Colombia",      "CO"),
    "chile":        ("Chile",         "CL"),
    "peru":         ("Peru",          "PE"),
    "uruguay":      ("Uruguay",       "UY"),
    "cuba":         ("Cuba",          "CU"),
    # Middle East / Arabian
    "uae":          ("United Arab Emirates", "AE"),
    "united arab emirates": ("United Arab Emirates", "AE"),
    "oman":         ("Oman",          "OM"),
    "arabia saudi": ("Saudi Arabia",  "SA"),
    "saudi arabia": ("Saudi Arabia",  "SA"),
    "qatar":        ("Qatar",         "QA"),
    "kuwait":       ("Kuwait",        "KW"),
    "bahrain":      ("Bahrain",       "BH"),
    "lebanon":      ("Lebanon",       "LB"),
    "jordan":       ("Jordan",        "JO"),
    "iran":         ("Iran",          "IR"),
    "iraq":         ("Iraq",          "IQ"),
    "egypt":        ("Egypt",         "EG"),
    "morocco":      ("Morocco",       "MA"),
    "tunisia":      ("Tunisia",       "TN"),
    "pakistan":      ("Pakistan",      "PK"),
    # Asia Pacific
    "japan":        ("Japan",         "JP"),
    "south korea":  ("South Korea",   "KR"),
    "korea":        ("South Korea",   "KR"),
    "china":        ("China",         "CN"),
    "india":        ("India",         "IN"),
    "indonesia":    ("Indonesia",     "ID"),
    "malaysia":     ("Malaysia",      "MY"),
    "singapore":    ("Singapore",     "SG"),
    "thailand":     ("Thailand",      "TH"),
    "vietnam":      ("Vietnam",       "VN"),
    "philippines":  ("Philippines",   "PH"),
    "australia":    ("Australia",     "AU"),
    "new zealand":  ("New Zealand",   "NZ"),
    "taiwan":       ("Taiwan",        "TW"),
    # Eastern Europe / Russia
    "russia":       ("Russia",        "RU"),
    "ukraine":      ("Ukraine",       "UA"),
    "turkey":       ("Turkey",        "TR"),
    "georgia":      ("Georgia",       "GE"),
    # Africa
    "south africa": ("South Africa",  "ZA"),
    "nigeria":      ("Nigeria",       "NG"),
    "kenya":        ("Kenya",         "KE"),
}

# Middle Eastern countries for category classification
ME_COUNTRIES = {
    "uae", "united arab emirates", "oman", "arabia saudi", "saudi arabia",
    "qatar", "kuwait", "bahrain", "lebanon", "jordan", "iran", "iraq",
    "egypt", "morocco", "tunisia", "pakistan",
}

# ═══════════════════════════════════════════════════════════════════════
# 2. BRAND CATEGORIZATION RULES
# ═══════════════════════════════════════════════════════════════════════

# Explicit brand → category overrides (slug-based, matching CSV brand column)
NICHE_LUXURY_BRANDS = {
    "xerjoff", "creed", "amouage", "nishane", "tiziana-terenzi",
    "memo-paris", "byredo", "le-labo", "diptyque", "maison-margiela",
    "maison-francis-kurkdjian", "parfums-de-marly", "initio-parfums-prives",
    "tom-ford", "frederic-malle", "kilian", "mancera", "montale",
    "roja-dove", "ex-nihilo", "bond-no-9", "clive-christian",
    "penhaligon-s", "acqua-di-parma", "serge-lutens", "aesop",
    "juliette-has-a-gun", "clean", "d-s-durga", "imaginary-authors",
    "replica", "atelier-cologne", "comptoir-sud-pacifique",
    "histoires-de-parfums", "etat-libre-d-orange", "profumum-roma",
    "xerjoff-casamorati", "boadicea-the-victorious", "floris",
    "penhaligons", "house-of-oud", "vilhelm-parfumerie",
    "goldfield-banks", "bdk-parfums", "matiere-premiere",
    "zarko-perfume", "nicolai-parfumeur-createur", "perris-monte-carlo",
    "sospiro", "orto-parisi", "nasomatto", "masque-milano",
    "ormonde-jayne", "the-different-company", "heeley",
    "l-artisan-parfumeur", "comme-des-garcons", "a-lab-on-fire",
}

DESIGNER_BRANDS = {
    "dior", "chanel", "versace", "dolce-gabbana", "prada",
    "yves-saint-laurent", "giorgio-armani", "gucci", "givenchy",
    "burberry", "ralph-lauren", "calvin-klein", "hugo-boss",
    "carolina-herrera", "marc-jacobs", "kenzo", "valentino",
    "roberto-cavalli", "lancome", "hermes", "jean-paul-gaultier",
    "issey-miyake", "narciso-rodriguez", "bvlgari", "fendi",
    "chloe", "balenciaga", "coach", "michael-kors",
    "tommy-hilfiger", "lacoste", "salvatore-ferragamo",
    "elizabeth-arden", "victoria-s-secret", "victorias-secret",
    "bath-body-works", "zara", "abercrombie-fitch",
    "banana-republic", "gap", "hollister", "massimo-dutti",
    "jo-malone-london", "guerlain", "thierry-mugler", "azzaro",
    "dunhill", "montblanc", "jaguar", "bentley", "ferrari",
    "davidoff", "cerruti", "escada", "loewe", "rochas",
    "oscar-de-la-renta", "donna-karan", "vera-wang",
    "elie-saab", "jimmy-choo", "carolina-herrera",
    "nina-ricci", "trussardi", "missoni", "moschino",
    "dsquared2", "zadig-voltaire", "celine",
}

ARABIAN_CLONE_BRANDS = {
    "lattafa-perfumes", "lattafa", "armaf", "rasasi", "ard-al-zaafaran",
    "al-haramain", "ajmal", "afnan", "swiss-arabian",
    "al-rehab", "nabeel", "al-jazeera-perfumes",
    "ahmed-al-maghribi", "my-perfumes", "anfar",
    "al-wataniah", "khadlaj", "alhambra", "asdaaf",
    "nusuk", "maison-alhambra", "paris-corner",
    "french-avenue", "fa-paris", "fragrance-world",
    "arabiyat-prestige", "emper", "vurv",
    "al-absar", "hamidi", "junaid-perfumes",
}


# ═══════════════════════════════════════════════════════════════════════
# 3. MANDATORY LOCAL INDONESIAN BRAND CATALOG
# ═══════════════════════════════════════════════════════════════════════

LOCAL_INDONESIAN_CATALOG = {
    "HMNS": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Orgasm": {
                "full_name": "HMNS Orgasm",
                "aliases": ["hmns orgasm", "orgasm hmns", "darker shade of orgasm", "darker shade of o", "dsoo", "orgasm"],
                "notes": ["floral", "sweet", "fruity", "powdery"],
                "gender": "Women / Unisex",
                "description": "Rich floral and sweet notes with apple, red rose, jasmine, and vanilla beans.",
                "is_ambiguous": True,
            },
            "Farhampton": {
                "full_name": "HMNS Farhampton",
                "aliases": ["hmns farhampton", "farhampton"],
                "notes": ["aromatic", "spicy", "woody", "fresh"],
                "gender": "Men / Unisex",
                "description": "Sophisticated bergamot, orange blossom, and cedarwood blend.",
                "is_ambiguous": True,
            },
            "Essence of the Sun (EOS)": {
                "full_name": "HMNS Essence of the Sun (EOS)",
                "aliases": ["essence of the sun", "hmns eos", "hmns essence of the sun", "eos hmns"],
                "notes": ["floral", "sweet", "fresh"],
                "gender": "Unisex",
                "description": "Warm solar floral fragrance with bergamot, coriander, tiare blossom, and vanilla.",
                "is_ambiguous": False,
            },
            "The Perfection": {
                "full_name": "HMNS The Perfection",
                "aliases": ["hmns the perfection", "the perfection"],
                "notes": ["spicy", "woody", "leather", "fresh"],
                "gender": "Men / Unisex",
                "description": "Signature collab with Christian Sugiono featuring spicy and woody notes.",
                "is_ambiguous": False,
            },
            "Unrosed": {
                "full_name": "HMNS Unrosed",
                "aliases": ["hmns unrosed", "unrosed"],
                "notes": ["floral", "woody", "aromatic"],
                "gender": "Unisex",
                "description": "Deconstructed rose scent highlighting green palmarosa and earthy cedar.",
                "is_ambiguous": True,
            },
            "Untitled Humans": {
                "full_name": "HMNS Untitled Humans",
                "aliases": ["hmns untitled humans", "untitled humans"],
                "notes": ["powdery", "woody", "fresh"],
                "gender": "Unisex",
                "description": "Clean, soothing skin scent crafted with sandalwood and musk.",
                "is_ambiguous": False,
            },
            "Alpha": {
                "full_name": "HMNS Alpha",
                "aliases": ["hmns alpha", "alpha hmns", "alpha"],
                "notes": ["fresh", "citrus", "green", "woody"],
                "gender": "Men / Unisex",
                "description": "Fresh citrus and green grass notes with cedarwood base.",
                "is_ambiguous": True,
            },
        },
    },
    "Mykonos": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Matcha Latte": {
                "full_name": "Mykonos Matcha Latte",
                "aliases": ["mykonos matcha latte", "matcha latte"],
                "notes": ["sweet", "aromatic", "floral", "fresh"],
                "gender": "Unisex",
                "description": "Soothing milky green tea with subtle citrus top and white floral heart.",
                "is_ambiguous": True,
            },
            "California": {
                "full_name": "Mykonos California",
                "aliases": ["mykonos california", "mykonos califonia", "california mykonos"],
                "notes": ["fresh", "fruity", "sweet"],
                "gender": "Unisex",
                "description": "Vibrant blend of mandarin, sweet tropical fruits, and soft musky drydown.",
                "is_ambiguous": True,
            },
            "Aphrodite": {
                "full_name": "Mykonos Aphrodite",
                "aliases": ["mykonos aphrodite", "aphrodite mykonos", "aphrodite"],
                "notes": ["sweet", "floral", "spicy", "oriental"],
                "gender": "Women",
                "description": "Warm cinnamon, jasmine, and vanilla creating a seductive sweet scent.",
                "is_ambiguous": True,
            },
            "Vanilla Clouds": {
                "full_name": "Mykonos Vanilla Clouds",
                "aliases": ["mykonos vanilla clouds", "vanilla clouds"],
                "notes": ["sweet", "powdery", "floral"],
                "gender": "Women / Unisex",
                "description": "Fluffy marshmallow, sweet vanilla, white florals, and caramel dessert notes.",
                "is_ambiguous": True,
            },
            "Pistachio Milk": {
                "full_name": "Mykonos Pistachio Milk",
                "aliases": ["mykonos pistachio milk", "pistachio milk"],
                "notes": ["sweet", "powdery"],
                "gender": "Unisex",
                "description": "Creamy roasted pistachio and sweet condensed milk notes.",
                "is_ambiguous": True,
            },
            "Bonfire Vanilla": {
                "full_name": "Mykonos Bonfire Vanilla",
                "aliases": ["mykonos bonfire vanilla", "bonfire vanilla"],
                "notes": ["sweet", "woody", "spicy", "oriental"],
                "gender": "Unisex",
                "description": "Smoky campfire warmth balanced by rich sweet vanilla and woods.",
                "is_ambiguous": False,
            },
            "Caramel Fudge Cookie": {
                "full_name": "Mykonos Caramel Fudge Cookie",
                "aliases": ["mykonos caramel fudge cookie", "caramel fudge cookie", "caramel fudge"],
                "notes": ["sweet", "powdery"],
                "gender": "Women",
                "description": "Ultra-decadent freshly baked cookies drenched in warm caramel fudge.",
                "is_ambiguous": True,
            },
            "When in Paris": {
                "full_name": "Mykonos When in Paris",
                "aliases": ["mykonos when in paris", "when in paris"],
                "notes": ["floral", "fruity", "sweet", "fresh"],
                "gender": "Women",
                "description": "Sparkling romantic blend of lychee, rose, and amber.",
                "is_ambiguous": True,
            },
            "Sansa": {
                "full_name": "Mykonos Sansa",
                "aliases": ["mykonos sansa", "sansa mykonos"],
                "notes": ["floral", "fruity", "sweet"],
                "gender": "Women",
                "description": "Regal floral scent featuring peony, peach, and soft musk.",
                "is_ambiguous": True,
            },
            "Baby Love": {
                "full_name": "Mykonos Baby Love",
                "aliases": ["mykonos baby love", "baby love mykonos", "baby love"],
                "notes": ["powdery", "floral", "fresh", "clean"],
                "gender": "Unisex",
                "description": "Nostalgic gentle baby powder scent with violet, rose, and comforting musk.",
                "is_ambiguous": True,
            },
        },
    },
    "SAFF & Co.": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Ostara": {
                "full_name": "SAFF & Co. Ostara",
                "aliases": ["saff ostara", "saff and co ostara", "saff & co ostara", "ostara"],
                "notes": ["floral", "sweet", "fresh", "powdery"],
                "gender": "Women / Unisex",
                "description": "Spring cherry blossom opening to sweet ylang ylang and soft white musk.",
                "is_ambiguous": True,
            },
            "Solaris": {
                "full_name": "SAFF & Co. Solaris",
                "aliases": ["saff solaris", "saff and co solaris", "saff & co solaris", "solaris"],
                "notes": ["citrus", "aromatic", "woody", "fresh"],
                "gender": "Men / Unisex",
                "description": "Bright bergamot and grapefruit citrus burst with warm cedarwood base.",
                "is_ambiguous": True,
            },
            "Second Skin": {
                "full_name": "SAFF & Co. Second Skin",
                "aliases": ["saff second skin", "saff and co second skin", "saff & co second skin", "second skin"],
                "notes": ["musk", "woody", "fresh", "powdery"],
                "gender": "Unisex",
                "description": "Intimate skin-scent with clean aldehydes, sandalwood, and warm ambrette.",
                "is_ambiguous": True,
            },
        },
    },
    "Alchemist": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Out West": {
                "full_name": "Alchemist Out West",
                "aliases": ["alchemist out west", "out west alchemist", "out west"],
                "notes": ["woody", "earthy", "citrus", "aromatic"],
                "gender": "Unisex",
                "description": "Earthy woody elegance with yuzu, bergamot, cedarwood, and vetiver.",
                "is_ambiguous": True,
            },
            "Powder Room": {
                "full_name": "Alchemist Powder Room",
                "aliases": ["alchemist powder room", "powder room alchemist", "powder room"],
                "notes": ["powdery", "floral", "fresh", "clean"],
                "gender": "Women / Unisex",
                "description": "Clean crisp powdery floral with fresh watery notes, rose, and comforting skin musk.",
                "is_ambiguous": True,
            },
            "Pink Laundry": {
                "full_name": "Alchemist Pink Laundry",
                "aliases": ["alchemist pink laundry", "pink laundry alchemist", "pink laundry"],
                "notes": ["clean", "floral", "fresh", "powdery"],
                "gender": "Women / Unisex",
                "description": "Clean aldehydes, delicate rose, and soft sandalwood reminiscent of fresh luxury linen.",
                "is_ambiguous": True,
            },
        },
    },
    "Evangeline": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Black Sakura": {
                "full_name": "Evangeline Black Sakura",
                "aliases": ["evangeline black sakura", "black sakura evangeline", "black sakura"],
                "notes": ["floral", "fruity", "sweet", "fresh"],
                "gender": "Women / Unisex",
                "description": "Sweet berry, cherry blossom, and soft musk popular in Indonesian fragrance community.",
                "is_ambiguous": True,
            },
            "White Floral Bouquet": {
                "full_name": "Evangeline White Floral Bouquet",
                "aliases": ["evangeline white floral bouquet", "white floral bouquet", "evangeline white floral"],
                "notes": ["floral", "fresh", "green", "powdery"],
                "gender": "Women",
                "description": "Elegant white floral arrangement with jasmine, tuberose, and lily.",
                "is_ambiguous": True,
            },
        },
    },
    "Fore": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Fields of Ubud": {
                "full_name": "Fore Fields of Ubud",
                "aliases": ["fore fields of ubud", "fields of ubud"],
                "notes": ["green", "earthy", "woody", "fresh"],
                "gender": "Unisex",
                "description": "Green Balinese rice terraces with dewy greens, vetiver, and earth accords.",
                "is_ambiguous": True,
            },
        },
    },
    "Panzeri": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Bubble Bath": {
                "full_name": "Panzeri Bubble Bath",
                "aliases": ["panzeri bubble bath", "bubble bath panzeri", "bubble bath"],
                "notes": ["aquatic", "clean", "powdery", "fresh"],
                "gender": "Unisex",
                "description": "Fresh soapy bubbles, clean musk, and warm powdery skin feel.",
                "is_ambiguous": True,
            },
        },
    },
    "Brasov": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Eau de Cologne": {
                "full_name": "Brasov Eau de Cologne",
                "aliases": ["brasov eau de cologne", "brasov cologne", "brasov edc"],
                "notes": ["citrus", "fresh", "aromatic"],
                "gender": "Men / Unisex",
                "description": "Classic Indonesian men's cologne with citrus and herbal freshness.",
                "is_ambiguous": False,
            },
        },
    },
    "Casablanca": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Femme": {
                "full_name": "Casablanca Femme",
                "aliases": ["casablanca femme", "casablanca parfum"],
                "notes": ["floral", "sweet", "powdery"],
                "gender": "Women",
                "description": "Classic Indonesian feminine fragrance with floral and powder notes.",
                "is_ambiguous": False,
            },
        },
    },
    "Wardah": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Eau de Toilette": {
                "full_name": "Wardah Eau de Toilette",
                "aliases": ["wardah edt", "wardah perfume", "wardah fragrance"],
                "notes": ["floral", "fresh", "clean"],
                "gender": "Women",
                "description": "Halal-certified light floral scent from Indonesia's beloved beauty brand.",
                "is_ambiguous": False,
            },
        },
    },
    "Molto": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Perfume Collection": {
                "full_name": "Molto Perfume Collection",
                "aliases": ["molto perfume", "molto fragrance"],
                "notes": ["floral", "clean", "fresh"],
                "gender": "Unisex",
                "description": "Well-known Indonesian fabric softener brand with dedicated perfume line.",
                "is_ambiguous": False,
            },
        },
    },
    "Kahf": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Saffron Oud": {
                "full_name": "Kahf Saffron Oud",
                "aliases": ["kahf saffron oud", "kahf saffron", "kahf oud"],
                "notes": ["spicy", "woody", "oriental"],
                "gender": "Men",
                "description": "Indonesian halal men's fragrance featuring bold saffron and oud wood.",
                "is_ambiguous": False,
            },
        },
    },
    "Izil Beauty": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Rose de Marrakech": {
                "full_name": "Izil Beauty Rose de Marrakech",
                "aliases": ["izil rose de marrakech", "izil rose", "izil beauty rose"],
                "notes": ["floral", "spicy", "warm"],
                "gender": "Women",
                "description": "Indonesian artisan rose perfume inspired by Moroccan rose gardens.",
                "is_ambiguous": False,
            },
        },
    },
    "Nagita Perfume": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Signature": {
                "full_name": "Nagita Perfume Signature",
                "aliases": ["nagita perfume", "nagita signature", "nagita fragrance"],
                "notes": ["floral", "sweet", "powdery"],
                "gender": "Women",
                "description": "Celebrity Indonesian perfume by Nagita Slavina.",
                "is_ambiguous": False,
            },
        },
    },
    "Raine Beauty": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Eau de Parfum": {
                "full_name": "Raine Beauty Eau de Parfum",
                "aliases": ["raine beauty perfume", "raine beauty edp", "raine beauty fragrance"],
                "notes": ["floral", "fruity", "fresh"],
                "gender": "Women",
                "description": "Indonesian beauty brand by Raisa Andriana with floral-fruity compositions.",
                "is_ambiguous": False,
            },
        },
    },
    "Senswell": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Eau de Parfum": {
                "full_name": "Senswell Eau de Parfum",
                "aliases": ["senswell perfume", "senswell edp", "senswell fragrance"],
                "notes": ["floral", "fresh", "sweet"],
                "gender": "Women / Unisex",
                "description": "Popular Indonesian drugstore perfume brand with accessible price point.",
                "is_ambiguous": False,
            },
        },
    },
    "Morris": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Eau de Parfum": {
                "full_name": "Morris Eau de Parfum",
                "aliases": ["morris perfume", "morris edp", "morris fragrance"],
                "notes": ["fresh", "woody", "aromatic"],
                "gender": "Men / Unisex",
                "description": "Affordable Indonesian men's fragrance brand with wide distribution.",
                "is_ambiguous": False,
            },
        },
    },
    "Eskulin": {
        "category": "Local Brand",
        "region": "Indonesia",
        "countryCode": "ID",
        "models": {
            "Body Mist": {
                "full_name": "Eskulin Body Mist",
                "aliases": ["eskulin body mist", "eskulin perfume", "eskulin fragrance"],
                "notes": ["fruity", "sweet", "fresh"],
                "gender": "Women",
                "description": "Popular Indonesian youth-targeted body mist brand.",
                "is_ambiguous": False,
            },
        },
    },
}

# ═══════════════════════════════════════════════════════════════════════
# 4. SUPPLEMENTARY DESIGNER / NICHE ENTRIES (not always in Kaggle CSV)
# ═══════════════════════════════════════════════════════════════════════

SUPPLEMENTARY_ENTRIES = {
    "Ariana Grande": {
        "category": "Celebrity",
        "region": "United States",
        "countryCode": "US",
        "models": {
            "Cloud": {
                "full_name": "Ariana Grande Cloud",
                "aliases": ["ariana grande cloud", "ag cloud", "cloud 2.0", "cloud"],
                "notes": ["sweet", "vanilla", "gourmand", "fruity"],
                "gender": "Women / Unisex",
                "description": "Sweet gourmand fragrance with lavender, coconut, praline, and vanilla notes.",
                "is_ambiguous": True,
            },
        },
    },
    "Glossier": {
        "category": "Designer",
        "region": "United States",
        "countryCode": "US",
        "models": {
            "You": {
                "full_name": "Glossier You",
                "aliases": ["glossier you", "you glossier", "glossier you edp"],
                "notes": ["powdery", "musk", "fresh", "spicy"],
                "gender": "Unisex",
                "description": "Sparkling pink pepper, powdery iris, and warm creamy ambrox that smells like clean skin.",
                "is_ambiguous": True,
            },
        },
    },
    "Maison Margiela": {
        "category": "Niche / Luxury",
        "region": "France",
        "countryCode": "FR",
        "models": {
            "By the Fireplace": {
                "full_name": "Maison Margiela By the Fireplace",
                "aliases": ["by the fireplace", "margiela by the fireplace", "replica by the fireplace", "maison margiela by the fireplace", "btfp"],
                "notes": ["woody", "smoky", "sweet", "spicy", "vanilla"],
                "gender": "Unisex",
                "description": "Comforting warmth of a crackling fire with chestnut, clove, orange blossom, and vanilla.",
                "is_ambiguous": True,
            },
            "Jazz Club": {
                "full_name": "Maison Margiela Jazz Club",
                "aliases": ["jazz club", "replica jazz club", "margiela jazz club", "maison margiela jazz club"],
                "notes": ["tobacco", "sweet", "spicy", "woody"],
                "gender": "Men / Unisex",
                "description": "Atmospheric heady rum, tobacco leaf, pink pepper, and vanilla cocktail.",
                "is_ambiguous": True,
            },
            "Lazy Sunday Morning": {
                "full_name": "Maison Margiela Lazy Sunday Morning",
                "aliases": ["lazy sunday morning", "replica lazy sunday morning", "margiela lazy sunday morning"],
                "notes": ["clean", "floral", "powdery", "fresh"],
                "gender": "Unisex",
                "description": "Silky smooth clean bedsheets with lily of the valley, pear, iris, and white musk.",
                "is_ambiguous": True,
            },
        },
    },
    "Le Labo": {
        "category": "Niche / Luxury",
        "region": "United States",
        "countryCode": "US",
        "models": {
            "Santal 33": {
                "full_name": "Le Labo Santal 33",
                "aliases": ["le labo santal 33", "santal 33", "santal33", "le labo santal"],
                "notes": ["woody", "leather", "spicy", "powdery", "aromatic"],
                "gender": "Unisex",
                "description": "Iconic smoky sandalwood, cedarwood, cardamom, violet, and leather scent.",
                "is_ambiguous": False,
            },
            "Another 13": {
                "full_name": "Le Labo Another 13",
                "aliases": ["le labo another 13", "another 13", "another13", "le labo another"],
                "notes": ["amber", "musk", "woody", "fresh"],
                "gender": "Unisex",
                "description": "Hypnotic second-skin molecular amber with ambroxan, jasmine, moss, and ambrette.",
                "is_ambiguous": False,
            },
        },
    },
    "Kilian": {
        "category": "Niche / Luxury",
        "region": "France",
        "countryCode": "FR",
        "models": {
            "Angels' Share": {
                "full_name": "Kilian Angels' Share",
                "aliases": ["kilian angels' share", "kilian angels share", "kilian angel's share", "kilian angel share", "angels' share", "angels share", "angel share"],
                "notes": ["sweet", "spicy", "gourmand", "woody", "amber"],
                "gender": "Unisex",
                "description": "Intoxicating cognac, cinnamon, oak wood, tonka bean, and praline gourmand masterpiece.",
                "is_ambiguous": True,
            },
        },
    },
    "Maison Francis Kurkdjian": {
        "category": "Niche / Luxury",
        "region": "France",
        "countryCode": "FR",
        "models": {
            "Grand Soir": {
                "full_name": "Maison Francis Kurkdjian Grand Soir",
                "aliases": ["mfk grand soir", "grand soir mfk", "grand soir"],
                "notes": ["amber", "vanilla", "sweet", "warm"],
                "gender": "Unisex",
                "description": "Sensual warm Parisian night with radiant benzoin, amber, tonka bean, and vanilla.",
                "is_ambiguous": True,
            },
            "Baccarat Rouge 540": {
                "full_name": "Maison Francis Kurkdjian Baccarat Rouge 540",
                "aliases": ["baccarat rouge 540", "br540", "mfk br540", "mfk baccarat rouge", "baccarat rouge"],
                "notes": ["amber", "sweet", "woody", "floral"],
                "gender": "Unisex",
                "description": "Luminous saffron, jasmine, ambergris, and fir resin in a crystalline structure.",
                "is_ambiguous": False,
            },
        },
    },
    "Parfums de Marly": {
        "category": "Niche / Luxury",
        "region": "France",
        "countryCode": "FR",
        "models": {
            "Layton": {
                "full_name": "Parfums de Marly Layton",
                "aliases": ["pdm layton", "parfums de marly layton", "layton pdm", "layton"],
                "notes": ["spicy", "sweet", "vanilla", "woody"],
                "gender": "Men / Unisex",
                "description": "Addictive blend of crisp apple, lavender, vanilla, cardamom, and sandalwood.",
                "is_ambiguous": True,
            },
            "Delina": {
                "full_name": "Parfums de Marly Delina",
                "aliases": ["pdm delina", "parfums de marly delina", "delina pdm", "delina", "delina exclusif"],
                "notes": ["floral", "fruity", "sweet", "powdery"],
                "gender": "Women",
                "description": "Sculptural Turkish rose, lychee, rhubarb, peony, and creamy vanilla cashmere.",
                "is_ambiguous": True,
            },
        },
    },
}


# ═══════════════════════════════════════════════════════════════════════
# 5. AMBIGUITY DETECTION
# ═══════════════════════════════════════════════════════════════════════

FORCE_AMBIGUOUS = {
    "cool water", "lost cherry", "black orchid", "bubble bath",
    "powder room", "out west", "pink laundry", "baby love",
    "black sakura", "lazy sunday morning", "by the fireplace",
    "matcha latte", "second skin", "vanilla clouds", "pistachio milk",
    "caramel fudge cookie", "when in paris", "white floral bouquet",
    "fields of ubud", "cloud", "you", "angel", "alien", "chance",
    "euphoria", "hero", "daisy", "perfect", "libre", "bombshell",
    "twilly", "bloom", "good girl", "la vie est belle",
    "miss dior", "coco mademoiselle", "sauvage", "eros",
    "bleu de chanel", "aventus", "khamrah", "yara",
    "orgasm", "farhampton", "alpha", "unrosed", "sansa",
    "ostara", "solaris", "aphrodite", "layton", "delina",
    "jazz club", "angels share", "grand soir", "another 13",
}


def is_ambiguous_model(model_name):
    """Determine if a model name is ambiguous enough to require brand proximity validation."""
    lower = model_name.lower().strip()

    # Forced ambiguous list
    if lower in FORCE_AMBIGUOUS:
        return True

    # Concentration words or generic fragrance descriptors are always ambiguous
    CONCENTRATION_OR_GENERIC = {
        "eau de parfum", "eau de toilette", "eau de cologne", "extrait de parfum",
        "parfum", "cologne", "edp", "edt", "edc", "elixir", "intense", "extreme",
        "absolu", "sport", "noir", "blanche", "pour homme", "pour femme",
        "for men", "for women", "men", "women", "fragrance", "perfume", "scent",
        "for", "homme", "femme", "black", "white", "gold", "silver", "classic"
    }
    if lower in CONCENTRATION_OR_GENERIC:
        return True

    # Single word, ≤12 chars, no digits → likely ambiguous
    words = lower.split()
    if len(words) == 1 and len(lower) <= 12 and not any(c.isdigit() for c in lower):
        return True

    return False


# ═══════════════════════════════════════════════════════════════════════
# 6. NAME CLEANING & NORMALIZATION
# ═══════════════════════════════════════════════════════════════════════

def normalize_unicode(text):
    """Normalize unicode characters (accents, special chars)."""
    # Preserve meaningful accents but normalize form
    return unicodedata.normalize("NFC", text)


def slug_to_display(slug):
    """Convert a URL slug to a display name.
    'yves-saint-laurent' → 'Yves Saint Laurent'
    'jo-malone-london' → 'Jo Malone London'
    'dolce-gabbana' → 'Dolce & Gabbana'
    """
    # Special brand display name mappings
    SLUG_OVERRIDES = {
        "dolce-gabbana": "Dolce & Gabbana",
        "dolce-and-gabbana": "Dolce & Gabbana",
        "yves-saint-laurent": "Yves Saint Laurent",
        "giorgio-armani": "Giorgio Armani",
        "ralph-lauren": "Ralph Lauren",
        "calvin-klein": "Calvin Klein",
        "hugo-boss": "Hugo Boss",
        "carolina-herrera": "Carolina Herrera",
        "marc-jacobs": "Marc Jacobs",
        "jean-paul-gaultier": "Jean Paul Gaultier",
        "issey-miyake": "Issey Miyake",
        "narciso-rodriguez": "Narciso Rodriguez",
        "roberto-cavalli": "Roberto Cavalli",
        "salvatore-ferragamo": "Salvatore Ferragamo",
        "elizabeth-arden": "Elizabeth Arden",
        "victoria-s-secret": "Victoria's Secret",
        "victorias-secret": "Victoria's Secret",
        "bath-body-works": "Bath & Body Works",
        "bath-and-body-works": "Bath & Body Works",
        "abercrombie-fitch": "Abercrombie & Fitch",
        "jo-malone-london": "Jo Malone",
        "jo-malone": "Jo Malone",
        "tom-ford": "Tom Ford",
        "maison-francis-kurkdjian": "Maison Francis Kurkdjian",
        "maison-margiela": "Maison Margiela",
        "parfums-de-marly": "Parfums de Marly",
        "le-labo": "Le Labo",
        "l-artisan-parfumeur": "L'Artisan Parfumeur",
        "l-occitane-en-provence": "L'Occitane",
        "tiziana-terenzi": "Tiziana Terenzi",
        "memo-paris": "Memo Paris",
        "initio-parfums-prives": "Initio Parfums Privés",
        "frederic-malle": "Frédéric Malle",
        "juliette-has-a-gun": "Juliette Has a Gun",
        "comme-des-garcons": "Comme des Garçons",
        "etat-libre-d-orange": "Etat Libre d'Orange",
        "histoires-de-parfums": "Histoires de Parfums",
        "comptoir-sud-pacifique": "Comptoir Sud Pacifique",
        "atelier-cologne": "Atelier Cologne",
        "acqua-di-parma": "Acqua di Parma",
        "bond-no-9": "Bond No. 9",
        "clive-christian": "Clive Christian",
        "penhaligon-s": "Penhaligon's",
        "lattafa-perfumes": "Lattafa",
        "ard-al-zaafaran": "Ard Al Zaafaran",
        "al-haramain": "Al Haramain",
        "swiss-arabian": "Swiss Arabian",
        "al-rehab": "Al Rehab",
        "al-jazeera-perfumes": "Al Jazeera Perfumes",
        "ahmed-al-maghribi": "Ahmed Al Maghribi",
        "my-perfumes": "My Perfumes",
        "maison-alhambra": "Maison Alhambra",
        "paris-corner": "Paris Corner",
        "fragrance-world": "Fragrance World",
        "arabiyat-prestige": "Arabiyat Prestige",
        "o-boticario": "O Boticário",
        "donna-karan": "Donna Karan",
        "oscar-de-la-renta": "Oscar de la Renta",
        "nina-ricci": "Nina Ricci",
        "zadig-voltaire": "Zadig & Voltaire",
        "d-s-durga": "D.S. & Durga",
        "a-lab-on-fire": "A Lab on Fire",
        "bdk-parfums": "BDK Parfums",
        "matiere-premiere": "Matière Première",
        "roja-dove": "Roja Dove",
        "ex-nihilo": "Ex Nihilo",
        "profumum-roma": "Profumum Roma",
        "xerjoff-casamorati": "Xerjoff Casamorati",
        "boadicea-the-victorious": "Boadicea the Victorious",
        "house-of-oud": "House of Oud",
        "vilhelm-parfumerie": "Vilhelm Parfumerie",
        "goldfield-banks": "Goldfield & Banks",
        "zarko-perfume": "Zarkoperfume",
        "nicolai-parfumeur-createur": "Nicolaï Parfumeur-Créateur",
        "perris-monte-carlo": "Perris Monte Carlo",
        "masque-milano": "Masque Milano",
        "ormonde-jayne": "Ormonde Jayne",
        "the-different-company": "The Different Company",
        "imaginary-authors": "Imaginary Authors",
        "thierry-mugler": "Mugler",
        "massimo-dutti": "Massimo Dutti",
        "elie-saab": "Elie Saab",
        "jimmy-choo": "Jimmy Choo",
        "vera-wang": "Vera Wang",
        "tommy-hilfiger": "Tommy Hilfiger",
        "orto-parisi": "Orto Parisi",
        "nasomatto": "Nasomatto",
        "serge-lutens": "Serge Lutens",
    }

    if slug in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[slug]

    # Fallback: capitalize each segment
    return " ".join(word.capitalize() for word in slug.split("-"))


def clean_model_name(raw_perfume_slug, brand_slug):
    """Clean a model name from the CSV's Perfume column.

    The CSV stores names as URL slugs: 'accento-overdose-pride-edition'
    This function converts them to proper display names.
    """
    # Convert slug to spaced words
    name = raw_perfume_slug.replace("-", " ").strip()

    # Remove leading brand name if present
    brand_words = brand_slug.replace("-", " ").lower()
    if name.lower().startswith(brand_words):
        name = name[len(brand_words):].strip()

    # Strip trailing year patterns like '2024', '2023'
    name = re.sub(r"\s+\d{4}$", "", name)

    # Strip gender suffixes only if a meaningful model name remains
    cleaned_suffix = re.sub(r"\s+(for\s+)?(men|women|him|her|homme|femme|pour\s+homme|pour\s+femme)$", "", name, flags=re.IGNORECASE).strip()
    if cleaned_suffix and cleaned_suffix.lower() not in {"for", "pour", "and", "the", "with", "in", "by"}:
        name = cleaned_suffix

    # Title-case while preserving known patterns
    LOWERCASE_WORDS = {"de", "du", "des", "le", "la", "les", "et", "en",
                       "di", "da", "del", "al", "el", "von", "van",
                       "for", "and", "the", "a", "an", "or", "by", "in", "on", "of", "to"}

    # Special model name overrides
    MODEL_OVERRIDES = {
        "edp": "EDP",
        "edt": "EDT",
        "parfum": "Parfum",
        "intense": "Intense",
        "elixir": "Elixir",
        "absolu": "Absolu",
        "extreme": "Extreme",
        "noir": "Noir",
        "blanche": "Blanche",
        "ii": "II",
        "iii": "III",
        "iv": "IV",
    }

    words = name.split()
    result = []
    for i, word in enumerate(words):
        lower = word.lower()
        if lower in MODEL_OVERRIDES:
            result.append(MODEL_OVERRIDES[lower])
        elif i > 0 and lower in LOWERCASE_WORDS:
            result.append(lower)
        else:
            result.append(word.capitalize())

    return " ".join(result) if result else raw_perfume_slug


def parse_notes(top_str, mid_str, base_str):
    """Parse notes from CSV's Top/Middle/Base columns into a flat list."""
    all_notes = []
    for col in [top_str, mid_str, base_str]:
        if col:
            for note in col.split(","):
                note = note.strip().lower()
                if note and note != "unknown":
                    all_notes.append(note)
    return list(dict.fromkeys(all_notes))  # deduplicate, preserve order


def parse_accords(row):
    """Extract main accords from the CSV's mainaccord columns."""
    accords = []
    for i in range(1, 6):
        key = f"mainaccord{i}"
        if key in row and row[key].strip():
            accords.append(row[key].strip().lower())
    return accords


def normalize_gender(raw_gender):
    """Map CSV gender values to our schema."""
    mapping = {
        "men": "Men",
        "women": "Women",
        "unisex": "Unisex",
    }
    return mapping.get(raw_gender.lower().strip(), "Unisex")


def generate_aliases(brand_display, model_name, brand_slug):
    """Generate a list of alias patterns for entity matching."""
    aliases = []
    full = f"{brand_display} {model_name}"

    # 1. Full name (brand + model) — lowercase
    aliases.append(full.lower())

    # 2. Reversed: "model brand"
    reversed_name = f"{model_name} {brand_display}".lower()
    if reversed_name != aliases[0]:
        aliases.append(reversed_name)

    CONCENTRATIONS_AND_GENERIC = {
        "eau de parfum", "eau de toilette", "eau de cologne", "extrait de parfum",
        "parfum", "cologne", "edp", "edt", "edc", "elixir", "intense", "extreme",
        "absolu", "sport", "noir", "blanche", "pour homme", "pour femme",
        "for men", "for women", "men", "women", "fragrance", "perfume", "scent",
        "for", "homme", "femme", "black", "white", "gold", "silver", "classic"
    }

    # 3. Model name alone (if not too short and not generic concentration or brand name)
    model_lower = model_name.lower().strip()
    brand_lower = brand_display.lower().strip()
    brand_tokens = set(re.findall(r"[a-z0-9']+", brand_lower))
    if (len(model_lower) >= 3 and 
        model_lower not in CONCENTRATIONS_AND_GENERIC and 
        model_lower != brand_lower and
        model_lower not in brand_tokens):
        aliases.append(model_lower)

    # 4. Slug-style alias (hyphens)
    slug_alias = f"{brand_slug} {model_name.lower().replace(' ', '-')}"
    if slug_alias not in aliases:
        aliases.append(slug_alias)

    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for a in aliases:
        if a not in seen:
            seen.add(a)
            deduped.append(a)

    return deduped


def classify_brand(brand_slug, country_raw):
    """Classify a brand into one of the 4 target categories."""
    country_lower = country_raw.lower().strip()

    # 1. Check explicit overrides
    if brand_slug in NICHE_LUXURY_BRANDS:
        return "Niche / Luxury"

    if brand_slug in ARABIAN_CLONE_BRANDS:
        return "Arabian / Clone"

    if brand_slug in DESIGNER_BRANDS:
        return "Designer"

    # 2. Infer from country
    if country_lower in ME_COUNTRIES:
        return "Arabian / Clone"

    # 3. Default: Designer (most Kaggle entries are mainstream)
    return "Designer"


# ═══════════════════════════════════════════════════════════════════════
# 7. CSV FILE DISCOVERY
# ═══════════════════════════════════════════════════════════════════════

def find_csv_file(explicit_path=None):
    """Auto-detect the Fragrantica CSV file in the project root."""
    if explicit_path and os.path.isfile(explicit_path):
        return explicit_path

    # Try patterns in priority order
    for pattern in CSV_PATTERNS:
        full_pattern = os.path.join(PROJECT_ROOT, pattern)
        matches = glob.glob(full_pattern)
        if matches:
            # Prioritize fra_cleaned.csv
            for m in matches:
                if os.path.basename(m) == "fra_cleaned.csv":
                    return m
            return matches[0]

    return None


def detect_encoding(filepath):
    """Try to detect the correct encoding for the CSV file.
    Reads the ENTIRE file to avoid missing encoding issues mid-file.
    """
    for enc in ["utf-8", "latin-1", "cp1252", "iso-8859-1"]:
        try:
            with open(filepath, "rb") as f:
                raw = f.read()
            raw.decode(enc)
            return enc
        except (UnicodeDecodeError, UnicodeError):
            continue
    return "latin-1"  # safe fallback


# ═══════════════════════════════════════════════════════════════════════
# 8. MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════════

def build_catalog(csv_path, output_path):
    """Main pipeline: CSV → cleaned catalog JSON."""

    print(f"\n{'═' * 64}")
    print(f"  🏗️  PERFUME CATALOG BUILDER")
    print(f"{'═' * 64}")
    print(f"  📄 Source CSV:  {os.path.basename(csv_path)}")
    print(f"  📁 Output:      {output_path}")
    print(f"{'─' * 64}\n")

    catalog = {"metadata": {}, "brands": {}}

    # ── Phase 1: Ingest CSV ──────────────────────────────────────────
    print("  ▸ Phase 1: Ingesting Kaggle CSV...")
    encoding = detect_encoding(csv_path)
    print(f"    Detected encoding: {encoding}")

    csv_brands = {}  # brand_slug → { display, country, models: [] }
    skipped = 0
    total_csv_rows = 0

    with open(csv_path, "r", encoding=encoding) as f:
        # Auto-detect delimiter
        sample = f.read(2048)
        f.seek(0)
        delimiter = ";" if ";" in sample.split("\n")[0] else ","

        reader = csv.DictReader(f, delimiter=delimiter)

        for row in reader:
            total_csv_rows += 1

            brand_slug = row.get("Brand", "").strip()
            perfume_slug = row.get("Perfume", "").strip()
            country = row.get("Country", "").strip()
            gender = row.get("Gender", "")
            year = row.get("Year", "")
            rating_str = row.get("Rating Value", "")
            rating_count_str = row.get("Rating Count", "")
            url = row.get("url", "")

            if not brand_slug or not perfume_slug:
                skipped += 1
                continue

            # Parse notes & accords
            notes = parse_accords(row)  # use main accords (cleaner than raw notes)
            if not notes:
                notes = parse_notes(
                    row.get("Top", ""),
                    row.get("Middle", ""),
                    row.get("Base", ""),
                )

            # Build brand entry
            if brand_slug not in csv_brands:
                csv_brands[brand_slug] = {
                    "display": slug_to_display(brand_slug),
                    "country": country,
                    "models": [],
                }

            csv_brands[brand_slug]["models"].append({
                "perfume_slug": perfume_slug,
                "gender": gender,
                "year": year,
                "notes": notes,
                "url": url,
                "rating": rating_str,
                "rating_count": rating_count_str,
            })

    print(f"    ✓ Read {total_csv_rows:,} rows, {len(csv_brands):,} unique brands")
    if skipped:
        print(f"    ⚠ Skipped {skipped} rows with missing brand/model")

    # ── Phase 2: Transform CSV brands into catalog schema ────────────
    print("\n  ▸ Phase 2: Transforming to catalog schema...")

    csv_model_count = 0
    csv_brand_count = 0

    for brand_slug, brand_info in csv_brands.items():
        brand_display = brand_info["display"]
        country_raw = brand_info["country"]
        category = classify_brand(brand_slug, country_raw)

        # Resolve region & country code
        country_key = country_raw.lower().strip()
        if country_key in COUNTRY_MAP:
            region, country_code = COUNTRY_MAP[country_key]
        else:
            region = country_raw if country_raw else "Global"
            country_code = "XX"

        # Override region for Arabian brands
        if category == "Arabian / Clone":
            region = "Middle East"

        # Initialize brand in catalog
        if brand_display not in catalog["brands"]:
            catalog["brands"][brand_display] = {
                "category": category,
                "region": region,
                "countryCode": country_code,
                "models": {},
            }
            csv_brand_count += 1

        # Process each model
        for model_info in brand_info["models"]:
            model_name = clean_model_name(model_info["perfume_slug"], brand_slug)

            if not model_name or len(model_name) < 2:
                continue

            model_clean = model_name.lower().strip()
            brand_clean = brand_display.lower().strip()
            # Skip junk models that are just stopwords, prepositions, or brand duplicates
            if model_clean in {"for", "and", "the", "in", "with", "by", "to", "or", "a", "an", "men", "women", "him", "her", "homme", "femme", "pour", "parfum", "fragrance", "cologne", "edp", "edt"}:
                continue
            if model_clean == brand_clean or model_clean in brand_clean.split():
                continue

            # Skip if model already exists (from supplementary entries)
            if model_name in catalog["brands"][brand_display]["models"]:
                continue

            full_name = f"{brand_display} {model_name}"
            aliases = generate_aliases(brand_display, model_name, brand_slug)
            gender = normalize_gender(model_info["gender"])
            notes = model_info["notes"][:5]  # cap at 5 accords
            ambiguous = is_ambiguous_model(model_name)

            # Build a basic description from accords
            if notes:
                accord_str = ", ".join(notes[:3])
                description = f"{full_name}: a {gender.lower()} fragrance with {accord_str} character."
            else:
                description = f"{full_name} by {brand_display}."

            catalog["brands"][brand_display]["models"][model_name] = {
                "full_name": full_name,
                "aliases": aliases,
                "notes": notes,
                "gender": gender,
                "description": description,
                "is_ambiguous": ambiguous,
            }
            csv_model_count += 1

    print(f"    ✓ Transformed {csv_brand_count:,} brands, {csv_model_count:,} models from CSV")

    # ── Phase 3: Inject Local Indonesian Brands (MANDATORY) ──────────
    print("\n  ▸ Phase 3: Injecting Local Indonesian brands...")
    local_injected_brands = 0
    local_injected_models = 0

    for brand_name, brand_data in LOCAL_INDONESIAN_CATALOG.items():
        if brand_name in catalog["brands"]:
            # Merge models into existing brand, overwriting if conflict
            existing = catalog["brands"][brand_name]
            existing["category"] = brand_data["category"]
            existing["region"] = brand_data["region"]
            existing["countryCode"] = brand_data["countryCode"]
            for model_name, model_data in brand_data["models"].items():
                existing["models"][model_name] = model_data
                local_injected_models += 1
        else:
            catalog["brands"][brand_name] = brand_data
            local_injected_brands += 1
            local_injected_models += len(brand_data.get("models", {}))

    print(f"    ✓ Injected {local_injected_brands} new brands, {local_injected_models} models (Indonesian Local)")

    # ── Phase 4: Inject Supplementary Entries ────────────────────────
    print("\n  ▸ Phase 4: Injecting supplementary designer/niche entries...")
    supp_brands = 0
    supp_models = 0

    for brand_name, brand_data in SUPPLEMENTARY_ENTRIES.items():
        if brand_name in catalog["brands"]:
            existing = catalog["brands"][brand_name]
            # Only inject models that don't already exist
            for model_name, model_data in brand_data["models"].items():
                if model_name not in existing["models"]:
                    existing["models"][model_name] = model_data
                    supp_models += 1
        else:
            catalog["brands"][brand_name] = brand_data
            supp_brands += 1
            supp_models += len(brand_data.get("models", {}))

    print(f"    ✓ Injected {supp_brands} new brands, {supp_models} models (supplementary)")

    # ── Phase 5: Build metadata ──────────────────────────────────────
    print("\n  ▸ Phase 5: Building metadata & summary...")

    total_brands = len(catalog["brands"])
    total_models = sum(len(b["models"]) for b in catalog["brands"].values())
    ambiguous_count = sum(
        1 for b in catalog["brands"].values()
        for m in b["models"].values()
        if m.get("is_ambiguous")
    )

    # Category distribution
    cat_dist = Counter()
    for b in catalog["brands"].values():
        cat_dist[b.get("category", "Unknown")] += 1

    # Region distribution
    region_dist = Counter()
    for b in catalog["brands"].values():
        region_dist[b.get("region", "Global")] += 1

    catalog["metadata"] = {
        "version": "2.0.0",
        "generator": "build_perfume_catalog.py",
        "source_csv": os.path.basename(csv_path),
        "total_brands": total_brands,
        "total_models": total_models,
        "total_ambiguous": ambiguous_count,
        "categories": dict(cat_dist.most_common()),
        "regions": dict(region_dist.most_common(20)),
    }

    # ── Phase 6: Write output ────────────────────────────────────────
    print(f"\n  ▸ Phase 6: Writing {output_path}...")

    # Reorder: move metadata to top, then sort brands
    output = OrderedDict()
    output["metadata"] = catalog["metadata"]
    output["brands"] = OrderedDict(
        sorted(catalog["brands"].items(), key=lambda x: x[0].lower())
    )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    file_size = os.path.getsize(output_path)
    print(f"    ✓ Written {file_size:,} bytes")

    # ── Summary Report ───────────────────────────────────────────────
    print(f"\n{'═' * 64}")
    print(f"  ✅ CATALOG BUILD COMPLETE")
    print(f"{'─' * 64}")
    print(f"  📊 Total brands:     {total_brands:,}")
    print(f"  📊 Total models:     {total_models:,}")
    print(f"  ⚠️  Ambiguous models: {ambiguous_count:,}")
    print(f"  📁 Output file:      {output_path}")
    print(f"  💾 File size:         {file_size:,} bytes")
    print(f"{'─' * 64}")
    print(f"  Category distribution:")
    for cat, count in cat_dist.most_common():
        print(f"    {cat:25s} {count:,} brands")
    print(f"{'─' * 64}")
    print(f"  Top 10 regions:")
    for reg, count in region_dist.most_common(10):
        print(f"    {reg:25s} {count:,} brands")
    print(f"{'═' * 64}\n")

    return catalog


# ═══════════════════════════════════════════════════════════════════════
# 9. CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════

def main():
    explicit_csv = None
    output = OUTPUT_FILE

    # Parse simple CLI args
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--output" and i + 1 < len(args):
            output = args[i + 1]
            i += 2
        elif args[i] == "--help" or args[i] == "-h":
            print(__doc__)
            sys.exit(0)
        elif not args[i].startswith("-"):
            explicit_csv = args[i]
            i += 1
        else:
            i += 1

    # Resolve output path relative to project root
    if not os.path.isabs(output):
        output = os.path.join(PROJECT_ROOT, output)

    # Find CSV
    csv_path = find_csv_file(explicit_csv)
    if not csv_path:
        print("❌ ERROR: No Fragrantica CSV file found in the project root.")
        print("   Place a CSV file matching one of these patterns:")
        for p in CSV_PATTERNS:
            print(f"     - {p}")
        print(f"   in: {PROJECT_ROOT}")
        sys.exit(1)

    # Run pipeline
    build_catalog(csv_path, output)


if __name__ == "__main__":
    main()
