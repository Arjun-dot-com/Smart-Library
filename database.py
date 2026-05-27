from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Creates a local SQLite database file named 'library_app.db'
SQLALCHEMY_DATABASE_URL = "sqlite:///./library_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)