#!/usr/bin/env python3
"""
sync_sociolla_to_catalog.py — Sociolla Crawler & Master Catalog Reconciler

Crawls all paginated listing pages of the Sociolla fragrance category
(https://www.sociolla.com/145-fragrance?page={n}), extracts perfume brands
and models, cleans product titles into concise perfume model names, and
reconciles/merges them into the master perfume_catalog.json.

Usage:
    python sync_sociolla_to_catalog.py
    python sync_sociolla_to_catalog.py --catalog custom_catalog.json
    python sync_sociolla_to_catalog.py --max-pages 35
    python sync_sociolla_to_catalog.py --dry-run
"""

import argparse
import json
import os
import random
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import requests
from bs4 import BeautifulSoup

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ═══════════════════════════════════════════════════════════════════════
# 1. CONFIGURATION & TAXONOMIES
# ═══════════════════════════════════════════════════════════════════════

DEFAULT_CATALOG_PATH = "perfume_catalog.json"
PRIMARY_URL_TEMPLATE = "https://www.sociolla.com/145-fragrance?page={page}"
FALLBACK_API_TEMPLATE = "https://catalog-api.sociolla.com/search?categories=145&limit=16&page={page}"

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/json,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.sociolla.com/145-fragrance",
    "Origin": "https://www.sociolla.com",
}

# Known Indonesian fragrance houses sold on Sociolla / local market
KNOWN_INDONESIAN_BRANDS: Dict[str, str] = {
    "hmns": "HMNS",
    "mykonos": "Mykonos",
    "saff & co": "SAFF & Co.",
    "saff & co.": "SAFF & Co.",
    "carl & claire": "Carl & Claire",
    "oullu": "Oullu",
    "lilith & eve": "Lilith & Eve",
    "lilith and eve": "Lilith & Eve",
    "kitschy": "Kitschy",
    "alchemist": "Alchemist Fragrance",
    "alchemist fragrance": "Alchemist Fragrance",
    "kahf": "Kahf",
    "alien objects": "Alien Objects",
    "buttonscarves": "Buttonscarves Beauty",
    "buttonscarves beauty": "Buttonscarves Beauty",
    "troupe": "Troupe Industry",
    "troupe industry": "Troupe Industry",
    "sensatia": "Sensatia Botanicals",
    "sensatia botanicals": "Sensatia Botanicals",
    "teratu": "Teratu Beauty",
    "teratu beauty": "Teratu Beauty",
    "labcitane": "Labcitane",
    "onix": "Onix",
    "onix fragrance": "Onix",
    "crusita": "Crusita",
    "project 1945": "Project 1945",
    "mine": "MINE. Perfumery",
    "mine.": "MINE. Perfumery",
    "mine. perfumery": "MINE. Perfumery",
    "mother of pearl": "Mother of Pearl",
    "mop beauty": "Mother of Pearl",
    "heura": "Heura",
    "farhampton": "HMNS",
    "morris": "Morris",
    "bizarre": "Bizarre",
    "regazza": "Regazza",
    "vitalis": "Vitalis",
    "pucelle": "Pucelle",
    "evangeline": "Evangeline",
    "romano": "Romano",
    "casablanca": "Casablanca",
    "bellagio": "Bellagio",
    "scarlett": "Scarlett Whitening",
    "scarlett whitening": "Scarlett Whitening",
    "layr": "Layr",
    "layr fragrance": "Layr",
    "fordive": "Fordive",
    "hint": "HINT",
    "hint of": "HINT",
    "bonavie": "Bonavie",
    "chumbak": "Chumbak",
    "read between the lines": "Read Between The Lines",
    "dear me beauty": "Dear Me Beauty",
    "somethinc": "Somethinc",
    "wardah": "Wardah",
    "make over": "Make Over",
    "emina": "Emina",
    "elvicto": "Elvicto",
    "gatsby": "Gatsby",
    "posh": "Posh",
    "braven": "Braven",
    "octarine": "Octarine",
    "dupe": "Dupe",
    "bodibreze": "BODIBREZE",
}

