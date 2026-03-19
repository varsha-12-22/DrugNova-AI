# backend/modules/market_api.py
# Market size approximation using CMS Medicare/Medicaid data + OpenFDA breadth signals
# Free, no API key needed

import requests
from backend.utils.contracts import ModuleResult, Source

# CMS.gov Data (Medicare/Medicaid spending)
CMS_PART_D   = "https://data.cms.gov/resource/jznz-jg8e.json"   # Medicare Part D
CMS_MEDICAID = "https://data.cms.gov/resource/2u5j-ttfp.json"   # Medicaid

# OpenFDA (Market breadth/usage)
OPENFDA_NDC   = "https://api.fda.gov/drug/ndc.json"
OPENFDA_EVENT = "https://api.fda.gov/drug/event.json"

def fetch_market_data(drug_name: str) -> ModuleResult:
    """
    Approximates market size using Actual Spending (CMS) and 
    Usage Breadth (OpenFDA NDC/Events).
    """
    findings = []
    sources  = []
    safe_name = drug_name.upper().replace("'", "''")

    # --- 1. CMS Medicare Part D Spending ---
    try:
        resp = requests.get(
            CMS_PART_D,
            params={
                "$where": f"upper(brnd_name) like '%{safe_name}%' OR upper(gnrc_name) like '%{safe_name}%'",
                "$limit": 3,
                "$order": "tot_spndng DESC"
            },
            timeout=10
        )
        rows = resp.json()

        if rows and isinstance(rows, list) and len(rows) > 0 and "brnd_name" in rows[0]:
            findings.append("Medicare Part D spending data:")
            for r in rows:
                brand     = r.get("brnd_name", drug_name)
                year      = r.get("year", "?")
                spending  = float(r.get("tot_spndng") or 0)
                claims    = int(float(r.get("tot_clms") or 0))
                avg_cost  = float(r.get("avg_spnd_per_clm") or 0)

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
    except Exception as e:
        findings.append(f"CMS Part D lookup partial failed/skipped: {str(e)}")

    # --- 2. CMS Medicaid Spending ---
    try:
        resp = requests.get(
            CMS_MEDICAID,
            params={
                "$where": f"upper(drug_name) like '%{safe_name}%'",
                "$limit": 2,
                "$order": "total_spending DESC"
            },
            timeout=10
        )
        rows = resp.json()

        if rows and isinstance(rows, list) and len(rows) > 0 and "drug_name" in rows[0]:
            findings.append("Medicaid spending data:")
            for r in rows:
                name      = r.get("drug_name", drug_name)
                year      = r.get("year", "?")
                spending  = float(r.get("total_spending") or 0)
                units     = float(r.get("total_units") or 0)

                findings.append(
                    f"  {name} ({year}): "
                    f"Total spending ${spending:,.0f} | "
                    f"Units dispensed: {units:,.0f}"
                )
            sources.append(Source(
                label="CMS Medicaid Drug Spending",
                url="https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicaid-spending-by-drug"
            ))
    except Exception as e:
        findings.append(f"CMS Medicaid lookup partial failed/skipped: {str(e)}")

    # --- 3. OpenFDA Breadth (Events + NDC) ---
    try:
        # Event count search
        resp = requests.get(
            OPENFDA_EVENT,
            params={
                "search": f'patient.drug.medicinalproduct:"{drug_name}"',
                "limit": 1
            },
            timeout=10
        )
        data = resp.json()
        event_total = data.get("meta", {}).get("results", {}).get("total", 0)

        if event_total:
            findings.append(
                f"FDA usage signal: {event_total:,} adverse event records found. "
                f"High volume correlates with widespread clinical use."
            )
            sources.append(Source(
                label="OpenFDA Adverse Events",
                url=f"https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:\"{drug_name}\"&limit=1"
            ))
    except (requests.exceptions.RequestException, ValueError):
        pass # Optional signal

    if not findings:
        findings = [f"No detailed market spending or usage data found for '{drug_name}'."]

    return ModuleResult(
        module="market",
        findings=findings,
        sources=sources
    )