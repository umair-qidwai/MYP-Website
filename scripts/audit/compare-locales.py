"""Compare server-rendered text of each Wix locale page against its English original.

Writes migration/crawl/locales.json with, per URL, whether the localized page differs
from English and a sample of differing lines. Rate-limited (1 request/second).
Usage: python3 -I scripts/audit/compare-locales.py
"""
import html
import json
import re
import time
import urllib.request

ORIGIN = "https://www.myprojectusa.org"
UA = "Mozilla/5.0 (Macintosh) MYP-migration-audit"
LOCALES = ["ar", "es", "fr", "ht", "so"]
OUT = "migration/crawl/locales.json"


def get(url):
    req = urllib.request.Request(url, headers={"user-agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def text_lines(doc):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", doc, flags=re.S)
    t = re.sub(r"<[^>]+>", "\n", t)
    t = html.unescape(t)
    return [l.strip() for l in t.split("\n") if l.strip()]


def locs(xml):
    return [html.unescape(m) for m in re.findall(r"<loc>([^<]+)</loc>", xml)]


def main():
    _, en_xml = get(f"{ORIGIN}/pages-sitemap.xml")
    en_urls = locs(en_xml)
    en_cache = {}
    results = []
    for loc in LOCALES:
        _, xml = get(f"{ORIGIN}/{loc}_{loc}-pages-sitemap.xml")
        for url in locs(xml):
            path = re.sub(rf"^{ORIGIN}/{loc}", "", url) or "/"
            en_url = ORIGIN + (path if path != "/" else "")
            if en_url not in en_cache:
                _, d = get(en_url)
                en_cache[en_url] = set(text_lines(d))
                time.sleep(1)
            status, d = get(url)
            lines = text_lines(d)
            diff = [l for l in lines if l not in en_cache[en_url] and len(l) > 2]
            results.append({"locale": loc, "url": url, "en": en_url, "status": status, "differs": len(diff), "sample": diff[:15]})
            print(loc, status, len(diff), url, flush=True)
            time.sleep(1)
    json.dump({"en_pages": len(en_urls), "results": results}, open(OUT, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
