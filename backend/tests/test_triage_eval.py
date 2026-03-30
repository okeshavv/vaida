"""
VAIDA Triage Evaluation — CI/CD gate tests.
These verify the triage system meets minimum accuracy requirements.
If accuracy < 85%, the CI pipeline MUST fail.
"""
import pytest
from app.ai.classifier import classify_urgency

# ═══════════════════════════════════════════════════════════
# Test case corpus — known correct classifications
# ═══════════════════════════════════════════════════════════
RED_CASES = [
    {
        "name": "Chest pain with sweating",
        "symptoms": {
            "chief_complaint": "chest pain with sweating",
            "body_location": "chest",
            "symptom_character": ["sharp"],
            "severity_1_10": 9,
            "associated_symptoms": ["sweating", "nausea"],
            "red_flag_features": {"chest_pain_sweat": True},
        },
    },
    {
        "name": "Stroke signs - facial droop",
        "symptoms": {
            "chief_complaint": "face drooping",
            "body_location": "face",
            "symptom_character": [],
            "severity_1_10": 7,
            "associated_symptoms": ["speech difficulty"],
            "red_flag_features": {"facial_droop": True},
        },
    },
    {
        "name": "Loss of consciousness",
        "symptoms": {
            "chief_complaint": "patient collapsed",
            "body_location": "head",
            "symptom_character": [],
            "severity_1_10": 9,
            "associated_symptoms": [],
            "red_flag_features": {"loss_of_consciousness": True},
        },
    },
    {
        "name": "Child breathing distress",
        "symptoms": {
            "chief_complaint": "infant struggling to breathe",
            "body_location": "chest",
            "symptom_character": [],
            "severity_1_10": 9,
            "associated_symptoms": ["wheezing"],
            "red_flag_features": {"child_breathing_distress": True},
        },
    },
    {
        "name": "Thunderclap headache",
        "symptoms": {
            "chief_complaint": "worst headache ever, sudden onset",
            "body_location": "head",
            "symptom_character": ["stabbing"],
            "severity_1_10": 10,
            "associated_symptoms": ["nausea"],
            "red_flag_features": {"sudden_severe_headache": True},
        },
    },
]

GREEN_CASES = [
    {
        "name": "Mild cold",
        "symptoms": {
            "chief_complaint": "runny nose and mild cough",
            "body_location": "throat",
            "symptom_character": ["dull"],
            "severity_1_10": 2,
            "duration_hours": 24,
            "associated_symptoms": [],
            "red_flag_features": {},
        },
    },
    {
        "name": "Minor muscle ache",
        "symptoms": {
            "chief_complaint": "sore legs after exercise",
            "body_location": "leg",
            "symptom_character": ["dull"],
            "severity_1_10": 2,
            "duration_hours": 12,
            "associated_symptoms": [],
            "red_flag_features": {},
        },
    },
    {
        "name": "Mild headache",
        "symptoms": {
            "chief_complaint": "mild headache",
            "body_location": "head",
            "symptom_character": ["dull"],
            "severity_1_10": 2,
            "duration_hours": 2,
            "associated_symptoms": [],
            "red_flag_features": {},
        },
    },
]

AMBER_CASES = [
    {
        "name": "Moderate fever with body pain",
        "symptoms": {
            "chief_complaint": "fever 101F with body aches",
            "body_location": "head",
            "symptom_character": ["throbbing"],
            "severity_1_10": 6,
            "duration_hours": 48,
            "associated_symptoms": ["fever", "fatigue", "body ache"],
            "red_flag_features": {},
        },
    },
    {
        "name": "Persistent stomach pain",
        "symptoms": {
            "chief_complaint": "stomach pain for 3 days",
            "body_location": "abdomen",
            "symptom_character": ["burning"],
            "severity_1_10": 6,
            "duration_hours": 72,
            "associated_symptoms": ["nausea", "loss of appetite", "bloating"],
            "red_flag_features": {},
        },
    },
]


class TestTriageEval:
    """CI/CD triage evaluation gate — must pass for deployment."""

    @pytest.mark.eval
    def test_triage_accuracy_above_85_percent(self):
        """
        The triage system must correctly classify ≥ 85% of known cases.
        This is the CI/CD deployment gate.
        """
        all_cases = RED_CASES + GREEN_CASES + AMBER_CASES
        correct = 0
        total = len(all_cases)

        for case in RED_CASES:
            result = classify_urgency(case["symptoms"])
            if result["urgency"] == "RED":
                correct += 1

        for case in GREEN_CASES:
            result = classify_urgency(case["symptoms"])
            if result["urgency"] in ("GREEN", "AMBER"):  # AMBER is acceptable for GREEN (errs safe)
                correct += 1

        for case in AMBER_CASES:
            result = classify_urgency(case["symptoms"])
            if result["urgency"] in ("AMBER", "RED"):  # RED is acceptable for AMBER (errs safe)
                correct += 1

        accuracy = correct / total
        print(f"\n{'='*50}")
        print(f"TRIAGE EVALUATION: {correct}/{total} = {accuracy:.1%}")
        print(f"{'='*50}")
        assert accuracy >= 0.85, f"Triage accuracy {accuracy:.1%} is below 85% gate!"

    @pytest.mark.eval
    def test_no_red_case_classified_green(self):
        """
        CRITICAL SAFETY: No RED case should EVER be classified as GREEN.
        This is the most important safety invariant.
        """
        for case in RED_CASES:
            result = classify_urgency(case["symptoms"])
            assert result["urgency"] != "GREEN", \
                f"SAFETY FAILURE: RED case '{case['name']}' was classified as GREEN!"

    @pytest.mark.eval
    def test_red_sensitivity_100_percent(self):
        """All RED flag cases must be caught with 100% sensitivity."""
        for case in RED_CASES:
            result = classify_urgency(case["symptoms"])
            assert result["urgency"] == "RED", \
                f"RED case '{case['name']}' was classified as {result['urgency']}"

    @pytest.mark.eval
    def test_red_cases_have_rule_override(self):
        """All red flag cases bypass ML via rule override."""
        for case in RED_CASES:
            result = classify_urgency(case["symptoms"])
            assert result["rule_override"] is True, \
                f"RED case '{case['name']}' did not use rule override!"
