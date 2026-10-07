"""
AI-Powered CRM & Email Workflow Automation
FastAPI Backend
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from ai.email_processor import classify_and_extract_email
from database import SessionLocal, engine
from models.crm import Base, Communication, Company, Task
from schemas import (
    BatchProcessResult,
    CommunicationCreate,
    CommunicationResponse,
    CompanyCreate,
    CompanyResponse,
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
)

# ─────────────────────────────────────────
# App & DB Init
# ─────────────────────────────────────────

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered CRM & Email Workflow Automation",
    description="Automatically classifies emails, creates tasks, tracks deadlines, and flags penalty risks.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

PENALTY_CONFIG = {
    "income_tax": {"type": "Statutory Penalty", "amount": 10000.0},
    "gst": {"type": "GST Late Fee", "amount": 5000.0},
    "compliance": {"type": "ROC Penalty", "amount": 15000.0},
    "payment": {"type": "Internal SLA Breach", "amount": 2000.0},
    "quotation": {"type": "Business Risk", "amount": 0.0},
    "invoice": {"type": "Payment Delay", "amount": 1000.0},
    "general": {"type": "Internal SLA", "amount": 0.0},
}




def _normalize_company_name(value: str | None) -> str:
    """Normalize company names for deterministic CRM matching."""
    if not value:
        return ""
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\b(limited|ltd|private|pvt|company|co|corp|corporation)\b", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _company_from_email(sender_email: str | None, db: Session):
    """Match an existing company using the sender domain when possible."""
    if not sender_email or "@" not in sender_email:
        return None
    domain = sender_email.split("@", 1)[1].lower().strip()
    for company in db.query(Company).filter(Company.email.isnot(None)).all():
        if company.email and "@" in company.email and company.email.split("@", 1)[1].lower() == domain:
            return company
    return None


def _resolve_company(company_id: int | None, extracted_name: str | None, sender_email: str | None, db: Session):
    """Resolve an email to an existing company, creating one only when a clear name was extracted."""
    if company_id:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company

    normalized = _normalize_company_name(extracted_name)
    if normalized:
        for company in db.query(Company).all():
            if _normalize_company_name(company.name) == normalized:
                return company

    by_domain = _company_from_email(sender_email, db)
    if by_domain:
        return by_domain

    if extracted_name and len(extracted_name.strip()) >= 4:
        company = Company(name=extracted_name.strip(), email=sender_email)
        db.add(company)
        db.flush()
        return company

    return None

def _sync_task_overdue(task: Task) -> None:
    """Update task status and days_overdue in-place (does not commit)."""
    if (
        task.due_date is not None
        and task.due_date < datetime.now()
        and task.status not in ("completed",)
    ):
        task.status = "overdue"
        delta = datetime.now() - task.due_date
        task.days_overdue = delta.days
    else:
        task.days_overdue = 0


# ─────────────────────────────────────────
# Health
# ─────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ─────────────────────────────────────────
# Companies
# ─────────────────────────────────────────

@app.post("/companies", response_model=CompanyResponse, tags=["Companies"])
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    new_company = Company(name=company.name, email=company.email, phone=company.phone)
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    return new_company


@app.get("/companies", response_model=list[CompanyResponse], tags=["Companies"])
def get_companies(db: Session = Depends(get_db)):
    return db.query(Company).all()


@app.get("/companies/{company_id}", response_model=CompanyResponse, tags=["Companies"])
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@app.delete("/companies/{company_id}", tags=["Companies"])
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    return {"message": "Company deleted"}


# ─────────────────────────────────────────
# Tasks
# ─────────────────────────────────────────

@app.post("/tasks", response_model=TaskResponse, tags=["Tasks"])
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    if task.company_id:
        company = db.query(Company).filter(Company.id == task.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

    new_task = Task(
        company_id=task.company_id,
        communication_id=task.communication_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        assigned_to=task.assigned_to,
        penalty_applicable=task.penalty_applicable,
        penalty_amount=task.penalty_amount,
        penalty_type=task.penalty_type,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


@app.get("/tasks", response_model=list[TaskResponse], tags=["Tasks"])
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).order_by(Task.created_at.desc()).all()
    for task in tasks:
        _sync_task_overdue(task)
    db.commit()
    return tasks


@app.get("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    _sync_task_overdue(task)
    db.commit()
    return task


@app.patch("/tasks/{task_id}/status", response_model=TaskResponse, tags=["Tasks"])
def update_task_status(task_id: int, body: TaskStatusUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    allowed = {"pending", "in_progress", "completed"}
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {allowed}")

    task.status = body.status
    if body.status == "completed":
        task.days_overdue = 0
    db.commit()
    db.refresh(task)
    return task


# ─────────────────────────────────────────
# Communications
# ─────────────────────────────────────────

@app.post("/communications", response_model=CommunicationResponse, tags=["Communications"])
def create_communication(communication: CommunicationCreate, db: Session = Depends(get_db)):
    if communication.company_id:
        company = db.query(Company).filter(Company.id == communication.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

    new_comm = Communication(
        company_id=communication.company_id,
        subject=communication.subject,
        sender_email=communication.sender_email,
        message=communication.message,
        category=communication.category,
        ai_summary=communication.ai_summary,
        action_required=communication.action_required,
    )
    db.add(new_comm)
    db.commit()
    db.refresh(new_comm)
    return new_comm


@app.get("/communications", response_model=list[CommunicationResponse], tags=["Communications"])
def get_communications(db: Session = Depends(get_db)):
    return db.query(Communication).order_by(Communication.received_at.desc()).all()


@app.get("/communications/{communication_id}", response_model=CommunicationResponse, tags=["Communications"])
def get_communication(communication_id: int, db: Session = Depends(get_db)):
    comm = db.query(Communication).filter(Communication.id == communication_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")
    return comm


# ─────────────────────────────────────────
# Process Email (single)
# ─────────────────────────────────────────

@app.post("/communications/process", tags=["AI Processing"])
def process_communication(communication: CommunicationCreate, db: Session = Depends(get_db)):
    """
    Main endpoint: Submit an email → AI classifies it → CRM record + Task auto-created.
    """

    # Step 1: AI Processing
    # We need the extracted company name before resolving the CRM entity.

    # Step 2: AI Processing
    result = classify_and_extract_email(
        subject=communication.subject or "",
        message=communication.message or "",
    )

    # Step 3: Resolve email to a CRM company.
    company = _resolve_company(
        communication.company_id, result.company_name, communication.sender_email, db
    )
    resolved_company_id = company.id if company else None

    # Step 4: Determine penalty applicability
    penalty_cfg = PENALTY_CONFIG.get(result.category, PENALTY_CONFIG["general"])
    penalty_applicable = result.priority == "high" and penalty_cfg["amount"] > 0

    # Step 5: Save Communication
    new_comm = Communication(
        company_id=resolved_company_id,
        subject=communication.subject,
        sender_email=communication.sender_email,
        message=communication.message,
        category=result.category,
        ai_summary=result.summary,
        action_required=result.action_required,
        priority=result.priority,
        extracted_amount=result.amount,
        extracted_company=result.company_name,
        extracted_action=result.action,
    )
    db.add(new_comm)
    db.flush()

    # Step 5: Auto-create task if action required
    new_task = None
    if result.action_required:
        new_task = Task(
            company_id=resolved_company_id,
            communication_id=new_comm.id,
            title=result.action or result.summary,
            description=communication.message,
            priority=result.priority,
            status="pending",
            due_date=result.deadline,
            penalty_applicable=penalty_applicable,
            penalty_amount=penalty_cfg["amount"] if penalty_applicable else None,
            penalty_type=penalty_cfg["type"] if penalty_applicable else None,
        )
        db.add(new_task)

    db.commit()
    if new_task:
        db.refresh(new_task)
    db.refresh(new_comm)

    return {
        "message": "Email processed successfully",
        "ai_result": {
            "category": result.category,
            "priority": result.priority,
            "action_required": result.action_required,
            "action": result.action,
            "summary": result.summary,
            "deadline": result.deadline.isoformat() if result.deadline else None,
            "company_name": result.company_name,
            "amount": result.amount,
        },
        "communication": {
            "id": new_comm.id,
            "category": new_comm.category,
            "ai_summary": new_comm.ai_summary,
        },
        "task": (
            {
                "id": new_task.id,
                "title": new_task.title,
                "priority": new_task.priority,
                "status": new_task.status,
                "due_date": new_task.due_date.isoformat() if new_task.due_date else None,
                "penalty_applicable": new_task.penalty_applicable,
                "penalty_amount": new_task.penalty_amount,
                "penalty_type": new_task.penalty_type,
            }
            if new_task
            else None
        ),
    }


# ─────────────────────────────────────────
# Batch Process (demo emails)
# ─────────────────────────────────────────

@app.post("/communications/process-batch", tags=["AI Processing"])
def process_batch(db: Session = Depends(get_db)):
    """
    Process all sample emails from sample_emails/ directory.
    Simulates processing 40-50 real emails per day.
    """
    sample_dir = Path(__file__).parent.parent / "sample_emails"
    if not sample_dir.exists():
        raise HTTPException(status_code=404, detail="sample_emails directory not found")

    files = list(sample_dir.glob("*.json"))
    if not files:
        raise HTTPException(status_code=404, detail="No sample email files found")

    processed = 0
    tasks_created = 0
    action_count = 0
    high_count = 0
    overdue_count = 0
    categories: dict = {}

    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue

        # Find or create company
        company_id = None
        company_name = data.get("company_name")
        if company_name:
            company = db.query(Company).filter(Company.name == company_name).first()
            if not company:
                company = Company(name=company_name)
                db.add(company)
                db.flush()
            company_id = company.id

        result = classify_and_extract_email(
            subject=data.get("subject", ""),
            message=data.get("message", ""),
        )

        # Use company_name from AI if not in sample file
        if not company_id and result.company_name:
            company = db.query(Company).filter(Company.name == result.company_name).first()
            if not company:
                company = Company(name=result.company_name)
                db.add(company)
                db.flush()
            company_id = company.id

        penalty_cfg = PENALTY_CONFIG.get(result.category, PENALTY_CONFIG["general"])
        penalty_applicable = result.priority == "high" and penalty_cfg["amount"] > 0

        new_comm = Communication(
            company_id=company_id,
            subject=data.get("subject"),
            sender_email=data.get("sender_email"),
            message=data.get("message"),
            category=result.category,
            ai_summary=result.summary,
            action_required=result.action_required,
            priority=result.priority,
            extracted_amount=result.amount,
            extracted_company=result.company_name,
            extracted_action=result.action,
        )
        db.add(new_comm)
        db.flush()

        new_task = None
        if result.action_required:
            new_task = Task(
                company_id=company_id,
                communication_id=new_comm.id,
                title=result.action or result.summary,
                description=data.get("message"),
                priority=result.priority,
                status="pending",
                due_date=result.deadline,
                penalty_applicable=penalty_applicable,
                penalty_amount=penalty_cfg["amount"] if penalty_applicable else None,
                penalty_type=penalty_cfg["type"] if penalty_applicable else None,
            )
            db.add(new_task)
            tasks_created += 1

        processed += 1
        if result.action_required:
            action_count += 1
        if result.priority == "high":
            high_count += 1
        if result.deadline and result.deadline < datetime.now():
            overdue_count += 1
        categories[result.category] = categories.get(result.category, 0) + 1

    db.commit()

    return {
        "message": f"Batch processing complete: {processed} emails processed",
        "processed": processed,
        "tasks_created": tasks_created,
        "action_required": action_count,
        "high_priority": high_count,
        "overdue": overdue_count,
        "categories": categories,
    }


# ─────────────────────────────────────────
# Demo Reset
# ─────────────────────────────────────────

@app.post("/demo/reset", tags=["Demo"])
def reset_demo_data(db: Session = Depends(get_db)):
    """Clear demo CRM data so the interview flow can be replayed cleanly."""
    db.query(Task).delete(synchronize_session=False)
    db.query(Communication).delete(synchronize_session=False)
    db.query(Company).delete(synchronize_session=False)
    db.commit()
    return {"message": "Demo data reset successfully"}


# ─────────────────────────────────────────
# Dashboard Summary
# ─────────────────────────────────────────

@app.get("/dashboard/summary", tags=["Dashboard"])
def dashboard_summary(db: Session = Depends(get_db)):
    """Full dashboard summary with risk alerts."""
    now = datetime.now()

    # Tasks
    tasks = db.query(Task).all()
    for task in tasks:
        _sync_task_overdue(task)
    db.commit()

    total_tasks = len(tasks)
    pending = sum(1 for t in tasks if t.status == "pending")
    in_progress = sum(1 for t in tasks if t.status == "in_progress")
    completed = sum(1 for t in tasks if t.status == "completed")
    overdue = sum(1 for t in tasks if t.status == "overdue")
    penalty_risk = sum(1 for t in tasks if t.status == "overdue" and t.penalty_applicable)

    # Communications
    comms = db.query(Communication).all()
    total_comms = len(comms)
    category_breakdown = {}
    for c in comms:
        cat = c.category or "general"
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    # Companies
    total_companies = db.query(Company).count()

    # High risk items (overdue + penalty applicable)
    risk_items = []
    for task in tasks:
        if task.status == "overdue" and task.penalty_applicable:
            comm = None
            if task.communication_id:
                comm = db.query(Communication).filter(Communication.id == task.communication_id).first()
            company = None
            if task.company_id:
                company = db.query(Company).filter(Company.id == task.company_id).first()
            risk_items.append({
                "task_id": task.id,
                "task_title": task.title,
                "company": company.name if company else "Unknown",
                "days_overdue": task.days_overdue,
                "penalty_type": task.penalty_type,
                "penalty_amount": task.penalty_amount,
                "category": comm.category if comm else "general",
            })

    # Recent communications (last 10)
    recent_comms = db.query(Communication).order_by(Communication.received_at.desc()).limit(10).all()
    recent_list = []
    for c in recent_comms:
        company = None
        if c.company_id:
            company = db.query(Company).filter(Company.id == c.company_id).first()
        recent_list.append({
            "id": c.id,
            "subject": c.subject,
            "category": c.category,
            "priority": c.priority,
            "action_required": c.action_required,
            "company": company.name if company else c.extracted_company or "Unknown",
            "received_at": c.received_at.isoformat(),
            "amount": c.extracted_amount,
        })

    # Recent tasks (last 10)
    recent_tasks = db.query(Task).order_by(Task.created_at.desc()).limit(10).all()
    recent_tasks_list = []
    for t in recent_tasks:
        company = None
        if t.company_id:
            company = db.query(Company).filter(Company.id == t.company_id).first()
        recent_tasks_list.append({
            "id": t.id,
            "title": t.title,
            "priority": t.priority,
            "status": t.status,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "days_overdue": t.days_overdue,
            "company": company.name if company else "Unknown",
            "penalty_applicable": t.penalty_applicable,
            "penalty_amount": t.penalty_amount,
        })

    return {
        "stats": {
            "total_companies": total_companies,
            "total_communications": total_comms,
            "total_tasks": total_tasks,
            "pending_tasks": pending,
            "in_progress_tasks": in_progress,
            "completed_tasks": completed,
            "overdue_tasks": overdue,
            "penalty_risk": penalty_risk,
        },
        "category_breakdown": category_breakdown,
        "risk_alerts": risk_items,
        "recent_communications": recent_list,
        "recent_tasks": recent_tasks_list,
    }
