from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Source:
    label: str
    url: str


@dataclass
class ModuleResult:
    module: str
    findings: List[str]
    sources: List[Source] = field(default_factory=list)
    score: Optional[float] = None

    def to_dict(self):
        return {
            "module": self.module,
            "findings": self.findings,
            "sources": [{"label": s.label, "url": s.url} for s in self.sources],
            "score": self.score,
        }


@dataclass
class RepurposingCandidate:
    drug_name: str
    drugbank_id: str
    current_disease_area: str
    similarity_score: float
    shared_targets: List[str]
    shared_pathways: List[str]
    sources: List[Source] = field(default_factory=list)

    def to_dict(self):
        return {
            "drug_name": self.drug_name,
            "drugbank_id": self.drugbank_id,
            "current_disease_area": self.current_disease_area,
            "similarity_score": round(self.similarity_score, 4),
            "shared_targets": self.shared_targets,
            "shared_pathways": self.shared_pathways,
            "sources": [{"label": s.label, "url": s.url} for s in self.sources],
        }


@dataclass
class AnalysisReport:
    input_drug: str
    drugbank_id: str
    current_indication: str
    current_disease_area: str
    repurposing_candidates: List[RepurposingCandidate]
    interaction_warnings: List[str]
    clinical_trials: List[dict]
    module_results: List[ModuleResult] = field(default_factory=list)

    def to_dict(self):
        return {
            "input_drug": self.input_drug,
            "drugbank_id": self.drugbank_id,
            "current_indication": self.current_indication,
            "current_disease_area": self.current_disease_area,
            "repurposing_candidates": [c.to_dict() for c in self.repurposing_candidates],
            "interaction_warnings": self.interaction_warnings,
            "clinical_trials": self.clinical_trials,
            "module_results": [m.to_dict() for m in self.module_results],
        }