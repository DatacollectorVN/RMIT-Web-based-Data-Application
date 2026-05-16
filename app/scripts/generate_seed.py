#!/usr/bin/env python3
"""
Generate snapshot_seed.sql from app/archive/cosmetics_beauty_products_reviews.csv.

User layout:
  IDs 1-5  : demo accounts (alice / bob / carol / david / emma) — used by orders
  ID  6    : Anonymous user (for any blank/undetectable author)
  IDs 7+   : one user per unique CSV author (sorted alphabetically)

Reviews are attached to their author's user ID (Anonymous if author is empty).

Usage:
    python app/scripts/generate_seed.py
"""
import csv
import datetime
import hashlib
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CSV_FILE   = SCRIPT_DIR / "cosmetics_beauty_products_reviews.csv"
OUT_FILE   = SCRIPT_DIR / "snapshot_seed.sql"

DUMMY_HASH = "$2a$10$7QJjzq3Y2G4d6R2iK5D6UOm2Gx1nA1m5aG7J3x4m0Y8pK9xT1Jp1W"
BATCH      = 1000

LOCATIONS = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
    "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
    "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad",
]
JOBS = [
    "Student", "Software Engineer", "Teacher", "Doctor", "Homemaker",
    "Business Owner", "Fashion Designer", "Nurse", "Marketing Professional", "Accountant",
    "Content Creator", "Sales Executive", "Graphic Designer", "HR Manager", "Beautician",
    "Pharmacist", "Journalist", "Architect", "Data Analyst", "Freelancer",
]
GENDERS = ["female", "male"]

DEMO_USERS = [
    # (id, email, full_name, role, location, age, job, gender)
    (1, "alice@example.com", "Alice Nguyen", "buyer", "Ho Chi Minh City", 28, "Software Engineer", "female"),
    (2, "bob@example.com",   "Bob Tran",     "buyer", "Hanoi",            35, "Business Owner",    "male"),
    (3, "carol@example.com", "Carol Pham",   "buyer", "Da Nang",          24, "Student",           "female"),
    (4, "david@example.com", "David Le",     "admin", "Ho Chi Minh City", 42, "IT Manager",        "male"),
    (5, "emma@example.com",  "Emma Hoang",   "buyer", "Hue",              30, "Fashion Designer",  "female"),
]
ANON_ID = 6


# ── helpers ──────────────────────────────────────────────────────────────────

def _h(seed_str: str) -> int:
    return int(hashlib.md5(seed_str.encode()).hexdigest(), 16)


def _pick(name: str, salt: str, lst: list) -> str:
    return lst[_h(f"{salt}:{name}") % len(lst)]


def _age(name: str) -> int:
    return 18 + (_h(f"age:{name}") % 38)  # 18–55


def _esc(s: str) -> str:
    return s.replace("'", "''")


def _trunc(s: str, n: int) -> str:
    return s[:n]


def _parse_date(s: str) -> str:
    """Return a SQL timestamp literal from multiple date formats, or NOW()."""
    s = s.strip().replace("T", " ")
    # ISO: 2022-06-20 17:41 or 2022-06-20 17:41:00
    if re.match(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}", s):
        parts = s.split()
        time  = parts[1] if len(parts) > 1 else "00:00:00"
        time  = time if time.count(":") == 2 else time + ":00"
        return f"'{parts[0]} {time}'"
    if re.match(r"\d{4}-\d{2}-\d{2}$", s):
        return f"'{s} 00:00:00'"
    # DD/MM/YYYY HH:MM or DD/MM/YYYY HH:MM:SS
    m = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}:\d{2}(?::\d{2})?)", s)
    if m:
        day, mon, yr, tm = m.group(1), m.group(2), m.group(3), m.group(4)
        tm = tm if tm.count(":") == 2 else tm + ":00"
        return f"'{yr}-{mon}-{day} {tm}'"
    return "NOW()"


