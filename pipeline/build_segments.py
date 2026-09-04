"""Build the Berkshire segment dataset from SEC EDGAR XBRL.

Berkshire tags its segment note two different ways in the same filing:

  Table A  segment axis alone -> a revenue-only disaggregation where insurance
           is folded together with corporate into `InsuranceCorporateAndOther`.
  Table B  segment axis + `srt:ConsolidationItemsAxis = OperatingSegmentsMember`
           -> the real operating-segment P&L, with insurance broken out on its
           own and a separate corporate reconciling line.

We use Table B exclusively. Mixing the two double-counts insurance: Table B's
seven segments plus the corporate reconciling item tie to consolidated revenue,
Table A's seven tie to the same total by a different cut.

The `companyfacts` API is no use here -- it strips XBRL dimensions, so it can
only ever return consolidated totals. The per-segment numbers exist solely in
each filing's raw instance document, which is what this script parses.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

CIK = 1067983
UA = "BuffettsEdge research contact@buffettsedge.com"

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "pipeline" / ".cache"
OUT = ROOT / "public" / "data"

XBRLI = "{http://www.xbrl.org/2003/instance}"
XBRLDI = "{http://xbrl.org/2006/xbrldi}"
NS = {"xbrli": "http://www.xbrl.org/2003/instance"}

SEG_AXIS = "us-gaap:StatementBusinessSegmentsAxis"
CI_AXIS = "srt:ConsolidationItemsAxis"
OPERATING = "us-gaap:OperatingSegmentsMember"

# The concepts worth carrying. Everything else in the segment note is either a
# subtotal we can recompute or a disclosure that doesn't trend usefully.
#
# Two eras. ASU 2023-07 expanded segment disclosure for fiscal years beginning
# after 2023-12-15, and Berkshire's tagging changed with it: earnings moved from
# `OperatingIncomeLoss` to the pre-tax-income concept, and costs, capex, D&A and
# tax appear per segment for the first time. Before 2024 only revenue and
# earnings exist at the segment level -- that is a real gap in the source data,
# not a parsing failure, so we record which basis each figure came from rather
# than silently splicing two different measures into one series.
CONCEPTS = {
    "Revenues": "revenue",
    "CostsAndExpenses": "costs",
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest": "pretax",
    "OperatingIncomeLoss": "pretax",
    "IncomeTaxExpenseBenefit": "tax",
    "DepreciationDepletionAndAmortization": "dna",
    "SegmentExpenditureAdditionToLongLivedAssets": "capex",
    "InterestExpense": "interest",
    "Goodwill": "goodwill",
    "AssetsExcludingGoodwill": "assets_ex_goodwill",
}

# When both earnings concepts appear, the post-ASU one wins.
PRETAX_PRECEDENCE = {
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest": 2,
    "OperatingIncomeLoss": 1,
}

# Berkshire renames and reshuffles members over the years; map every historical
# spelling onto one stable key so a multi-year series doesn't fracture.
SEGMENTS = {
    "BurlingtonNorthernSantaFeCorporation": ("bnsf", "BNSF Railway"),
    "BurlingtonNorthernSantaFeLlc": ("bnsf", "BNSF Railway"),
    "BerkshireHathawayEnergyCompany": ("bhe", "Berkshire Hathaway Energy"),
    "BerkshireHathawayInsuranceGroup": ("insurance", "Insurance Group"),
    "ManufacturingBusinesses": ("manufacturing", "Manufacturing"),
    "ServiceAndRetailingBusinesses": ("service_retail", "Service & Retailing"),
    "McLaneCompany": ("mclane", "McLane"),
    "PilotTravelCentersLLC": ("pilot", "Pilot Travel Centers"),
}


def get(url: str, binary: bool = False):
    """Fetch a URL, caching to disk. SEC asks for a descriptive UA and <=10 req/s."""
    key = re.sub(r"[^A-Za-z0-9._-]", "_", url.split("://", 1)[1])[-180:]
    path = CACHE / key
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            path.write_bytes(r.read())
        time.sleep(0.15)
    return path.read_bytes() if binary else path.read_text(encoding="utf-8", errors="replace")


@dataclass
class Filing:
    form: str
    accn: str
    period: str
    filed: str

    @property
    def folder(self) -> str:
        return f"https://www.sec.gov/Archives/edgar/data/{CIK}/{self.accn.replace('-', '')}"


def recent_filings(years: int) -> list[Filing]:
    """Periodic reports, newest first, from the submissions API."""
    data = json.loads(get(f"https://data.sec.gov/submissions/CIK{CIK:010d}.json"))
    rows: list[Filing] = []
    seen: set[str] = set()

    chunks = [data["filings"]["recent"]]
    for extra in data["filings"].get("files", []):
        chunks.append(json.loads(get(f"https://data.sec.gov/submissions/{extra['name']}")))

    cutoff = f"{int(time.strftime('%Y')) - years}-01-01"
    for chunk in chunks:
        for form, accn, period, filed in zip(
            chunk["form"], chunk["accessionNumber"],
            chunk["reportDate"], chunk["filingDate"],
        ):
            if form not in ("10-K", "10-Q") or filed < cutoff or accn in seen:
                continue
            seen.add(accn)
            rows.append(Filing(form, accn, period, filed))
    return sorted(rows, key=lambda f: f.filed, reverse=True)


def instance_url(f: Filing) -> str | None:
    """Locate the XBRL instance document inside a filing folder."""
    try:
        items = json.loads(get(f"{f.folder}/index.json"))["directory"]["item"]
    except Exception:
        return None
    names = [i["name"] for i in items]
    for n in names:
        if n.endswith("_htm.xml"):  # inline-XBRL extraction, the modern shape
            return f"{f.folder}/{n}"
    for n in names:
        if n.endswith(".xml") and not n.endswith(("_cal.xml", "_def.xml", "_lab.xml", "_pre.xml")):
            if not n.startswith("R") and "FilingSummary" not in n:
                return f"{f.folder}/{n}"
    return None


def period_kind(start: str, end: str) -> str:
    """Classify a duration as a quarter, a fiscal year, or a year-to-date stub."""
    from datetime import date
    d = (date.fromisoformat(end) - date.fromisoformat(start)).days
    if 80 <= d <= 100:
        return "Q"
    if 350 <= d <= 380:
        return "FY"
    return "YTD"


def parse(xml_bytes: bytes) -> dict:
    """Pull Table B facts out of one instance document."""
    root = ET.fromstring(xml_bytes)

    contexts = {}
    for c in root.iter(f"{XBRLI}context"):
        p = c.find("xbrli:period", NS)
        if p is None:
            continue
        start = p.findtext("xbrli:startDate", default="", namespaces=NS)
        end = p.findtext("xbrli:endDate", default="", namespaces=NS) or \
            p.findtext("xbrli:instant", default="", namespaces=NS)
        dims = {m.get("dimension"): (m.text or "") for m in c.iter(f"{XBRLDI}explicitMember")}
        contexts[c.get("id")] = (start, end, dims)

    out: dict = {}
    for el in root:
        if "}" not in el.tag:
            continue
        local = el.tag.split("}")[1]
        field_name = CONCEPTS.get(local)
        if field_name is None:
            continue

        ctx = contexts.get(el.get("contextRef") or "")
        if ctx is None:
            continue
        start, end, dims = ctx

        member = dims.get(SEG_AXIS)
        if not member:
            continue
        # Table B only: operating segments, no further slicing by product/subsegment.
        if dims.get(CI_AXIS) != OPERATING:
            continue
        if set(dims) - {SEG_AXIS, CI_AXIS}:
            continue

        seg = SEGMENTS.get(member.replace("brka:", "").replace("Member", ""))
        if seg is None:
            continue

        try:
            value = int(el.text)
        except (TypeError, ValueError):
            continue

        # Instant facts (goodwill, assets) carry no start date.
        kind = period_kind(start, end) if start else "instant"
        bucket = out.setdefault((start, end, kind), {}).setdefault(seg[0], {})

        if field_name == "pretax":
            rank = PRETAX_PRECEDENCE[local]
            if rank < bucket.get("_pretax_rank", 0):
                continue
            bucket["_pretax_rank"] = rank
            bucket["pretax_basis"] = "pretax_income" if rank == 2 else "operating_income"

        bucket[field_name] = value

    return out


ADDITIVE = ("revenue", "costs", "pretax", "tax", "dna", "capex", "interest")


def derive_q4(rows: list[dict]) -> list[dict]:
    """Q4 is never filed on its own -- the 10-K reports the full year.

    Subtracting the nine-month year-to-date figures from the fiscal year gives
    it. Only flow measures subtract; goodwill and assets are point-in-time and
    are carried from the year-end balance instead.
    """
    fy = {r["start"][:4]: r for r in rows if r["kind"] == "FY"}
    ytd9 = {
        r["start"][:4]: r for r in rows
        if r["kind"] == "YTD" and r["start"][5:7] == "01" and r["end"][5:7] == "09"
    }

    out = []
    for year, full in fy.items():
        stub = ytd9.get(year)
        if stub is None:
            continue

        segments = {}
        for key, annual in full["segments"].items():
            nine = stub["segments"].get(key)
            if nine is None:
                continue
            seg = {f: annual[f] - nine[f] for f in ADDITIVE
                   if f in annual and f in nine}
            for f in ("goodwill", "assets_ex_goodwill"):
                if f in annual:
                    seg[f] = annual[f]
            if "pretax_basis" in annual:
                seg["pretax_basis"] = annual["pretax_basis"]
            if seg:
                segments[key] = seg

        if not segments:
            continue
        out.append({
            "start": f"{year}-10-01",
            "end": f"{year}-12-31",
            "kind": "Q",
            "derived": "FY minus nine-month year-to-date",
            "segments": segments,
            "source": full["source"],
        })
    return out


def main() -> int:
    years = int(sys.argv[1]) if len(sys.argv) > 1 else 6

    filings = recent_filings(years)
    print(f"{len(filings)} periodic filings since {int(time.strftime('%Y')) - years}")

    periods: dict = {}
    sources: dict = {}

    for f in filings:
        url = instance_url(f)
        if not url:
            print(f"  !! {f.form} {f.period}: no instance document")
            continue
        try:
            facts = parse(get(url, binary=True))
        except ET.ParseError as e:
            print(f"  !! {f.form} {f.period}: {e}")
            continue

        new = 0
        for (start, end, kind), segs in facts.items():
            key = f"{start}_{end}"
            # Newest filing wins; older ones only fill gaps. Restatements matter.
            if key in periods:
                continue
            periods[key] = {"start": start, "end": end, "kind": kind, "segments": segs}
            sources[key] = {"form": f.form, "accn": f.accn, "filed": f.filed}
            new += 1
        print(f"  {f.form} {f.period:>10} filed {f.filed}  ->  {len(facts):2d} periods, {new} new")

    rows = sorted(periods.values(), key=lambda r: (r["end"], r["kind"]))
    for r in rows:
        r["source"] = sources.get(f"{r['start']}_{r['end']}")

    rows += derive_q4(rows)
    rows.sort(key=lambda r: (r["end"], r["kind"]))

    for r in rows:
        for seg in r["segments"].values():
            seg.pop("_pretax_rank", None)
            rev, pre = seg.get("revenue"), seg.get("pretax")
            if rev and pre is not None:
                seg["margin"] = round(pre / rev, 4)
        bases = {s.get("pretax_basis") for s in r["segments"].values() if s.get("pretax_basis")}
        r["basis"] = bases.pop() if len(bases) == 1 else ("mixed" if bases else None)

    payload = {
        "entity": "Berkshire Hathaway Inc.",
        "cik": CIK,
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "segments": [{"key": k, "label": lbl} for k, lbl in
                     dict(SEGMENTS.values()).items()],
        "periods": rows,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / "segments.json"
    dest.write_text(json.dumps(payload, indent=1), encoding="utf-8")

    quarters = [r for r in rows if r["kind"] == "Q"]
    print(f"\nwrote {dest.relative_to(ROOT)}  "
          f"{dest.stat().st_size / 1024:.0f} KB  "
          f"{len(rows)} periods ({len(quarters)} quarterly)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
