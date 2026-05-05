import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://postgres:postgres@localhost:5432/nhs_intelligence"
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(exist_ok=True)
PROCESSED_DIR = DATA_DIR / "processed"
PROCESSED_DIR.mkdir(exist_ok=True)
