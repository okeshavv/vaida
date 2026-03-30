"""
VAIDA Classifier Tests — 10 unit tests for the triage classification engine.
These test the classifier.py module directly (no HTTP, no DB).
"""
import pytest
from app.ai.classifier import classify_urgency, check_red_flags, compute_severity_score


class TestRedFlags:
    """Red flag detection unit tests."""

    @pytest.mark.classifier
    def test_chest_pain_sweat_always_red(self):
        symptoms = {
            "chief_complaint": "chest pain",
            "body_location": "chest",
            "symptom_character": ["sharp"],
            "severity_1_10": 8,
            "associated_symptoms": [],
            "red_flag_features": {"chest_pain_sweat": True},
        }
        result = classify_urgency(symptoms)
        assert result["urgency"] == "RED"
        assert result["rule_override"] is True

    @pytest.mark.classifier
    def test_facial_droop_always_red(self):
        symptoms = {
            "red_flag_features": {"facial_droop": True},
            "severity_1_10": 5,
            "symptom_character": [],
            "associated_symptoms": [],
        }
        result = classify_urgency(symptoms)
        assert result["urgency"] == "RED"

    @pytest.mark.classifier
    def test_consciousness_always_red(self):
        symptoms = {
            "red_flag_features": {"loss_of_consciousness": True},
            "severity_1_10": 3,
            "symptom_character": [],
            "associated_symptoms": [],
        }
        result = classify_urgency(symptoms)
        assert result["urgency"] == "RED"

    @pytest.mark.classifier
    def test_child_breathing_always_red(self):
        symptoms = {
            "red_flag_features": {"child_breathing_distress": True},
            "severity_1_10": 4,
            "symptom_character": [],
            "associated_symptoms": [],
        }
        result = classify_urgency(symptoms)
        assert result["urgency"] == "RED"

    @pytest.mark.classifier
    def test_severe_headache_always_red(self):
        symptoms = {
            "red_flag_features": {"sudden_severe_headache": True},
            "severity_1_10": 10,
            "symptom_character": ["stabbing"],
            "associated_symptoms": [],
        }
        result = classify_urgency(symptoms)
        assert result["urgency"] == "RED"


class TestSeverityScoring:
    """Severity computation and classification tests."""

    @pytest.mark.classifier
    def test_low_severity_tends_green(self):
        """Low severity with no red flags trends GREEN."""
        symptoms = {
            "chief_complaint": "mild headache",
            "body_location": "head",
            "symptom_character": ["dull"],
            "severity_1_10": 2,
            "duration_hours": 4,
            "associated_symptoms": [],
            "red_flag_features": {},
        }
        result = classify_urgency(symptoms)
        # Should be GREEN or AMBER (confidence gating may push to AMBER)
        assert result["urgency"] in ("GREEN", "AMBER")
        assert result["rule_override"] is False

    @pytest.mark.classifier
    def test_high_severity_no_flags_trends_amber_or_red(self):
        """High severity without red flags trends AMBER or RED."""
        symptoms = {
            "chief_complaint": "severe abdominal pain",
            "body_location": "abdomen",
            "symptom_character": ["stabbing", "sharp"],
            "severity_1_10": 9,
            "duration_hours": 72,
            "associated_symptoms": ["nausea", "vomiting", "fever", "dizziness"],
            "red_flag_features": {},
        }
        result = classify_urgency(symptoms)
        assert result["urgency"] in ("AMBER", "RED")

    @pytest.mark.classifier
    def test_confidence_score_in_range(self):
        """Confidence score is always between 0 and 1."""
        symptoms = {
            "severity_1_10": 5,
            "symptom_character": ["dull"],
            "associated_symptoms": ["fatigue"],
            "red_flag_features": {},
        }
        result = classify_urgency(symptoms)
        assert 0.0 <= result["confidence"] <= 1.0

    @pytest.mark.classifier
    def test_result_has_differential(self):
        """Result always includes a differential diagnosis."""
        symptoms = {
            "chief_complaint": "headache",
            "body_location": "head",
            "severity_1_10": 5,
            "symptom_character": [],
            "associated_symptoms": [],
            "red_flag_features": {},
        }
        result = classify_urgency(symptoms)
        assert isinstance(result["differential"], list)
        assert len(result["differential"]) >= 1

    @pytest.mark.classifier
    def test_severity_score_computation(self):
        """Severity scoring handles edge cases."""
        # Zero severity
        score_low = compute_severity_score({
            "severity_1_10": 1,
            "symptom_character": [],
            "associated_symptoms": [],
            "body_location": "arm",
        })
        # Max severity
        score_high = compute_severity_score({
            "severity_1_10": 10,
            "symptom_character": ["stabbing", "burning"],
            "duration_hours": 100,
            "associated_symptoms": ["a", "b", "c", "d"],
            "body_location": "chest",
        })
        assert score_low < score_high
        assert 0.0 <= score_low <= 1.0
        assert 0.0 <= score_high <= 1.0