# Known Middle Eastern houses
KNOWN_ARABIAN_HOUSES: Dict[str, str] = {
    "lattafa": "Lattafa Perfumes",
    "lattafa perfumes": "Lattafa Perfumes",
    "armaf": "Armaf",
    "afnan": "Afnan",
    "al haramain": "Al Haramain",
    "al haramain perfumes": "Al Haramain",
    "ajmal": "Ajmal",
    "rasasi": "Rasasi",
    "swiss arabian": "Swiss Arabian",
    "paris corner": "Paris Corner",
    "fragrance world": "Fragrance World",
    "ard al zaafaran": "Ard Al Zaafaran",
}

# Common generic single-word names that need ambiguity flag
AMBIGUOUS_KEYWORDS: Set[str] = {
    "orgasm", "alpha", "daisy", "rose", "gold", "black", "white", "red", "blue",
    "one", "love", "sun", "moon", "oud", "vanilla", "amber", "musk", "bloom",
    "paradise", "legend", "icon", "noir", "intense", "extreme", "fresh", "water",
    "club", "night", "wild", "velvet", "pure", "rush", "secret", "homme", "femme",
    "sweet", "dark", "queen", "king", "crystal", "candy", "ambergris", "cherry",
}

# ═══════════════════════════════════════════════════════════════════════
# 2. TITLE CLEANING & NORMALIZATION ENGINE
# ═══════════════════════════════════════════════════════════════════════

def clean_brand_name(raw_brand: str) -> str:
    """Normalizes raw brand name, applying canonical casing and known aliases."""
    b = (raw_brand or "").strip()
    b_lower = b.lower()

    if b_lower in KNOWN_INDONESIAN_BRANDS:
        return KNOWN_INDONESIAN_BRANDS[b_lower]
    if b_lower in KNOWN_ARABIAN_HOUSES:
        return KNOWN_ARABIAN_HOUSES[b_lower]

    # Standard title capitalization
    words = b.split()
    capitalized = []
    for w in words:
        if w.isupper() and len(w) <= 4:
            capitalized.append(w)
        else:
            capitalized.append(w.capitalize())
    return " ".join(capitalized)


