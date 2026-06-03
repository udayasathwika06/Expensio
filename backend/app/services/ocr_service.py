import pytesseract
from PIL import Image
import cv2
import numpy as np
import re
import subprocess
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def _check_tesseract():
    """Check if tesseract is installed and accessible."""
    try:
        import os
        cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe' if os.name == 'nt' else 'tesseract'
        subprocess.run([cmd, '--version'], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False

TESSERACT_AVAILABLE = _check_tesseract()
if not TESSERACT_AVAILABLE:
    logger.error(
        "Tesseract OCR is NOT installed or not found in PATH. "
        "Receipt scanning will be unavailable. "
        "Install it with: sudo apt-get install tesseract-ocr"
    )

class OCRService:
    def __init__(self):
        # Explicitly point to the Windows installation path of Tesseract
        import os
        if os.name == 'nt':
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    def validate_image_quality(self, image_path):
        """Validate if image is clear enough for OCR"""
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                return False, "Could not read image file"
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Calculate Laplacian variance for blur detection
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Check resolution
            height, width = img.shape[:2]
            min_resolution = 500
            
            if height < min_resolution or width < min_resolution:
                return False, f"Image resolution too low ({width}x{height}). Minimum 500px"
            
            # Blur detection threshold
            if laplacian_var < 100:
                return False, "Image is too blurry. Please upload a clearer photo"
            
            return True, "Image quality is good"
            
        except Exception as e:
            logger.error(f"Image validation error: {str(e)}")
            return False, f"Error validating image: {str(e)}"
    
    def preprocess_image(self, image_path):
        """Preprocess image for better OCR results"""
        img = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise
        denoised = cv2.medianBlur(thresh, 1)
        
        # Save preprocessed image temporarily
        temp_path = image_path.replace('.', '_processed.')
        cv2.imwrite(temp_path, denoised)
        
        return temp_path
    
    def extract_text(self, image_path):
        """Extract text from image using Tesseract OCR"""
        import os

        if not TESSERACT_AVAILABLE:
            raise RuntimeError(
                "Tesseract OCR is not installed on this server. "
                "Please ask your administrator to run: sudo apt-get install tesseract-ocr"
            )

        processed_path = None
        try:
            # Preprocess image
            processed_path = self.preprocess_image(image_path)

            # Attempt 1: strict whitelist config
            strict_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/-:₹$'
            text = pytesseract.image_to_string(Image.open(processed_path), config=strict_config)

            # Attempt 2: if strict config yields very little, fall back to default
            if len(text.strip()) < 10:
                logger.info("Strict OCR config yielded little text; retrying with default config.")
                text = pytesseract.image_to_string(Image.open(image_path))

            return text.strip()

        except RuntimeError:
            raise
        except Exception as e:
            logger.error(f"OCR extraction error: {str(e)}")
            return ""
        finally:
            if processed_path and os.path.exists(processed_path):
                os.remove(processed_path)
    
    def extract_expense_details(self, text):
        """Extract amount, merchant, and date from OCR text"""
        details = {
            'amount': None,
            'merchant': None,
            'date': None,
            'tax': None,
            'confidence': 0.0
        }

        lines = [l.strip() for l in text.split('\n') if l.strip()]

        # --- AMOUNT EXTRACTION ---
        # Handles: ₹12,500 | Rs. 12,500 | INR 12,500 | 12500.00 | 12,500
        amount_patterns = [
            # With currency prefix (₹, Rs, INR) + Indian/decimal format
            r'(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)',
            # TOTAL / AMOUNT / Grand Total keyword
            r'(?:TOTAL|AMOUNT|Grand\s*Total|Net\s*Total|Bill\s*Amount)[:\s]*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)',
            # Number followed by currency symbol
            r'([\d,]+(?:\.\d{1,2})?)\s*(?:₹|Rs\.?|INR)',
            # Standalone large number (fallback, must be >= 2 digits)
            r'\b([\d]{1,3}(?:,\d{3})+(?:\.\d{1,2})?)\b',
            r'\b(\d{3,}(?:\.\d{1,2})?)\b',
        ]

        for pattern in amount_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Clean: remove commas (thousands separator), keep decimal
                clean = match.replace(',', '')
                try:
                    val = float(clean)
                    if val > 0:
                        details['amount'] = val
                        details['confidence'] += 0.35
                        break
                except ValueError:
                    continue
            if details['amount']:
                break

        # Fallback: amount in words (e.g. "Twelve Thousand Five Hundred")
        if not details['amount']:
            word_map = {
                'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lac': 100000,
                'million': 1000000
            }
            for line in lines:
                line_lower = line.lower()
                if any(w in line_lower for w in word_map):
                    # Very basic word-to-number: look for patterns like "Twelve Thousand Five Hundred"
                    words = re.findall(
                        r'(zero|one|two|three|four|five|six|seven|eight|nine|ten|'
                        r'eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|'
                        r'eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|'
                        r'eighty|ninety|hundred|thousand|lakh|lac)',
                        line_lower
                    )
                    if len(words) >= 2:
                        num_words = {
                            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
                            'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
                            'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
                            'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
                            'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
                            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
                            'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
                        }
                        current = 0
                        result = 0
                        for w in words:
                            if w in num_words:
                                current += num_words[w]
                            elif w == 'hundred':
                                current = current * 100 if current else 100
                            elif w in ('thousand', 'lakh', 'lac'):
                                result += current * word_map[w]
                                current = 0
                        result += current
                        if result > 0:
                            details['amount'] = float(result)
                            details['confidence'] += 0.2
                            break

        # --- MERCHANT EXTRACTION ---
        # Priority 1: "To: <Merchant>" pattern (UPI / Paytm receipts)
        to_match = re.search(r'To[:\s]+(.+)', text, re.IGNORECASE)
        if to_match:
            merchant = to_match.group(1).strip()
            # Remove trailing noise (State Bank Of India A/c, etc.)
            merchant = re.split(r'\s+(?:State Bank|A/c|Account|Bank)', merchant, flags=re.IGNORECASE)[0]
            merchant = merchant.strip().rstrip(',').strip()
            if 2 < len(merchant) < 80:
                details['merchant'] = merchant
                details['confidence'] += 0.2

        # Priority 2: scan first 10 lines for a text-only merchant name
        if not details['merchant']:
            skip_keywords = {'INVOICE', 'RECEIPT', 'BILL', 'TAX', 'PAYMENT', 'PAYTM',
                             'PHONEPE', 'GPAY', 'UPI', 'SUCCESSFUL', 'FROM', 'TO',
                             'DATE', 'REF', 'SECURE', 'ONLY', 'RUPEES'}
            for line in lines[:12]:
                if len(line) < 3 or len(line) > 70:
                    continue
                if re.search(r'\d', line):
                    continue
                if any(kw in line.upper() for kw in skip_keywords):
                    continue
                details['merchant'] = line
                details['confidence'] += 0.15
                break

        # --- DATE EXTRACTION ---
        date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
            r'Date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{2,4})',
            r'(\d{1,2}:\d{2}\s*(?:am|pm)[,\s]+\d{1,2}\s+\w+\s+\d{4})',  # Paytm: "09:57 am, 03 Jul 2023"
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                formats = [
                    '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%Y-%m-%d',
                    '%d/%m/%y', '%d-%m-%y',
                    '%d %B %Y', '%d %b %Y',
                ]
                for fmt in formats:
                    try:
                        details['date'] = datetime.strptime(date_str.strip(), fmt)
                        details['confidence'] += 0.2
                        break
                    except ValueError:
                        continue
                if details['date']:
                    break

        # Default to today if no date found
        if not details['date']:
            details['date'] = datetime.now()

        details['confidence'] = min(details['confidence'], 1.0)
        return details

