#!/usr/bin/env python3
"""Produce checked APK metadata for a signed release; does not store any signing secret."""
import argparse
import hashlib
import json
import re
from pathlib import Path


def build_metadata(gradle_file: Path, apk_file: Path, metadata_file: Path, repo: str):
    if repo != "markgwapo123/studentmate-frontend":
        raise ValueError("Unexpected repository: edit the pinned release URL in ApkUpdater.java first")
    gradle = gradle_file.read_text(encoding="utf-8")
    code_match = re.search(r"\bversionCode\s+(\d+)\b", gradle)
    name_match = re.search(r"\bversionName\s+['\"](\d+(?:\.\d+){1,3})['\"]", gradle)
    if not code_match or not name_match:
        raise ValueError("Missing Android versionCode or versionName")
    code, name = int(code_match.group(1)), name_match.group(1)
    if code <= 0:
        raise ValueError("Invalid Android versionCode")
    if metadata_file.is_file():
        old = json.loads(metadata_file.read_text(encoding="utf-8"))
        if old.get("published") and code <= int(old.get("versionCode", 0)):
            raise ValueError("Increase versionCode before publishing a new signed APK")
    if not apk_file.is_file() or apk_file.stat().st_size < 1000:
        raise ValueError("Missing or empty APK")
    with apk_file.open("rb") as f:
        if f.read(2) != b"PK":
            raise ValueError("Not a ZIP/APK package")
    digest = hashlib.sha256(apk_file.read_bytes()).hexdigest()
    return {
        "published": True,
        "version": name,
        "versionCode": code,
        "apkUrl": f"https://github.com/{repo}/releases/download/v{name}/StudentMate-v{name}.apk",
        "sha256": digest,
        "apkSizeBytes": apk_file.stat().st_size,
        "notes": "Android improvements and bug fixes, including the in-app APK update checker.",
        "required": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--gradle", type=Path, required=True)
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--repository", required=True)
    args = parser.parse_args()
    info = build_metadata(args.gradle, args.apk, args.metadata, args.repository)
    args.metadata.parent.mkdir(parents=True, exist_ok=True)
    args.metadata.write_text(json.dumps(info, indent=2) + "\n", encoding="utf-8")
    print("Prepared signed APK feed for v" + info["version"] + ", versionCode " + str(info["versionCode"]))


if __name__ == "__main__":
    main()
