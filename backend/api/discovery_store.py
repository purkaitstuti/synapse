
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "processed" / "synapse_discoveries.db"


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_discoveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                problem TEXT NOT NULL,
                innovation_json TEXT NOT NULL,
                mechanisms_json TEXT NOT NULL,
                model_used TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)


def save_discovery(problem, innovation, mechanisms, model_used):
    initialize_database()

    title = innovation.get("innovation_title") or problem[:100]

    with connect() as conn:
        cursor = conn.execute("""
            INSERT INTO saved_discoveries
            (title, problem, innovation_json, mechanisms_json, model_used)
            VALUES (?, ?, ?, ?, ?)
        """, (
            title,
            problem,
            json.dumps(innovation),
            json.dumps(mechanisms),
            model_used
        ))

        return cursor.lastrowid


def list_discoveries():
    initialize_database()

    with connect() as conn:
        rows = conn.execute("""
            SELECT id, title, created_at
            FROM saved_discoveries
            ORDER BY id DESC
        """).fetchall()

    return [dict(row) for row in rows]


def get_discovery(discovery_id):
    initialize_database()

    with connect() as conn:
        row = conn.execute("""
            SELECT *
            FROM saved_discoveries
            WHERE id = ?
        """, (discovery_id,)).fetchone()

    if row is None:
        return None

    result = dict(row)
    result["innovation"] = json.loads(result.pop("innovation_json"))
    result["mechanisms"] = json.loads(result.pop("mechanisms_json"))

    return result


if __name__ == "__main__":
    initialize_database()
    print("Discovery database initialized successfully.")
    print("Database:", DB_PATH)
