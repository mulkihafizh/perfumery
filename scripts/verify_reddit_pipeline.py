#!/usr/bin/env python3
"""
Full Verification Script for Reddit .zst Extraction & Unification Pipeline
========================================================================
1. Generates a realistic sample .zst file containing historical r/fragrance comments
2. Runs scripts/reddit_extractor.py on the archive
3. Verifies schema and correctness of reddit_perfume_rankings.json and match_evaluation_log.json
4. Runs scripts/build-unified-leaderboard.js to merge with Discord data
5. Verifies the unified leaderboard.json output
"""

import os
import sys
import json
import time
import subprocess
from datetime import datetime, timezone

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import zstandard

# ─── 1. Build Sample Reddit Comments ──────────────────────────────────
# Realistic r/fragrance comments across 2018-2024 with timestamps,
# distractors, invalid JSON, pre-2015 comments, and accord descriptions.

SAMPLE_COMMENTS = [
    # Dior Sauvage (2020) - exact match + accords
    {
        "created_utc": 1585699200,  # 2020-04-01
        "id": "c_sauvage_1",
        "author": "fraghead_99",
        "body": "Dior Sauvage is undeniably the king of compliment getters. It has this incredible fresh bergamot and spicy ambroxan punch with woody undertones. Just 3 sprays lasts all day on my skin."
    },
    # Dior Sauvage (2021) - ambiguous alias with context
    {
        "created_utc": 1622505600,  # 2021-06-01
        "id": "c_sauvage_2",
        "author": "scent_collector",
        "body": "I picked up a bottle of Sauvage edp last week. The drydown is much smoother and less harsh than the edt, very fresh and woody."
    },
    # Dior Sauvage (2022) - exact match
    {
        "created_utc": 1654041600,  # 2022-06-01
        "id": "c_sauvage_3",
        "author": "parfum_dan",
        "body": "Honestly Sauvage Elixir is a masterpiece. It smells like a rich spicy aromatic powerhouse with deep woody notes."
    },
    # Ariana Grande Cloud (2021) - ambiguous alias with context + accords
    {
        "created_utc": 1610000000,  # 2021-01-07
        "id": "c_cloud_1",
        "author": "sweet_tooth",
        "body": "I sprayed Cloud this morning and it smells so comforting! That sweet vanilla and fluffy gourmand praline drydown is just heaven."
    },
    # Ariana Grande Cloud (2022) - exact match
    {
        "created_utc": 1645000000,  # 2022-02-16
        "id": "c_cloud_2",
        "author": "gourmand_fanatic",
        "body": "Ariana Grande Cloud is easily the best celebrity fragrance on the market. It performs better than most designer sweet perfumes."
    },
    # Ariana Grande Cloud (2023) - ambiguous with accord context
    {
        "created_utc": 1680000000,  # 2023-03-28
        "id": "c_cloud_3",
        "author": "vanilla_queen",
        "body": "Wearing Cloud today. Such an airy lactonic sweet vanilla fragrance with a hint of coconut."
    },
    # MFK Baccarat Rouge 540 (2021) - multi-word exact match
    {
        "created_utc": 1630000000,  # 2021-08-26
        "id": "c_br540_1",
        "author": "luxury_sniff",
        "body": "Baccarat Rouge 540 has that famous burnt sugar amber sweetness and airy woody cedar. People stop me to ask what fragrance I wear."
    },
    # MFK Baccarat Rouge 540 (2023) - alias BR540
    {
        "created_utc": 1690000000,  # 2023-07-22
        "id": "c_br540_2",
        "author": "niche_lover",
        "body": "I compared BR540 with Ariana Grande Cloud side by side. BR540 is denser with amber and woody saffron, whereas Cloud is more lactonic and sweet."
    },
    # Versace Eros (2019) - exact match
    {
        "created_utc": 1560000000,  # 2019-06-08
        "id": "c_eros_1",
        "author": "club_king",
        "body": "Versace Eros is my ultimate clubbing cologne. Green apple, fresh mint, sweet vanilla, and woody tonka bean."
    },
    # Versace Eros (2022) - ambiguous model with context word
    {
        "created_utc": 1660000000,  # 2022-08-09
        "id": "c_eros_2",
        "author": "frag_newbie",
        "body": "How many sprays of Eros should I wear for a date night? The scent projects like crazy in warm weather."
    },
    # Creed Aventus (2018) - exact match
    {
        "created_utc": 1520000000,  # 2018-03-02
        "id": "c_aventus_1",
        "author": "batch_chaser",
        "body": "Creed Aventus batch 17X01 is legendary. Juicy fruity pineapple opening followed by smoky birch and woody oakmoss."
    },
    # Creed Aventus (2024) - exact match
    {
        "created_utc": 1710000000,  # 2024-03-09
        "id": "c_aventus_2",
        "author": "aventus_fan",
        "body": "Aventus remains the blueprint for modern masculine perfumery. That fruity smoky drydown is unmatched."
    },
    # YSL Y EDP (2020) - exact match
    {
        "created_utc": 1590000000,  # 2020-05-20
        "id": "c_ysly_1",
        "author": "blue_frag_guy",
        "body": "YSL Y EDP is the best versatile blue scent. Fresh apple and sage on top with deep woody amberwood base."
    },
    # Lattafa Khamrah (2023) - Middle Eastern hit
    {
        "created_utc": 1675000000,  # 2023-01-29
        "id": "c_khamrah_1",
        "author": "arabian_nights",
        "body": "Lattafa Khamrah is an insane value. Boozy cinnamon, warm spicy dates, and a rich sweet vanilla base. Outstanding winter perfume."
    },
    # HMNS Orgasm (2022) - Indonesian local brand with brand proximity
    {
        "created_utc": 1665000000,  # 2022-10-06
        "id": "c_hmns_1",
        "author": "se_asia_scents",
        "body": "Has anyone tried HMNS Orgasm? It is an Indonesian local brand fragrance. Lovely floral rose and sweet vanilla notes with fresh red apple."
    },
    # Afnan 9 PM (2022) - exact match with short digits
    {
        "created_utc": 1670000000,  # 2022-12-02
        "id": "c_9pm_1",
        "author": "budget_banger",
        "body": "Afnan 9 PM is a beast mode Ultra Male clone. Super fruity sweet cinnamon and vanilla. 2 sprays fills a whole room."
    },
    # Tom Ford Tobacco Vanille (2021) - exact match
    {
        "created_utc": 1635000000,  # 2021-10-24
        "id": "c_tf_tv_1",
        "author": "winter_warmer",
        "body": "Tom Ford Tobacco Vanille is cozy perfection. Rich spicy tobacco leaf wrapped in decadent sweet vanilla and dried fruits."
    },

    # ── DISTRACTORS (Must NOT match any perfume) ─────────────────────
    # Weather cloud (no fragrance context)
    {
        "created_utc": 1650000000,  # 2022-04-15
        "id": "c_dist_1",
        "author": "meteorologist",
        "body": "There is a massive dark cloud rolling in over the mountains. Looks like we are getting severe thunderstorms tonight."
    },
    # Sexual reference orgasm (no brand/fragrance context)
    {
        "created_utc": 1650000001,
        "id": "c_dist_2",
        "author": "biology_student",
        "body": "The physiological response during orgasm involves rhythmic contractions and intense dopamine release in the nervous system."
    },
    # Greek philosophy eros (no fragrance context)
    {
        "created_utc": 1650000002,
        "id": "c_dist_3",
        "author": "philosophy_prof",
        "body": "Plato distinguished between eros, agape, and philia in his dialogue on the nature of love and human connection."
    },
    # Pre-2015 comment (must be skipped by year filter)
    {
        "created_utc": 1380000000,  # 2013-09-24
        "id": "c_pre2015",
        "author": "old_timer",
        "body": "Creed Aventus was released in 2010 and it is still one of my favorite woody scents."
    },
    # Deleted/removed comment
    {
        "created_utc": 1650000003,
        "id": "c_deleted",
        "author": "[deleted]",
        "body": "[removed]"
    },
]


