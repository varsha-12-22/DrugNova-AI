# backend/modules/sec_api.py
# Company + investment signals using SEC EDGAR full-text search API
# Docs: https://efts.sec.gov/LATEST/search-index?q=...
# Free, no API key needed

import requests
from backend.utils.contracts import ModuleResult, Source

EDGAR_SEARCH  = "https://efts.sec.gov/LATEST/search-index"
EDGAR_FULL    = "https://efts.sec.gov/LATEST/search-index"
EDGAR_COMPANY = "https://www.sec.gov/cgi-bin/browse-edgar"


def fetch_sec_signals(drug_name: str, max_results: int = 5) -> ModuleResult:
    """
    Searches SEC EDGAR full-text search for 10-K and 10-Q filings
    that mention the drug — reveals which companies are investing in it
    and any revenue/pipeline discussion.
    """
    findings = []
    sources  = []

    try:
        # Full-text search across all EDGAR filings
        params = {
            "q": f'"{drug_name}"',
            "dateRange": "custom",
            "startdt": "2020-01-01",
            "forms": "10-K,10-Q",
            "_source": "file_date,period_of_report,entity_name,file_num,form_type,biz_location",
            "hits.hits.total.value": max_results,
        }

        resp = requests.get(
            "https://efts.sec.gov/LATEST/search-index",
            params={
                "q": f'"{drug_name}"',
                "forms": "10-K,10-Q",
                "dateRange": "custom",
                "startdt": "2022-01-01",
            },
            timeout=10
        )

        data = resp.json()
        hits = data.get("hits", {}).get("hits", [])

        if hits:
            findings.append(f"Found {len(hits)} SEC filings mentioning '{drug_name}':")
            companies_seen = set()

            for h in hits[:max_results]:
                src       = h.get("_source", {})
                company   = src.get("entity_name", "Unknown company")
                form_type = src.get("form_type", "Filing")
                file_date = src.get("file_date", "?")
                period    = src.get("period_of_report", "?")

                if company not in companies_seen:
                    findings.append(
                        f"  {company} — {form_type} filed {file_date} (period: {period})"
                    )
                    companies_seen.add(company)

            findings.append(
                f"These companies are actively discussing '{drug_name}' in financial filings — "
                f"indicating pipeline investment or commercial activity."
            )
            sources.append(Source(
                label="SEC EDGAR Full-Text Search",
                url=f"https://efts.sec.gov/LATEST/search-index?q=%22{drug_name.replace(' ', '+')}%22&forms=10-K,10-Q"
            ))
        else:
            findings.append(f"No SEC filings found mentioning '{drug_name}' since 2022.")

    except Exception as e:
        findings.append(f"SEC EDGAR lookup failed: {str(e)}")

    if not findings:
        findings = [f"No SEC investment signals found for '{drug_name}'."]

    return ModuleResult(
        module="sec_signals",
        findings=findings,
        sources=sources
    )