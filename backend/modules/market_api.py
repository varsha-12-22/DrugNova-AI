# backend/modules/market_api.py
# Market size approximation using CMS Medicare Part D + Medicaid spending data
# Docs: https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug
# Free, no API key needed

import requests
from backend.utils.contracts import ModuleResult, Source

# CMS data.cms.gov uses a Socrata-style open data API
CMS_PART_D   = "https://data.cms.gov/resource/jznz-jg8e.json"   # Medicare Part D
CMS_MEDICAID = "https://data.cms.gov/resource/2u5j-ttfp.json"   # Medicaid


def fetch_market_data(drug_name: str) -> ModuleResult:
    """
    Fetches Medicare Part D and Medicaid spending data for a drug.
    Returns total spending, claim counts, and average cost per claim —
    used as a market size approximation.
    """
    findings = []
    sources  = []

    # --- Medicare Part D ---
    try:
        resp = requests.get(
            CMS_PART_D,
            params={
                "$where": f"upper(brnd_name) like '%{drug_name.upper()}%' OR upper(gnrc_name) like '%{drug_name.upper()}%'",
                "$limit": 5,
                "$order": "tot_spndng DESC"
            },
            timeout=10
        )
        rows = resp.json()

        if rows and isinstance(rows, list) and "brnd_name" in rows[0]:
            findings.append("Medicare Part D spending data:")
            for r in rows[:3]:
                brand     = r.get("brnd_name", drug_name)
                year      = r.get("year", "?")
                spending  = float(r.get("tot_spndng", 0))
                claims    = int(float(r.get("tot_clms", 0)))
                avg_cost  = float(r.get("avg_spnd_per_clm", 0))

                findings.append(
                    f"  {brand} ({year}): "
                    f"Total spending ${spending:,.0f} | "
                    f"Claims: {claims:,} | "
                    f"Avg cost/claim: ${avg_cost:,.2f}"
                )
            sources.append(Source(
                label="CMS Medicare Part D Drug Spending",
                url=f"https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicare-part-d-spending-by-drug"
            ))
        else:
            findings.append(f"No Medicare Part D spending data found for '{drug_name}'.")

    except Exception as e:
        findings.append(f"CMS Part D lookup failed: {str(e)}")

    # --- Medicaid ---
    try:
        resp = requests.get(
            CMS_MEDICAID,
            params={
                "$where": f"upper(drug_name) like '%{drug_name.upper()}%'",
                "$limit": 3,
                "$order": "total_spending DESC"
            },
            timeout=10
        )
        rows = resp.json()

        if rows and isinstance(rows, list) and "drug_name" in rows[0]:
            findings.append("Medicaid spending data:")
            for r in rows[:2]:
                name      = r.get("drug_name", drug_name)
                year      = r.get("year", "?")
                spending  = float(r.get("total_spending", 0))
                units     = float(r.get("total_units", 0))

                findings.append(
                    f"  {name} ({year}): "
                    f"Total spending ${spending:,.0f} | "
                    f"Units dispensed: {units:,.0f}"
                )
            sources.append(Source(
                label="CMS Medicaid Drug Spending",
                url="https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicaid-spending-by-drug"
            ))
        else:
            findings.append(f"No Medicaid spending data found for '{drug_name}'.")

    except Exception as e:
        findings.append(f"CMS Medicaid lookup failed: {str(e)}")

    if not findings:
        findings = [f"No market spending data found for '{drug_name}'."]

    return ModuleResult(
        module="market",
        findings=findings,
        sources=sources
    )