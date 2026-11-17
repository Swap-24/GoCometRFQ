import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

if (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env", override=True)
elif (BACKEND_DIR / ".env").exists():
    load_dotenv(BACKEND_DIR / ".env", override=True)
else:
    load_dotenv(override=True)

class Settings:
    PROJECT_NAME: str = "GoComet British Reverse Auction RFQ System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{ROOT_DIR / 'rfq_auction.db'}")
    
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
