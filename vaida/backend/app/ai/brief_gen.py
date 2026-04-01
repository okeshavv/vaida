"""
VAIDA Brief Generator — Generates doctor pre-brief documents.
Supports PDF (ReportLab), FHIR R4 JSON, and raw JSON formats.
"""
import json
from datetime import datetime, timezone
from typing import Optional


def generate_brief_json(
    session_data: dict,
    triage_data: dict,
    image_data: Optional[dict] = None,
) -> dict:
    """Generate the raw JSON brief for a doctor."""
    symptoms = session_data.get("symptoms_json", {})

    brief = {
        "brief_type": "VAIDA AI Pre-Brief",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model_version": triage_data.get("model_version", "unknown"),
        "disclaimer": "AI-generated pre-brief. Clinical judgement supersedes all AI suggestions.",

        "patient_summary": {
            "session_id": session_data.get("id"),
            "language": session_data.get("lang_detected", "en"),
            "source": session_data.get("source", "mixed"),
        },

        "chief_complaint": symptoms.get("chief_complaint", "Not specified"),
        "body_location": symptoms.get("body_location", session_data.get("body_location", "unspecified")),
        "symptom_details": {
            "character": symptoms.get("symptom_character", []),
            "duration_hours": session_data.get("duration_hours"),
            "severity_1_10": session_data.get("severity_score"),
            "associated_symptoms": symptoms.get("associated_symptoms", []),
        },

        "ai_triage_assessment": {
            "urgency": triage_data.get("urgency", "AMBER"),
            "confidence": triage_data.get("confidence_score", 0),
            "rule_override": triage_data.get("rule_override", False),
        },

        "differential_diagnosis": triage_data.get("differential_json", []),

        "red_flags_identified": [
            k for k, v in symptoms.get("red_flag_features", {}).items() if v
        ],

        "recommended_questions": [
            "When did symptoms first appear?",
            "Any medications currently being taken?",
            "Any known allergies?",
            "Any recent travel history?",
            "Family history of relevant conditions?",
        ],
    }

    if image_data:
        brief["image_analysis"] = {
            "type": image_data.get("image_type"),
            "findings": image_data.get("findings"),
            "diagnosis_category": image_data.get("diagnosis_category"),
            "urgency": image_data.get("urgency_indicator"),
            "specialist": image_data.get("specialist_type"),
        }

    return brief


def generate_fhir_json(session_data: dict, triage_data: dict) -> dict:
    """
    Generate HL7 FHIR R4 compatible JSON resource.
    Maps VAIDA data to FHIR Encounter + Condition resources.
    """
    now = datetime.now(timezone.utc).isoformat()
    symptoms = session_data.get("symptoms_json", {})
    urgency = triage_data.get("urgency", "AMBER")

    # Map urgency to FHIR priority
    priority_map = {"GREEN": "routine", "AMBER": "urgent", "RED": "stat"}

    fhir_bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": now,
        "entry": [
            {
                "resource": {
                    "resourceType": "Encounter",
                    "status": "in-progress",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "VR",
                        "display": "virtual",
                    },
                    "priority": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
                            "code": priority_map.get(urgency, "urgent"),
                        }]
                    },
                    "subject": {
                        "reference": f"Patient/{session_data.get('patient_id')}",
                    },
                    "period": {"start": now},
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "clinicalStatus": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                        }]
                    },
                    "code": {
                        "text": symptoms.get("chief_complaint", "Unspecified complaint"),
                    },
                    "bodySite": [{
                        "text": symptoms.get("body_location", "unspecified"),
                    }],
                    "subject": {
                        "reference": f"Patient/{session_data.get('patient_id')}",
                    },
                    "note": [{
                        "text": f"AI Triage: {urgency} (confidence: {triage_data.get('confidence_score', 0)}). "
                                f"Symptoms: {', '.join(symptoms.get('associated_symptoms', []))}",
                    }],
                }
            },
        ],
    }

    return fhir_bundle


def generate_pdf_content(brief_json: dict) -> bytes:
    """
    Generate a PDF document from brief JSON using ReportLab.
    Returns PDF bytes.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
        from io import BytesIO

        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # ── Header ──
        c.setFont("Helvetica-Bold", 18)
        c.drawString(30, height - 40, "VAIDA — Doctor Pre-Brief")
        c.setFont("Helvetica", 9)
        c.drawString(30, height - 55, f"Generated: {brief_json.get('generated_at', 'N/A')}")
        c.drawString(30, height - 67, brief_json.get("disclaimer", ""))

        y = height - 100

        # ── Section helper ──
        def section(title, items, y_pos):
            c.setFont("Helvetica-Bold", 12)
            c.drawString(30, y_pos, title)
            y_pos -= 18
            c.setFont("Helvetica", 10)
            for item in items:
                if y_pos < 60:
                    c.showPage()
                    y_pos = height - 40
                c.drawString(45, y_pos, f"• {str(item)[:90]}")
                y_pos -= 14
            return y_pos - 10

        # ── Chief Complaint ──
        c.setFont("Helvetica-Bold", 12)
        c.drawString(30, y, f"Chief Complaint: {brief_json.get('chief_complaint', 'N/A')}")
        y -= 20
        c.setFont("Helvetica", 10)
        c.drawString(30, y, f"Body Location: {brief_json.get('body_location', 'N/A')}")
        y -= 25

        # ── Triage ──
        triage = brief_json.get("ai_triage_assessment", {})
        c.setFont("Helvetica-Bold", 14)
        urgency = triage.get("urgency", "AMBER")
        c.drawString(30, y, f"AI Triage: {urgency}  (Confidence: {triage.get('confidence', 'N/A')})")
        y -= 25

        # ── Differential ──
        diffs = brief_json.get("differential_diagnosis", [])
        diff_items = [f"{d.get('condition', '?')} ({d.get('probability', '?')})" for d in diffs]
        y = section("Differential Diagnosis", diff_items, y)

        # ── Red Flags ──
        flags = brief_json.get("red_flags_identified", [])
        if flags:
            y = section("Red Flags Identified", flags, y)

        # ── Recommended Questions ──
        questions = brief_json.get("recommended_questions", [])
        y = section("Recommended Questions", questions, y)

        c.save()
        return buffer.getvalue()

    except ImportError:
        # ReportLab not installed — return a placeholder PDF
        return b"%PDF-1.4 placeholder - install reportlab for real PDF generation"
