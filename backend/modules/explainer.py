# P4 — explainer.py
# Generates traceable human-readable explanations for repurposing candidates

from backend.utils.contracts import RepurposingCandidate, ModuleResult, Source


def explain_candidates(
    input_drug: str,
    input_drugbank_id: str,
    candidates: list[RepurposingCandidate]
) -> ModuleResult:
    """
    Takes repurposing candidates and produces plain-English findings
    where every claim traces back to a specific shared feature (gene/pathway).
    """
    findings = []

    for c in candidates:
        lines = []
        lines.append(
            f"{c.drug_name} (currently used for: {c.current_disease_area}) "
            f"shows biological similarity to {input_drug} — similarity score: {c.similarity_score:.2f}"
        )

        if c.shared_targets:
            targets_str = ", ".join(c.shared_targets[:5])
            lines.append(
                f"  → Shared gene targets: {targets_str} "
                f"[Source: DrugBank targets.csv — {input_drugbank_id} & {c.drugbank_id}]"
            )

        if c.shared_pathways:
            paths_str = ", ".join(c.shared_pathways[:3])
            lines.append(
                f"  → Shared pathways: {paths_str} "
                f"[Source: DrugBank pathways.csv — {input_drugbank_id} & {c.drugbank_id}]"
            )

        if not c.shared_targets and not c.shared_pathways:
            lines.append("  → Similarity driven by overlapping ATC therapeutic class.")

        findings.append("\n".join(lines))

    if not findings:
        findings = [f"No repurposing candidates found for {input_drug}."]

    sources = [
        Source("DrugBank targets.csv", f"https://go.drugbank.com/drugs/{input_drugbank_id}"),
        Source("DrugBank pathways.csv", f"https://go.drugbank.com/drugs/{input_drugbank_id}/pathways"),
    ]

    return ModuleResult(
        module="explainer",
        findings=findings,
        sources=sources
    )