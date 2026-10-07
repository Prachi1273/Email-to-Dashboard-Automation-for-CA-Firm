# AI-Powered CRM & Email Workflow Automation

> **Tech Stack:** React + FastAPI + MySQL + n8n + AI (OpenAI / Rule-based)  
> Built for a CA/accounting firm to automate email triage, task creation, and compliance tracking.

---

## Problem Statement

A CA firm receives **40-50 emails per day** — income tax notices, GST demands, quotations, invoices, compliance deadlines. Managing these manually in Excel leads to:
- Missed deadlines → penalty risk
- No priority tracking
- No automated task creation

This project automates the entire workflow.

---

## Architecture

```
Gmail / Email
     │
     ▼
  n8n (orchestration)
     │
     ▼
FastAPI Backend
     │
     ├── AI Email Processor (rule-based + optional LLM)
     │       ├── Category Classification
     │       ├── Priority Detection
     │       ├── Deadline Extraction
     │       ├── Company Name Extraction
     │       └── Amount Extraction
     │
     ├── MySQL Database
     │       ├── companies
     │       ├── communications
     │       ├── tasks (with penalty fields)
     │       └── contacts
     │
     └── Dashboard API
           ├── Risk Alerts
           ├── Category Breakdown
           └── Overdue Detection

React Frontend
     ├── Dashboard (stats, risk alerts, recent items)
     ├── Process Email (submit + see AI result)
     ├── Communications (all processed emails)
     ├── Tasks (with status management)
     └── Companies (CRM records)
```

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+

### 1. Database Setup

```sql
-- In MySQL Workbench or CLI:
CREATE DATABASE email_crm_db;
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Copy backend/.env.example to backend/.env and set your MySQL password:
# DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost/email_crm_db

# Start server (tables auto-created on first run)
uvicorn main:app --reload
```

Backend runs at: http://localhost:8000  
API docs: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Frontend runs at: http://localhost:3000

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communications/process` | Submit email → AI classifies → task created |
| POST | `/communications/process-batch` | Process all 10 sample emails |
| GET | `/dashboard/summary` | Full dashboard data with risk alerts |
| GET | `/tasks` | All tasks (auto-updates overdue status) |
| PATCH | `/tasks/{id}/status` | Update task status |
| GET | `/companies` | All companies |
| POST | `/companies` | Add company |

---

## AI Processing Pipeline

The AI processor works **without any API key** using rule-based logic:

```python
Email → classify_and_extract_email(subject, message)
      ├── Category: income_tax | gst | quotation | invoice | payment | compliance | general
      ├── Priority: high | medium | low
      ├── Action Required: true/false
      ├── Action: specific task description
      ├── Deadline: extracted date
      ├── Company Name: extracted from text
      └── Amount: extracted ₹ figure
```

If `OPENAI_API_KEY` is set with valid API access, it can use the configured OpenAI model. Set `AI_MODE=rule` to force the deterministic fallback. If the API call fails, the application automatically falls back to rule-based processing.

---

## Penalty/Risk Engine

For high-priority overdue tasks, the system flags penalty risk:

| Category | Penalty Type | Amount |
|----------|-------------|--------|
| Income Tax | Statutory Penalty | ₹10,000 |
| GST | GST Late Fee | ₹5,000 |
| Compliance (ROC) | ROC Penalty | ₹15,000 |
| Payment | Internal SLA Breach | ₹2,000 |

---

## Demo Flow (for interview)

1. Open dashboard → click **"Process Demo Emails"**
2. Watch 10 sample emails get processed: tasks auto-created, companies auto-detected
3. Go to **Process Email** → load "Income Tax Notice" sample → submit → see AI result
4. Go to **Tasks** → filter "Overdue" → mark one "In Progress" → "Completed"
5. Go to **Dashboard** → risk alerts clear as tasks are completed

---

## n8n Integration

The `n8n/gmail_to_crm_workflow.json` file contains a ready workflow.

**Import it:**
1. Start n8n and import `n8n/gmail_to_crm_workflow.json`.
2. Connect your Gmail OAuth credential.
3. Make sure FastAPI is running at `http://localhost:8000`.
4. Test the HTTP Request node with a sample email before activating the workflow.
5. Activate only after the test succeeds.

For a local demo, the React **Process Email** page and `/communications/process-batch` endpoint provide the same backend path without requiring Gmail credentials.

**Explanation for interview:**
> "I designed the backend so n8n acts as the orchestration layer. Instead of coupling Gmail directly to the application, n8n receives the email event and calls the FastAPI processing endpoint. This keeps the backend stateless and testable independently of the email source."

---

## Verification Checklist

### Backend
```text
GET  /health                         → API health
POST /communications/process         → AI extraction + CRM task creation
POST /communications/process-batch   → process the 10 demo emails
GET  /dashboard/summary              → KPI + risk dashboard
POST /demo/reset                     → clear demo data before replaying
```

### Interview demo
1. Start MySQL and FastAPI.
2. Start React.
3. Open Dashboard.
4. Click **Process Demo Emails**.
5. Open Communications and show category/priority/amount extraction.
6. Open Tasks and show deadlines/overdue/risk.
7. Return to Dashboard and show the updated KPIs.
8. Optionally import the n8n workflow to demonstrate email orchestration.

The project is intentionally designed so the core demo works without an OpenAI API key.

---

## Project Structure

```
email-dashboard-automation/
├── backend/
│   ├── ai/
│   │   └── email_processor.py   ← LLM + rule-based AI
│   ├── models/
│   │   └── crm.py               ← SQLAlchemy models
│   ├── schemas.py               ← Pydantic schemas
│   ├── main.py                  ← FastAPI routes
│   ├── database.py              ← DB connection
│   ├── config.py                ← Settings
│   ├── .env                     ← Environment variables
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx    ← Main dashboard
│       │   ├── ProcessEmail.jsx ← Email submission
│       │   ├── Tasks.jsx        ← Task management
│       │   ├── Communications.jsx
│       │   └── Companies.jsx
│       ├── services/
│       │   └── api.js           ← Axios API calls
│       └── App.jsx
│
├── sample_emails/               ← 10 realistic test emails
├── n8n/
│   └── gmail_to_crm_workflow.json
└── database/
    └── setup.sql
```
