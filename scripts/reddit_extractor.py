#!/usr/bin/env python3
"""
Reddit .zst Perfume Data Extractor
===================================
Streams Reddit comment dumps (.zst), extracts perfume mentions using
contextual entity matching with proximity validation, and outputs
structured JSON for the Nuxt leaderboard frontend.

Usage:
    python reddit_extractor.py <archive.zst> <perfume_catalog.json>

Outputs:
    reddit_perfume_rankings.json   — aggregated mention counts per (year, brand, model)
    match_evaluation_log.json      — sampled matches for human verification
"""

import zstandard
import json
import io
import re
import random
import sys
import os
from collections import defaultdict
from datetime import datetime, timezone

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# ─── Constants ───────────────────────────────────────────────────────

TARGET_ACCORDS = frozenset([
    'floral', 'woody', 'citrus', 'musk', 'vanilla', 'spicy', 'aquatic',
    'gourmand', 'amber', 'powdery', 'fruity', 'green', 'leather', 'tobacco',
    'animalic', 'aldehydic', 'earthy', 'smoky', 'fougere', 'chypre',
    'mossy', 'soapy', 'fresh', 'resinous', 'balsamic',
])

CONTEXT_WORDS = frozenset([
    'smell', 'spray', 'bottle', 'wear', 'wearing', 'edp', 'edt',
    'fragrance', 'perfume', 'cologne', 'scent', 'sniff', 'sample', 'decant',
])

# All words that validate a proximity check (context words + accords)
PROXIMITY_VALIDATORS = CONTEXT_WORDS | TARGET_ACCORDS

MIN_YEAR = 2015
ACCORD_RADIUS = 30       # Words radius for accord attribution
PROXIMITY_RADIUS = 20    # Words radius for ambiguous model validation
SAMPLE_RATE = 100         # Sample 1 in N matches for evaluation log
MAX_SAMPLES = 5000        # Cap evaluation samples to prevent memory bloat
PROGRESS_INTERVAL = 10_000  # Log progress every N lines (real-time visibility)

STOPWORDS = frozenset([
    'the', 'and', 'for', 'with', 'eau', 'de', 'du', 'des', 'la', 'le', 'les',
    'pour', 'femme', 'homme', 'parfum', 'toilette', 'cologne', 'edp', 'edt'
])

GRAMMAR_PHRASES = frozenset([
    'i am', 'to be', 'made in', 'out of', 'as well', 'so much', 'on skin', 'all day'
])

GENERIC_WORDS = frozenset([
    'for', 'men', 'man', 'woman', 'women', 'him', 'her', 'and', 'the', 'with', 'about',
    'just', 'made', 'now', 'to', 'be', 'else', 'skin', 'notes', 'enjoy', 'life', 'one',
    'two', 'touch', 'sign', 'free', 'spirit', 'hero', 'cold', 'west', 'today', 'all',
    'you', 'me', 'my', 'love', 'day', 'night', 'summer', 'winter', 'spring', 'fall',
    'pure', 'clean', 'fresh', 'intense', 'extreme', 'sport', 'ice', 'dark', 'white',
    'black', 'red', 'blue', 'gold', 'silver', 'pink', 'green', 'yellow', 'delicate',
    'water', 'fire', 'tea', 'coffee', 'rose', 'vanilla', 'oud', 'musk', 'amber',
    'september', 'flower', 'leather', 'tobacco', 'sugar', 'milk', 'iris', 'air', 'light',
    'sea', 'sun', 'rain', 'wood', 'woods', 'orange', 'lemon', 'lime', 'apple', 'pepper',
    'sweet', 'fruity', 'paradise', 'delicate', 'matcha', 'bloom', 'chance', 'order',
    'fragrance', 'perfume', 'cologne', 'scent', 'eau', 'parfum', 'toilette', 'extrait',
    'edp', 'edt', 'edc', 'body', 'mist'
]) | TARGET_ACCORDS

ICONIC_STANDALONE_MODELS = frozenset([
    'cloud', 'baccarat rouge 540', 'br 540', 'br540', 'aventus', 'sauvage', 'eros',
    'khamrah', 'yara', 'layton', 'delina', 'angels share', "angels' share", 'jazz club',
    'by the fireplace', 'santal 33', 'lost cherry', 'black phantom', 'spicebomb',
    'farhampton', 'orgasm', 'solaris', 'bleu de chanel', 'club de nuit intense',
    'la vie est belle', 'black opium', 'coco mademoiselle', 'tobacco vanille',
    'grand soir', 'another 13', 'the noir 29', 'the matcha 26', 'hacivat', 'ani',
    'cedrat boise', 'oud wood', 'silver mountain water', 'green irish tweed'
])


