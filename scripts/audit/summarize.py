"""Print a compact per-page summary of crawled data (for auditing). Usage:
python3 -I scripts/audit/summarize.py [group] [--full=<path-substring>]
"""
import glob
import json
import sys

group = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
full = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--full=")), None)

for f in sorted(glob.glob("migration/crawl/pages/*.json")):
    d = json.load(open(f))
    if group and d.get("group") != group:
        continue
    path = d["url"].replace("https://www.myprojectusa.org", "") or "/"
    if full and full not in path:
        continue
    items = d.get("items", [])
    page_items = [i for i in items if i["section"].endswith("@page")]
    kinds = {}
    for i in page_items:
        kinds[i["kind"]] = kinds.get(i["kind"], 0) + 1
    ext = sorted({i.get("href") for i in page_items if i["kind"] == "button" and i.get("href") and "myprojectusa.org" not in i["href"]})
    ifr = [i.get("src", "")[:90] for i in page_items if i["kind"] == "iframe"]
    print(f"\n## {path}  [{d['status']}] final={d.get('finalUrl','').replace('https://www.myprojectusa.org','')}")
    print(f"   title: {d.get('title')} | desc: {(d.get('meta') or {}).get('description')}")
    print(f"   chars={len(d.get('mainText',''))} kinds={kinds} forms={len(d.get('forms',[]))} height={d.get('docHeight')}")
    if ext:
        print("   ext:", ext[:12])
    if ifr:
        print("   iframes:", ifr)
    if full:
        print(d.get("mainText", ""))
        for i in page_items:
            if i["kind"] in ("image", "button", "iframe", "gallery", "video"):
                print("  -", i["kind"], {k: (v[:120] if isinstance(v, str) else v) for k, v in i.items() if k in ("src", "text", "href", "alt", "rect", "titles", "descs")})
        for fm in d.get("forms", []):
            print("  FORM", json.dumps(fm)[:1500])
