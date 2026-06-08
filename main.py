from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import models
from datetime import datetime, timedelta
import schemas
from database import engine, SessionLocal
from ml_engine import get_collaborative_recommendations
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Library API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite React port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH SETUP ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your_super_secret_key_for_library"
ALGORITHM = "HS256"

def get_password_hash(password):
    return pwd_context.hash(password)   

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- CATEGORY ROUTES ---

@app.post("/categories/", response_model=schemas.CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_cat = db.query(models.Category).filter(models.Category.name == category.name).first()
    if db_cat:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_cat = models.Category(name=category.name)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@app.get("/categories/", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


# --- BOOK CATALOG ROUTES ---

@app.post("/books/", response_model=schemas.BookResponse, status_code=status.HTTP_201_CREATED)
def add_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    # Verify barcode is unique
    db_book = db.query(models.Book).filter(models.Book.barcode == book.barcode).first()
    if db_book:
        raise HTTPException(status_code=400, detail="Book with this barcode already exists")
    
    # When a book is first added, available_copies equals total_copies
    new_book = models.Book(
        **book.dict(),
        available_copies=book.total_copies
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    return new_book

@app.get("/books/search/", response_model=List[schemas.BookResponse])
def search_books(
    title: Optional[str] = None,
    author: Optional[str] = None,
    category_id: Optional[int] = None,
    available_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    Advanced search with filters. 
    Allows finding books by title, author, category, and checking current availability.
    """
    query = db.query(models.Book)

    # Dynamically build the SQL query based on what the user provided
    if title:
        query = query.filter(models.Book.title.ilike(f"%{title}%")) # ilike for case-insensitive
    if author:
        query = query.filter(models.Book.author.ilike(f"%{author}%"))
    if category_id:
        query = query.filter(models.Book.category_id == category_id)
    if available_only:
        query = query.filter(models.Book.available_copies > 0)

    return query.all()



# --- BOOK LIFECYCLE ROUTES ---

@app.post("/issue/", response_model=schemas.IssueResponse, status_code=status.HTTP_201_CREATED)
def issue_book(issue: schemas.IssueCreate, db: Session = Depends(get_db)):
    # 1. Verify the book exists and has available copies
    book = db.query(models.Book).filter(models.Book.id == issue.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="No copies currently available")

    # 2. Verify the user exists
    user = db.query(models.User).filter(models.User.id == issue.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 3. Check if user already has this specific book issued and hasn't returned it
    existing_issue = db.query(models.IssueLog).filter(
        models.IssueLog.book_id == issue.book_id,
        models.IssueLog.user_id == issue.user_id,
        models.IssueLog.status == "issued"
    ).first()
    if existing_issue:
        raise HTTPException(status_code=400, detail="User already has an active issue for this book")

    # 4. Create the Issue Log (Standard 14-day checkout period)
    due_date = datetime.utcnow() + timedelta(days=14)
    new_issue = models.IssueLog(
        book_id=issue.book_id,
        user_id=issue.user_id,
        due_date=due_date
    )
    
    # 5. Decrement the available inventory
    book.available_copies -= 1

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    return new_issue


@app.post("/return/", response_model=schemas.ReturnResponse, status_code=status.HTTP_200_OK)
def return_book(return_req: schemas.ReturnCreate, db: Session = Depends(get_db)):
    # 1. Find the active issue log
    issue_log = db.query(models.IssueLog).filter(
        models.IssueLog.id == return_req.issue_id,
        models.IssueLog.status == "issued"
    ).first()
    
    if not issue_log:
        raise HTTPException(status_code=404, detail="Active issue log not found")

    # 2. Create the return record
    return_date = datetime.utcnow()
    new_return = models.ReturnLog(
        issue_id=issue_log.id,
        return_date=return_date
    )
    db.add(new_return)
    
    # 3. Update the issue status and restore book inventory
    issue_log.status = "returned"
    book = db.query(models.Book).filter(models.Book.id == issue_log.book_id).first()
    book.available_copies += 1

    # 4. Flush the session so the new_return gets an ID (we need it for the fine record)
    db.flush()

    # 5. Calculate Fines (e.g., 10 rupees per day overdue)
    DAILY_FINE_RATE = 10.0
    if return_date > issue_log.due_date:
        days_late = (return_date - issue_log.due_date).days
        if days_late > 0:
            fine_amount = days_late * DAILY_FINE_RATE
            new_fine = models.Fine(
                user_id=issue_log.user_id,
                return_id=new_return.id,
                amount=fine_amount
            )
            db.add(new_fine)

    db.commit()
    db.refresh(new_return)
    return new_return

@app.get("/fines/{user_id}")
def get_user_fines(user_id: int, db: Session = Depends(get_db)):
    """A quick helper route to show a student their outstanding fines"""
    fines = db.query(models.Fine).filter(
        models.Fine.user_id == user_id, 
        models.Fine.paid == False
    ).all()
    
    total_unpaid = sum(fine.amount for fine in fines)
    return {"total_unpaid_fines": total_unpaid, "records": fines}

@app.get("/recommendations/{user_id}", response_model=List[schemas.BookResponse])
def recommend_books(user_id: int, db: Session = Depends(get_db)):
    """
    Returns AI recommendations based on user-based collaborative filtering.
    """
    recommendations = get_collaborative_recommendations(user_id, db)
    return recommendations

# --- AUTH ENDPOINTS ---

@app.post("/users/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        name=user.name, 
        email=user.email, 
        password_hash=hashed_password, 
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login/", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode = {"sub": str(user.id), "role": user.role, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": encoded_jwt, 
        "token_type": "bearer", 
        "user_id": user.id, 
        "role": user.role
    }

@app.get("/issued/{user_id}")
def get_user_issued_books(user_id: int, db: Session = Depends(get_db)):
    """Returns books the user currently has issued."""
    # BUG FIX: We check status == "issued", not return_date == None
    active_issues = db.query(models.IssueLog).filter(
        models.IssueLog.user_id == user_id,
        models.IssueLog.status == "issued" 
    ).all()
    
    issued_books = []
    for issue in active_issues:
        book = db.query(models.Book).filter(models.Book.id == issue.book_id).first()
        if book:
            issued_books.append({
                "issue_id": issue.id,
                "book_id": book.id,
                "title": book.title,
                "author": book.author,
                "issue_date": issue.issue_date
            })
    return issued_books

@app.get("/users/{user_id}")
def get_user_info(user_id: int, db: Session = Depends(get_db)):
    """Fetches basic profile info for the dashboard header"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return {"name": user.name, "email": user.email}

@app.get("/admin/student_logs")
def get_student_logs(db: Session = Depends(get_db)):
    """Compiles a master list of all students, their active books, and unpaid fines"""
    students = db.query(models.User).filter(models.User.role == "student").all()
    logs = []
    for student in students:
        fines = db.query(models.Fine).filter(models.Fine.user_id == student.id, models.Fine.paid == False).all()
        active_issues = db.query(models.IssueLog).filter(models.IssueLog.user_id == student.id, models.IssueLog.status == "issued").all()
        
        logs.append({
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "pending_fines": sum(f.amount for f in fines),
            "active_issues_count": len(active_issues)
        })
    return logs

@app.delete("/books/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db)):
    """Removes a book from the catalog permanently, regardless of issue status."""
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # 1. THE OVERRIDE: Delete all issue logs associated with this book first.
    # This rips the book out of the hands of any student who currently has it,
    # and prevents SQLite from crashing due to orphaned foreign keys.
    db.query(models.IssueLog).filter(models.IssueLog.book_id == book_id).delete()
    
    # 2. Purge the book itself
    db.delete(book)
    db.commit()
    
    return {"detail": "Asset and all associated records FORCE PURGED successfully"}

@app.post("/admin/fines/")
def add_manual_fine(req: schemas.ManualFineRequest, db: Session = Depends(get_db)):
    """Allows librarians to manually add a penalty fee to a user."""
    # Create a new unpaid fine without a return_id (since it's manual)
    new_fine = models.Fine(
        user_id=req.user_id,
        amount=req.amount,
        paid=False
    )
    db.add(new_fine)
    db.commit()
    return {"detail": "Penalty fee applied successfully."}

@app.delete("/users/{user_id}")
def purge_student_node(user_id: int, db: Session = Depends(get_db)):
    """Permanently deletes a user and restores their checked-out books to inventory."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Node not found")
        
    # 1. Look for books they currently have and restore the global inventory
    active_issues = db.query(models.IssueLog).filter(
        models.IssueLog.user_id == user_id, 
        models.IssueLog.status == "issued"
    ).all()
    
    for issue in active_issues:
        book = db.query(models.Book).filter(models.Book.id == issue.book_id).first()
        if book:
            book.available_copies += 1

    # 2. Vaporize all their associated history and fines
    db.query(models.IssueLog).filter(models.IssueLog.user_id == user_id).delete()
    db.query(models.Fine).filter(models.Fine.user_id == user_id).delete()
    
    # 3. Vaporize the user
    db.delete(user)
    db.commit()
    
    return {"detail": "User node completely purged from system."}

@app.patch("/books/{book_id}/copies")
def update_book_copies(book_id: int, req: schemas.UpdateCopiesRequest, db: Session = Depends(get_db)):
    """Updates the total inventory count for a specific book."""
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Asset not found in grid")
    
    # Calculate exactly how many copies are currently out in the field
    copies_checked_out = book.total_copies - book.available_copies
    
    # Block the admin from setting the total lower than what is currently checked out
    if req.new_total < copies_checked_out:
        raise HTTPException(
            status_code=400, 
            detail=f"ERR: Cannot reduce total below {copies_checked_out}. Those units are currently assigned to user nodes."
        )
    
    # Apply the mathematical update
    book.total_copies = req.new_total
    book.available_copies = req.new_total - copies_checked_out
    
    db.commit()
    return {"detail": "Inventory stock updated successfully"}