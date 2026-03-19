import pandas as pd
from backend.modules.data_layer import data_layer
from backend.modules.model import model

with open("check_out_utf8.txt", "w", encoding="utf-8") as f:
    # Check Metformin
    target_groups = data_layer.targets.groupby("drugbank_id")["gene_symbol"].apply(lambda x: list(x.dropna()))
    pathway_groups = data_layer.pathways.groupby("drugbank_id")["pathway_name"].apply(lambda x: list(x.dropna()))

    f.write("Targets head:\n")
    f.write(str(target_groups.head()) + "\n")

    f.write("Pathways head:\n")
    f.write(str(pathway_groups.head()) + "\n")

    m = data_layer.lookup_by_name("Metformin")
    f.write(f"Metformin disease_area in data_layer: {m.get('disease_area')}\n")

    candidates, _ = model.find_candidates("DB00331")
    f.write(f"Number of candidates found: {len(candidates)}\n")
    for cand in candidates:
        f.write(f"  {cand.drug_name} - Score: {cand.similarity_score:.2f} - Disease Area: {cand.current_disease_area}\n")

    drugs = model.drug_meta
    f.write(f"Number of drugs with features: {len(drugs)}\n")
    if not drugs[drugs["drugbank_id"] == "DB00331"].empty:
        m_feat = drugs[drugs["drugbank_id"] == "DB00331"].iloc[0]
        f.write(f"Metformin features in model - Genes: {len(m_feat['gene_symbol'])}, Pathways: {len(m_feat['pathway_name'])}\n")
        f.write(f"Metformin genes: {m_feat['gene_symbol']}\n")
        f.write(f"Metformin pathways: {m_feat['pathway_name']}\n")
    else:
        f.write("Metformin not in model.drug_meta!\n")
