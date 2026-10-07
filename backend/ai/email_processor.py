"""
AI Email Processor — Rule-based engine with LLM fallback.

Architecture:
  classify_and_extract_email()
      ├── try: llm_processor()      (if OPENAI_API_KEY set and valid)
      └── fallback: rule_processor() (always works, no API needed)
"""

import os
import re
from datetime import datetime

from schemas import EmailAnalysis


# ─────────────────────────────────────────────────────────────
# LLM Processor (optional — requires valid OpenAI key)
# ─────────────────────────────────────────────────────────────

def _llm_processor(subject: str, message: str) -> EmailAnalysis | None:
    """
    Call OpenAI to extract structured info from email.
    Returns None if API is unavailable (no key, no credits, network error).
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    ai_mode = os.getenv("AI_MODE", "auto").lower()
    if ai_mode == "rule" or not api_key or api_key.startswith("sk-placeholder"):
        return None

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)

        prompt = f"""
You are a CRM email analyst for a CA/accounting firm.

Extract structured information from this email and respond ONLY with valid JSON.

Email Subject: {subject}
Email Message: {message}

Respond with this exact JSON structure:
{{
  "category": "income_tax|gst|quotation|invoice|payment|compliance|general",
  "summary": "one sentence summary",
  "action": "specific action the staff must take",
  "action_required": true or false,
  "priority": "high|medium|low",
  "deadline": "YYYY-MM-DD or null",
  "company_name": "extracted company name or null",
  "amount": numeric amount in rupees or null
}}