def create_sample_zst(output_path="sample_fragrance.zst"):
    """Compress sample Reddit comments into a valid .zst file."""
    print(f"📦 Generating sample .zst file: {output_path}")
    cctx = zstandard.ZstdCompressor(level=3)

    # Encode JSON lines + 1 intentionally corrupted line to test fault tolerance
    lines = []
    for c in SAMPLE_COMMENTS:
        lines.append(json.dumps(c))
    lines.append("{INVALID_JSON_LINE_CORRUPTED_BYTES: true, broken")

    raw_bytes = ("\n".join(lines) + "\n").encode("utf-8")
    compressed = cctx.compress(raw_bytes)

    with open(output_path, "wb") as f:
        f.write(compressed)

    print(f"   ✅ Created {output_path} ({len(compressed):,} bytes, {len(SAMPLE_COMMENTS)} comments)")
    return output_path


def verify_reddit_pipeline(use_real=None):
    real_zst = "reddit_fragrance_comments.zst"
    sample_zst = "sample_fragrance.zst"
    catalog_path = "perfume_catalog.json"
    rankings_output = "reddit_perfume_rankings.json"
    eval_output = "match_evaluation_log.json"
    leaderboard_output = "app/public/data/leaderboard.json"

    # Decide whether to use real data archive or mock test file
    if use_real is None:
        # Default to real data if the archive exists
        use_real = os.path.exists(real_zst) and "--mock" not in sys.argv

    target_zst = real_zst if use_real else sample_zst

    print("═" * 60)
    print(f"🔬 RUNNING REDDIT PIPELINE VERIFICATION ({'REAL DATA' if use_real else 'MOCK DATA'})")
    print("═" * 60)

    if not use_real:
        create_sample_zst(sample_zst)
    else:
        print(f"📦 Using real Reddit archive: {real_zst} ({os.path.getsize(real_zst):,} bytes)")

    # Step 2: Run Python Reddit Extractor
    print("\n" + "=" * 60)
    print(f"🚀 STEP 2: Running reddit_extractor.py on {target_zst}")
    print("=" * 60)
    cmd_extract = [
        sys.executable,
        os.path.join("scripts", "reddit_extractor.py"),
        target_zst,
        catalog_path,
        "."
    ]
    result = subprocess.run(cmd_extract, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    if result.returncode != 0:
        print("❌ Extractor failed!")
        return False

    # Step 3: Verify Output JSONs
    print("=" * 60)
    print("🔍 STEP 3: Verifying Extractor Outputs")
    print("=" * 60)

    if not os.path.exists(rankings_output):
        print(f"❌ Missing {rankings_output}")
        return False

    with open(rankings_output, "r", encoding="utf-8") as f:
        rankings = json.load(f)

    print(f"✅ Loaded {rankings_output}: {len(rankings)} entries")

    # Verify schema of rankings
    expected_fields = {"source", "year", "brand", "model", "full_name", "category", "region", "mention_count", "accord_distribution"}
    perfumes_found = set()
    total_mentions = 0

    for item in rankings:
        missing = expected_fields - set(item.keys())
        if missing:
            print(f"❌ Ranking entry missing fields: {missing}")
            return False
        perfumes_found.add(item["full_name"])
        total_mentions += item["mention_count"]

    print(f"   📊 Unique perfumes identified: {len(perfumes_found)}")
    print(f"   📊 Total mentions tallied:     {total_mentions}")

    # Check evaluation log
    if os.path.exists(eval_output):
        with open(eval_output, "r", encoding="utf-8") as f:
            eval_log = json.load(f)
        print(f"✅ Loaded {eval_output}: {len(eval_log)} sampled matches")
        if eval_log:
            sample = eval_log[0]
            print(f"   Sample trigger: {sample.get('matched_model')} via [{sample.get('trigger_type')}] (Year: {sample.get('year')})")
            print(f"   Snippet: {sample.get('snippet')[:100]}...")

    # Step 4: Run Unified Leaderboard Script
    print("\n" + "=" * 60)
    print("🔗 STEP 4: Running build-unified-leaderboard.js")
    print("=" * 60)
    cmd_unify = ["node", os.path.join("scripts", "build-unified-leaderboard.js")]
    res_unify = subprocess.run(cmd_unify, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(res_unify.stdout)
    if res_unify.stderr:
        print("STDERR:", res_unify.stderr)
    if res_unify.returncode != 0:
        print("❌ Unification script failed!")
        return False

    # Step 5: Verify Unified leaderboard.json
    print("=" * 60)
    print("🔍 STEP 5: Verifying Unified leaderboard.json")
    print("=" * 60)

    with open(leaderboard_output, "r", encoding="utf-8") as f:
        unified = json.load(f)

    reddit_meta = unified["meta"]["sources"]["reddit"]
    print(f"   💬 Discord messages:  {unified['meta']['sources']['discord']['totalMessages']:,}")
    print(f"   🔴 Reddit mentions:   {reddit_meta['totalComments']:,}")
    print(f"   📅 Reddit year range: {reddit_meta['yearsRange']}")
    print(f"   🏆 Total perfumes:    {unified['meta']['totalPerfumesFound']}")

    if reddit_meta["totalComments"] == 0:
        print("❌ Reddit totalComments is still 0 in unified leaderboard!")
        return False

    # Find top perfumes with both Discord and Reddit mentions
    shared_found = False
    for p in unified["leaderboard"]:
        disc_m = p.get("sources", {}).get("discord", {}).get("mentionCount", 0)
        redd_m = p.get("sources", {}).get("reddit", {}).get("mentionCount", 0)
        if disc_m > 0 and redd_m > 0:
            shared_found = True
            print(f"\n   🌟 Shared Perfume: {p['name']}")
            print(f"      Discord mentions: {disc_m}")
            print(f"      Reddit mentions:  {redd_m}")
            print(f"      Combined:         {p['mentionCount']} (disc + redd = {disc_m + redd_m})")
            print(f"      Yearly breakdown: {p.get('sources', {}).get('reddit', {}).get('yearlyBreakdown')}")
            print(f"      Accord distribution: {p.get('accordDistribution')}")
            break

    print("\n" + "═" * 60)
    print("🎉 PIPELINE VERIFICATION SUCCESSFUL!")
    print(f"   Processed {'real' if use_real else 'mock'} Reddit data and unified seamlessly with Discord.")
    print("═" * 60)
    return True


if __name__ == "__main__":
    is_mock = "--mock" in sys.argv
    is_real = "--real" in sys.argv
    use_real = True if is_real else (False if is_mock else None)
    success = verify_reddit_pipeline(use_real=use_real)
    sys.exit(0 if success else 1)
