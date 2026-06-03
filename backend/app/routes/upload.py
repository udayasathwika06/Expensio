from flask import Blueprint, request, jsonify, g
from ..supabase_auth import supabase_auth_required
import os
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime
from ..config import Config
from ..models import db, Expense
from ..services.ocr_service import OCRService
from ..services.categorization_service import CategorizationService

bp = Blueprint('upload', __name__, url_prefix='/api/upload')
ocr_service = OCRService()
categorization_service = CategorizationService()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@bp.route('/receipt', methods=['POST'])
@supabase_auth_required
def upload_receipt():
    user_id = g.user_id
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Save file temporarily
    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    file.save(filepath)
    
    try:
        # Validate image quality
        is_valid, quality_message = ocr_service.validate_image_quality(filepath)
        
        if not is_valid:
            os.remove(filepath)
            return jsonify({
                'error': quality_message,
                'quality_check': False
            }), 400
        
        # Extract text using OCR
        extracted_text = ocr_service.extract_text(filepath)
        
        if not extracted_text:
            os.remove(filepath)
            return jsonify({
                'error': 'Could not extract text from image',
                'quality_check': True
            }), 400
        
        # Extract expense details
        details = ocr_service.extract_expense_details(extracted_text)
        
        if not details['amount']:
            os.remove(filepath)
            return jsonify({
                'error': 'Could not find amount in receipt',
                'quality_check': True
            }), 400
        
        # Categorize expense
        categorization = categorization_service.categorize_expense(
            details['merchant'],
            details['amount'],
            user_id
        )
        
        # Save expense to database
        expense = Expense(
            user_id=user_id,
            amount=details['amount'],
            merchant=details['merchant'] or 'Unknown Merchant',
            date=details['date'],
            category=categorization['category'],
            original_text=extracted_text,
            image_url=f"/uploads/{filename}"
        )
        
        db.session.add(expense)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'expense': expense.to_dict(),
            'extracted_text': extracted_text,
            'categorization': categorization,
            'confidence': details['confidence']
        })
        
    except RuntimeError as e:
        # Tesseract not installed or unavailable
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': f'Processing error: {str(e)}'}), 500
