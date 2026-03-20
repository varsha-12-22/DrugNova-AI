# backend/modules/patent.py
# Patent lookup using FDA Orange Book dataset (local CSV file)
# Source: data/patents_all.csv

import pandas as pd
from datetime import datetime
from rapidfuzz import process, fuzz
from backend.utils.contracts import ModuleResult, Source

# ── Load patent data at startup (once) ────────────────────────────────────────
def _load_data():
    path = "data/patents_all.csv"
    try:
        df = pd.read_csv(path, low_memory=False)
        df.columns = df.columns.str.strip()

        # master sheet = main patent records
        master = df[df["_sheet"] == "master"].copy()

        # cliff sheet = patents expiring within 3 years
        cliff  = df[df["_sheet"] == "cliff"].copy()

        print(f"  Patent data loaded: {len(master):,} master records, {len(cliff):,} cliff records")
        return master, cliff
    except Exception as e:
        print(f"  WARNING: Could not load patent data: {e}")
        return pd.DataFrame(), pd.DataFrame()

master_df, cliff_df = _load_data()

_ingredients = master_df["Ingredient"].dropna().str.upper().unique().tolist() if not master_df.empty else []
_trade_names  = master_df["Trade Name"].dropna().str.upper().unique().tolist()  if not master_df.empty else []

def _find_drug_rows(drug_name: str) -> pd.DataFrame:
    if master_df.empty:
        return pd.DataFrame()

    name_upper = drug_name.strip().upper()

    # exact match on ingredient
    mask = master_df["Ingredient"].str.upper() == name_upper
    if mask.any():
        return master_df[mask]

    # exact match on trade name
    mask = master_df["Trade Name"].str.upper() == name_upper
    if mask.any():
        return master_df[mask]

    # fuzzy match
    all_names = _ingredients + _trade_names
    if all_names:
        match, score, _ = process.extractOne(name_upper, all_names, scorer=fuzz.WRatio)
        if score >= 80:
            mask = (master_df["Ingredient"].str.upper() == match) | \
                   (master_df["Trade Name"].str.upper() == match)
            return master_df[mask]

    return pd.DataFrame()

def _find_cliff_rows(drug_name: str) -> pd.DataFrame:
    if cliff_df.empty:
        return pd.DataFrame()
    name_upper = drug_name.strip().upper()
    mask = (cliff_df["Ingredient"].str.upper().str.contains(name_upper, na=False)) | \
           (cliff_df["Trade Name"].str.upper().str.contains(name_upper, na=False))
    return cliff_df[mask]

def fetch_patents(drug_name: str) -> ModuleResult:
    findings = []
    sources  = []

    if master_df.empty:
        return ModuleResult(
            module="patents",
            findings=["Patent database not available."],
            sources=[]
        )

    rows = _find_drug_rows(drug_name)

    if rows.empty:
        findings.append(f"No FDA Orange Book patent records found for '{drug_name}'.")
        findings.append("This may indicate the drug is off-patent, generic-only, or not NDA-listed.")
        return ModuleResult(module="patents", findings=findings, sources=sources)

    # ── Basic info ────────────────────────────────────────────────────────────
    trade_names   = rows["Trade Name"].dropna().unique().tolist()
    ingredients   = rows["Ingredient"].dropna().unique().tolist()
    applicants    = rows["Applicant"].dropna().unique().tolist()
    drug_statuses = rows["Drug Status"].dropna().unique().tolist()
    total_patents = len(rows)

    findings.append(f"FDA Orange Book — {total_patents} patent record(s) found")
    findings.append(f"Trade name(s)  : {', '.join(str(x) for x in trade_names[:3])}")
    findings.append(f"Ingredient(s)  : {', '.join(str(x) for x in ingredients[:3])}")
    findings.append(f"Applicant(s)   : {', '.join(str(x) for x in applicants[:3])}")
    findings.append(f"Drug status    : {', '.join(str(x) for x in drug_statuses)}")

    # ── Patent expiry analysis ────────────────────────────────────────────────
    today = pd.Timestamp(datetime.today())
    expiry_dates = []
    for exp in rows["Patent Expiry Date"].dropna():
        try:
            expiry_dates.append(pd.to_datetime(exp))
        except:
            pass

    if expiry_dates:
        earliest          = min(expiry_dates)
        latest            = max(expiry_dates)
        days_to_earliest  = (earliest - today).days
        years_to_earliest = round(days_to_earliest / 365.25, 1)

        findings.append(f"Earliest patent expiry : {earliest.strftime('%b %d, %Y')} ({years_to_earliest} yrs)")
        findings.append(f"Latest patent expiry   : {latest.strftime('%b %d, %Y')}")

        if days_to_earliest <= 0:
            findings.append("Repurposing window : OPEN — patent already expired")
            findings.append("Generic manufacturers can produce freely — repurposing is highly viable")
        elif days_to_earliest <= 365:
            findings.append("Repurposing window : OPENING SOON — expires within 1 year")
            findings.append("Strong commercial opportunity — ideal time to invest in repurposing")
        elif days_to_earliest <= 3 * 365:
            findings.append("Repurposing window : APPROACHING — expires within 3 years")
            findings.append("Begin repurposing trials now to capitalize at patent expiry")
        else:
            findings.append(f"Repurposing window : RESTRICTED — {years_to_earliest} years remaining")
            findings.append("Repurposing requires licensing or a new formulation strategy")

    # ── Patent type breakdown ─────────────────────────────────────────────────
    substance_count = rows["Substance Patent"].eq("Y").sum()
    product_count   = rows["Product Patent"].eq("Y").sum()
    ped_count       = rows["PED Extension"].eq("Yes").sum() if "PED Extension" in rows.columns else 0
    delisted_count  = rows["Delisted"].eq("Y").sum()        if "Delisted"       in rows.columns else 0

    findings.append(f"Substance patents (active ingredient) : {substance_count}")
    findings.append(f"Product patents (formulation)         : {product_count}")
    findings.append(f"Pediatric exclusivity (PED) extensions: {ped_count}")
    findings.append(f"Delisted patents                      : {delisted_count}")

    if substance_count > 0:
        findings.append("Note: Substance patents cover the molecule itself — strongest protection")
    if ped_count > 0:
        findings.append("Note: PED extensions add 6 months beyond base patent expiry")
    if delisted_count > 0:
        findings.append("Note: Delisted patents were removed — often after successful generic challenge")

    # ── Patent cliff signal ───────────────────────────────────────────────────
    cliff_rows = _find_cliff_rows(drug_name)
    if not cliff_rows.empty:
        findings.append(f"Patent cliff: {len(cliff_rows)} patent(s) expiring within 3 years")
        for _, cr in cliff_rows.head(3).iterrows():
            findings.append(
                f"  Patent {cr.get('Patent No','?')} — "
                f"expires {cr.get('Expiry Date','?')} "
                f"({cr.get('Days to Expiry','?')} days) | "
                f"Generic exists: {cr.get('Generic Exists','?')}"
            )

    sources.append(Source(
        label="FDA Orange Book — Patent & Exclusivity Data",
        url="https://www.accessdata.fda.gov/scripts/cder/ob/index.cfm"
    ))

    return ModuleResult(
        module="patents",
        findings=findings,
        sources=sources
    )