import re
import logging
from typing import Optional

logger = logging.getLogger("python_erp.nfc")

def sanitize_nfc_uid(raw_input: str) -> str:
    """
    Cleans raw NFC scanner output into normalized hexadecimal UID string.
    Supports 4-byte (8 hex chars), 7-byte (14 hex chars), or custom encoded formats.
    """
    if not raw_input:
        return ""
    
    cleaned = raw_input.strip()
    # Remove colons or spaces (e.g., 04:A1:B2:C3 -> 04A1B2C3)
    cleaned = re.sub(r"[\s\:\-]", "", cleaned).upper()
    return cleaned

def validate_nfc_card(nfc_code: str) -> bool:
    """
    Validates if string is a valid NFC card or SUID identifier.
    """
    cleaned = sanitize_nfc_uid(nfc_code)
    return len(cleaned) >= 3 and len(cleaned) <= 64
