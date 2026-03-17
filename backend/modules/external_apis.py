# P5 — external_apis.py
# Fetches live data from ClinicalTrials.gov and PubChem

import requests
from backend.utils.contracts import ModuleResult, Source

CLINICALTRIALS_API = "https://clinicaltrials.gov/api/v2/studies"
PUBCHEM_API = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"


def fetch_clinical_trials(drug_name: str, max_results: int = 5) -> ModuleResult:
    """
    Fetches active/completed clinical trials for a drug from ClinicalTrials.gov.
    Free API, no key required.
    """
    try:
        params = {
            "query.term": drug_name,
            "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED",
            "pageSize": max_results,
            "format": "json"
        }
        response = requests.get(CLINICALTRIALS_API, params=params, timeout=10)
        data = response.json()

        studies = data.get("studies", [])
        findings = []

        for s in studies:
            proto = s.get("protocolSection", {})
            id_module = proto.get("identificationModule", {})
            status_module = proto.get("statusModule", {})
            conditions = proto.get("conditionsModule", {}).get("conditions", [])

            nct_id = id_module.get("nctId", "N/A")
            title  = id_module.get("briefTitle", "Untitled")
            status = status_module.get("overallStatus", "Unknown")
            conds  = ", ".join(conditions[:3]) if conditions else "Not specified"

            findings.append(
                f"{nct_id}: {title} | Status: {status} | Condition: {conds}"
            )

        if not findings:
            findings = [f"No active clinical trials found for {drug_name}."]

        return ModuleResult(
            module="clinical_trials",
            findings=findings,
            sources=[Source(
                label="ClinicalTrials.gov",
                url=f"https://clinicaltrials.gov/search?term={drug_name.replace(' ', '+')}"
            )]
        )

    except Exception as e:
        return ModuleResult(
            module="clinical_trials",
            findings=[f"Clinical trials lookup failed: {str(e)}"],
            sources=[]
        )


def fetch_pubchem(drug_name: str) -> ModuleResult:
    """
    Fetches compound metadata from PubChem.
    Free API, no key required.
    """
    try:
        url = f"{PUBCHEM_API}/compound/name/{requests.utils.quote(drug_name)}/JSON"
        response = requests.get(url, timeout=10)
        data = response.json()

        compound = data["PC_Compounds"][0]
        cid = compound["id"]["id"]["cid"]

        props = {p["urn"]["label"]: p["value"] for p in compound.get("props", []) if "label" in p.get("urn", {})}

        mol_formula = props.get("Molecular Formula", {}).get("sval", "N/A")
        mol_weight  = props.get("Molecular Weight", {}).get("fval", "N/A")
        iupac_name  = props.get("IUPAC Name", {}).get("sval", "N/A")

        findings = [
            f"PubChem CID: {cid}",
            f"Molecular formula: {mol_formula}",
            f"Molecular weight: {mol_weight}",
            f"IUPAC name: {iupac_name}",
        ]

        return ModuleResult(
            module="pubchem",
            findings=findings,
            sources=[Source(
                label="PubChem",
                url=f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"
            )]
        )

    except Exception as e:
        return ModuleResult(
            module="pubchem",
            findings=[f"PubChem lookup failed: {str(e)}"],
            sources=[]
        )