def clean_model_name(brand: str, raw_title: str) -> str:
    """
    Cleans and normalizes product title into a concise perfume model name.
    Strips brand prefixes, bottle sizes, concentrations, and marketing buzzwords.
    """
    title = raw_title.strip()

    # 1. Remove bracketed / parenthesized volume or concentration at end
    title = re.sub(r'\s*[\(\[\{][^\)\]\}]*(?:ml|oz|g|edp|edt|size|edition)[^\)\]\}]*[\)\]\}]', '', title, flags=re.IGNORECASE)

    # 2. If title contains ' - ' or ' — ', inspect parts
    if ' - ' in title or ' — ' in title:
        parts = re.split(r'\s*[-—]\s*', title)
        conc_pattern = r'(?i)\b(?:extrait|eau de|edp|edt|edc|parfum|cologne|mist|body mist|hair mist|cloud mist)\b'
        non_conc_parts = [
            p.strip() for p in parts
            if not re.search(conc_pattern, p) and not re.match(r'(?i)^\d+\s*(?:ml|l|oz)', p.strip())
        ]
        if non_conc_parts:
            # If first part is just the brand name, drop it
            if brand and non_conc_parts[0].lower() == brand.lower():
                title = " - ".join(non_conc_parts[1:]) if len(non_conc_parts) > 1 else non_conc_parts[0]
            else:
                title = " ".join(non_conc_parts)

    # 3. Strip brand name prefix and brand stems if they appear at start
    if brand:
        stems = [brand]
        b_without_suffix = re.sub(r'(?i)\s+(?:parfums?|fragrances?|perfumery|beauty|whitening|official|id)\b', '', brand).strip()
        if b_without_suffix and b_without_suffix.lower() != brand.lower():
            stems.append(b_without_suffix)
        stems.append(re.sub(r'\s+', '', brand))
        if b_without_suffix:
            stems.append(re.sub(r'\s+', '', b_without_suffix))

        for s in stems:
            if s:
                title = re.sub(rf'^(?:{re.escape(s)})\s*(?:x\s*)?[-:\s]*', '', title, flags=re.IGNORECASE)

    # Also strip common Indonesian collaboration prefixes e.g. "HMNS x Tsana", "Scarlett x Alive"
    title = re.sub(r'(?i)^x\s+[A-Za-z0-9\s]+\s*[-:]*\s*', '', title)
    title = re.sub(r'(?i)^collab\s+[A-Za-z0-9\s]+\s*[-:]*\s*', '', title)

    # 4. Strip bottle sizes & volumes
    title = re.sub(r'(?i)\b\d+(?:\.\d+)?\s*(?:ml|l|oz|fl\.?\s*oz)\b', '', title)
    title = re.sub(r'(?i)\b(?:size\s*)?\d+\s*ml\b', '', title)

    # 5. Strip concentrations & perfume keywords
    title = re.sub(
        r'(?i)\b(?:extrait de parfum|eau de parfum|eau de toilette|eau de cologne|'
        r'extrait|de parfum|de toilette|de cologne|edp|edt|edc|parfum|cologne|'
        r'fragrance mist|body mist|hair mist|cloud mist|shimmer mist|perfume mist|scent mist|'
        r'perfume|fragrance|wewangian|minyak wangi)\b',
        '',
        title
    )

    # 6. Strip gender mentions
    title = re.sub(r'(?i)\b(?:for\s+)?(?:unisex|men|women|pria|wanita|him|her)\b', '', title)

    # 7. Strip packaging and marketing buzzwords
    title = re.sub(
        r'(?i)\b(?:travel size|full size|mini size|discovery set|starter pack|gift set|'
        r'bundle set|bundle|refill pack|refill|decant|sample pack|sample|vial|'
        r'bpom|tester|signature|special edition|limited edition|exclusive edition|'
        r'new formula|original)\b',
        '',
        title
    )

    # 8. Normalize version numbers (e.g. "2 0" -> "2.0")
    title = re.sub(r'\b(\d)\s+(\d)\b', r'\1.\2', title)

    # 9. Strip remaining stray symbols and parenthesized remnants
    title = re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]', '', title)
    title = re.sub(r'^[\s\-–—/|:,._+]+|[\s\-–—/|:,._+]+$', '', title)
    title = re.sub(r'\s*[-–—/|:,._+]+\s*', ' ', title)
    title = re.sub(r'\s+', ' ', title).strip()

    # 10. Capitalization normalization
    words = title.split()
    cleaned_words = []
    for w in words:
        if re.match(r'^[A-Z0-9\.]+$', w) and len(w) <= 6:  # e.g., EOS, S.O.T.B, S.O.F.R
            cleaned_words.append(w)
        elif w.lower() in {"and", "of", "the", "in", "de", "la", "le", "du", "des", "for", "with"}:
            cleaned_words.append(w.lower())
        else:
            cleaned_words.append(w.capitalize())

    result = " ".join(cleaned_words).strip()
    if result:
        result = result[0].upper() + result[1:]
    return result


