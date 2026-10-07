from datetime import datetime
from pydantic import BaseModel, EmailStr


# ─────────────────────────────────────────
# Company Schemas
# ─────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# Task Schemas
# ─────────────────────────────────────────

class TaskCreate(BaseModel):
    company_id: int | None = None
    communication_id: int | None = None
    title: str
    description: str | None = None
    priority: str = "medium"
    due_date: datetime | None = None
    assigned_to: str | None = None
    penalty_applicable: bool = False
    penalty_amount: float | None = None
    penalty_type: str | None = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskResponse(BaseModel):
    id: int
    company_id: int | None
    communication_id: int | None
    title: str
    description: str | None
    priority: str
    status: str
    due_date: datetime | None
    assigned_to: str | None
    penalty_applicable: bool
    penalty_amount: float | None
    penalty_type: str | None
    days_overdue: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# Communication Schemas
# ─────────────────────────────────────────

class CommunicationCreate(BaseModel):
    company_id: int | None = None
    subject: str | None = None
    sender_email: EmailStr | None = None
    message: str | None = None
    category: str | None = None
    ai_summary: str | None = None
    action_required: bool = False


class CommunicationResponse(BaseModel):
    id: int
    company_id: int | None
    subject: str | None
    sender_email: str | None
    message: str | None
    category: str | None
    ai_summary: str | None
    action_required: bool
    priority: str
    extracted_amount: float | None
    extracted_company: str | None
    extracted_action: str | None
    received_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# AI Analysis Schema (internal)
# ─────────────────────────────────────────

class EmailAnalysis(BaseModel):
    category: str
    summary: str
    action: str | None = None
    action_required: bool
    priority: str
    deadline: datetime | None = None
    company_name: str | None = None
    amount: float | None = None


# ─────────────────────────────────────────
# Batch Process Schema
# ─────────────────────────────────────────

class BatchProcessResult(BaseModel):
    processed: int
    tasks_created: int
    action_required: int
    high_priority: int
    overdue: int
    categories: dict
