from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import get_db
from models.misc import LibraryBook, BookIssue, BookIssueStatus
from middleware.auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta
from utils.audit_logger import log_audit

router = APIRouter(prefix="/api/library", tags=["Library"])

class BookResponse(BaseModel):
    id: str
    isbn: str
    title: str
    author: str
    publisher: str
    total_copies: int
    available_copies: int
    category: str
    status: str
    issued_by_me: bool
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[BookResponse])
def get_library_books(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all library books for the tenant."""
    books = db.query(LibraryBook).filter(LibraryBook.org_id == current_user.org_id).all()
    
    # Get active issues for the current user to set issued_by_me
    active_issues = db.query(BookIssue).filter(
        BookIssue.user_id == current_user.id,
        BookIssue.status == BookIssueStatus.ISSUED
    ).all()
    issued_book_ids = {issue.book_id for issue in active_issues}
    
    result = []
    for book in books:
        status_str = 'available'
        if book.available_copies == 0:
            status_str = 'issued'
            
        result.append(BookResponse(
            id=book.id,
            isbn=book.isbn,
            title=book.title,
            author=book.author,
            publisher=book.publisher,
            total_copies=book.total_copies,
            available_copies=book.available_copies,
            category=book.category,
            status=status_str,
            issued_by_me=book.id in issued_book_ids
        ))
    return result

@router.post("/issue/{bookId}", response_model=dict)
async def issue_book(
    bookId: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Issue a book to the current user."""
    book = db.query(LibraryBook).filter(
        LibraryBook.id == bookId,
        LibraryBook.org_id == current_user.org_id
    ).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    # Check if already issued by this user
    existing = db.query(BookIssue).filter(
        BookIssue.book_id == bookId,
        BookIssue.user_id == current_user.id,
        BookIssue.status == BookIssueStatus.ISSUED
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already issued this book")
        
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="No copies available for issue")
        
    # Decrement available copies
    book.available_copies -= 1
    
    # Create BookIssue record
    issue = BookIssue(
        org_id=current_user.org_id,
        book_id=book.id,
        user_id=current_user.id,
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=14),
        status=BookIssueStatus.ISSUED
    )
    db.add(issue)
    db.commit()
    
    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="BOOK_ISSUED",
        resource_type="LIBRARY_BOOK",
        resource_id=book.id,
        metadata={"title": book.title},
        request=request
    )
    
    return {"message": "Book issued successfully"}

@router.post("/return/{bookId}", response_model=dict)
async def return_book(
    bookId: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Return an issued book."""
    issue = db.query(BookIssue).filter(
        BookIssue.book_id == bookId,
        BookIssue.user_id == current_user.id,
        BookIssue.status == BookIssueStatus.ISSUED
    ).first()
    if not issue:
        raise HTTPException(status_code=400, detail="No active issue record found for this book")
        
    book = db.query(LibraryBook).filter(LibraryBook.id == bookId).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    # Increment available copies
    book.available_copies = min(book.total_copies, book.available_copies + 1)
    
    # Mark issue as returned
    issue.status = BookIssueStatus.RETURNED
    issue.return_date = date.today()
    
    db.commit()
    
    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="BOOK_RETURNED",
        resource_type="LIBRARY_BOOK",
        resource_id=book.id,
        metadata={"title": book.title},
        request=request
    )
    
    return {"message": "Book returned successfully"}

