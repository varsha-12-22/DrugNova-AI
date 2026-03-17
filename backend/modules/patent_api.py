# backend/modules/patent_api.py
# Patent landscape scan using PatentsView PatentSearch API
# Docs: https://search.patentsview.org/docs/
# Requires API key: https://patentsview.org/apis/keyrequest
# Set PATENTSVIEW_API_KEY in your .env file

import os
import requests
from dotenv import load_dotenv
from backend.utils.contracts import ModuleResult, Source

load_dotenv()

API_KEY = os.getenv("PATENTSVIEW_API_KEY", "")
BASE_URL = "https://search.patentsview.org/api/v1/patent/"


def fetch_patents(drug_name: str, max_results: int = 5) -> ModuleResult:
    """
    Searches for patents related to a drug name.
    Returns patent titles, assignees (companies), dates, and IDs.
    Falls back gracefully if no API key is set.
    """
    if not API_KEY:
        return ModuleResult(
            module="patents",
            findings=["PatentsView API key not configured. Add PATENTSVIEW_API_KEY to .env"],
            sources=[]
        )

    try:
        headers = {"X-Api-Key": API_KEY}

        # Search patents whose abstract contains the drug name
        params = {
            "q": f'{{"_text_any":{{"patent_abstract":"{drug_name}"}}}}',
            "f": '["patent_id","patent_title","patent_date","assignees.assignee_organization","patent_abstract"]',
            "o": f'{{"size":{max_results},"sort":[{{"patent_date":"desc"}}]}}'
        }

        response = requests.get(BASE_URL, headers=headers, params=params, timeout=10)

        if response.status_code == 429:
            return ModuleResult(
                module="patents",
                findings=["PatentsView rate limit hit — try again in a minute."],
                sources=[]
            )

        data = response.json()
        patents = data.get("patents", [])
        findings = []

        for p in patents:
            patent_id   = p.get("patent_id", "N/A")
            title       = p.get("patent_title", "Untitled")
            date        = p.get("patent_date", "Unknown date")
            assignees   = p.get("assignees", [])
            orgs        = ", ".join(
                a.get("assignee_organization", "Unknown") for a in assignees if a.get("assignee_organization")
            ) or "No assignee listed"

            findings.append(
                f"Patent {patent_id} ({date}): {title} | Held by: {orgs}"
            )

        if not findings:
            findings = [f"No patents found for '{drug_name}' in PatentsView."]

        return ModuleResult(
            module="patents",
            findings=findings,
            sources=[Source(
                label="PatentsView PatentSearch API",
                url=f"https://search.patentsview.org/query/?q={{\"_text_any\":{{\"patent_abstract\":\"{drug_name}\"}}}}"
            )]
        )

    except Exception as e:
        return ModuleResult(
            module="patents",
            findings=[f"Patent lookup failed: {str(e)}"],
            sources=[]
        )