# Latest date allowed for generated order timestamps (today).
_ORDER_CAP = datetime.date(2026, 5, 12)
# Window available for capped/fallback dates: 2025-01-01 → 2026-05-12 = 497 days.
_ORDER_WINDOW_DAYS = (_ORDER_CAP - datetime.date(2025, 1, 1)).days


def _order_date_sql(raw: str) -> str:
    """Parse a CSV date string, shift it +4 years into 2025-2026, cap at today.

    Mapping examples:
      2020-06-15 → 2024-06-15  (already within window, left as-is after shift)
      2021-03-10 → 2025-03-10  ✓
      2022-11-20 → 2026-11-20  → capped → random date in 2025-2026
    """
    raw = raw.strip()
    dt: datetime.datetime | None = None

    # DD/MM/YYYY HH:MM[:SS]
    m = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}:\d{2}(?::\d{2})?)", raw)
    if m:
        d, mo, y, t = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
        t = t if t.count(":") == 2 else t + ":00"
        try:
            dt = datetime.datetime(y, mo, d, int(t[0:2]), int(t[3:5]), int(t[6:8]))
        except ValueError:
            pass

    # ISO YYYY-MM-DD HH:MM[:SS]
    if dt is None:
        m = re.match(r"(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}(?::\d{2})?)", raw)
        if m:
            y, mo, d, t = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
            t = t if t.count(":") == 2 else t + ":00"
            try:
                dt = datetime.datetime(y, mo, d, int(t[0:2]), int(t[3:5]), int(t[6:8]))
            except ValueError:
                pass

    # Shift +4 years
    if dt is not None:
        try:
            dt = dt.replace(year=dt.year + 4)
        except ValueError:
            dt = dt.replace(year=dt.year + 4, day=28)  # Feb 29 edge case
    else:
        # No recognisable date → deterministic fallback within the window
        offset = _h(raw or "x") % _ORDER_WINDOW_DAYS
        dt = datetime.datetime(2025, 1, 1) + datetime.timedelta(days=offset)

    # Force everything into the 2025-01-01 → 2026-05-12 window
    _FLOOR = datetime.date(2025, 1, 1)
    if dt.date() > _ORDER_CAP or dt.date() < _FLOOR:
        offset = _h(raw) % _ORDER_WINDOW_DAYS
        dt = datetime.datetime(2025, 1, 1) + datetime.timedelta(days=offset, hours=dt.hour, minutes=dt.minute)

    return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'"


