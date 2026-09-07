import os
import sys
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("python_erp.printer")

class ESCPOSCommands:
    INIT = b"\x1B\x40"
    ALIGN_LEFT = b"\x1B\x61\x00"
    ALIGN_CENTER = b"\x1B\x61\x01"
    ALIGN_RIGHT = b"\x1B\x61\x02"
    BOLD_ON = b"\x1B\x45\x01"
    BOLD_OFF = b"\x1B\x45\x00"
    DOUBLE_SIZE = b"\x1D\x21\x11"
    NORMAL_SIZE = b"\x1D\x21\x00"
    FEED_LINE = b"\x0A"
    CUT_PAPER = b"\x1D\x56\x41\x10"

def build_receipt_bytes(receipt_data: Dict[str, Any]) -> bytes:
    """
    Constructs raw ESC/POS byte sequence for 58mm / 80mm thermal receipt.
    """
    buf = bytearray()
    
    # 1. Initialize Printer
    buf.extend(ESCPOSCommands.INIT)
    
    # 2. Header
    buf.extend(ESCPOSCommands.ALIGN_CENTER)
    buf.extend(ESCPOSCommands.BOLD_ON)
    buf.extend(ESCPOSCommands.DOUBLE_SIZE)
    buf.extend("GURUKUL KIOSK\n".encode("utf-8"))
    buf.extend(ESCPOSCommands.NORMAL_SIZE)
    buf.extend(ESCPOSCommands.BOLD_OFF)
    buf.extend("--------------------------------\n".encode("utf-8"))
    
    # 3. Receipt Details
    buf.extend(ESCPOSCommands.ALIGN_LEFT)
    receipt_no = receipt_data.get("receipt_no") or receipt_data.get("receiptNo", "")
    date_str = receipt_data.get("created_at") or receipt_data.get("at", "")
    buf.extend(f"Receipt No: #{receipt_no}\n".encode("utf-8"))
    buf.extend(f"Date: {date_str[:19]}\n".encode("utf-8"))
    buf.extend("--------------------------------\n".encode("utf-8"))
    
    # 4. Student & Service
    suid = receipt_data.get("suid", "")
    name = receipt_data.get("student_name") or receipt_data.get("name", "")
    class_name = receipt_data.get("class_name") or receipt_data.get("className", "N/A")
    room_no = receipt_data.get("room_no") or receipt_data.get("roomNo", "N/A")
    service = receipt_data.get("service_name") or receipt_data.get("service", "")
    amount = float(receipt_data.get("amount", 0.0))
    
    buf.extend(f"Student: {name}\n".encode("utf-8"))
    buf.extend(f"SUID   : {suid}\n".encode("utf-8"))
    buf.extend(f"Class  : {class_name} | Room: {room_no}\n".encode("utf-8"))
    buf.extend("--------------------------------\n".encode("utf-8"))
    
    # 5. Amount (Bold Double Size)
    buf.extend(ESCPOSCommands.ALIGN_CENTER)
    buf.extend(ESCPOSCommands.BOLD_ON)
    buf.extend(f"SERVICE: {service.upper()}\n".encode("utf-8"))
    buf.extend(ESCPOSCommands.DOUBLE_SIZE)
    buf.extend(f"AMOUNT: Rs. {amount:.2f}\n".encode("utf-8"))
    buf.extend(ESCPOSCommands.NORMAL_SIZE)
    buf.extend(ESCPOSCommands.BOLD_OFF)
    buf.extend("--------------------------------\n".encode("utf-8"))
    
    # 6. Footer
    buf.extend(ESCPOSCommands.ALIGN_CENTER)
    buf.extend("Shree Swaminarayan Gurukul\n".encode("utf-8"))
    buf.extend("Thank You & Jay Swaminarayan\n\n\n".encode("utf-8"))
    
    # 7. Paper Cut
    buf.extend(ESCPOSCommands.CUT_PAPER)
    return bytes(buf)

def print_raw_bytes(raw_data: bytes, printer_name: Optional[str] = None) -> bool:
    """
    Sends raw ESC/POS bytes directly to Windows Print Spooler.
    """
    if sys.platform != "win32":
        logger.info("[DirectPrint] Non-windows platform - raw bytes generated successfully.")
        return True

    try:
        import win32print
        p_name = printer_name or win32print.GetDefaultPrinter()
        if not p_name:
            logger.warning("No default Windows printer found.")
            return False

        h_printer = win32print.OpenPrinter(p_name)
        try:
            h_job = win32print.StartDocPrinter(h_printer, 1, ("Gurukul Thermal Receipt", None, "RAW"))
            try:
                win32print.StartPagePrinter(h_printer)
                win32print.WritePrinter(h_printer, raw_data)
                win32print.EndPagePrinter(h_printer)
            finally:
                win32print.EndDocPrinter(h_printer)
        finally:
            win32print.ClosePrinter(h_printer)
        
        logger.info(f"Receipt printed successfully on '{p_name}'")
        return True
    except Exception as e:
        logger.error(f"Failed to send print job to '{printer_name}': {e}")
        return False