Rules:
- category income_tax: mentions ITR, income tax, TDS
- category gst: mentions GST, GSTIN, goods and services tax
- category quotation: quotation approval, estimate
- category invoice: invoice, bill raised
- category payment: payment due, payment received, outstanding
- category compliance: ROC, MCA, company law, audit
- priority high: urgent, immediately, ASAP, overdue, penalty, legal notice
- priority medium: important, review needed, approval required
- priority low: FYI, information, update
"""

        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0,
        )

        import json
        raw = response.choices[0].message.content.strip()
        data = json.loads(raw)

        deadline = None
        if data.get("deadline"):
            try:
                deadline = datetime.strptime(data["deadline"], "%Y-%m-%d")
            except ValueError:
                pass

        return EmailAnalysis(
            category=data.get("category", "general"),
            summary=data.get("summary", "Communication requiring review."),
            action=data.get("action"),
            action_required=bool(data.get("action_required", False)),
            priority=data.get("priority", "low"),
            deadline=deadline,
            company_name=data.get("company_name"),
            amount=data.get("amount"),
        )

    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
# Rule-Based Processor (always works, no API needed)
# ─────────────────────────────────────────────────────────────

def _rule_processor(subject: str, message: str) -> EmailAnalysis:
    text = f"{subject} {message}".lower()
    full_text = f"{subject} {message}"

    # ── Category ──────────────────────────────────────────────
    if any(k in text for k in ["income tax", "itr", "income-tax", "tds", "26as"]):
        category = "income_tax"
    elif any(k in text for k in ["gst", "goods and services tax", "gstin", "gstr"]):
        category = "gst"
    elif any(k in text for k in ["quotation", "quote", "estimate"]):
        category = "quotation"
    elif any(k in text for k in ["payment outstanding", "payment reminder", "payment received",
                                 "payment overdue", "outstanding payment", "payment due",
                                 "overdue amount", "dues"]):
        category = "payment"
    elif any(k in text for k in ["invoice", "bill raised", "tax invoice"]):
        category = "invoice"
    elif any(k in text for k in ["roc", "mca", "company law", "audit", "compliance", "annual return"]):
        category = "compliance"
    else:
        category = "general"

    # ── Priority ──────────────────────────────────────────────
    if any(k in text for k in ["urgent", "immediately", "asap", "as soon as possible", "penalty", "legal notice", "notice", "demand notice"]):
        priority = "high"
    elif any(k in text for k in ["important", "review", "approval", "confirm", "needed", "require"]):
        priority = "medium"
    else:
        priority = "low"

    # Compliance/tax categories auto-elevate to at least medium
    if category in ("income_tax", "gst", "compliance") and priority == "low":
        priority = "medium"

    # ── Action Required ───────────────────────────────────────
    action_keywords = [
        "please provide", "please send", "please submit", "please confirm",
        "please review", "please approve", "required", "need", "submit",
        "send us", "provide", "complete", "pay", "respond", "reply",
        "kindly", "request you to", "action required", "follow up",
    ]
    action_required = any(k in text for k in action_keywords)

    # ── Action Extraction ─────────────────────────────────────
    action = None
    if "submit" in text and category == "income_tax":
        action = "Submit Income Tax documents"
    elif "submit" in text and category == "gst":
        action = "Submit GST documents/returns"
    elif "quotation" in text and any(k in text for k in ["approve", "confirm", "review"]):
        action = "Review and approve quotation"
    elif "quotation" in text:
        action = "Review quotation"
    elif "invoice" in text and any(k in text for k in ["pay", "payment"]):
        action = "Process payment for invoice"
    elif "invoice" in text:
        action = "Review invoice"
    elif "payment" in text:
        action = "Process pending payment"
    elif "please provide" in text or "provide" in text:
        action = "Provide requested documents"
    elif "please send" in text:
        action = "Send requested information"
    elif "confirm" in text or "approval" in text or "approve" in text:
        action = "Review and provide confirmation"
    elif action_required:
        action = "Review and respond to communication"

    # ── Deadline Extraction ───────────────────────────────────
    deadline = None
    months = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4,
        "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }

    # Pattern: "25 September 2026" or "25 Sep"
    m = re.search(
        r"(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(?:\s+(\d{4}))?",
        text,
    )
    if m:
        day = int(m.group(1))
        month = months[m.group(2)]
        year = int(m.group(3)) if m.group(3) else datetime.now().year
        try:
            deadline = datetime(year, month, day)
        except ValueError:
            pass

    if not deadline:
        # Pattern: "25/09/2026" or "25-09-2026"
        m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", text)
        if m:
            try:
                deadline = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            except ValueError:
                pass

    if not deadline:
        # ISO pattern: "2026-09-25"
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
        if m:
            try:
                deadline = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                pass

    # ── Company Name Extraction ───────────────────────────────
    company_name = None
    # Prefer the subject because company names commonly appear after a dash.
    subject_company_patterns = [
        r"\s[-–]\s*([A-Z][A-Za-z0-9& .]{2,60})\s*$",
    ]
    for pattern in subject_company_patterns:
        m = re.search(pattern, subject.strip())
        if m:
            candidate = m.group(1).strip()
            if len(candidate) > 3:
                company_name = candidate
                break

    # Fall back to the message when the subject does not contain a clear company name.
    company_patterns = [
        # Common email subject formats: "... - ABC Industries Pvt Ltd" or "... - YZA Logistics"
        r"[-–]\s*([A-Z][A-Za-z0-9& .]+(?:Ltd|Limited|Pvt|Private|Industries|Corp|Corporation|Enterprises|Solutions|Services|Logistics|Trading|Manufacturing|Technologies))\s*$",
        r"for\s+([A-Z][A-Za-z\s&]+(?:Ltd|Limited|Pvt|Private|Industries|Corp|Corporation|Enterprises|Solutions|Services))",
        r"([A-Z][A-Za-z\s&]+(?:Ltd|Limited|Pvt|Private|Industries|Corp|Corporation|Enterprises|Solutions|Services))",
        r"(?:from|re:|regarding)\s+([A-Z][A-Za-z\s&]+)",
    ]
    if not company_name:
        for pattern in company_patterns:
            m = re.search(pattern, full_text)
            if m:
                company_name = m.group(1).strip()
                if len(company_name) > 5:
                    break

    # ── Amount Extraction ─────────────────────────────────────
    amount = None
    # Match Rs. 2,50,000 or ₹2,50,000 or INR 250000
    amount_patterns = [
        (r"(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:lakh|lakhs)", 100000),
        (r"([0-9,]+(?:\.[0-9]+)?)\s*(?:lakh|lakhs)", 100000),
        (r"(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]+)?)", 1),
        (r"([0-9,]+(?:\.[0-9]+)?)\s*rupees", 1),
    ]
    for pattern, multiplier in amount_patterns:
        m = re.search(pattern, text)
        if m:
            try:
                raw_amount = m.group(1).replace(",", "")
                amount = float(raw_amount) * multiplier
                break
            except ValueError:
                pass

    # ── Summary ───────────────────────────────────────────────
    cat_label = category.replace("_", " ").title()
    priority_label = priority.title()
    if action:
        summary = f"{cat_label} | {action}"
    else:
        summary = f"{cat_label} communication — {priority_label} priority."

    return EmailAnalysis(
        category=category,
        summary=summary,
        action=action,
        action_required=action_required,
        priority=priority,
        deadline=deadline,
        company_name=company_name,
        amount=amount,
    )


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────

def classify_and_extract_email(subject: str, message: str) -> EmailAnalysis:
    """
    Analyze an email and return structured CRM information.

    Tries LLM processor first; falls back to rule-based processor
    if LLM is unavailable (no API key, no credits, network error).
    """
    result = _llm_processor(subject, message)
    if result is not None:
        return result
    return _rule_processor(subject, message)