def _category(title: str, tags: str) -> str:
    text = (title + " " + tags).lower()
    if any(w in text for w in ("shampoo", "conditioner", "hair oil", "hair serum", "hair mask")):
        return "haircare"
    if any(w in text for w in ("lipstick", "lip ", "kajal", "eyeliner", "mascara", "eyeshadow",
                                "foundation", "blush", "concealer", "highlighter", "primer",
                                "contour", "eye ", "bb cream", "cc cream")):
        return "makeup"
    if any(w in text for w in ("moisturizer", "sunscreen", "face wash", "cleanser", "toner",
                                "face serum", "face cream", "face gel", "scrub", "face mask",
                                "skin", "acne", "spot patch", "pore")):
        return "skincare"
    if any(w in text for w in ("perfume", "body mist", "fragrance", "body spray", "deodorant", "mist ")):
        return "fragrance"
    if any(w in text for w in ("nail", "polish")):
        return "nails"
    if any(w in text for w in ("body lotion", "body wash", "body butter", "bath")):
        return "body"
    return "beauty"


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    if not CSV_FILE.exists():
        print(f"error: CSV not found: {CSV_FILE}", file=sys.stderr)
        sys.exit(1)

    print("Reading CSV …", flush=True)
    rows: list[dict] = []
    with open(CSV_FILE, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    print(f"  {len(rows):,} review rows")

    # ── unique products, sorted brand A→Z then avg_rating desc ───────────────
    seen_products: dict[str, dict] = {}
    for row in rows:
        pid = row["product_id"]
        if pid not in seen_products:
            seen_products[pid] = row

    sorted_products = sorted(
        seen_products.values(),
        key=lambda r: (r["brand_name"].strip().lower(), -float(r["avg_product_rating"] or 0)),
    )
    csv_pid_to_db_id: dict[str, int] = {r["product_id"]: i + 1 for i, r in enumerate(sorted_products)}
    num_products = len(sorted_products)
    print(f"  {num_products} unique products")

    # ── unique authors → user IDs starting at 7 ──────────────────────────────
    unique_authors: list[str] = sorted({r["author"].strip() for r in rows if r["author"].strip()})
    author_to_uid: dict[str, int] = {a: 7 + i for i, a in enumerate(unique_authors)}
    max_uid = 6 + len(unique_authors)
    print(f"  {len(unique_authors):,} named authors → user IDs 7–{max_uid:,}")

    # ── write SQL ─────────────────────────────────────────────────────────────
    print(f"Writing {OUT_FILE} …", flush=True)
    with open(OUT_FILE, "w", encoding="utf-8") as out:

        out.write(
            "-- Snapshot seed — auto-generated by app/scripts/generate_seed.py\n"
            f"-- {num_products} products · {len(rows):,} reviews · {len(unique_authors):,} named users + 6 system/demo users\n"
            "-- Requires migrations 000008 (location/age/job), 000009 (gender on users), 000010 (ai_model on reviews).\n\n"
            "BEGIN;\n\n"
            "TRUNCATE TABLE order_items, orders, reviews, photos, products, users\n"
            "RESTART IDENTITY CASCADE;\n\n"
        )

        # ── demo + anonymous users ────────────────────────────────────────────
        out.write("-- Demo / system users (IDs 1-5) + Anonymous (ID 6)\n")
        out.write(
            "INSERT INTO users"
            " (id, email, password_hash, full_name, role, location, age, job, gender, created_at, updated_at)"
            " VALUES\n"
        )
        demo_rows = []
        for uid, email, name, role, loc, age, job, gender in DEMO_USERS:
            demo_rows.append(
                f"  ({uid}, '{email}', '{DUMMY_HASH}', '{_esc(name)}', '{role}', "
                f"'{loc}', {age}, '{job}', '{gender}', NOW() - INTERVAL '{uid} days', NOW() - INTERVAL '1 day')"
            )
        demo_rows.append(
            f"  ({ANON_ID}, 'anonymous@glowshop.example', '{DUMMY_HASH}', 'Anonymous', 'buyer', "
            f"NULL, NULL, NULL, NULL, NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day')"
        )
        out.write(",\n".join(demo_rows) + ";\n\n")

        # ── CSV author users in batches ───────────────────────────────────────
        out.write(f"-- CSV authors ({len(unique_authors):,} users, IDs 7–{max_uid:,})\n")
        for b_start in range(0, len(unique_authors), BATCH):
            batch = unique_authors[b_start:b_start + BATCH]
            out.write(
                "INSERT INTO users"
                " (id, email, password_hash, full_name, role, location, age, job, gender, created_at, updated_at)"
                " VALUES\n"
            )
            author_rows = []
            for author in batch:
                uid    = author_to_uid[author]
                loc    = _pick(author, "loc",    LOCATIONS)
                job    = _pick(author, "job",    JOBS)
                gender = _pick(author, "gender", GENDERS)
                age    = _age(author)
                interval_days = uid % 365 + 1
                author_rows.append(
                    f"  ({uid}, 'user{uid}@glowshop.example', '{DUMMY_HASH}', "
                    f"'{_esc(_trunc(author, 255))}', 'buyer', "
                    f"'{loc}', {age}, '{job}', '{gender}', "
                    f"NOW() - INTERVAL '{interval_days} days', NOW() - INTERVAL '1 day')"
                )
            out.write(",\n".join(author_rows) + ";\n\n")

        out.write(
            "SELECT setval(pg_get_serial_sequence('users', 'id'),\n"
            "  (SELECT COALESCE(MAX(id), 1) FROM users));\n\n"
        )

        # ── products ─────────────────────────────────────────────────────────
        out.write(f"-- {num_products} products (brand A→Z, avg_rating desc)\n")
        out.write("INSERT INTO products (id, brand, name, description, price, category, created_at, updated_at) VALUES\n")
        prod_rows = []
        for row in sorted_products:
            db_id     = csv_pid_to_db_id[row["product_id"]]
            brand     = _trunc(row["brand_name"].strip(), 255)
            name      = _trunc(row["product_title"].strip(), 255)
            price_usd = round(float(row.get("price") or 0) / 83, 2)
            rating    = (row.get("avg_product_rating") or "").strip()
            tags      = (row.get("product_tags")        or "").strip()
            cat       = _category(name, tags)
            badges    = [w for w in ("FEATURED", "BESTSELLER") if w in tags.upper()]
            suffix    = (" " + ", ".join(badges) + ".") if badges else "."
            desc      = (f"Rated {rating}/5 by buyers." + suffix) if rating else "Premium beauty product."
            prod_rows.append(
                f"  ({db_id}, '{_esc(brand)}', '{_esc(name)}', '{_esc(desc)}', "
                f"{price_usd}, '{cat}', "
                f"NOW() - INTERVAL '{db_id} days', NOW() - INTERVAL '1 day')"
            )
        out.write(",\n".join(prod_rows) + ";\n\n")
        out.write(
            "SELECT setval(pg_get_serial_sequence('products', 'id'),\n"
            "  (SELECT COALESCE(MAX(id), 1) FROM products));\n\n"
        )

        # ── photos ────────────────────────────────────────────────────────────
        out.write(f"-- Default photos for all {num_products} products\n")
        out.write("INSERT INTO photos (id, product_id, url, is_primary, sort_order, is_active, created_at, updated_at) VALUES\n")
        photo_rows = [
            f"  ({i}, {i}, '/media/products/{i}/{i}.jpg', true, 0, true, NOW(), NOW())"
            for i in range(1, num_products + 1)
        ]
        out.write(",\n".join(photo_rows) + ";\n\n")
        out.write(
            "SELECT setval(pg_get_serial_sequence('photos', 'id'),\n"
            "  (SELECT COALESCE(MAX(id), 1) FROM photos));\n\n"
        )

        # ── reviews in batches ────────────────────────────────────────────────
        out.write(f"-- {len(rows):,} reviews mapped to author user IDs\n")
        for b_start in range(0, len(rows), BATCH):
            batch = rows[b_start:b_start + BATCH]
            out.write(
                "INSERT INTO reviews"
                " (id, user_id, product_id, title, content, rating, status,"
                " ai_label, final_label, ai_model, created_at, updated_at) VALUES\n"
            )
            rev_rows = []
            for local_i, r in enumerate(batch):
                review_id = b_start + local_i + 1
                author    = r["author"].strip()
                uid       = author_to_uid.get(author, ANON_ID)
                db_pid    = csv_pid_to_db_id.get(r["product_id"], 1)
                title     = _esc(_trunc((r.get("review_title") or "Review").strip() or "Review", 255))
                content   = _esc(_trunc((r.get("review_text")  or "No content.").strip() or "No content.", 2000))
                try:
                    rating = max(1, min(5, int(float(r.get("review_rating") or 3))))
                except (ValueError, TypeError):
                    rating = 3
                is_buyer  = str(r.get("is_a_buyer", "")).strip().upper() == "TRUE"
                date_sql  = _parse_date(r.get("review_date") or "")
                rev_rows.append(
                    f"  ({review_id}, {uid}, {db_pid}, '{title}', '{content}', "
                    f"{rating}, 'done', {str(is_buyer).lower()}, {str(is_buyer).lower()}, "
                    f"NULL, {date_sql}, {date_sql})"
                )
            out.write(",\n".join(rev_rows) + ";\n\n")

        out.write(
            "SELECT setval(pg_get_serial_sequence('reviews', 'id'),\n"
            "  (SELECT COALESCE(MAX(id), 1) FROM reviews));\n\n"
        )

        # ── orders & order_items from is_a_buyer=TRUE rows ───────────────────
        # One order per unique (author, csv_product_id) pair where is_a_buyer=TRUE.
        # Use the earliest review_date for that pair as the order date.
        buyer_pairs: dict[tuple[str, str], dict] = {}
        for r in rows:
            if str(r.get("is_a_buyer", "")).strip().upper() != "TRUE":
                continue
            author  = r["author"].strip()
            csv_pid = r["product_id"].strip()
            key     = (author, csv_pid)
            if key not in buyer_pairs:
                buyer_pairs[key] = r
            else:
                # keep the earliest date
                if r.get("review_date", "") < buyer_pairs[key].get("review_date", ""):
                    buyer_pairs[key] = r

        # Sort by (author, product_id) for deterministic IDs
        sorted_pairs = sorted(buyer_pairs.items(), key=lambda kv: kv[0])
        num_orders   = len(sorted_pairs)
        print(f"  {num_orders:,} buyer orders to write …", flush=True)

        out.write(f"-- {num_orders:,} orders derived from is_a_buyer=TRUE reviews\n")
        for b_start in range(0, num_orders, BATCH):
            batch_pairs = sorted_pairs[b_start:b_start + BATCH]
            out.write(
                "INSERT INTO orders"
                " (id, user_id, total_amount, status, created_at, updated_at) VALUES\n"
            )
            ord_rows = []
            for local_i, ((author, csv_pid), r) in enumerate(batch_pairs):
                oid        = b_start + local_i + 1
                uid        = author_to_uid.get(author, ANON_ID)
                price_usd  = round(float(r.get("price") or 0) / 83, 2)
                date_sql   = _order_date_sql(r.get("review_date") or "")
                ord_rows.append(
                    f"  ({oid}, {uid}, {price_usd}, 'completed', {date_sql}, {date_sql})"
                )
            out.write(",\n".join(ord_rows) + ";\n\n")

        out.write(
            "SELECT setval(pg_get_serial_sequence('orders', 'id'),\n"
            "  (SELECT COALESCE(MAX(id), 1) FROM orders));\n\n"
        )

        out.write(f"-- {num_orders:,} order_items (one per order)\n")
        for b_start in range(0, num_orders, BATCH):
            batch_pairs = sorted_pairs[b_start:b_start + BATCH]
            out.write(
                "INSERT INTO order_items"
                " (id, order_id, product_id, quantity, unit_price, created_at) VALUES\n"
            )
            item_rows = []
            for local_i, ((author, csv_pid), r) in enumerate(batch_pairs):
                oid       = b_start + local_i + 1
                db_pid    = csv_pid_to_db_id.get(csv_pid, 1)
                price_usd = round(float(r.get("price") or 0) / 83, 2)
                date_sql  = _order_date_sql(r.get("review_date") or "")
                item_rows.append(
                    f"  ({oid}, {oid}, {db_pid}, 1, {price_usd}, {date_sql})"
                )
            out.write(",\n".join(item_rows) + ";\n\n")

        out.write(
            "SELECT setval(pg_get_serial_sequence('order_items', 'id'),\n"
            "  (SELECT COALESCE(MAX(id), 1) FROM order_items));\n\n"
            "COMMIT;\n"
        )

    size_mb = OUT_FILE.stat().st_size / 1_048_576
    print(f"Done → {OUT_FILE}  ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
