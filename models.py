# models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users" # Represents the 'Members' table requirement
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="student") # 'student' or 'librarian'
    
    # Relationships
    issues = relationship("IssueLog", back_populates="student")
    reservations = relationship("Reservation", back_populates="student")
    fines = relationship("Fine", back_populates="student")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    
    books = relationship("Book", back_populates="category")

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    author = Column(String)
    barcode = Column(String, unique=True, index=True) # For the scanner requirement
    total_copies = Column(Integer, default=1)
    available_copies = Column(Integer, default=1)
    category_id = Column(Integer, ForeignKey("categories.id"))
    
    category = relationship("Category", back_populates="books")
    issues = relationship("IssueLog", back_populates="book")
    reservations = relationship("Reservation", back_populates="book")

class IssueLog(Base):
    __tablename__ = "issue_logs"
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    status = Column(String, default="issued") # 'issued' or 'returned'
    
    book = relationship("Book", back_populates="issues")
    student = relationship("User", back_populates="issues")
    return_record = relationship("ReturnLog", back_populates="issue_log", uselist=False)

class ReturnLog(Base):
    __tablename__ = "returns"
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issue_logs.id"))
    return_date = Column(DateTime, default=datetime.utcnow)
    
    issue_log = relationship("IssueLog", back_populates="return_record")
    fine_record = relationship("Fine", back_populates="return_log", uselist=False)

class Fine(Base):
    __tablename__ = "fines"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    return_id = Column(Integer, ForeignKey("returns.id"))
    amount = Column(Float, default=0.0)
    paid = Column(Boolean, default=False)
    
    student = relationship("User", back_populates="fines")
    return_log = relationship("ReturnLog", back_populates="fine_record")

class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    reservation_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active") # 'active', 'fulfilled', or 'cancelled'
    
    book = relationship("Book", back_populates="reservations")
    student = relationship("User", back_populates="reservations")