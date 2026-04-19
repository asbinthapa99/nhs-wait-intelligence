"""
Enables the PostGIS and PGVector extensions on the host Neon database.
Execute this prior to running Alembic migrations.
"""
from sqlalchemy import text
from app.database import engine

def enable_extensions():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        print("PostGIS and Vector extensions successfully enabled on Database.")

if __name__ == "__main__":
    enable_extensions()
