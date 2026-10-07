import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ["AI_MODE"] = "rule"
os.environ["OPENAI_API_KEY"] = "sk-placeholder"

from ai.email_processor import classify_and_extract_email


def test_gst_notice_is_high_priority_and_extracts_deadline():
    result = classify_and_extract_email(
        "GST Demand Notice - PQR Enterprises",
        "Please respond urgently. Amount Rs. 75,000. Deadline is 10 October 2026. Please submit documents.",
    )
    assert result.category == "gst"
    assert result.priority == "high"
    assert result.action_required is True
    assert result.amount == 75000.0
    assert result.deadline is not None


def test_payment_reminder_is_not_misclassified_as_invoice():
    result = classify_and_extract_email(
        "Payment Outstanding - JKL Industries Pvt Ltd",
        "Payment of Rs. 3,40,000 against our invoice is still outstanding. Please process this immediately.",
    )
    assert result.category == "payment"
    assert result.priority == "high"
    assert result.amount == 340000.0


def test_lakh_amount_is_converted_once():
    result = classify_and_extract_email(
        "Quotation - MNO Technologies Ltd",
        "Please review quotation of Rs. 2.5 lakh and confirm by 25 September 2026.",
    )
    assert result.amount == 250000.0