def is_fragrance_product(name: str, brand: str, categories: List[Dict[str, Any]], default_cat: str) -> bool:
    """Accurately checks if a product belongs to the fragrance / perfume taxonomy."""
    name_lower = name.lower()
    def_cat_lower = (default_cat or "").lower()

    slugs = [str(c.get('slug', '')).lower() for c in categories if isinstance(c, dict)]
    cat_names = [str(c.get('name', '')).lower() for c in categories if isinstance(c, dict)]
    all_cats = " ".join(slugs + cat_names)

    # Absolute non-fragrance categories & products
    strict_disqualifiers = [
        'hair mask', 'sheet mask', 'clay mask', 'peeling gel', 'shampoo', 'conditioner',
        'cushion', 'eyeliner', 'mascara', 'lip tint', 'lip cream', 'lip gloss',
        'lipstick', 'lip balm', 'blush', 'foundation', 'eyeshadow', 'cleanser', 'face wash'
    ]
    if any(term in name_lower for term in strict_disqualifiers):
        return False

    # Definite non-perfume cosmetics
    non_perfume_terms = [
        'pressed powder', 'loose powder', 'face powder', 'lip liner',
        'sunscreen', 'micellar', 'face serum', 'moisturizer', 'hair brush',
        'toner', 'body wash', 'shower gel', 'acne patch', 'sponge', 'body lotion',
        'hand cream', 'body butter', 'bath salt', 'scrub', 'body scrub', 'lotion',
        'concealer', 'eyebrow', 'clay stick', 'deodorant roll on', 'deodorant stick'
    ]

    is_body_care = any(w in name_lower or w in def_cat_lower for w in ['lotion', 'body wash', 'shower gel', 'butter', 'hand cream'])
    if is_body_care and not any(w in name_lower for w in ['mist', 'extrait', 'edp', 'edt']):
        return False

    has_strong_fragrance_cue = any(
        cue in name_lower for cue in [
            'extrait de parfum', 'eau de parfum', 'eau de toilette', 'eau de cologne',
            'edp', 'edt', 'extrait', 'perfume', 'parfum', 'fragrance mist', 'body mist', 'hair mist', 'cloud mist'
        ]
    )

    has_non_perfume = any(term in name_lower or term in def_cat_lower for term in non_perfume_terms)
    if has_non_perfume and not has_strong_fragrance_cue:
        return False

    # Check for fragrance categorization in category tree
    if 'fragrance' in all_cats or '145' in all_cats or 'parfum' in def_cat_lower or 'fragrance' in def_cat_lower:
        return True

    if has_strong_fragrance_cue:
        return True

    # Check if brand is an exclusively fragrance house
    if brand.lower() in {"hmns", "mykonos", "saff & co.", "saff & co", "carl & claire", "alchemist fragrance", "oullu", "layr", "project 1945", "velixir parfums"}:
        return not has_non_perfume

    return False


def generate_aliases(brand: str, model: str) -> List[str]:
    """Generates standard lowercased, slugified, and concatenated search aliases."""
    b_clean = brand.lower().strip()
    m_clean = model.lower().strip()

    aliases: List[str] = [
        f"{b_clean} {m_clean}",
        f"{m_clean} {b_clean}",
        m_clean,
        f"{b_clean.replace(' ', '-')}-{m_clean.replace(' ', '-')}",
    ]

    # Hyphenated single alias
    slug_brand = re.sub(r'[^a-z0-9]+', '-', b_clean).strip('-')
    slug_model = re.sub(r'[^a-z0-9]+', '-', m_clean).strip('-')
    if slug_brand and slug_model:
        aliases.append(f"{slug_brand}-{slug_model}")

    # Deduplicate while preserving order
    seen: Set[str] = set()
    result: List[str] = []
    for a in aliases:
        if a and a not in seen:
            seen.add(a)
            result.append(a)
    return result


def detect_gender(title: str, description: str) -> str:
    """Infers target gender from title and description keywords."""
    text = f"{title} {description}".lower()
    has_men = bool(re.search(r'\b(?:men|pria|him|pour homme|man)\b', text))
    has_women = bool(re.search(r'\b(?:women|wanita|her|pour femme|woman)\b', text))

    if has_men and not has_women:
        return "Men"
    if has_women and not has_men:
        return "Women"
    return "Unisex"


# ═══════════════════════════════════════════════════════════════════════
# 3. NETWORK CRAWLER (DUAL-ENGINE RESILIENCE)
# ═══════════════════════════════════════════════════════════════════════

