from app.core.database import engine, Base
import app.models  # Ensure all models are registered with Base.metadata

def init_db():
    print("Creating database tables if not exist...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully!")

if __name__ == "__main__":
    init_db()
