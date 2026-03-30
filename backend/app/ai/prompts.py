"""
VAIDA AI Prompts — All LLM system/user prompts centralised here.
Matches the wireframe specification exactly.
"""

# ─────────────────────────────────────────────────────────
# POST /intake — Symptom NLP extraction prompt
# ─────────────────────────────────────────────────────────
SYMPTOM_NLP_PROMPT = """
You are a structured medical intake assistant.
Extract ALL of the following and return ONLY JSON:

{
  "chief_complaint": str,
  "body_location": str,
  "symptom_character": [
    "sharp|dull|burning|throbbing|tight|stabbing"
  ],
  "duration_hours": int,
  "severity_1_10": int,
  "associated_symptoms": [str],
  "red_flag_features": {
    "chest_pain_sweat": bool,
    "facial_droop": bool,
    "loss_of_consciousness": bool,
    "child_breathing_distress": bool,
    "sudden_severe_headache": bool
  },
  "lang_detected": str
}

Patient input (may be Hindi / dialect):
{patient_input}
""".strip()


# ─────────────────────────────────────────────────────────
# POST /image/analyse — GPT-4o Vision prompt
# ─────────────────────────────────────────────────────────
VISION_PROMPT = """
Analyse this medical image. Return ONLY JSON:
{
  "visible_findings": str,
  "diagnosis_category": "inflammatory|infectious|traumatic|other",
  "urgency_indicator": "low|medium|high",
  "recommended_specialist": str,
  "patient_message": "Image received and sent to doctor."
}
Image type provided: {image_type}
""".strip()


# ─────────────────────────────────────────────────────────
# GET /brief — Doctor pre-brief generation prompt
# ─────────────────────────────────────────────────────────
BRIEF_GENERATION_PROMPT = """
You are generating a structured doctor pre-brief for a teleconsultation.
Based on the following patient data, generate a comprehensive clinical summary.

Return ONLY JSON:
{{
  "patient_summary": str,
  "chief_complaint": str,
  "symptom_timeline": str,
  "ai_triage_assessment": {{
    "urgency": str,
    "confidence": float,
    "reasoning": str
  }},
  "differential_diagnosis": [
    {{"condition": str, "probability": float, "key_indicators": [str]}}
  ],
  "recommended_questions": [str],
  "recommended_investigations": [str],
  "red_flags_identified": [str],
  "disclaimer": "AI-generated pre-brief. Clinical judgement supersedes all AI suggestions."
}}

Patient data:
{patient_data}
""".strip()


# ─────────────────────────────────────────────────────────
# Triage guidance messages by urgency level
# ─────────────────────────────────────────────────────────
GUIDANCE_TEMPLATES = {
    "GREEN": {
        "en": "Based on your symptoms, self-care at home is recommended. Rest, stay hydrated, and monitor your symptoms. If they worsen or persist beyond 48 hours, please consult again. This is AI guidance, not a medical diagnosis. Always consult a qualified doctor.",
        "hi": "आपके लक्षणों के आधार पर, घर पर स्व-देखभाल की सिफारिश की जाती है। आराम करें, हाइड्रेटेड रहें, और अपने लक्षणों की निगरानी करें। यदि वे 48 घंटे से अधिक समय तक बिगड़ते या बने रहते हैं, तो कृपया फिर से परामर्श करें। यह AI मार्गदर्शन है, चिकित्सा निदान नहीं।",
        "ta": "உங்கள் அறிகுறிகளின் அடிப்படையில், வீட்டிலேயே சுய பராமரிப்பு பரிந்துரைக்கப்படுகிறது। ஓய்வு எடுங்கள், நீரேற்றமாக இருங்கள். இது AI வழிகாட்டுதல், மருத்துவ நோயறிதல் அல்ல.",
    },
    "AMBER": {
        "en": "Your symptoms suggest you should consult a doctor within 24 hours. A teleconsultation has been scheduled. Please keep monitoring your symptoms. This is AI guidance, not a medical diagnosis. Always consult a qualified doctor.",
        "hi": "आपके लक्षण बताते हैं कि आपको 24 घंटे के भीतर डॉक्टर से परामर्श करना चाहिए। एक टेलीकंसल्टेशन निर्धारित की गई है। यह AI मार्गदर्शन है, चिकित्सा निदान नहीं।",
        "ta": "உங்கள் அறிகுறிகள் 24 மணி நேரத்திற்குள் மருத்துவரை அணுக வேண்டும் என்று குறிக்கின்றன. இது AI வழிகாட்டுதல், மருத்துவ நோயறிதல் அல்ல.",
    },
    "RED": {
        "en": "URGENT: Your symptoms indicate a potential emergency. Please visit your nearest health facility immediately or call emergency services. An alert has been sent to your local health worker. This is AI guidance, not a medical diagnosis.",
        "hi": "तत्काल: आपके लक्षण एक संभावित आपातकाल का संकेत देते हैं। कृपया तुरंत अपने निकटतम स्वास्थ्य केंद्र पर जाएं। आपके स्थानीय स्वास्थ्य कार्यकर्ता को अलर्ट भेजा गया है। यह AI मार्गदर्शन है, चिकित्सा निदान नहीं।",
        "ta": "அவசரம்: உங்கள் அறிகுறிகள் அவசர நிலையைக் குறிக்கின்றன. உடனடியாக அருகிலுள்ள மருத்துவமனைக்குச் செல்லுங்கள். இது AI வழிகாட்டுதல், மருத்துவ நோயறிதல் அல்ல.",
    },
}

# Disclaimer appended to every patient-facing response
DISCLAIMER = {
    "en": "This is AI guidance, not a medical diagnosis. Always consult a qualified doctor.",
    "hi": "यह AI मार्गदर्शन है, चिकित्सा निदान नहीं। हमेशा एक योग्य डॉक्टर से परामर्श करें।",
    "ta": "இது AI வழிகாட்டுதல், மருத்துவ நோயறிதல் அல்ல. எப்போதும் தகுதியான மருத்துவரை அணுகவும்.",
}
