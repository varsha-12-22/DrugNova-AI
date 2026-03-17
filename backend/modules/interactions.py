# P2 — interactions.py
# Queries the SQLite interactions database built by scripts/build_interactions_db.py

from backend.utils.db import get_connection
from backend.utils.contracts import ModuleResult, Source


def get_interactions(drugbank_id: str, limit: int = 10) -> ModuleResult:
    """
    Returns top drug-drug interactions for a given drugbank_id.
    Queries the pre-built SQLite database — fast even on 2.9M rows.
    """
    conn = get_connection()
    rows = conn.execute(
        "SELECT interacting_drug_name, description FROM interactions WHERE drugbank_id = ? LIMIT ?",
        (drugbank_id, limit)
    ).fetchall()
    conn.close()

    findings = [f"{r['interacting_drug_name']}: {r['description']}" for r in rows]

    if not findings:
        findings = ["No interaction data found for this drug."]

    return ModuleResult(
        module="interactions",
        findings=findings,
        sources=[Source(
            label="DrugBank Drug Interactions",
            url=f"https://go.drugbank.com/drugs/{drugbank_id}/drug_interactions"
        )]
    )