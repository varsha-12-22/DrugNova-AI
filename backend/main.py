# P6 — main.py
# FastAPI server — wires all modules into a single /analyze endpoint
# Trigger uvicorn reload to load new CSVs

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.modules.data_layer import data_layer
from backend.modules.model import model
from backend.modules.explainer import explain_candidates
from backend.modules.interactions import get_interactions
from backend.modules.external_apis import fetch_clinical_trials, fetch_pubchem
from backend.modules.patent import fetch_patents
from backend.modules.regulatory_api import fetch_regulatory

from backend.modules.market_api import fetch_market_data
from backend.utils.contracts import AnalysisReport

app = FastAPI(title="DrugNova AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    drug_name: str
    top_n: int = 10


@app.get("/")
def root():
    return {"status": "DrugNova AI is running"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    # Step 1 — Resolve drug name to DrugBank ID
    drug_data = data_layer.lookup_by_name(req.drug_name)
    if not drug_data:
        raise HTTPException(status_code=404, detail=f"Drug '{req.drug_name}' not found in DrugBank.")

    drugbank_id = drug_data["drugbank_id"]

    # Step 2 — Find repurposing candidates via cosine similarity
    candidates, target_vector = model.find_candidates(drugbank_id, top_n=req.top_n)

    # Step 3 — Generate traceable explanations
    explanation = explain_candidates(drug_data["name"], drugbank_id, candidates)

    # Step 4 — Fetch interaction warnings
    interactions = get_interactions(drugbank_id)

    # Step 5 — Enrich with live clinical trials
    trials = fetch_clinical_trials(drug_data["name"])

    # Step 6 — PubChem compound metadata
    pubchem = fetch_pubchem(drug_data["name"])

    # Step 7 — Patent landscape (Europe PMC)
    patents = fetch_patents(drug_data["name"])

    # Step 8 — Regulatory scan (OpenFDA)
    regulatory = fetch_regulatory(drug_data["name"])



    # Step 10 — Market size (CMS spending)
    market = fetch_market_data(drug_data["name"])

    # Step 11 — Assemble final report
    report = AnalysisReport(
        input_drug=drug_data["name"],
        drugbank_id=drugbank_id,
        current_indication=str(drug_data.get("indication", ""))[:500],
        current_disease_area=str(drug_data.get("disease_area", "")),
        repurposing_candidates=candidates,
        interaction_warnings=interactions.findings,
        clinical_trials=[{"info": f} for f in trials.findings],
        target_vector=target_vector,
        module_results=[explanation, interactions, trials, pubchem,
                        patents, regulatory, market],
    )

    return report.to_dict()


@app.get("/drug/{drug_name}")
def get_drug(drug_name: str):
    drug_data = data_layer.lookup_by_name(drug_name)
    if not drug_data:
        raise HTTPException(status_code=404, detail=f"Drug '{drug_name}' not found.")
    return drug_data