# DrugNova AI 🔬
### Autonomous Drug Repurposing Platform

DrugNova AI accepts a drug name as input, computes biological similarity across 19,000+ approved and experimental compounds using gene targets and pathways, and generates a traceable repurposing opportunity report — identifying candidate diseases a drug could potentially treat beyond its current indication.

---

## How it works

```
User inputs drug name
        ↓
Fuzzy match → DrugBank ID
        ↓
Build feature vector (gene targets + pathways + ATC class)
        ↓
Cosine similarity across all 19,842 drugs
        ↓
Find top-N similar drugs with different disease areas
        ↓
Explain: which shared targets/pathways drove the score
        ↓
┌─────────────────────────────────────────────────┐
│          Parallel domain enrichment             │
│                                                 │
│  ClinicalTrials.gov — active trials             │
│  PubChem           — compound metadata          │
│  OpenFDA           — regulatory + recalls       │
│  PatentsView       — patent landscape           │
│  SEC EDGAR         — company investment signals │
│  CMS Medicare      — market size + spending     │
└─────────────────────────────────────────────────┘
        ↓
Return structured report with traceable citations
```

---

## Project Structure

```
DrugNova-AI/
├── data/                            # CSV files — local only, NOT on GitHub
│   ├── drugs_core.csv               # 19,842 rows — name, groups, indication, disease_area, MOA
│   ├── targets.csv                  # 34,931 rows — drugbank_id, gene_symbol, actions
│   ├── pathways.csv                 # 205,292 rows — drugbank_id, pathway_name, category
│   ├── atc_codes.csv                # 5,780 rows — drugbank_id, ATC hierarchy
│   ├── drug_interactions_part1.csv  # 900,000 rows
│   ├── drug_interactions_part2.csv  # 900,000 rows
│   ├── drug_interactions_part3.csv  # 900,000 rows
│   └── drug_interactions_part4.csv  # 211,156 rows
│
├── backend/
│   ├── modules/
│   │   ├── data_layer.py            # P1 — CSV loading + fuzzy drug name lookup
│   │   ├── interactions.py          # P2 — SQLite ingestion + interaction queries
│   │   ├── model.py                 # P3 — feature vectors + cosine similarity engine
│   │   ├── explainer.py             # P4 — traceable explanation generator
│   │   ├── external_apis.py         # P5 — ClinicalTrials.gov + PubChem
│   │   ├── regulatory_api.py        # P5 — OpenFDA regulatory scan
│   │   ├── patent_api.py            # P5 — PatentsView patent landscape
│   │   ├── sec_api.py               # P5 — SEC EDGAR investment signals
│   │   └── market_api.py            # P5 — CMS Medicare/Medicaid market size
│   ├── utils/
│   │   ├── contracts.py             # Shared data contracts — everyone imports this
│   │   └── db.py                    # SQLite connection helper
│   └── main.py                      # P6 — FastAPI server + /analyze endpoint
│
├── frontend/
│   └── src/
│       ├── index.html               # Main UI
│       ├── app.js                   # Drug input + report rendering
│       └── style.css                # Styles
│
├── scripts/
│   └── build_interactions_db.py     # Run once to build interactions.db from CSVs
│
├── .env.example                     # Copy to .env and fill in API keys
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Team & Branches

| Person | Branch | File(s) | Responsible For |
|--------|--------|---------|-----------------|
| P1 | `feature/data-layer` | `modules/data_layer.py` | Load CSVs, fuzzy drug name → drugbank_id lookup |
| P2 | `feature/interactions-db` | `modules/interactions.py` + `scripts/build_interactions_db.py` | SQLite ingestion + interaction queries |
| P3 | `feature/model` | `modules/model.py` | Feature vectors + cosine similarity engine |
| P4 | `feature/explainer` | `modules/explainer.py` | Traceable explanation from shared features |
| P5 | `feature/external-apis` | `modules/external_apis.py`, `regulatory_api.py`, `patent_api.py`, `sec_api.py`, `market_api.py` | All 5 external API integrations |
| P6 | `feature/api-server` | `backend/main.py` + `frontend/` | FastAPI endpoint + UI |

---

## API Modules

| Module | Source | Key needed? | What it provides |
|--------|--------|-------------|-----------------|
| Clinical trials | ClinicalTrials.gov | ✅ No | Active + completed trials for the drug |
| Compound metadata | PubChem | ✅ No | Molecular formula, weight, IUPAC name |
| Regulatory scan | OpenFDA | ✅ No | FDA approval, label info, recall history |
| Patent landscape | PatentsView | ⚠️ Yes* | Patent titles, assignees, filing dates |
| Investment signals | SEC EDGAR | ✅ No | Companies mentioning drug in 10-K/10-Q filings |
| Market size | CMS Medicare/Medicaid | ✅ No | Drug spending, claim counts, avg cost |

> *PatentsView new key grants temporarily suspended as of March 2026. Apply at patentsview.org/apis/keyrequest. Module skips gracefully if no key is set.

---

## Setup (every teammate)

### 1. Clone the repo
```bash
git clone https://github.com/varsha-12-22/DrugNova-AI.git
cd DrugNova-AI
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Open `.env` — add your PatentsView API key if you have one. Everything else works without a key.

### 4. Add data files
Download the 8 CSV files from the shared Google Drive and place them in `data/`

```bash
ls data/   # should show all 8 files
```

### 5. Build the interactions database (run once)
```bash
python scripts/build_interactions_db.py
```
Converts the 4 interaction CSVs (2.9M rows, 359MB) into a fast SQLite database.

---

## Running the app

```bash
# Start the backend (from project root)
uvicorn backend.main:app --reload

# API available at http://localhost:8000

# Test it
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"drug_name": "Metformin"}'
```

---

## Module Output Contract

Every module returns this shape. Import from `backend/utils/contracts.py`:

```python
{
  "module": "model",
  "findings": [
    "Metformin shares 4 gene targets with Drug X (approved for cancer): AMPK, TP53, MTOR, PRKAA1",
    "Shared pathways: Insulin Signaling, mTOR Signaling — both implicated in tumor growth"
  ],
  "sources": [
    {
      "label": "DrugBank targets — DB00331",
      "url": "https://go.drugbank.com/drugs/DB00331"
    }
  ],
  "score": 0.84
}
```

---

## Data Sources

| Source | Used For |
|--------|----------|
| DrugBank CSVs | Core drug biology — targets, pathways, indications |
| ClinicalTrials.gov API | Active trial enrichment |
| PubChem API | Compound metadata |
| OpenFDA API | Regulatory status + recall history |
| PatentsView API | Patent landscape + assignees |
| SEC EDGAR API | Company investment signals |
| CMS Medicare/Medicaid | Market size approximation |

---

## Key Design Decisions

**Why cosine similarity?**
Each drug is represented as a binary vector of gene targets + pathways. Cosine similarity finds drugs that share biology. Drugs with high similarity but different disease areas = repurposing candidates.

**Why SQLite for interactions?**
The 4 interaction CSV files total 359MB and 2.9M rows. Loading into pandas on every request would be too slow. SQLite with an index on `drugbank_id` gives instant lookups.

**Why traceable by design?**
Every repurposing suggestion maps directly back to the specific CSV rows that caused the similarity score. No black box — every claim has a source.

---

> Built for the Autonomous Research Orchestrator Hackathon
> Team: 6 members | Stack: Python · FastAPI · scikit-learn · React
