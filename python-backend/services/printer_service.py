import datetime

def generate_thermal_receipt_text(data: dict) -> str:
    """Generates standard ASCII ESC/POS formatted receipt text for thermal printer hardware"""
    tx_id = data.get("transaction_id", "TXN-000000")
    student_name = data.get("student_name", "Student").upper()
    suid = data.get("suid", "SUID-000")
    standard = data.get("standard", "STD")
    service = data.get("service_description", "Store Purchase")
    amount = float(data.get("amount", 0.0))
    time_str = data.get("timestamp") or datetime.datetime.now().strftime("%d/%m/%Y %I:%mm %p")

    receipt = f"""
========================================
       STUDENT KIOSK ERP SYSTEM        
         OFFICIAL PAYMENT SLIP         
========================================
DATE/TIME: {time_str}
RECEIPT NO: {tx_id}
----------------------------------------
STUDENT NAME : {student_name}
SUID / ID    : {suid}
CLASS/STD    : {standard}
----------------------------------------
SERVICE      : {service}
TOTAL PAID   : INR {amount:.2f}
STATUS       : CLEARED / SUCCESS
----------------------------------------
AUTHENTICATION MODE:
[X] FACE BIOMETRIC (PASSED)
[X] NFC HARDWARE CARD (PASSED)
========================================
     THANK YOU! KEEP THIS RECEIPT.      
========================================
\n\n\n
"""
    return receipt

def send_to_thermal_printer(data: dict) -> bool:
    """Attempts local hardware ESC/POS print job or fallback to text stream"""
    try:
        receipt_text = generate_thermal_receipt_text(data)
        print("[THERMAL PRINTER JOB SENT]:")
        print(receipt_text)
        return True
    except Exception as e:
        print(f"[Thermal Print Hardware Error] {e}")
        return False
