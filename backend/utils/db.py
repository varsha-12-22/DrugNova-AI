import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("INTERACTIONS_DB", "interactions.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn