# P3 — model.py
# Builds drug feature vectors and computes cosine similarity for repurposing

import numpy as np
import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.modules.data_layer import data_layer
from backend.utils.contracts import RepurposingCandidate, Source


class RepurposingModel:
    def __init__(self):
        print("Building drug feature vectors...")
        self._build_feature_matrix()
        print("Model ready.")

    def _build_feature_matrix(self):
        """
        Builds a sparse binary matrix where each row is a drug and
        each column is a gene target, pathway name, or ATC code.
        """
        drugs = data_layer.drugs[["drugbank_id", "name", "disease_area"]].copy()

        # Gene targets per drug
        target_groups = (
            data_layer.targets
            .groupby("drugbank_id")["gene_symbol"]
            .apply(lambda x: list(x.dropna()))
        )

        # Pathways per drug
        pathway_groups = (
            data_layer.pathways
            .groupby("drugbank_id")["pathway_name"]
            .apply(lambda x: list(x.dropna()))
        )

        # ATC codes per drug (very helpful for biological context)
        atc_groups = (
            data_layer.atc
            .groupby("drugbank_id")["atc_code"]
            .apply(lambda x: list(x.dropna()))
        )

        drugs = drugs.join(target_groups, on="drugbank_id")
        drugs = drugs.join(pathway_groups, on="drugbank_id")
        drugs = drugs.join(atc_groups, on="drugbank_id")

        # Map approved uses and mechanism from drugs_core
        drugs["indication"] = data_layer.drugs["indication"]
        drugs["mechanism_of_action"] = data_layer.drugs["mechanism_of_action"]

        drugs["gene_symbol"]   = drugs["gene_symbol"].apply(lambda x: x if isinstance(x, list) else [])
        drugs["pathway_name"]  = drugs["pathway_name"].apply(lambda x: x if isinstance(x, list) else [])
        drugs["atc_code"]      = drugs["atc_code"].apply(lambda x: x if isinstance(x, list) else [])

        # Combine features — more diverse features = better similarity scores
        drugs["features"] = drugs.apply(
            lambda r: [f"gene:{g}" for g in r["gene_symbol"]] +
                      [f"path:{p}" for p in r["pathway_name"]] +
                      [f"atc:{a[:3]}" for a in r["atc_code"]], # Use level 3 ATC for better matching
            axis=1
        )

        # Only keep drugs with at least one feature
        drugs = drugs[drugs["features"].map(len) > 0].reset_index(drop=True)

        self.mlb = MultiLabelBinarizer(sparse_output=True)
        self.matrix = self.mlb.fit_transform(drugs["features"])
        self.drug_meta = drugs[["drugbank_id", "name", "disease_area", "gene_symbol", "pathway_name", "atc_code", "indication", "mechanism_of_action"]].reset_index(drop=True)
        self._id_to_idx = {did: i for i, did in enumerate(self.drug_meta["drugbank_id"])}

    def find_candidates(self, drugbank_id: str, top_n: int = 10) -> tuple[list[RepurposingCandidate], list[float]]:
        """
        Returns (top-N repurposing candidates, target_vector).
        Each candidate now includes a 3D vector for frontend visualization.
        """
        if drugbank_id not in self._id_to_idx:
            return [], [1, 0, 0]

        idx = self._id_to_idx[drugbank_id]
        query_vec = self.matrix[idx]
        scores = cosine_similarity(query_vec, self.matrix).flatten()

        # Get input drug's disease area
        input_meta = self.drug_meta.iloc[idx]
        input_disease = str(input_meta["disease_area"]).lower()

        # Rank by score, exclude self and same disease area
        ranked = np.argsort(scores)[::-1]
        candidates = []

        # Target vector for frontend (always normalized to standard orientation)
        target_vector = [1.0, 0.0, 0.0]

        for i in ranked:
            if i == idx:
                continue
            meta = self.drug_meta.iloc[i]
            candidate_disease = str(meta["disease_area"]).lower()

            # Skip if same disease area
            if candidate_disease == input_disease or candidate_disease == "nan":
                continue

            score = float(scores[i])

            # Generate a 3D vector representation for the frontend
            # The angle between this vector and [1,0,0] will match the cosine similarity
            angle = np.arccos(np.clip(score, -1.0, 1.0))
            # Shake it up with a hash to make it unique per drug
            z_jitter = (hash(meta["name"]) % 100) / 1000.0 # Small jitter in 3rd dim
            vec = [
                round(float(score), 4),
                round(float(np.sin(angle)), 4),
                round(z_jitter, 4)
            ]

            shared_targets = list(set(input_meta["gene_symbol"]) & set(meta["gene_symbol"]))

            candidates.append(RepurposingCandidate(
                drug_name=meta["name"],
                drugbank_id=meta["drugbank_id"],
                current_disease_area=meta["disease_area"],
                similarity_score=score,
                shared_targets=shared_targets,
                shared_pathways=[], # Simplifying for now
                atc_code=meta["atc_code"][0] if meta["atc_code"] else None,
                category=meta["disease_area"],
                mechanism=str(meta.get("mechanism_of_action", "Not specified"))[:300],
                indication=str(meta.get("indication", "Not specified"))[:300],
                vector=vec,
                sources=[Source(
                    label=f"DrugBank — {meta['drugbank_id']}",
                    url=f"https://go.drugbank.com/drugs/{meta['drugbank_id']}"
                )]
            ))

            if len(candidates) >= top_n:
                break

        return candidates, target_vector



# Singleton
model = RepurposingModel()