"""
VAIDA SMS Service — Sends OTPs and alerts via Twilio or MSG91.

In development mode (SMS_PROVIDER_KEY unset): logs to console instead.
In production: set SMS_PROVIDER_KEY, SMS_PROVIDER, and SMS_FROM_NUMBER in .env.
"""
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def send_sms(phone: str, message: str) -> dict:
    """
    Send an SMS to the given phone number.
    Dev mode (no SMS_PROVIDER_KEY): logs to console.
    Production: routes to Twilio or MSG91.
    """
    if not settings.SMS_PROVIDER_KEY:
        logger.info("[SMS DEV] To: %s | %s", phone, message[:120])
        return {"status": "dev_logged", "phone": phone}

    if settings.SMS_PROVIDER == "twilio":
        return _send_twilio(phone, message)
    elif settings.SMS_PROVIDER == "msg91":
        return _send_msg91(phone, message)
    else:
        logger.error("Unknown SMS_PROVIDER: %s", settings.SMS_PROVIDER)
        return {"status": "error", "detail": f"Unknown SMS_PROVIDER: {settings.SMS_PROVIDER}"}


def _send_twilio(phone: str, message: str) -> dict:
    try:
        from twilio.rest import Client  # type: ignore[import]
        # SMS_PROVIDER_KEY format: "ACCOUNT_SID:AUTH_TOKEN"
        parts = settings.SMS_PROVIDER_KEY.split(":", 1)
        if len(parts) != 2:
            raise ValueError("SMS_PROVIDER_KEY for Twilio must be 'ACCOUNT_SID:AUTH_TOKEN'")
        account_sid, auth_token = parts
        client = Client(account_sid, auth_token)
        msg = client.messages.create(
            body=message,
            from_=settings.SMS_FROM_NUMBER,
            to=f"+91{phone}" if not phone.startswith("+") else phone,
        )
        logger.info("Twilio SMS sent: SID=%s to %s", msg.sid, phone)
        return {"status": "sent", "sid": msg.sid}
    except ImportError:
        logger.error("twilio package not installed. Run: pip install twilio")
        return {"status": "error", "detail": "twilio not installed"}
    except Exception as exc:
        logger.error("Twilio SMS failed to %s: %s", phone, exc)
        return {"status": "error", "detail": str(exc)}


def _send_msg91(phone: str, message: str) -> dict:
    try:
        import httpx
        resp = httpx.post(
            "https://api.msg91.com/api/v5/otp",
            params={
                "authkey": settings.SMS_PROVIDER_KEY,
                "mobile": f"91{phone}",
                "message": message,
                "otp": message,  # MSG91 OTP API expects otp param
            },
            timeout=10,
        )
        resp.raise_for_status()
        logger.info("MSG91 SMS sent to %s: %s", phone, resp.text[:80])
        return {"status": "sent", "response": resp.json()}
    except Exception as exc:
        logger.error("MSG91 SMS failed to %s: %s", phone, exc)
        return {"status": "error", "detail": str(exc)}


def send_otp(phone: str, otp_code: str, lang: str = "en") -> dict:
    """Send an OTP to the user's phone number."""
    messages = {
        "en": f"Your VAIDA verification code is {otp_code}. Valid for 5 minutes. Do not share.",
        "hi": f"आपका VAIDA सत्यापन कोड {otp_code} है। 5 मिनट के लिए वैध। किसी को न बताएं।",
    }
    message = messages.get(lang, messages["en"])
    return send_sms(phone, message)


def send_asha_alert(phone: str, patient_district: str, urgency: str) -> dict:
    """Send emergency alert to ASHA worker."""
    message = (
        f"VAIDA ALERT: A RED urgency case has been flagged in {patient_district}. "
        "Please check your VAIDA dashboard immediately."
    )
    return send_sms(phone, message)


def send_patient_confirmation(phone: str, urgency: str, lang: str = "en") -> dict:
    """Send teleconsult confirmation SMS to patient."""
    messages = {
        "en": "VAIDA: Your teleconsultation has been scheduled. A doctor will contact you within 24 hours.",
        "hi": "VAIDA: आपका टेलीकंसल्टेशन निर्धारित किया गया है। एक डॉक्टर 24 घंटे के भीतर आपसे संपर्क करेगा।",
    }
    return send_sms(phone, messages.get(lang, messages["en"]))
