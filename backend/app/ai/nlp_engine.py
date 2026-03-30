"""
VAIDA NLP Engine — Symptom extraction using GPT-4o or local fallback.
"""
import json
import re
from typing import Optional
from app.ai.prompts import SYMPTOM_NLP_PROMPT


def extract_symptoms_local(patient_input: str, lang: str = "en") -> dict:
    """
    Local/fallback symptom extraction when OpenAI is unavailable.
    Parses basic symptom keywords from free text.
    Used in tests and offline mode.
    """
    text = patient_input.lower()

    # ── Detect body location ──
    locations = {
        "chest": ["chest", "heart", "seena", "chhati"],
        "head": ["head", "sir", "thalai"],
        "abdomen": ["stomach", "abdomen", "belly", "pet"],
        "throat": ["throat", "gala", "tontai"],
        "back": ["back", "kamar", "peeth"],
        "leg": ["leg", "pair", "kaal"],
        "arm": ["arm", "haath", "baahu"],
        "eye": ["eye", "aankh", "kann"],
    }
    body_location = "unspecified"
    for loc, keywords in locations.items():
        if any(kw in text for kw in keywords):
            body_location = loc
            break

    # ── Detect symptom characters ──
    characters = []
    char_keywords = {
        "sharp": ["sharp", "tez"],
        "dull": ["dull", "halka"],
        "burning": ["burning", "jalan"],
        "throbbing": ["throbbing", "dhadakna"],
        "tight": ["tight", "pressure"],
        "stabbing": ["stabbing", "chubhna"],
    }
    for char, keywords in char_keywords.items():
        if any(kw in text for kw in keywords):
            characters.append(char)

    # ── Detect severity from text ──
    severity = 5  # default moderate
    if any(w in text for w in ["severe", "extreme", "unbearable", "bahut", "very bad"]):
        severity = 8
    elif any(w in text for w in ["moderate", "medium", "thoda"]):
        severity = 5
    elif any(w in text for w in ["mild", "slight", "halka", "little"]):
        severity = 3

    # ── Detect duration ──
    duration_hours = None
    duration_match = re.search(r"(\d+)\s*(hour|hr|day|din|ghanta)", text)
    if duration_match:
        val = int(duration_match.group(1))
        unit = duration_match.group(2)
        if unit in ("day", "din"):
            duration_hours = val * 24
        else:
            duration_hours = val

    # ── Detect red flags ──
    red_flags = {
        "chest_pain_sweat": any(w in text for w in ["chest pain", "sweating", "seena dard"]) and
                            any(w in text for w in ["sweat", "paseena", "perspir"]),
        "facial_droop": any(w in text for w in ["face droop", "facial droop", "chehra", "numbness face"]),
        "loss_of_consciousness": any(w in text for w in ["unconscious", "fainted", "behosh", "passed out"]),
        "child_breathing_distress": any(w in text for w in ["child breath", "baby breath", "infant breath", "bachcha saans"]),
        "sudden_severe_headache": any(w in text for w in ["sudden headache", "worst headache", "thunderclap"]),
    }

    # ── Detect associated symptoms ──
    associated = []
    symptom_keywords = [
        "fever", "nausea", "vomiting", "dizziness", "fatigue",
        "cough", "diarrhea", "rash", "swelling", "weakness",
        "bukhar", "ulti", "chakkar", "thakan", "khansi",
    ]
    for kw in symptom_keywords:
        if kw in text:
            associated.append(kw)

    # ── Detect language ──
    hindi_markers = ["hai", "mein", "dard", "bukhar", "pet", "sir", "bahut"]
    tamil_markers = ["irukku", "vali", "thalai", "kaichal"]
    detected_lang = lang
    if any(m in text for m in hindi_markers):
        detected_lang = "hi"
    elif any(m in text for m in tamil_markers):
        detected_lang = "ta"

    return {
        "chief_complaint": patient_input[:200],
        "body_location": body_location,
        "symptom_character": characters if characters else ["dull"],
        "duration_hours": duration_hours,
        "severity_1_10": severity,
        "associated_symptoms": associated,
        "red_flag_features": red_flags,
        "lang_detected": detected_lang,
    }


async def extract_symptoms_gpt(patient_input: str, openai_client=None) -> dict:
    """
    Extract symptoms using GPT-4o API.
    Falls back to local extraction if API unavailable.
    """
    if openai_client is None:
        return extract_symptoms_local(patient_input)

    try:
        prompt = SYMPTOM_NLP_PROMPT.replace("{patient_input}", patient_input)
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=800,
        )
        content = response.choices[0].message.content
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return extract_symptoms_local(patient_input)
    except Exception:
        return extract_symptoms_local(patient_input)
