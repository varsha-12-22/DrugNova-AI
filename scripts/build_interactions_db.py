# scripts/build_interactions_db.py
# Run this ONCE to convert the 4 interaction CSV parts into a fast SQLite database.
# After running, interactions.db will be created in the project root.
# This file is in .gitignore — each person runs this locally.

import sqlite3
import pandas as pd
import os
import time

DB_PATH = "interactions.db"
DATA_DIR = os.getenv("DATA_DIR", "data")

PARTS = [
    f"{DATA_DIR}/drug_interactions_part1.csv",
    f"{DATA_DIR}/drug_interactions_part2.csv",
    f"{DATA_DIR}/drug_interactions_part3.csv",
    f"{DATA_DIR}/drug_interactions_part4.csv",
]

print("Building interactions.db from CSV parts...")
start = time.time()

conn = sqlite3.connect(DB_PATH)

# Drop and recreate table
conn.execute("DROP TABLE IF EXISTS interactions")
conn.execute("""
    CREATE TABLE interactions (
        drugbank_id TEXT,
        interacting_drugbank_id TEXT,
        interacting_drug_name TEXT,
        description TEXT
    )
""")

total = 0
for part in PARTS:
    if not os.path.exists(part):
        print(f"  Skipping {part} — file not found")
        continue

    print(f"  Loading {part}...")
    for chunk in pd.read_csv(part, chunksize=50000):
        chunk.to_sql("interactions", conn, if_exists="append", index=False)
        total += len(chunk)

print(f"  Creating index on drugbank_id...")
conn.execute("CREATE INDEX IF NOT EXISTS idx_drugbank_id ON interactions(drugbank_id)")
conn.commit()
conn.close()

elapsed = time.time() - start
print(f"\nDone. {total:,} rows loaded in {elapsed:.1f}s → interactions.db")