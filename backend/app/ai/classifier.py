"""
VAIDA Triage Classifier — Rule engine + ML confidence gating.
This is the most safety-critical component in the entire system.

Logic (from wireframe):
  1. Hard-coded RED overrides (clinical rules) — NEVER reaches ML
  2. ML model prediction (fine-tuned on MIMIC-III)
  3. Confidence gating: if confidence < 0.65, default to AMBER (err safe)
  4. Return GREEN | AMBER | RED
"""
from typing import Tuple, List
import random


# ═══════════════════════════════════════════════════════════
# RED FLAG DEFINITIONS — 15 hard overrides
# ═══════════════════════════════════════════════════════════
RED_FLAG_KEYS = [
    "chest_pain_sweat",
    "facial_droop",
    "loss_of_consciousness",
    "child_breathing_distress",
    "sudden_severe_headache",
]

# Extended red flags (beyond the 5 in the prompt)
EXTENDED_RED_FLAGS = [
    "severe_bleeding",
    "seizure_active",
    "anaphylaxis_signs",
    "severe_burns",
    "poisoning_ingestion",
    "high_fever_infant",       # fever > 38°C in < 3 months
    "severe_dehydration",
    "trauma_head_injury",
    "difficulty_breathing",
    "unresponsive",
]

CONFIDENCE_THRESHOLD = 0.65


def check_red_flags(symptoms: dict) -> Tuple[bool, List[str]]:
    """
    Check for hard RED override conditions.
    Returns (is_red, list_of_triggered_flags).
    """
    red_flags = symptoms.get("red_flag_features", {})
    triggered = [key for key, val in red_flags.items() if val is True]
    return len(triggered) > 0, triggered


def compute_severity_score(symptoms: dict) -> float:
    """
    Heuristic severity scoring when ML model is unavailable.
    Factors: severity_1_10, duration, symptom count, associated symptoms.
    Returns a score between 0.0 and 1.0.
    """
    score = 0.0

    # Severity input (1-10 scale, normalised)
    severity = symptoms.get("severity_1_10", 5)
    if severity is not None:
        score += (severity / 10.0) * 0.4  # 40% weight

    # Duration factor — longer duration with high severity is concerning
    duration = symptoms.get("duration_hours", 0)
    if duration is not None:
        if duration > 72:
            score += 0.15
        elif duration > 24:
            score += 0.10
        elif duration > 6:
            score += 0.05

    # Symptom character severity
    characters = symptoms.get("symptom_character", [])
    severe_chars = {"stabbing", "sharp", "burning", "throbbing"}
    if set(characters) & severe_chars:
        score += 0.15

    # Number of associated symptoms
    associated = symptoms.get("associated_symptoms", [])
    if len(associated) >= 4:
        score += 0.15
    elif len(associated) >= 2:
        score += 0.10

    # Body location risk multiplier
    high_risk_locations = {"chest", "head", "abdomen", "throat", "eye"}
    location = (symptoms.get("body_location", "") or "").lower()
    if any(loc in location for loc in high_risk_locations):
        score += 0.10

    return min(score, 1.0)


def classify_urgency(symptoms: dict) -> dict:
    """
    Main triage classification function.
    Returns dict with urgency, confidence, differential, rule_override, model_version.
    """
    # ── Step 1: Hard-coded RED overrides ──
    is_red, triggered_flags = check_red_flags(symptoms)
    if is_red:
        return {
            "urgency": "RED",
            "confidence": 1.0,
            "rule_override": True,
            "triggered_flags": triggered_flags,
            "model_version": "rule-engine-v1.0",
            "differential": [
                {
                    "condition": "Emergency condition detected via red flag rules",
                    "probability": 0.95,
                    "reasoning": f"Red flags triggered: {', '.join(triggered_flags)}",
                }
            ],
        }

    # ── Step 2: ML model prediction (simulated with heuristics) ──
    severity_score = compute_severity_score(symptoms)

    # Simulate ML confidence (in production, this calls the MIMIC-III model)
    # For hackathon: use heuristic score + small random noise
    noise = random.uniform(-0.05, 0.05)
    confidence = min(max(severity_score + noise, 0.0), 1.0)

    # Classify based on severity score
    if severity_score >= 0.70:
        raw_urgency = "RED"
    elif severity_score >= 0.40:
        raw_urgency = "AMBER"
    else:
        raw_urgency = "GREEN"

    # ── Step 3: Confidence gating ──
    if confidence < CONFIDENCE_THRESHOLD:
        final_urgency = "AMBER" if raw_urgency == "GREEN" else raw_urgency
    else:
        final_urgency = raw_urgency

    # ── Build differential diagnosis ──
    differential = _build_differential(symptoms, final_urgency)

    return {
        "urgency": final_urgency,
        "confidence": round(confidence, 3),
        "rule_override": False,
        "triggered_flags": [],
        "model_version": "triage-v1.0.0",
        "differential": differential,
    }


def _build_differential(symptoms: dict, urgency: str) -> list:
    """Build a basic differential diagnosis list based on symptoms."""
    chief = symptoms.get("chief_complaint", "Unknown")
    location = symptoms.get("body_location", "unspecified")
    characters = symptoms.get("symptom_character", [])

    differentials = []

    # Simple pattern matching for common presentations
    location_lower = (location or "").lower()
    chief_lower = (chief or "").lower()

    if "chest" in location_lower or "chest" in chief_lower:
        differentials.append({
            "condition": "Musculoskeletal chest pain",
            "probability": 0.4,
            "reasoning": "Chest location without red flags",
        })
        differentials.append({
            "condition": "Gastroesophageal reflux",
            "probability": 0.3,
            "reasoning": "Common cause of chest discomfort",
        })

    elif "head" in location_lower or "headache" in chief_lower:
        differentials.append({
            "condition": "Tension headache",
            "probability": 0.5,
            "reasoning": "Most common headache type",
        })
        differentials.append({
            "condition": "Migraine",
            "probability": 0.3,
            "reasoning": "Recurrent headache pattern",
        })

    elif "abdomen" in location_lower or "stomach" in chief_lower:
        differentials.append({
            "condition": "Gastritis",
            "probability": 0.4,
            "reasoning": "Common abdominal complaint",
        })
        differentials.append({
            "condition": "Gastroenteritis",
            "probability": 0.35,
            "reasoning": "GI infection",
        })

    else:
        differentials.append({
            "condition": "Requires clinical evaluation",
            "probability": 0.5,
            "reasoning": f"Symptoms in {location} need in-person assessment",
        })

    if "fever" in chief_lower or "fever" in str(symptoms.get("associated_symptoms", [])).lower():
        differentials.append({
            "condition": "Viral infection",
            "probability": 0.45,
            "reasoning": "Fever with associated symptoms suggests infection",
        })

    return differentials
