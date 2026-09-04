# Buffett's Edge

Berkshire Hathaway's **operating businesses**, charted from the filings — BNSF,
Berkshire Hathaway Energy, the insurance group, manufacturing, McLane, Pilot and
service & retailing.

Every other Berkshire tracker covers the ~$260B equity portfolio, because a 13F
is one clean quarterly download. That portfolio is a minority of a company with
over a trillion in assets. The operating segments are the rest, and nobody
charts them.

## Layout

| Path | What it does |
| --- | --- |
| `pipeline/build_segments.py` | Fetches every 10-Q/10-K from SEC EDGAR, parses the XBRL, writes `public/data/segments.json`. |
| `src/lib/data.ts` | Types, quarter helpers, trailing-twelve-month math. |
| `src/components/TrendChart.tsx` | One parameterised Recharts wrapper for all four chart shapes. |
| `src/App.tsx` | The page. |
| `.github/workflows/refresh.yml` | Daily rebuild; commits only when the data actually changes. |

## Data

SEC EDGAR only. No vendor feed, no API key, no cost. The SEC asks for a
descriptive `User-Agent` and no more than 10 requests/second; both are handled
in `pipeline/build_segments.py`, which also caches every download to
`pipeline/.cache/` so re-runs hit the network once.

```bash
python pipeline/build_segments.py 10   # 10 years of filings
```

### Three things worth knowing about the source

**`companyfacts` is a dead end.** The obvious API strips XBRL dimensions, so it
can only return consolidated totals. The `SegmentReportingInformation*` concepts
that look right were deprecated in 2013 and stop there. Per-segment numbers
exist *only* inside each filing's raw instance document, which is why this
parses 7MB of XML per filing instead of calling a tidy endpoint.

**Berkshire tags its segment note twice.** Once as a revenue disaggregation that
folds insurance in with corporate, once as a true operating-segment P&L with
insurance standalone. Only the second is used here — mixing them double-counts
insurance by ~$26B a quarter. The rule is
`srt:ConsolidationItemsAxis = us-gaap:OperatingSegmentsMember`; those seven
segments plus the corporate reconciling line tie to consolidated revenue exactly.

**Earnings changed basis in 2024.** ASU 2023-07 expanded segment disclosure for
fiscal years beginning after 2023-12-15. Berkshire moved from
`OperatingIncomeLoss` to pre-tax income, and costs, capex, D&A and tax appear per
segment for the first time. Each period records which basis it used rather than
splicing two different measures into one series.

Fourth quarters are derived — the 10-K reports the full year, not Q4 — as
annual less nine-month year-to-date. They reconcile to the cent.

## Develop

```bash
npm install
npm run dev
```

## Deploy

Vercel, framework preset Vite, no environment variables. The site is fully
static: the nightly Action commits fresh JSON, which triggers a redeploy.