class CatalogEntries(list):
    """List subclass that retains candidate_index for O(1) candidate lookup."""
    def __init__(self, *args, candidate_index=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.candidate_index = candidate_index or {}


# ─── Catalog Loading ─────────────────────────────────────────────────

def load_catalog(catalog_path):
    """
    Load perfume_catalog.json and build high-speed inverted candidate matching structures.

    Returns:
        entries: CatalogEntries (list of dicts) with .candidate_index attribute
        quick_reject_tokens: set of all individual words from all aliases
        brand_patterns: dict of brand_name -> compiled regex
    """
    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    entries = []
    quick_reject_tokens = set()
    brand_patterns = {}

    for brand_name, brand_data in catalog['brands'].items():
        brand_lower = brand_name.lower().strip()
        brand_core = re.sub(r'\b(fragrance|fragrances|perfumery|perfume|perfumes|parfums|parfum|house)\b', '', brand_lower).strip()
        
        escaped_brand = re.escape(brand_lower)
        if brand_core and brand_core != brand_lower and len(brand_core) >= 3:
            brand_regex = re.compile(r'\b(' + escaped_brand + r'|' + re.escape(brand_core) + r')\b')
        else:
            brand_regex = re.compile(r'\b' + escaped_brand + r'\b')
            
        brand_patterns[brand_name] = brand_regex
        brand_identifying_words = frozenset([
            w for w in re.findall(r"[a-z0-9']+", brand_lower)
            if w not in {'fragrance', 'fragrances', 'perfume', 'perfumes', 'perfumery', 'parfums', 'parfum', 'house', 'and', 'the', 'co', 'of', 'in', 'by', 'pour', 'for'}
            and len(w) >= 3
        ])
        brand_words = brand_identifying_words

        category = brand_data.get('category', 'Unknown')
        region = brand_data.get('region', 'Global')

        for model_name, model_data in brand_data.get('models', {}).items():
            # Avoid redundant exact duplicate names like "Dior Dior"
            if brand_lower == model_name.lower().strip():
                continue

            full_name = model_data.get('full_name', f'{brand_name} {model_name}')
            aliases = model_data.get('aliases', [])
            is_ambiguous = model_data.get('is_ambiguous', False)

            # Build compiled regex and metadata for each alias (sorted longest first)
            # Expand digit-word spacing variants (e.g. "9pm" <-> "9 pm", "br540" <-> "br 540")
            expanded_aliases = set(aliases)
            for a in aliases:
                spaced = re.sub(r'(\d+)([a-zA-Z]+)', r'\1 \2', a)
                unspaced = re.sub(r'(\d+)\s+([a-zA-Z]+)', r'\1\2', a)
                expanded_aliases.add(spaced)
                expanded_aliases.add(unspaced)

            compiled_aliases = []
            for alias in sorted(expanded_aliases, key=len, reverse=True):
                try:
                    alias_clean = alias.lower().strip()
                    if alias_clean in GRAMMAR_PHRASES:
                        continue

                    escaped = re.escape(alias_clean)
                    regex = re.compile(r'\b' + escaped + r'\b')

                    alias_tokens = [w for w in re.findall(r"[a-z0-9']+", alias_clean) if len(w) >= 2 or w.isdigit()]
                    alias_tok_set = frozenset(alias_tokens)
                    has_brand = (
                        (brand_lower in alias_clean) or
                        (brand_core and len(brand_core) >= 3 and brand_core in alias_clean) or
                        bool(brand_identifying_words and any(w in alias_tok_set for w in brand_identifying_words))
                    )

                    # An alias requires proximity validation if the model is marked ambiguous,
                    # or if the alias consists of <= 2 words or any generic/note words,
                    # and the alias does NOT include the brand name
                    is_generic_tokens = bool(alias_tokens) and any(t in GENERIC_WORDS for t in alias_tokens)
                    is_ambig_alias = (is_ambiguous or len(alias_tokens) <= 2 or is_generic_tokens) and not has_brand

                    compiled_aliases.append({
                        'regex': regex,
                        'raw': alias_clean,
                        'tokens': alias_tokens,
                        'token_set': alias_tok_set,
                        'is_ambiguous': is_ambig_alias,
                        'has_brand': has_brand,
                    })
                except re.error:
                    continue

            if not compiled_aliases:
                continue

            for alias in aliases:
                for word in re.findall(r"[a-z0-9']+", alias.lower()):
                    if len(word) >= 2 or word.isdigit():
                        quick_reject_tokens.add(word)

            max_len = max((len(a['raw']) for a in compiled_aliases), default=0)
            entries.append({
                'brand': brand_name,
                'model': model_name,
                'full_name': full_name,
                'category': category,
                'region': region,
                'aliases': compiled_aliases,
                'is_ambiguous': is_ambiguous,
                'brand_lower': brand_lower,
                'brand_words': brand_words,
                'brand_pattern': brand_regex,
                'max_alias_len': max_len,
            })

    # Sort entries by longest alias first to prevent shorter alias collisions
    entries.sort(key=lambda e: e['max_alias_len'], reverse=True)

    # Build inverted index mapping anchor token -> sorted entry indices
    candidate_index = {}
    for entry_idx, entry in enumerate(entries):
        for a_info in entry['aliases']:
            toks = a_info['tokens']
            if not toks:
                continue
            anchors = [t for t in toks if t not in STOPWORDS and len(t) >= 3]
            if not anchors:
                anchors = [t for t in toks if len(t) >= 2]
            if not anchors:
                anchors = toks
            best_anchor = max(anchors, key=len)
            if best_anchor not in candidate_index:
                candidate_index[best_anchor] = []
            candidate_index[best_anchor].append(entry_idx)

    # Deduplicate indices per anchor while preserving sorted order
    for anchor, idx_list in candidate_index.items():
        candidate_index[anchor] = sorted(set(idx_list))

    catalog_entries = CatalogEntries(entries, candidate_index=candidate_index)
    return catalog_entries, quick_reject_tokens, brand_patterns


# ─── Proximity Engine ────────────────────────────────────────────────

def tokenize(text):
    """Split text into words, preserving only alphanumeric + apostrophes."""
    return re.findall(r"[a-z0-9']+", text.lower())


def tokenize_with_spans(text):
    """Tokenize text into a list of tuples: (word_lower, start_char, end_char)."""
    return [(m.group(0).lower(), m.start(), m.end()) for m in re.finditer(r"[a-zA-Z0-9']+", text)]


def find_token_range(tokens, match_start, match_end):
    """
    Given character start and end of a regex match in text, find
    the index range (start_tok_idx, end_tok_idx) in the token list.
    """
    start_idx = None
    end_idx = None
    for i, (_, tok_s, tok_e) in enumerate(tokens):
        if tok_e > match_start and start_idx is None:
            start_idx = i
        if tok_s < match_end:
            end_idx = i
    if start_idx is None:
        start_idx = 0
    if end_idx is None:
        end_idx = start_idx
    return start_idx, end_idx


def check_proximity(words, match_start_tok, match_end_tok, radius, targets):
    """
    Check if any word from `targets` appears within `radius` words
    of the match (excluding tokens within the match itself).

    Returns target_word or None.
    """
    start = max(0, match_start_tok - radius)
    end = min(len(words), match_end_tok + radius + 1)
    for i in range(start, end):
        if match_start_tok <= i <= match_end_tok:
            continue
        if words[i] in targets:
            return words[i]
    return None


def check_brand_proximity(words, match_start_tok, match_end_tok, brand_words, radius):
    """
    Check if any word of the brand appears within `radius` words of the match.
    """
    start = max(0, match_start_tok - radius)
    end = min(len(words), match_end_tok + radius + 1)
    for i in range(start, end):
        if match_start_tok <= i <= match_end_tok:
            continue
        if words[i] in brand_words:
            return words[i]
    return None


def extract_snippet(raw_text, tokens, match_start_tok, match_end_tok, radius=15):
    """
    Extract a snippet of ±radius words around the match position,
    preserving the original casing and punctuation from raw_text.
    """
    if not tokens:
        return raw_text[:100]
    snip_start = max(0, match_start_tok - radius)
    snip_end = min(len(tokens), match_end_tok + radius + 1)
    char_start = tokens[snip_start][1]
    char_end = tokens[snip_end - 1][2]

    snippet = raw_text[char_start:char_end].strip()
    prefix = '...' if snip_start > 0 else ''
    suffix = '...' if snip_end < len(tokens) else ''
    return f"{prefix}{snippet}{suffix}"


def get_accord_distribution(words, match_start_tok, match_end_tok, radius=ACCORD_RADIUS):
    """
    Scan ±radius words around the match for target accords.
    Returns dict of {accord: count}.
    """
    start = max(0, match_start_tok - radius)
    end = min(len(words), match_end_tok + radius + 1)
    accords = {}
    for i in range(start, end):
        if match_start_tok <= i <= match_end_tok:
            continue
        if words[i] in TARGET_ACCORDS:
            accords[words[i]] = accords.get(words[i], 0) + 1
    return accords


# ─── Negative Context & Idiom Filters ─────────────────────────────────

PRE_TRAVEL_WORDS = frozenset([
    'trip', 'go', 'going', 'gone', 'went', 'head', 'heading', 'headed',
    'travel', 'traveling', 'traveled', 'live', 'living', 'lived',
    'move', 'moving', 'moved', 'relocate', 'relocating', 'way', 'far',
    'vacation', 'back', 'down', 'up', 'drive', 'driving', 'road', 'tour',
    'flew', 'flying', 'flight', 'visit', 'visiting', 'visited',
])

BEVERAGE_DESCRIPTORS = frozenset([
    'creamy', 'milky', 'iced', 'hot', 'cup', 'cups', 'glass', 'glasses',
    'sip', 'sips', 'drink', 'drinking', 'drank', 'breath', 'warm',
    'delicious', 'tasty', 'sweet', 'frothy', 'steamed', 'order', 'ordered',
    'ordering', 'starbucks', 'cafe', 'boba', 'froth', 'latte',
])

CLOUD_METAPHORS_PRE = frozenset([
    'a', 'the', 'scent', 'fragrance', 'perfume', 'smoke', 'dust', 'powder',
    'cashmere', 'thick', 'dense', 'big', 'huge', 'white', 'fluffy', 'puff',
    'mushroom', 'dark', 'rain', 'storm', 'stormy', 'grey', 'gray', 'literal',
])

HERO_METAPHORS_PRE = frozenset([
    'my', 'a', 'the', 'super', 'guitar', 'unsung', 'an', 'real', 'local',
    'action', 'childhood', 'everyday', 'true', 'personal',
])

HERO_METAPHORS_POST = frozenset([
    'note', 'notes', 'ingredient', 'ingredients', 'worship', 'complex', 'journey',
])

FIREPLACE_SITUATION_PRE = frozenset([
    'in', 'front', 'of', 'sitting', 'next', 'to', 'near', 'beside', 'sat', 'sit',
    'curled', 'curling', 'relaxing', 'cozy', 'warm', 'an', 'actual', 'real',
])


def is_negative_context(alias_raw, words, start_tok, end_tok, text_lower):
    """
    Check if a matched alias is being used as a non-fragrance idiom,
    beverage note descriptor, competing perfume, or metaphor.
    """
    pre_window = words[max(0, start_tok - 4):start_tok]
    post_window = words[end_tok + 1:min(len(words), end_tok + 5)]

    # 1. 'out west' travel idiom
    if 'out west' in alias_raw:
        if any(w in PRE_TRAVEL_WORDS for w in pre_window):
            return True

    # 2. 'matcha latte' beverage / note descriptor
    if 'matcha latte' in alias_raw:
        if any(w in BEVERAGE_DESCRIPTORS for w in pre_window) or any(w in BEVERAGE_DESCRIPTORS for w in post_window):
            if 'mykonos' not in text_lower:
                return True
        # If another perfume with matcha is explicitly mentioned in the comment
        other_matcha = ['thé matcha', 'the matcha', 'matcha 26', 'matcha meditation', 'matcha lover', 'nefertum']
        if any(om in text_lower for om in other_matcha) and 'mykonos' not in text_lower:
            return True

    # 3. 'solaris' competing perfume collision (Penhaligon's Solaris)
    if alias_raw == 'solaris':
        competing = ['penhaligon', 'penhaligons', "penhaligon's", 'agonist']
        if any(c in text_lower for c in competing) and 'saff' not in text_lower:
            return True

    # 4. 'alpha' non-HMNS contexts (ATH Alpha Man, alpha by perfume house)
    if alias_raw == 'alpha':
        if 'ath' in pre_window or 'hughes' in pre_window or 'man' in post_window:
            if 'hmns' not in text_lower:
                return True
        if any(w in {'by', 'order', 'numeric', 'alphabetical', 'sort', 'boxes'} for w in pre_window + post_window):
            if 'hmns' not in text_lower:
                return True

    # 5. 'cloud' metaphorical contexts
    if alias_raw == 'cloud':
        if (pre_window and pre_window[-1] in CLOUD_METAPHORS_PRE) or (post_window and post_window[0] in {'of', 'above', 'around', 'cover'}):
            if 'ariana' not in text_lower and 'ag cloud' not in text_lower:
                return True

    # 6. 'hero' metaphorical contexts
    if alias_raw == 'hero':
        if (pre_window and pre_window[-1] in HERO_METAPHORS_PRE) or (post_window and post_window[0] in HERO_METAPHORS_POST):
            if 'burberry' not in text_lower:
                return True

    # 7. 'by the fireplace' architectural fireplace context
    if 'by the fireplace' in alias_raw:
        if any(w in FIREPLACE_SITUATION_PRE for w in pre_window):
            near_frag = any(w in CONTEXT_WORDS for w in words[max(0, start_tok - 6):min(len(words), end_tok + 7)])
            if not near_frag and 'margiela' not in text_lower and 'replica' not in text_lower:
                return True

    return False


# ─── Entity Extraction ───────────────────────────────────────────────

def extract_entities(raw_text, text_lower, tokens, words, word_set, entries, brand_patterns, candidate_index=None):
    """
    Two-phase entity extraction.

    Phase 1: Candidate lookup via inverted token index (O(1) amortized).
    Phase 2: Token subset pre-check + full regex matching on surviving candidates.

    Returns list of dicts:
        { brand, model, full_name, category, region, trigger_type,
          trigger_word, accords, snippet }
    """
    results = []
    matched_names = set()  # Prevent duplicate matches for the same perfume in a comment

    word_set_lower = {w.lower() for w in word_set} if word_set else set()
    cand_idx = candidate_index or getattr(entries, 'candidate_index', None)
    if cand_idx:
        candidate_indices = set()
        for w in word_set_lower:
            if w in cand_idx:
                candidate_indices.update(cand_idx[w])
        if not candidate_indices:
            return []
        # Precedence: sorted entries preserve longest-alias-first order
        candidates = [entries[i] for i in sorted(candidate_indices)]
    else:
        candidates = entries

    for entry in candidates:
        if entry['full_name'] in matched_names:
            continue

        matched_alias_info = None
        match_obj = None

        # Test each alias in precedence order
        for alias_info in entry['aliases']:
            # Fast token set subset check before executing regex
            if 'token_set' in alias_info and not alias_info['token_set'].issubset(word_set_lower):
                continue

            m = alias_info['regex'].search(text_lower)
            if m:
                matched_alias_info = alias_info
                match_obj = m
                break

        if not match_obj:
            continue

        start_tok, end_tok = find_token_range(tokens, match_obj.start(), match_obj.end())
        raw_alias = matched_alias_info['raw']

        # ── Local Brand Quarantine ───────────────────────────────
        # On global Reddit (r/fragrance), Indonesian indie local brands
        # MUST have explicit brand evidence to avoid collisions with
        # English idioms (e.g., 'trip out west', 'powder room', 'second skin')
        # or famous Western houses (e.g., Penhaligon's Solaris).
        is_local_brand = (
            entry.get('category') == 'Local Brand' or
            entry.get('region') == 'Indonesia'
        )

        if is_local_brand:
            has_explicit_brand = matched_alias_info['has_brand']
            if not has_explicit_brand:
                brand_word = check_brand_proximity(
                    words, start_tok, end_tok, entry['brand_words'], PROXIMITY_RADIUS
                )
                if not brand_word and not entry['brand_pattern'].search(text_lower):
                    continue

        # ── Negative Context & Idiom Filter ──────────────────────
        if is_negative_context(raw_alias, words, start_tok, end_tok, text_lower):
            continue

        # ── Proximity validation for ambiguous models ────────────
        trigger_type = 'exact_match'
        trigger_word = None

        if matched_alias_info['is_ambiguous']:
            # Ambiguous alias (common word without brand)
            # Rule a: Check for parent brand within ±20 words or in full comment
            brand_word = check_brand_proximity(
                words, start_tok, end_tok, entry['brand_words'], PROXIMITY_RADIUS
            )
            if brand_word:
                trigger_type = 'proximity_brand'
                trigger_word = brand_word
            elif len(matched_alias_info['tokens']) >= 2 and entry['brand_pattern'].search(text_lower):
                trigger_type = 'proximity_brand'
                trigger_word = entry['brand']
            else:
                # No brand in text. Only ICONIC standalone models may match without brand!
                model_lower = entry['model'].lower()
                is_iconic = (raw_alias in ICONIC_STANDALONE_MODELS or model_lower in ICONIC_STANDALONE_MODELS)
                if not is_iconic:
                    # Non-iconic model without brand MUST NOT match
                    continue

                # Rule b: Check for context words within ±20 words
                ctx_word = check_proximity(
                    words, start_tok, end_tok, PROXIMITY_RADIUS, CONTEXT_WORDS
                )
                if ctx_word:
                    trigger_type = 'proximity_context_word'
                    trigger_word = ctx_word
                else:
                    # Rule c: Check for accords within ±20 words
                    accord_word = check_proximity(
                        words, start_tok, end_tok, PROXIMITY_RADIUS, TARGET_ACCORDS
                    )
                    if accord_word:
                        trigger_type = 'proximity_accord'
                        trigger_word = accord_word
                    else:
                        # Ambiguous mention without fragrance context → reject
                        continue
        elif matched_alias_info['has_brand']:
            trigger_type = 'exact_match'
            trigger_word = entry['brand']

        # ── Accord attribution within ±30 words ──────────────────
        accords = get_accord_distribution(words, start_tok, end_tok)

        # ── Raw snippet extraction ───────────────────────────────
        snippet = extract_snippet(raw_text, tokens, start_tok, end_tok)

        results.append({
            'brand': entry['brand'],
            'model': entry['model'],
            'full_name': entry['full_name'],
            'category': entry['category'],
            'region': entry['region'],
            'trigger_type': trigger_type,
            'trigger_word': trigger_word,
            'accords': accords,
            'snippet': snippet,
        })

        matched_names.add(entry['full_name'])

    return results


# ─── Streaming Processor ─────────────────────────────────────────────

def process_zst_archive(archive_path, catalog_path):
    """
    Stream-read a .zst archive line-by-line, extract perfume mentions,
    and aggregate results.

    Returns:
        aggregation: dict of (year, brand, model) -> {mention_count, accord_dist, ...}
        evaluation_samples: list of sampled match dicts
        stats: dict of processing statistics
    """
    print(f'\n🔄 Loading catalog from {catalog_path}...')
    entries, quick_reject_tokens, brand_patterns = load_catalog(catalog_path)
    print(f'   ✅ {len(entries)} perfume models loaded')
    print(f'   🔤 {len(quick_reject_tokens)} quick-reject tokens built')

    # Aggregation: (year, brand, model) -> stats
    agg = defaultdict(lambda: {
        'mention_count': 0,
        'accord_distribution': defaultdict(int),
        'category': '',
        'region': '',
        'full_name': '',
        'sample_mentions': [],
    })

    evaluation_samples = []
    stats = {
        'total_lines': 0,
        'valid_json': 0,
        'in_year_range': 0,
        'phase1_passed': 0,
        'total_matches': 0,
        'skipped_ambiguous': 0,
    }

    print(f'\n🚀 Streaming {archive_path}...\n')
    start_time = datetime.now()

    dctx = zstandard.ZstdDecompressor()
    with open(archive_path, 'rb') as fh:
        reader = dctx.stream_reader(fh)
        text_stream = io.TextIOWrapper(reader, encoding='utf-8', errors='ignore')

        for line in text_stream:
            stats['total_lines'] += 1

            # Progress logging
            if stats['total_lines'] % PROGRESS_INTERVAL == 0:
                elapsed = (datetime.now() - start_time).total_seconds()
                rate = stats['total_lines'] / elapsed if elapsed > 0 else 0
                print(
                    f"   📊 {stats['total_lines']:,} lines processed "
                    f"({stats['total_matches']:,} matches) "
                    f"[{rate:,.0f} lines/sec]",
                    flush=True
                )

            # ── Parse JSON ───────────────────────────────────────
            line = line.strip()
            if not line:
                continue

            try:
                comment = json.loads(line)
            except (json.JSONDecodeError, ValueError):
                continue

            stats['valid_json'] += 1

            # ── Extract year ─────────────────────────────────────
            created_utc = comment.get('created_utc')
            if created_utc is None:
                continue

            try:
                ts = int(created_utc)
                year = datetime.fromtimestamp(ts, tz=timezone.utc).year
            except (ValueError, TypeError, OSError):
                continue

            if year < MIN_YEAR:
                continue

            year_str = str(year)
            stats['in_year_range'] += 1

            # ── Extract body text ────────────────────────────────
            body = comment.get('body', '')
            if not body or body in ('[deleted]', '[removed]'):
                continue

            text_lower = body.lower()
            tokens = tokenize_with_spans(text_lower)

            if not tokens:
                continue

            words = [t[0] for t in tokens]

            # ── Phase 1: Quick-reject ────────────────────────────
            word_set = set(words)
            if not word_set.intersection(quick_reject_tokens):
                continue

            stats['phase1_passed'] += 1

            # ── Phase 2: Full entity extraction ──────────────────
            matches = extract_entities(
                body, text_lower, tokens, words, word_set, entries, brand_patterns
            )

            if not matches:
                continue

            # ── Aggregate ────────────────────────────────────────
            for match in matches:
                stats['total_matches'] += 1

                key = (year_str, match['brand'], match['model'])
                bucket = agg[key]
                bucket['mention_count'] += 1
                bucket['category'] = match['category']
                bucket['region'] = match['region']
                bucket['full_name'] = match['full_name']

                for accord, count in match['accords'].items():
                    bucket['accord_distribution'][accord] += count

                # ── Collect sample mentions for web UI ───────────
                if len(bucket['sample_mentions']) < 10 and len(body.strip()) > 20:
                    permalink = comment.get('permalink', '')
                    full_url = comment.get('url', '')
                    if not full_url and permalink:
                        full_url = f"https://www.reddit.com{permalink}" if not permalink.startswith('http') else permalink
                    elif not full_url:
                        cid = comment.get('id', '')
                        sub = comment.get('subreddit', 'fragrance')
                        full_url = f"https://www.reddit.com/r/{sub}/comments/{cid}"

                    timestamp_iso = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else ''
                    # Clean snippet or trimmed body
                    clean_content = body[:350] + ('...' if len(body) > 350 else '')
                    bucket['sample_mentions'].append({
                        'author': comment.get('author', '[anonymous]'),
                        'content': clean_content,
                        'timestamp': timestamp_iso,
                        'score': comment.get('score', 1),
                        'source': 'reddit',
                        'subreddit': comment.get('subreddit', 'fragrance'),
                        'permalink': permalink,
                        'url': full_url,
                        'id': comment.get('id', '')
                    })

                # ── Evaluation sampling ──────────────────────────
                # Sample 1 out of SAMPLE_RATE, and always capture the first few matches for test verification
                should_sample = (
                    len(evaluation_samples) < 5
                    or random.randint(1, SAMPLE_RATE) == 1
                )
                if len(evaluation_samples) < MAX_SAMPLES and should_sample:
                    evaluation_samples.append({
                        'matched_model': match['model'],
                        'matched_brand': match['brand'],
                        'trigger_type': match['trigger_type'],
                        'trigger_word': match['trigger_word'],
                        'year': year_str,
                        'snippet': match['snippet'],
                        'url': comment.get('url', '')
                    })

    elapsed = (datetime.now() - start_time).total_seconds()
    stats['elapsed_seconds'] = round(elapsed, 1)
    stats['lines_per_second'] = round(stats['total_lines'] / elapsed, 0) if elapsed > 0 else 0

    return dict(agg), evaluation_samples, stats


# ─── Output ──────────────────────────────────────────────────────────

def build_output(aggregation, evaluation_samples, stats, output_dir='.'):
    """
    Write the two output files:
      1. reddit_perfume_rankings.json — flat aggregation list
      2. match_evaluation_log.json   — sampled matches for debugging
    """
    # Build flat list from aggregation
    rankings = []
    for (year, brand, model), bucket in aggregation.items():
        rankings.append({
            'source': 'reddit',
            'year': year,
            'brand': brand,
            'model': model,
            'full_name': bucket['full_name'],
            'category': bucket['category'],
            'region': bucket['region'],
            'mention_count': bucket['mention_count'],
            'accord_distribution': dict(bucket['accord_distribution']),
            'sample_mentions': bucket.get('sample_mentions', []),
        })

    # Sort by mention_count descending, then by year
    rankings.sort(key=lambda r: (-r['mention_count'], r['year']))

    # Write rankings
    os.makedirs(output_dir, exist_ok=True)
    rankings_path = os.path.join(output_dir, 'reddit_perfume_rankings.json')
    with open(rankings_path, 'w', encoding='utf-8') as f:
        json.dump(rankings, f, indent=2, ensure_ascii=False)

    # Write evaluation log
    eval_path = os.path.join(output_dir, 'match_evaluation_log.json')
    with open(eval_path, 'w', encoding='utf-8') as f:
        json.dump(evaluation_samples, f, indent=2, ensure_ascii=False)

    return rankings_path, eval_path


# ─── Main ────────────────────────────────────────────────────────────

def main():
    default_archive = 'reddit_fragrance_comments.zst' if os.path.exists('reddit_fragrance_comments.zst') else 'sample_fragrance.zst'
    default_catalog = 'perfume_catalog.json'
    default_output = '.'

    if len(sys.argv) < 2 and not os.path.exists(default_archive):
        print('Usage: python reddit_extractor.py [archive.zst] [perfume_catalog.json] [output_dir]')
        print('')
        print('Arguments:')
        print('  archive.zst          Path to the Zstandard compressed Reddit dump (default: reddit_fragrance_comments.zst)')
        print('  perfume_catalog.json  Path to the perfume catalog reference file (default: perfume_catalog.json)')
        print('  output_dir           Directory to write output JSON files (default: .)')
        sys.exit(1)

    archive_path = sys.argv[1] if len(sys.argv) > 1 else default_archive
    catalog_path = sys.argv[2] if len(sys.argv) > 2 else default_catalog
    output_dir = sys.argv[3] if len(sys.argv) > 3 else default_output

    # Validate inputs
    if not os.path.exists(archive_path):
        print(f'❌ Archive not found: {archive_path}')
        sys.exit(1)

    if not os.path.exists(catalog_path):
        print(f'❌ Catalog not found: {catalog_path}')
        sys.exit(1)

    print('═' * 60)
    print('🔴 REDDIT PERFUME DATA EXTRACTOR')
    print('═' * 60)
    print(f'📦 Archive:  {archive_path}')
    print(f'📋 Catalog:  {catalog_path}')
    print(f'📁 Output:   {output_dir}/')

    # Process
    aggregation, samples, stats = process_zst_archive(archive_path, catalog_path)

    # Output
    rankings_path, eval_path = build_output(aggregation, samples, stats, output_dir)

    # Summary
    print('\n' + '═' * 60)
    print('✅ EXTRACTION COMPLETE')
    print('═' * 60)
    print(f'📊 Total lines processed:     {stats["total_lines"]:,}')
    print(f'📝 Valid JSON comments:        {stats["valid_json"]:,}')
    print(f'📅 In year range (≥{MIN_YEAR}):    {stats["in_year_range"]:,}')
    print(f'🔤 Phase 1 passed (quick-rej): {stats["phase1_passed"]:,}')
    print(f'🎯 Total perfume matches:      {stats["total_matches"]:,}')
    print(f'🔍 Evaluation samples:         {len(samples):,}')
    print(f'⏱  Elapsed:                    {stats["elapsed_seconds"]}s')
    print(f'🚀 Throughput:                 {stats["lines_per_second"]:,.0f} lines/sec')
    print(f'\n📁 Rankings:   {rankings_path}')
    print(f'📁 Eval log:   {eval_path}')

    # Top perfumes summary
    # Aggregate across years for a quick summary
    totals = defaultdict(int)
    for (year, brand, model), bucket in aggregation.items():
        totals[(brand, model, bucket['full_name'])] += bucket['mention_count']

    top = sorted(totals.items(), key=lambda x: -x[1])[:25]
    if top:
        print(f'\n🏆 Top 25 Perfumes (All Years Combined):')
        print('─' * 50)
        for i, ((brand, model, full_name), count) in enumerate(top, 1):
            medal = ['🥇', '🥈', '🥉'][i - 1] if i <= 3 else f'{i:>2}.'
            print(f'  {medal} {full_name:<36} {count:>6,} mentions')

    print('')


if __name__ == '__main__':
    main()
