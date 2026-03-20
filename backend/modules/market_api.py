# backend/modules/market_api.py
# Market intelligence using FDA adverse event signal
# CMS Part D and Medicaid APIs removed — unreliable response

import requests
from backend.utils.contracts import ModuleResult, Source

def fetch_market_data(drug_name: str) -> ModuleResult:
    """
    Returns FDA adverse event report count as a market size proxy.
    High report count = widespread clinical use = large market.
    """
    findings = []
    sources  = []

    try:
        resp = requests.get(
            "https://api.fda.gov/drug/event.json",
            params={
                "search": f'patient.drug.medicinalproduct:"{drug_name}"',
                "limit": 1
            },
            timeout=10
        )
        if resp.ok and resp.text.strip():
            data = resp.json()
            total = data.get("meta", {}).get("results", {}).get("total", 0)
            if total:
                findings.append(
                    f"FDA adverse event reports: {total:,} reports mentioning '{drug_name}' — "
                    f"high report count correlates with widespread clinical use."
                )
                sources.append(Source(
                    label="FDA FAERS — Adverse Event Reporting System",
                    url=f"https://www.fda.gov/drugs/questions-and-answers-fdas-adverse-event-reporting-system-faers"
                ))
            else:
                findings.append(f"No FDA adverse event records found for '{drug_name}'.")
        else:
            findings.append(f"FDA adverse event data currently unavailable for '{drug_name}'.")

    except Exception as e:
        findings.append(f"Market data lookup failed: {str(e)}")

    if not findings:
        findings = [f"No market data available for '{drug_name}'."]

    return ModuleResult(
        module="market",
        findings=findings,
        sources=sources
    )