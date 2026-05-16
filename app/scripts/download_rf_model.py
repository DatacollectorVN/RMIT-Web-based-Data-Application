#!/usr/bin/env python3
"""
Download the trained Random Forest classifier (rf_pipeline.pkl) from Google Drive.

The file is gitignored and must be present at app/ai/model/rf_pipeline.pkl for the
AI counting pipeline to load.

Usage:
    uv run python scripts/download_rf_model.py
    uv run python scripts/download_rf_model.py --force   # replace existing file

Environment / deps: uses ``gdown`` (declared in pyproject.toml). Run ``make install``
from the repo root first so the venv has gdown.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import gdown

# Shared with docs/getting-started.md — large-file RF pipeline hosted off-repo
GOOGLE_DRIVE_FILE_ID = "15C3q-VN5BIO1sb-VwHVBH-QSVEaDxVTY"
MIN_BYTES = 10_000  # reject HTML error pages masquerading as .pkl


def main() -> None:
    parser = argparse.ArgumentParser(description="Download rf_pipeline.pkl from Google Drive.")
    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Download even if the file already exists (overwrites).",
    )
    args = parser.parse_args()

    app_dir = Path(__file__).resolve().parent.parent
    dest_dir = app_dir / "ai" / "model"
    dest = dest_dir / "rf_pipeline.pkl"

    dest_dir.mkdir(parents=True, exist_ok=True)

    if dest.is_file() and not args.force:
        print(f"download_rf_model: already exists — {dest} (use --force to replace)")
        return

    url = f"https://drive.google.com/uc?id={GOOGLE_DRIVE_FILE_ID}"
    print("download_rf_model: downloading from Google Drive …")
    gdown.download(url, str(dest), quiet=False)
    if not dest.is_file() or dest.stat().st_size < MIN_BYTES:
        print(
            "error: download failed or file is too small — "
            "check the Drive link is still public and try again.",
            file=sys.stderr,
        )
        if dest.is_file():
            dest.unlink()
        sys.exit(1)

    mb = dest.stat().st_size / 1_048_576
    print(f"download_rf_model: saved → {dest} ({mb:.1f} MiB)")


if __name__ == "__main__":
    main()
