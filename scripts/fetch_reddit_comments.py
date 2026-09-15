#!/usr/bin/env python3
"""
Real Reddit Comment Fetcher & .zst Compressor
==============================================
Fetches authentic historical comments from r/fragrance (and r/femfraglab)
via Arctic Shift (Pushshift open archive) and compresses them into a
standard .zst dump file for reddit_extractor.py.

Usage:
    python scripts/fetch_reddit_comments.py [--subreddit fragrance] [--output reddit_fragrance_comments.zst]
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import zstandard

API_BASE = "https://arctic-shift.photon-reddit.com/api/comments/search"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Perfumery-Research-Tool/1.0"
}


def fetch_batch(subreddit, before_timestamp, limit=100):
    """Fetch a single batch of comments from Arctic Shift before a given timestamp."""
    url = f"{API_BASE}?subreddit={subreddit}&limit={limit}"
    if before_timestamp:
        url += f"&before={before_timestamp}"

    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data.get('data', [])
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2.0 * (attempt + 1))
                continue
            time.sleep(1.0)
        except Exception as e:
            time.sleep(1.0)
    return []


def get_year_checkpoints(year, num_checkpoints=4):
    """Generate evenly spaced timestamps across a given year for seasonal variety."""
    if num_checkpoints <= 1:
        return [int(datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc).timestamp())]
    elif num_checkpoints == 2:
        return [
            int(datetime(year, 7, 1, 0, 0, 0, tzinfo=timezone.utc).timestamp()),
            int(datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc).timestamp()),
        ]
    elif num_checkpoints == 4:
        # Quarterly: Spring, Summer, Autumn, Winter
        return [
            int(datetime(year, 3, 31, 23, 59, 59, tzinfo=timezone.utc).timestamp()),
            int(datetime(year, 6, 30, 23, 59, 59, tzinfo=timezone.utc).timestamp()),
            int(datetime(year, 9, 30, 23, 59, 59, tzinfo=timezone.utc).timestamp()),
            int(datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc).timestamp()),
        ]
    else:
        # Month-end checkpoints
        checkpoints = []
        for month in range(1, 13):
            # approximate day 28 for all months
            checkpoints.append(int(datetime(year, month, 28, 23, 59, 59, tzinfo=timezone.utc).timestamp()))
        return checkpoints[:num_checkpoints]


def fetch_historical_comments(
    subreddit="fragrance",
    years=range(2017, 2026),
    comments_per_year=600,
    checkpoints_per_year=4,
    output_path="reddit_fragrance_comments.zst"
):
    """
    Fetch authentic comments sampled across target years and stream-write
    them into a compressed .zst archive.
    """
    years_list = sorted(list(years))
    total_target = len(years_list) * comments_per_year

    print("═" * 60)
    print(f"🔴 FETCHING REAL REDDIT DATA: r/{subreddit}")
    print("═" * 60)
    print(f"📅 Target Years:        {years_list[0]} – {years_list[-1]} ({len(years_list)} years)")
    print(f"🎯 Target Per Year:     {comments_per_year:,} comments/year")
    print(f"🎯 Total Quota:         {total_target:,} authentic comments")
    print(f"🌸 Seasonal Sampling:   {checkpoints_per_year} checkpoints/year")
    print(f"📦 Output Archive:      {output_path}\n")

    cctx = zstandard.ZstdCompressor(level=3)
    total_fetched = 0
    seen_ids = set()
    start_time = time.time()

    with open(output_path, "wb") as f_out:
        with cctx.stream_writer(f_out) as writer:
            for year in years_list:
                year_count = 0
                checkpoints = get_year_checkpoints(year, checkpoints_per_year)
                base_per_checkpoint = comments_per_year // len(checkpoints)
                remainder = comments_per_year % len(checkpoints)

                for idx, cp in enumerate(checkpoints):
                    quota = base_per_checkpoint + (remainder if idx == len(checkpoints) - 1 else 0)
                    before = cp
                    cp_fetched = 0

                    while cp_fetched < quota and year_count < comments_per_year:
                        batch_limit = min(100, quota - cp_fetched)
                        batch = fetch_batch(subreddit, before, limit=batch_limit)
                        if not batch:
                            break

                        new_lines = []
                        for item in batch:
                            cid = item.get("id")
                            if not cid or cid in seen_ids:
                                continue
                            seen_ids.add(cid)

                            permalink = item.get("permalink", "")
                            if permalink and not permalink.startswith("http"):
                                full_url = f"https://www.reddit.com{permalink}"
                            else:
                                full_url = permalink or f"https://www.reddit.com/r/{subreddit}/comments/{cid}"

                            comment_record = {
                                "id": cid,
                                "author": item.get("author", "[anonymous]"),
                                "body": item.get("body", ""),
                                "created_utc": item.get("created_utc"),
                                "score": item.get("score", 1),
                                "subreddit": subreddit,
                                "permalink": permalink,
                                "url": full_url
                            }
                            line = json.dumps(comment_record, ensure_ascii=False) + "\n"
                            new_lines.append(line.encode("utf-8"))
                            cp_fetched += 1
                            year_count += 1
                            total_fetched += 1

                            if cp_fetched >= quota or year_count >= comments_per_year:
                                break

                        if new_lines:
                            writer.write(b"".join(new_lines))

                        earliest = batch[-1].get("created_utc")
                        if not earliest or earliest >= before:
                            break
                        before = earliest
                        time.sleep(0.12)  # Respectful rate-limit delay (~8 req/sec)

                elapsed_so_far = time.time() - start_time
                rate = total_fetched / elapsed_so_far if elapsed_so_far > 0 else 0
                pct = (total_fetched / total_target) * 100 if total_target > 0 else 100
                print(f"   📅 Year {year}: {year_count:,}/{comments_per_year:,} comments | Total: {total_fetched:,}/{total_target:,} ({pct:.1f}%) | {rate:.0f} c/s")

    elapsed = time.time() - start_time
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print("\n" + "═" * 60)
    print("✅ REDDIT FETCH COMPLETE")
    print("═" * 60)
    print(f"📊 Total Real Comments: {total_fetched:,}")
    print(f"📁 Compressed File:     {output_path} ({file_size_mb:.2f} MB)")
    print(f"⏱  Time Elapsed:        {elapsed:.1f}s ({total_fetched / elapsed:.0f} comments/sec)")
    print("═" * 60)
    return output_path


def fetch_continuous_comments(
    subreddit="fragrance",
    max_comments=25000,
    until_year=2017,
    output_path="reddit_fragrance_comments.zst",
    state_path="reddit_fetch_state.json",
    resume=False
):
    """
    Continuous backwards historical fetcher:
    Pages continuously backwards through time (100 comments/request)
    without artificial per-year quotas until max_comments or until_year is reached.
    """
    print("═" * 60)
    print(f"🔴 CONTINUOUS REAL REDDIT DATA FETCHER: r/{subreddit}")
    print("═" * 60)
    print(f"🎯 Target Volume:      {f'{max_comments:,} comments' if max_comments else 'UNCAPPED (until stopped/done)'}")
    print(f"📅 Until Year:          ≥ {until_year}")
    print(f"📦 Output Archive:      {output_path}")
    print(f"💾 State Tracking:      {state_path}\n")

    seen_ids = set()
    total_fetched = 0
    start_before = None

    # Load resume state if requested
    if resume and os.path.exists(state_path):
        try:
            with open(state_path, "r", encoding="utf-8") as sf:
                state = json.load(sf)
                start_before = state.get("last_timestamp")
                total_fetched = state.get("total_fetched", 0)
                print(f"🔄 Resuming from {datetime.fromtimestamp(start_before, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} (previously fetched: {total_fetched:,})")
        except Exception as e:
            print(f"⚠️ Could not load state ({e}), starting from latest...")

    cctx = zstandard.ZstdCompressor(level=3)
    start_time = time.time()
    before = start_before
    file_mode = "ab" if (resume and os.path.exists(output_path)) else "wb"

    try:
        with open(output_path, file_mode) as f_out:
            with cctx.stream_writer(f_out) as writer:
                while True:
                    if max_comments and total_fetched >= max_comments:
                        print(f"\n🎯 Reached target limit of {max_comments:,} comments.")
                        break

                    batch_limit = 100
                    if max_comments:
                        batch_limit = min(100, max_comments - total_fetched)

                    batch = fetch_batch(subreddit, before, limit=batch_limit)
                    if not batch:
                        print("\n🏁 No more comments returned by API.")
                        break

                    new_lines = []
                    for item in batch:
                        cid = item.get("id")
                        if not cid or cid in seen_ids:
                            continue
                        seen_ids.add(cid)

                        created_utc = item.get("created_utc")
                        if created_utc and until_year:
                            comment_year = datetime.fromtimestamp(created_utc, tz=timezone.utc).year
                            if comment_year < until_year:
                                print(f"\n📅 Reached boundary year {until_year} (encountered comment from {comment_year}).")
                                if new_lines:
                                    writer.write(b"".join(new_lines))
                                return output_path

                        permalink = item.get("permalink", "")
                        if permalink and not permalink.startswith("http"):
                            full_url = f"https://www.reddit.com{permalink}"
                        else:
                            full_url = permalink or f"https://www.reddit.com/r/{subreddit}/comments/{cid}"

                        comment_record = {
                            "id": cid,
                            "author": item.get("author", "[anonymous]"),
                            "body": item.get("body", ""),
                            "created_utc": created_utc,
                            "score": item.get("score", 1),
                            "subreddit": subreddit,
                            "permalink": permalink,
                            "url": full_url
                        }
                        line = json.dumps(comment_record, ensure_ascii=False) + "\n"
                        new_lines.append(line.encode("utf-8"))
                        total_fetched += 1

                        if max_comments and total_fetched >= max_comments:
                            break

                    if new_lines:
                        writer.write(b"".join(new_lines))

                    earliest = batch[-1].get("created_utc")
                    if not earliest or earliest >= (before or float('inf')):
                        print("\n🏁 Reached end of historical timeline.")
                        break
                    before = earliest

                    # Progress display & state save every ~500 comments
                    if total_fetched % 500 < len(new_lines):
                        elapsed = time.time() - start_time
                        rate = len(seen_ids) / elapsed if elapsed > 0 else 0
                        curr_date = datetime.fromtimestamp(before, tz=timezone.utc).strftime('%Y-%m-%d')
                        sys.stdout.write(f"\r   ⏳ Fetched: {total_fetched:,} comments | Date reached: {curr_date} | Speed: {rate:.0f} c/s")
                        sys.stdout.flush()

                        # Save state
                        with open(state_path, "w", encoding="utf-8") as sf:
                            json.dump({
                                "subreddit": subreddit,
                                "last_timestamp": before,
                                "last_date": curr_date,
                                "total_fetched": total_fetched,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }, sf, indent=2)

                    time.sleep(0.12)

    except KeyboardInterrupt:
        print("\n\n⚠️ Fetch paused by user (Ctrl+C). State preserved in", state_path)

    elapsed = time.time() - start_time
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024) if os.path.exists(output_path) else 0
    print("\n\n" + "═" * 60)
    print("✅ CONTINUOUS FETCH SESSION COMPLETED")
    print("═" * 60)
    print(f"📊 Total Real Comments: {total_fetched:,}")
    print(f"📁 Compressed File:     {output_path} ({file_size_mb:.2f} MB)")
    print(f"⏱  Time Elapsed:        {elapsed:.1f}s")
    print("═" * 60)
    return output_path


def parse_args():
    import argparse
    parser = argparse.ArgumentParser(
        description="Fetch authentic historical comments from Reddit via Arctic Shift and stream into .zst",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "sub_pos",
        nargs="?",
        default=None,
        help="Subreddit name (positional fallback, e.g. fragrance)"
    )
    parser.add_argument(
        "--subreddit", "-s",
        default="fragrance",
        help="Target subreddit (e.g. fragrance, femfraglab)"
    )
    parser.add_argument(
        "--continuous",
        action="store_true",
        help="Run continuous backward historical fetch without fixed annual quotas"
    )
    parser.add_argument(
        "--no-limit",
        action="store_true",
        help="Run uncapped continuous streaming without any comment limit (fetch continuously until stopped with Ctrl+C)"
    )
    parser.add_argument(
        "--max-comments", "-m",
        type=int,
        default=None,
        help="Max comments to fetch in continuous mode (None or omit for unlimited)"
    )
    parser.add_argument(
        "--until-year",
        type=int,
        default=2015,
        help="Stop continuous fetch when comments reach this year (default: 2015)"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume continuous fetch from last recorded timestamp in state file"
    )
    parser.add_argument(
        "--per-year", "-n",
        type=int,
        default=600,
        help="Exact number of comments to fetch per year in checkpoint mode (e.g. 600, 1200, 3000)"
    )
    parser.add_argument(
        "--total", "-t",
        type=int,
        default=None,
        help="Total comments quota across all specified years (overrides --per-year)"
    )
    parser.add_argument(
        "--years", "-y",
        default="2017-2025",
        help="Year range (e.g. 2017-2025) or comma-separated years (e.g. 2018,2020,2022,2024)"
    )
    parser.add_argument(
        "--checkpoints", "-c",
        type=int,
        default=4,
        help="Seasonal checkpoints per year (1=continuous backwards, 2=mid+year-end, 4=quarterly)"
    )
    parser.add_argument(
        "--output", "-o",
        default="reddit_fragrance_comments.zst",
        help="Output .zst archive filename"
    )

    args = parser.parse_args()

    # Allow positional subreddit to override default
    subreddit = args.sub_pos if args.sub_pos and not args.sub_pos.startswith("-") else args.subreddit

    # Parse years
    if "-" in args.years:
        parts = args.years.split("-")
        start_yr, end_yr = int(parts[0].strip()), int(parts[1].strip())
        years = list(range(start_yr, end_yr + 1))
    elif "," in args.years:
        years = [int(y.strip()) for y in args.years.split(",") if y.strip()]
    else:
        years = [int(args.years.strip())]

    # Handle --total vs --per-year
    comments_per_year = args.per_year
    if args.total:
        comments_per_year = max(1, args.total // len(years))

    return args, subreddit, years, comments_per_year


def main():
    args, subreddit, years, comments_per_year = parse_args()

    if args.continuous or args.no_limit:
        max_comments = None if args.no_limit else args.max_comments
        fetch_continuous_comments(
            subreddit=subreddit,
            max_comments=max_comments,
            until_year=args.until_year,
            output_path=args.output,
            resume=args.resume
        )
    else:
        fetch_historical_comments(
            subreddit=subreddit,
            years=years,
            comments_per_year=comments_per_year,
            checkpoints_per_year=args.checkpoints,
            output_path=args.output
        )


if __name__ == "__main__":
    main()
