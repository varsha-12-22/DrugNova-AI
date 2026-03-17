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
        each column is a gene target or pathway name.
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

        drugs = drugs.join(target_groups, on="drugbank_id")
        drugs = drugs.join(pathway_groups, on="drugbank_id")
        drugs["gene_symbol"]   = drugs["gene_symbol"].apply(lambda x: x if isinstance(x, list) else [])
        drugs["pathway_name"]  = drugs["pathway_name"].apply(lambda x: x if isinstance(x, list) else [])

        # Combine features: prefix to avoid collisions
        drugs["features"] = drugs.apply(
            lambda r: [f"gene:{g}" for g in r["gene_symbol"]] +
                      [f"path:{p}" for p in r["pathway_name"]],
            axis=1
        )

        # Only keep drugs with at least one feature
        drugs = drugs[drugs["features"].map(len) > 0].reset_index(drop=True)

        self.mlb = MultiLabelBinarizer(sparse_output=True)
        self.matrix = self.mlb.fit_transform(drugs["features"])
        self.drug_meta = drugs[["drugbank_id", "name", "disease_area", "gene_symbol", "pathway_name"]].reset_index(drop=True)
        self._id_to_idx = {did: i for i, did in enumerate(self.drug_meta["drugbank_id"])}

    def find_candidates(self, drugbank_id: str, top_n: int = 10) -> list[RepurposingCandidate]:
        """
        Returns top-N repurposing candidates — drugs with high biological
        similarity but different disease areas.
        """
        if drugbank_id not in self._id_to_idx:
            return []

        idx = self._id_to_idx[drugbank_id]
        query_vec = self.matrix[idx]
        scores = cosine_similarity(query_vec, self.matrix).flatten()

        # Get input drug's disease area
        input_meta = self.drug_meta.iloc[idx]
        input_disease = str(input_meta["disease_area"]).lower()

        # Rank by score, exclude self and same disease area
        ranked = np.argsort(scores)[::-1]
        candidates = []

        for i in ranked:
            if i == idx:
                continue
            meta = self.drug_meta.iloc[i]
            candidate_disease = str(meta["disease_area"]).lower()

            # Skip if same disease area (not a repurposing opportunity)
            if candidate_disease == input_disease or candidate_disease == "nan":
                continue

            # Find shared features
            input_genes    = set(input_meta["gene_symbol"])
            candidate_genes = set(meta["gene_symbol"])
            shared_targets = list(input_genes & candidate_genes)

            input_paths     = set(input_meta["pathway_name"])
            candidate_paths = set(meta["pathway_name"])
            shared_pathways = list(input_paths & candidate_paths)

            candidates.append(RepurposingCandidate(
                drug_name=meta["name"],
                drugbank_id=meta["drugbank_id"],
                current_disease_area=meta["disease_area"],
                similarity_score=float(scores[i]),
                shared_targets=shared_targets,
                shared_pathways=shared_pathways,
                sources=[Source(
                    label=f"DrugBank — {meta['drugbank_id']}",
                    url=f"https://go.drugbank.com/drugs/{meta['drugbank_id']}"
                )]
            ))

            if len(candidates) >= top_n:
                break

        return candidates


# Singleton
model = RepurposingModel()