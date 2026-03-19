# backend/modules/patent.py
# Patent landscape scan using Europe PMC API (Free, no API key required)
# Europe PMC searches across patents from EPO, USPTO, and WIPO via their web services.

import requests
from backend.utils.contracts import ModuleResult, Source

EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"

def fetch_patents(drug_name: str, max_results: int = 5) -> ModuleResult:
    """
    Searches for patents related to a drug name using Europe PMC.
    Returns patent titles, assignees (if available), and release dates.
    """
    findings = []
    sources = []

    try:
        # We use 'SRC:PAT' to filter only for patents
        query = f'"{drug_name}" AND SRC:PAT'
        params = {
            "query": query,
            "format": "json",
            "resultType": "core",
            "pageSize": max_results
        }

        response = requests.get(EUROPE_PMC_SEARCH, params=params, timeout=15)
        
        if not response.ok:
            return ModuleResult(
                module="patents",
                findings=[f"Europe PMC search failed with status {response.status_code}"],
                sources=[]
            )

        data = response.json()
        results = data.get("resultList", {}).get("result", [])

        if not results:
            findings.append(f"No patents found for '{drug_name}' in Europe PMC.")
        else:
            findings.append(f"Found {len(results)} patent records for '{drug_name}':")
            for r in results:
                title = r.get("title", "No title available")
                # Sometimes the title is a bit long, let's keep it tidy
                if len(title) > 150:
                    title = title[:147] + "..."
                
                patent_id = r.get("id", "Unknown ID")
                date = r.get("firstPublicationDate", "Unknown date")
                author = r.get("authorString", "Unknown Assignee")
                
                findings.append(
                    f"Patent {patent_id} ({date}): {title} | Assignee/Authors: {author}"
                )
            
            # Add general source
            sources.append(Source(
                label="Europe PMC Patent Database",
                url=f"https://europepmc.org/search?query=SRC%3APAT%20AND%20%22{drug_name.replace(' ', '%20')}%22"
            ))

    except Exception as e:
        findings.append(f"Patent lookup failed: {str(e)}")

    if not findings:
        findings = [f"No patent information available for '{drug_name}'."]

    return ModuleResult(
        module="patents",
        findings=findings,
        sources=sources
    )