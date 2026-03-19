# P1 — data_layer.py
# Loads all CSVs at startup and provides drug lookup functions
# Join key across all files: drugbank_id

import os
import pandas as pd
from fuzzywuzzy import process
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))

DATA_DIR = os.path.join(BASE_DIR, "data")


class DataLayer:
    def __init__(self):
        print("Loading DrugBank CSVs...")
        self.drugs     = pd.read_csv(f"{DATA_DIR}/drugs_core.csv")
        self.targets   = pd.read_csv(f"{DATA_DIR}/targets.csv")
        self.pathways  = pd.read_csv(f"{DATA_DIR}/pathways.csv")
        self.atc       = pd.read_csv(f"{DATA_DIR}/atc_codes.csv")

        # Build a lowercase name → drugbank_id index for fast lookup
        self._name_index = dict(
            zip(self.drugs["name"].str.lower(), self.drugs["drugbank_id"])
        )
        print(f"Loaded {len(self.drugs)} drugs.")

    def lookup_by_name(self, drug_name: str) -> dict | None:
        """
        Fuzzy match a drug name to a DrugBank ID.
        Returns the full drugs_core row as a dict, or None if not found.
        """
        name_lower = drug_name.strip().lower()

        # Exact match first
        if name_lower in self._name_index:
            drug_id = self._name_index[name_lower]
        else:
            # Fuzzy match — returns (best_match, score)
            best_match, score = process.extractOne(name_lower, self._name_index.keys())
            if score < 70:
                return None
            drug_id = self._name_index[best_match]

        row = self.drugs[self.drugs["drugbank_id"] == drug_id].iloc[0]
        return row.to_dict()

    def get_targets(self, drugbank_id: str) -> pd.DataFrame:
        """Returns all targets for a given drugbank_id."""
        return self.targets[self.targets["drugbank_id"] == drugbank_id]

    def get_pathways(self, drugbank_id: str) -> pd.DataFrame:
        """Returns all pathways for a given drugbank_id."""
        return self.pathways[self.pathways["drugbank_id"] == drugbank_id]

    def get_atc(self, drugbank_id: str) -> pd.DataFrame:
        """Returns ATC classification for a given drugbank_id."""
        return self.atc[self.atc["drugbank_id"] == drugbank_id]


# Singleton — imported by all other modules
data_layer = DataLayer()