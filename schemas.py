from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Category Schemas ---
class CategoryCreate(BaseModel):
    name: str

class CategoryResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# --- Book Schemas ---
class BookCreate(BaseModel):
    title: str
    author: str
    barcode: str
    total_copies: int
    category_id: int

class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    barcode: str
    total_copies: int
    available_copies: int
    category: CategoryResponse 

    class Config:
        from_attributes = True


class IssueCreate(BaseModel):
    book_id: int
    user_id: int

class IssueResponse(BaseModel):
    id: int
    book_id: int
    user_id: int
    issue_date: datetime
    due_date: datetime
    status: str

    class Config:
        from_attributes = True

class ReturnCreate(BaseModel):
    issue_id: int

class FineResponse(BaseModel):
    id: int
    amount: float
    paid: bool

    class Config:
        from_attributes = True

class ReturnResponse(BaseModel):
    id: int
    issue_id: int
    return_date: datetime
    fine_record: Optional[FineResponse] = None

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str

class ManualFineRequest(BaseModel):
    user_id: int
    amount: float

class UpdateCopiesRequest(BaseModel):
    new_total: int