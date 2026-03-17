# backend/modules/regulatory_api.py
# Regulatory scan using OpenFDA API
# Docs: https://open.fda.gov/apis/
# Free, no API key needed

import requests
from backend.utils.contracts import ModuleResult, Source

OPENFDA_DRUG_LABEL  = "https://api.fda.gov/drug/label.json"
OPENFDA_ENFORCEMENT = "https://api.fda.gov/drug/enforcement.json"
OPENFDA_EVENT       = "https://api.fda.gov/drug/event.json"


def fetch_regulatory(drug_name: str) -> ModuleResult:
    """
    Fetches regulatory status, label info, and recall/enforcement history
    for a drug from OpenFDA.
    """
    findings = []
    sources  = []

    # --- Drug label (approval, indications, warnings) ---
    try:
        resp = requests.get(
            OPENFDA_DRUG_LABEL,
            params={"search": f'openfda.brand_name:"{drug_name}"', "limit": 1},
            timeout=10
        )
        data = resp.json()
        results = data.get("results", [])

        if results:
            r = results[0]
            fda_info   = r.get("openfda", {})
            brand      = fda_info.get("brand_name", [drug_name])[0]
            generic    = fda_info.get("generic_name", ["N/A"])[0]
            route      = fda_info.get("route", ["N/A"])[0]
            manuf      = fda_info.get("manufacturer_name", ["N/A"])[0]
            purpose    = r.get("indications_and_usage", ["Not listed"])[0][:300]
            warnings   = r.get("warnings", ["None listed"])[0][:200]

            findings += [
                f"Brand name: {brand} | Generic: {generic}",
                f"Route of administration: {route} | Manufacturer: {manuf}",
                f"FDA-approved indication: {purpose}...",
                f"Key warnings: {warnings}...",
            ]
            sources.append(Source(
                label="OpenFDA Drug Label",
                url=f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:\"{drug_name}\"&limit=1"
            ))
        else:
            findings.append(f"No FDA label found for '{drug_name}'.")

    except Exception as e:
        findings.append(f"FDA label lookup failed: {str(e)}")

    # --- Enforcement / recall history ---
    try:
        resp = requests.get(
            OPENFDA_ENFORCEMENT,
            params={"search": f'product_description:"{drug_name}"', "limit": 3},
            timeout=10
        )
        data = resp.json()
        recalls = data.get("results", [])

        if recalls:
            findings.append(f"Recall/enforcement actions found: {len(recalls)}")
            for rc in recalls[:2]:
                findings.append(
                    f"  Recall ({rc.get('recall_initiation_date','?')}): "
                    f"{rc.get('reason_for_recall','No reason listed')[:150]}"
                )
            sources.append(Source(
                label="OpenFDA Enforcement",
                url=f"https://api.fda.gov/drug/enforcement.json?search=product_description:\"{drug_name}\"&limit=3"
            ))
        else:
            findings.append("No recall or enforcement actions found.")

    except Exception:
        pass  # Enforcement data is optional — don't fail the whole module

    if not findings:
        findings = [f"No regulatory data found for '{drug_name}'."]

    return ModuleResult(
        module="regulatory",
        findings=findings,
        sources=sources
    )