class SociollaCrawler:
    """
    Crawls Sociolla Fragrance category pages using a polite, resilient dual-engine:
    Primary: HTML Parsing via BeautifulSoup targeting product card DOM elements.
    Fallback: Catalog Search API (catalog-api.sociolla.com).
    """

    def __init__(self, max_pages: int = 40):
        self.max_pages = max_pages
        self.session = requests.Session()
        self.session.headers.update(REQUEST_HEADERS)

    def fetch_with_retry(self, url: str, is_json: bool = False) -> Optional[Any]:
        """Fetches a URL with up to 3 exponential backoff retries on error."""
        retries = 3
        backoff = 1.0

        for attempt in range(1, retries + 1):
            try:
                resp = self.session.get(url, timeout=18)
                if resp.status_code == 200:
                    return resp.json() if is_json else resp.text
                elif resp.status_code in {429, 500, 502, 503, 504}:
                    print(f"   ⚠️ HTTP {resp.status_code} on {url}. Retrying in {backoff:.1f}s (attempt {attempt}/{retries})...", flush=True)
                    time.sleep(backoff)
                    backoff *= 2.0
                elif resp.status_code == 404:
                    return None
                else:
                    print(f"   ⚠️ HTTP {resp.status_code} on {url}. Skipping page.", flush=True)
                    return None
            except requests.exceptions.RequestException as e:
                print(f"   ⚠️ Network exception ({e.__class__.__name__}): {e}. Retrying in {backoff:.1f}s...", flush=True)
                time.sleep(backoff)
                backoff *= 2.0

        return None

    def parse_html_page(self, html: str) -> List[Dict[str, Any]]:
        """Parses HTML for product cards using BeautifulSoup and JSON-LD schema."""
        soup = BeautifulSoup(html, "html.parser")
        products: List[Dict[str, Any]] = []

        # 1. Target product card containers
        cards = soup.select("a#product-default, div[class*='product-item'], div[class*='product-card'], div[class*='ProductCard']")
        for card in cards:
            paragraphs = [p.get_text(strip=True) for p in card.find_all("p") if p.get_text(strip=True)]
            brand_name = ""
            product_title = ""

            if len(paragraphs) >= 2:
                brand_name = paragraphs[0]
                product_title = paragraphs[1]
            else:
                brand_el = card.select_one("[class*='brand'], [class*='Brand']")
                title_el = card.select_one("[class*='name'], [class*='Name'], [class*='title'], [class*='Title']")
                if brand_el:
                    brand_name = brand_el.get_text(strip=True)
                if title_el:
                    product_title = title_el.get_text(strip=True)

            if brand_name and product_title:
                products.append({
                    "brand": brand_name,
                    "title": product_title,
                    "description": "",
                    "categories": [{"name": "Fragrance", "slug": "145-fragrance"}],
                    "default_category": "Fragrance",
                    "source": "html_dom"
                })

        # 2. Also check for embedded JSON-LD schema
        scripts = soup.find_all("script", type="application/ld+json")
        for s in scripts:
            try:
                data = json.loads(s.string or "{}")
                items = data.get("itemListElement") or []
                for it in items:
                    item = it.get("item") or {}
                    b = item.get("brand", {}).get("name") if isinstance(item.get("brand"), dict) else item.get("brand")
                    n = item.get("name")
                    if b and n:
                        products.append({
                            "brand": str(b),
                            "title": str(n),
                            "description": item.get("description", ""),
                            "categories": [{"name": "Fragrance", "slug": "145-fragrance"}],
                            "default_category": "Fragrance",
                            "source": "json_ld"
                        })
            except Exception:
                pass

        return products

    def fetch_api_page_raw(self, page: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Queries Sociolla's catalog API endpoint.
        Returns: (raw_items_from_api, filtered_fragrance_items)
        """
        api_url = FALLBACK_API_TEMPLATE.format(page=page)
        data = self.fetch_with_retry(api_url, is_json=True)
        if not data or not isinstance(data, dict):
            return [], []

        raw_items = data.get("data") or []
        fragrance_items: List[Dict[str, Any]] = []

        for it in raw_items:
            b_obj = it.get("brand") or {}
            brand_name = b_obj.get("name") if isinstance(b_obj, dict) else str(b_obj or "")
            product_name = it.get("name") or ""
            categories = it.get("categories") or []
            default_cat = (it.get("default_category") or {}).get("name", "")

            if is_fragrance_product(product_name, brand_name, categories, default_cat):
                fragrance_items.append({
                    "brand": brand_name,
                    "title": product_name,
                    "description": it.get("description") or "",
                    "country": b_obj.get("country") if isinstance(b_obj, dict) else "",
                    "categories": categories,
                    "default_category": default_cat,
                    "source": "api"
                })

        return raw_items, fragrance_items

    def crawl_all(self) -> List[Dict[str, Any]]:
        """Executes full paginated crawl with polite rate-limiting and dual engine."""
        print("\n" + "═" * 68, flush=True)
        print("🌐 SOCIOLLA FRAGRANCE DIRECTORY CRAWLER", flush=True)
        print("═" * 68, flush=True)
        print(f"🎯 Target Category:  145-fragrance", flush=True)
        print(f"📄 Max Page Limit:    {self.max_pages}", flush=True)
        print(f"⏳ Rate Limit Delay: 0.8s — 1.5s per request\n", flush=True)

        all_fragrances: List[Dict[str, Any]] = []
        seen_keys: Set[Tuple[str, str]] = set()
        consecutive_empty_raw_pages = 0

        for page in range(1, self.max_pages + 1):
            html_url = PRIMARY_URL_TEMPLATE.format(page=page)
            print(f"🔍 [Page {page:02d}/{self.max_pages}] Requesting {html_url}...", flush=True)

            page_products: List[Dict[str, Any]] = []

            # 1. Primary: HTML scrape via BeautifulSoup
            html = self.fetch_with_retry(html_url, is_json=False)
            if html:
                page_products = self.parse_html_page(html)

            # 2. Fallback: If HTML yields 0 items (SPA client rendering), query catalog API
            if not page_products:
                raw_api_items, page_products = self.fetch_api_page_raw(page)
                if not raw_api_items:
                    consecutive_empty_raw_pages += 1
                    print(f"   ℹ️ API returned 0 raw items ({consecutive_empty_raw_pages}/2 empty).", flush=True)
                    if consecutive_empty_raw_pages >= 2:
                        print(f"\n🛑 Pagination termination: 2 consecutive empty pages from Sociolla. Crawl complete.\n", flush=True)
                        break
                else:
                    consecutive_empty_raw_pages = 0
            else:
                consecutive_empty_raw_pages = 0

            new_in_page = 0
            for p in page_products:
                key = (p["brand"].lower().strip(), p["title"].lower().strip())
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_fragrances.append(p)
                    new_in_page += 1

            print(f"   ✓ Extracted {len(page_products)} fragrances on page {page} ({new_in_page} new, total: {len(all_fragrances)}).", flush=True)

            # Polite dynamic delay
            delay = random.uniform(0.8, 1.5)
            time.sleep(delay)

        print(f"\n✨ Crawling complete: {len(all_fragrances)} unique fragrance products collected.", flush=True)
        return all_fragrances


# ═══════════════════════════════════════════════════════════════════════
# 4. MASTER CATALOG RECONCILIATION & DIFF
# ═══════════════════════════════════════════════════════════════════════

def infer_brand_metadata(brand_name: str, brand_country: str = "") -> Tuple[str, str, str]:
    """Infers category, region, and countryCode for a new brand."""
    b_lower = brand_name.lower().strip()
    c_lower = (brand_country or "").lower().strip()

    # 1. Known Indonesian Brands or country is Indonesia
    if b_lower in KNOWN_INDONESIAN_BRANDS or c_lower in {"indonesia", "id"}:
        return "Local Brand", "Indonesia", "ID"

    # 2. Known Middle Eastern / Arabian houses
    if b_lower in KNOWN_ARABIAN_HOUSES or c_lower in {"uae", "united arab emirates", "saudi arabia", "oman", "middle east"}:
        return "Arabian / Clone", "Middle East", "AE"

    # 3. Country code map check
    country_map = {
        "france": ("France", "FR"),
        "italy": ("Italy", "IT"),
        "united states": ("United States", "US"),
        "usa": ("United States", "US"),
        "united kingdom": ("United Kingdom", "GB"),
        "uk": ("United Kingdom", "GB"),
        "spain": ("Spain", "ES"),
        "germany": ("Germany", "DE"),
        "japan": ("Japan", "JP"),
        "korea": ("South Korea", "KR"),
        "south korea": ("South Korea", "KR"),
        "australia": ("Australia", "AU"),
    }

    if c_lower in country_map:
        region, code = country_map[c_lower]
        return "Designer", region, code

    # Default for unidentified brands on Sociolla:
    # Since Sociolla is an Indonesian e-commerce platform, brands without international presence
    # are almost exclusively Indonesian local artisanal/indie brands.
    return "Local Brand", "Indonesia", "ID"


def reconcile_and_merge_catalog(
    raw_products: List[Dict[str, Any]],
    catalog_path: str = DEFAULT_CATALOG_PATH,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Reconciles scraped Sociolla products against perfume_catalog.json:
    - Normalizes titles & brands.
    - Avoids duplicate brands/models.
    - Updates metadata and counts.
    - Prints detailed terminal diff summary.
    """
    if not os.path.exists(catalog_path):
        raise FileNotFoundError(f"Master catalog file '{catalog_path}' not found.")

    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    brands_dict = catalog.setdefault("brands", {})
    existing_brand_keys = {k.lower(): k for k in brands_dict.keys()}

    added_models_by_brand: Dict[str, List[str]] = {}
    skipped_existing = 0
    new_brands_count = 0
    new_models_count = 0

    print("\n" + "═" * 68, flush=True)
    print("🔄 MASTER CATALOG RECONCILIATION & MERGE", flush=True)
    print("═" * 68, flush=True)

    for item in raw_products:
        raw_brand = item.get("brand", "").strip()
        raw_title = item.get("title", "").strip()
        country = item.get("country", "")

        if not raw_brand or not raw_title:
            continue

        clean_b = clean_brand_name(raw_brand)
        b_key = clean_b.lower()

        # Check if brand exists in master catalog
        if b_key in existing_brand_keys:
            canonical_brand = existing_brand_keys[b_key]
        else:
            canonical_brand = clean_b
            cat, reg, code = infer_brand_metadata(clean_b, country)
            if not dry_run:
                brands_dict[canonical_brand] = {
                    "category": cat,
                    "region": reg,
                    "countryCode": code,
                    "models": {}
                }
            existing_brand_keys[b_key] = canonical_brand
            new_brands_count += 1

        brand_entry = brands_dict.get(canonical_brand, {"models": {}})
        models_dict = brand_entry.setdefault("models", {})
        existing_model_keys = {m.lower(): m for m in models_dict.keys()}

        # Clean model name
        model_name = clean_model_name(canonical_brand, raw_title)
        if not model_name or len(model_name) < 2:
            continue

        m_key = model_name.lower()

        # Check for model duplicate (exact name or in aliases)
        is_duplicate = False
        if m_key in existing_model_keys:
            is_duplicate = True
        else:
            for ex_model, ex_data in models_dict.items():
                aliases = [a.lower() for a in ex_data.get("aliases", [])]
                if m_key in aliases or model_name.lower() == ex_model.lower():
                    is_duplicate = True
                    break

        if is_duplicate:
            skipped_existing += 1
            continue

        # Create new model entry adhering strictly to perfume_catalog schema
        is_ambiguous = (model_name.lower() in AMBIGUOUS_KEYWORDS) or (len(model_name.split()) == 1 and len(model_name) <= 4)
        gender = detect_gender(raw_title, item.get("description", ""))
        desc = (
            item.get("description", "").strip()
            or f"{canonical_brand} {model_name}: formulation catalogued from Indonesian fragrance directory."
        )

        model_entry = {
            "full_name": f"{canonical_brand} {model_name}",
            "aliases": generate_aliases(canonical_brand, model_name),
            "notes": [],
            "gender": gender,
            "description": desc,
            "is_ambiguous": is_ambiguous
        }

        if not dry_run:
            models_dict[model_name] = model_entry

        added_models_by_brand.setdefault(canonical_brand, []).append(model_name)
        new_models_count += 1

    # Update metadata
    if not dry_run:
        meta = catalog.setdefault("metadata", {})
        meta["total_brands"] = len(brands_dict)
        meta["total_models"] = sum(len(b.get("models", {})) for b in brands_dict.values())
        meta["total_ambiguous"] = sum(
            1 for b in brands_dict.values() for m in b.get("models", {}).values() if m.get("is_ambiguous")
        )
        meta["categories"] = dict(Counter(b.get("category", "Designer") for b in brands_dict.values()))
        meta["regions"] = dict(Counter(b.get("region", "Global") for b in brands_dict.values()).most_common(20))
        meta["sociolla_sync"] = {
            "last_synced": datetime.now(timezone.utc).isoformat(),
            "new_brands_added": new_brands_count,
            "new_models_added": new_models_count,
            "raw_products_evaluated": len(raw_products),
        }

        # Write safely to disk
        temp_path = catalog_path + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        os.replace(temp_path, catalog_path)

    # Output detailed diff summary
    print(f"\n📊 RECONCILIATION AUDIT SUMMARY:", flush=True)
    print(f"   • Raw Fragrance Items Scanned: {len(raw_products):,}", flush=True)
    print(f"   • Existing Models Matched:     {skipped_existing:,} (skipped duplicates)", flush=True)
    print(f"   • New Brands Added:            {new_brands_count:,}", flush=True)
    print(f"   • New Fragrance Models Added:  {new_models_count:,}", flush=True)

    if added_models_by_brand:
        print("\n📋 ADDED MODELS BREAKDOWN BY BRAND:", flush=True)
        print("─" * 68, flush=True)
        for brand, models in sorted(added_models_by_brand.items()):
            print(f"  🏷️  {brand} ({len(models)} new models):", flush=True)
            for m in models:
                print(f"      • {m}", flush=True)
        print("─" * 68, flush=True)

    print(f"\n📦 FINAL CATALOG TOTALS ({catalog_path}):", flush=True)
    print(f"   • Total Brands:    {len(brands_dict):,}", flush=True)
    print(f"   • Total Models:    {sum(len(b.get('models', {})) for b in brands_dict.values()):,}", flush=True)
    print(f"   • Status:          {'DRY RUN (No files modified)' if dry_run else 'SUCCESSFULLY WRITTEN TO DISK'}", flush=True)
    print("═" * 68 + "\n", flush=True)

    return {
        "new_brands": new_brands_count,
        "new_models": new_models_count,
        "skipped_existing": skipped_existing,
        "added_models_by_brand": added_models_by_brand,
    }


# ═══════════════════════════════════════════════════════════════════════
# 5. CLI ENTRYPOINT
# ═══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Sociolla Fragrance Crawler & Master Catalog Reconciler"
    )
    parser.add_argument(
        "--catalog",
        default=DEFAULT_CATALOG_PATH,
        help=f"Path to master perfume_catalog.json (default: {DEFAULT_CATALOG_PATH})",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=40,
        help="Maximum paginated pages to crawl (default: 40)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview reconciliation diff without modifying perfume_catalog.json",
    )

    args = parser.parse_args()

    # Step 1: Run Crawler
    crawler = SociollaCrawler(max_pages=args.max_pages)
    raw_products = crawler.crawl_all()

    # Step 2: Reconcile and Merge
    reconcile_and_merge_catalog(
        raw_products=raw_products,
        catalog_path=args.catalog,
        dry_run=args.dry_run
    )


if __name__ == "__main__":
    main()
