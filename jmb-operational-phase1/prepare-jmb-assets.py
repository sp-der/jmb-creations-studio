#!/usr/bin/env python3
from __future__ import annotations
import argparse
import re
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required. Run: python3 -m pip install pillow") from exc

FOLDERS = {
    "Site": ("site", None),
    "Soap Dispenser": ("products/soap-dispensers", "soap (9)"),
    "Tap Wands": ("products/tap-wands", "wandsmain"),
    "Cosplay": ("products/cosplay", "cosplaymain"),
    "Cup Koozies": ("products/cup-koozies", "kooziemain"),
    "Shelves": ("products/shelves", "shelvesmain"),
}

FAMILY_META = {
    "soap-dispensers": ("Soap Dispensers", "Custom soap and lotion dispenser holders in the designs currently available."),
    "tap-wands": ("Tap Wands", "Character and themed tap wands available from JMB 2 Creations."),
    "cosplay": ("Cosplay Props", "Decorative costume and display props made for cosplay, photos, and collections."),
    "cup-koozies": ("Cup Koozies", "Sports and themed can koozies in the designs currently available."),
    "shelves": ("Display Shelves", "Custom shelves and display pieces for mini figures and collectibles."),
}

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"\bmain\b", "main", value)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "image"

def humanize(stem: str) -> str:
    cleaned = stem.replace("main", "").strip(" _-()")
    m = re.match(r"(.+?)\s*\((\d+)\)$", cleaned)
    if m:
        return f"{m.group(1).strip().title()} Design {m.group(2)}"
    cleaned = re.sub(r"[_-]+", " ", cleaned).strip()
    return cleaned.title() or "Design"

def open_rgb_or_rgba(path: Path) -> Image.Image:
    img = Image.open(path)
    img.load()
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        return img.convert("RGBA")
    return img.convert("RGB")

def resize_if_needed(img: Image.Image, max_side: int = 1600) -> Image.Image:
    w, h = img.size
    scale = min(1.0, max_side / max(w, h))
    if scale >= 1.0:
        return img
    return img.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)

def convert(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    img = resize_if_needed(open_rgb_or_rgba(source))
    img.save(destination, "WEBP", quality=82, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare JMB catalog assets as optimized WebP files.")
    parser.add_argument("source", nargs="?", default="JMB2C", help="Folder containing Site, Soap Dispenser, Tap Wands, etc.")
    parser.add_argument("--public", default="public/catalog", help="Output folder inside the website repo.")
    args = parser.parse_args()

    source_root = Path(args.source).resolve()
    out_root = Path(args.public).resolve()
    if not source_root.exists():
        raise SystemExit(f"Source folder not found: {source_root}")

    catalog: dict[str, dict] = {}
    site_assets: list[str] = []

    for source_name, (output_rel, main_stem) in FOLDERS.items():
        src_dir = source_root / source_name
        if not src_dir.exists():
            print(f"WARN: missing {src_dir}")
            continue
        dst_dir = out_root / output_rel
        dst_dir.mkdir(parents=True, exist_ok=True)

        files = sorted([p for p in src_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS], key=lambda p: p.name.lower())
        generated = []
        main_url = None

        for idx, src in enumerate(files, start=1):
            stem_lower = src.stem.lower()
            if source_name == "Site":
                match = re.search(r"(\d+)", src.stem)
                number = match.group(1) if match else str(idx)
                out_name = f"mainfloat-{number}.webp"
            elif main_stem and stem_lower == main_stem.lower():
                out_name = "main.webp"
            else:
                out_name = f"{slugify(src.stem)}.webp"

            dest = dst_dir / out_name
            convert(src, dest)
            url = "/" + str(dest.relative_to(Path.cwd() / "public")).replace("\\", "/") if str(dest).startswith(str(Path.cwd() / "public")) else "/catalog/" + output_rel.replace("\\", "/") + "/" + out_name

            if source_name == "Site":
                site_assets.append(url)
                continue

            is_explicit_family_main = out_name == "main.webp"
            is_soap_main_design = source_name == "Soap Dispenser" and stem_lower == "soap (9)"
            is_main = is_explicit_family_main or is_soap_main_design
            if is_main:
                main_url = url

            # Files explicitly named *main* are family cover images, not separate designs.
            # Soap (9) is both the chosen family cover and a real dispenser design, so it remains in the collection.
            if not is_explicit_family_main:
                generated.append({
                    "name": humanize(src.stem),
                    "slug": slugify(src.stem),
                    "image": url,
                    "sourceFile": src.name,
                    "isMain": is_soap_main_design,
                })

        if source_name != "Site":
            family_slug = output_rel.split("/")[-1]
            family_name, description = FAMILY_META[family_slug]
            if not main_url and generated:
                main_url = generated[0]["image"]
                generated[0]["isMain"] = True
            catalog[family_slug] = {
                "name": family_name,
                "description": description,
                "mainImage": main_url,
                "designs": generated,
            }

    # stable float order
    site_assets = sorted(site_assets)

    out_ts = Path.cwd() / "src/data/catalog-assets.ts"
    out_ts.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "// AUTO-GENERATED by prepare-jmb-assets.py. Re-run the script after changing product image folders.",
        "export type CatalogAssetDesign = { name: string; slug: string; image: string; sourceFile: string; isMain: boolean };",
        "export type CatalogAssetFamily = { name: string; description: string; mainImage: string; designs: CatalogAssetDesign[] };",
        "",
        f"export const HERO_FLOAT_IMAGES = {repr(site_assets).replace(chr(39), chr(34))} as const;",
        "",
        "export const CATALOG_ASSETS: Record<string, CatalogAssetFamily> = " + repr(catalog).replace("'", '"').replace(" True", " true").replace(": True", ": true").replace(" False", " false").replace(": False", ": false") + ";",
        "",
    ]
    # Python repr may emit None; normalize just in case.
    text = "\n".join(lines).replace("None", "null")
    out_ts.write_text(text, encoding="utf-8")

    print(f"Prepared assets in: {out_root}")
    print(f"Generated: {out_ts}")
    print(f"Hero floats: {len(site_assets)}")
    for slug, family in catalog.items():
        print(f"{slug}: {len(family['designs'])} images | main={family['mainImage']}")

if __name__ == "__main__":
    main()
