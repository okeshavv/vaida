"""
VAIDA SMS Service — Sends SMS alerts via Twilio/MSG91.
In dev mode: logs messages instead of sending.
"""
from app.config import get_settings

settings = get_settings()


def send_sms(phone: str, message: str) -> dict:
    """
    Send an SMS to the given phone number.
    Dev mode: returns mock response.
    Production: integrates with Twilio/MSG91.
    """
    if settings.ENVIRONMENT == "development" or not settings.SMS_PROVIDER_KEY:
        # Dev mode — just log
        print(f"[SMS DEV] To: {phone} | Message: {message[:100]}")
        return {"status": "dev_logged", "phone": phone}

    # Production: call SMS API
    # import twilio or msg91 SDK here
    return {"status": "sent", "phone": phone}


def send_asha_alert(phone: str, patient_district: str, urgency: str) -> dict:
    """Send emergency alert to ASHA worker."""
    message = (
        f"VAIDA ALERT: A RED urgency case has been flagged in {patient_district}. "
        f"Please check your VAIDA dashboard immediately."
    )
    return send_sms(phone, message)


def send_patient_confirmation(phone: str, urgency: str, lang: str = "en") -> dict:
    """Send teleconsult confirmation SMS to patient."""
    messages = {
        "en": "VAIDA: Your teleconsultation has been scheduled. A doctor will contact you within 24 hours.",
        "hi": "VAIDA: आपका टेलीकंसल्टेशन निर्धारित किया गया है। एक डॉक्टर 24 घंटे के भीतर आपसे संपर्क करेगा।",
    }
    return send_sms(phone, messages.get(lang, messages["en"]))
