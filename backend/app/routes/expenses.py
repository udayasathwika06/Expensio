from flask import Blueprint, request, jsonify, g
from ..supabase_auth import supabase_auth_required
from datetime import datetime
from ..models import db, Expense
from ..services.expense_service import ExpenseService
from ..services.categorization_service import CategorizationService

bp = Blueprint('expenses', __name__, url_prefix='/api/expenses')
categorization_service = CategorizationService()

@bp.route('/', methods=['GET'])
@supabase_auth_required
def get_expenses():
    user_id = g.user_id
    
    # Get query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    
    query = Expense.query.filter_by(user_id=user_id)
    
    if start_date:
        query = query.filter(Expense.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Expense.date <= datetime.fromisoformat(end_date))
    if category:
        query = query.filter_by(category=category)
    
    expenses = query.order_by(Expense.date.desc()).all()
    
    return jsonify({
        'expenses': [e.to_dict() for e in expenses],
        'count': len(expenses)
    })

@bp.route('/<int:expense_id>', methods=['PUT'])
@supabase_auth_required
def update_expense(expense_id):
    user_id = g.user_id
    expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
    
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404
    
    data = request.get_json()
    
    # Track category change for learning
    old_category = expense.category
    new_category = data.get('category', expense.category)
    
    if 'amount' in data:
        expense.amount = data['amount']
    if 'merchant' in data:
        expense.merchant = data['merchant']
    if 'date' in data:
        expense.date = datetime.fromisoformat(data['date'])
    if 'category' in data:
        expense.category = data['category']
    
    db.session.commit()
    
    # Record correction for learning
    if old_category != new_category and expense.merchant:
        categorization_service.record_correction(
            user_id,
            expense.merchant,
            old_category,
            new_category,
            expense.amount
        )
    
    return jsonify({'success': True, 'expense': expense.to_dict()})

@bp.route('/<int:expense_id>', methods=['DELETE'])
@supabase_auth_required
def delete_expense(expense_id):
    user_id = g.user_id
    expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
    
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404
    
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({'success': True})

@bp.route('/summary/monthly', methods=['GET'])
@supabase_auth_required
def monthly_summary():
    user_id = g.user_id
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    if not year or not month:
        now = datetime.now()
        year = now.year
        month = now.month
    
    summary = ExpenseService.get_monthly_summary(user_id, year, month)
    return jsonify(summary)

@bp.route('/trends', methods=['GET'])
@supabase_auth_required
def spending_trends():
    user_id = g.user_id
    months = request.args.get('months', 6, type=int)
    
    trends = ExpenseService.get_spending_trends(user_id, months)
    return jsonify({'trends': trends})

@bp.route('/distribution', methods=['GET'])
@supabase_auth_required
def category_distribution():
    user_id = g.user_id
    days = request.args.get('days', 30, type=int)
    
    distribution = ExpenseService.get_category_distribution(user_id, days)
    return jsonify({'distribution': distribution})

@bp.route('/insights', methods=['GET'])
@supabase_auth_required
def insights():
    user_id = g.user_id
    
    insights = ExpenseService.get_insights(user_id)
    return jsonify({'insights': insights})

@bp.route('/reclassify/<int:expense_id>', methods=['POST'])
@supabase_auth_required
def reclassify_expense(expense_id):
    user_id = g.user_id
    expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
    
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404
    
    # Re-categorize based on current data
    categorization = categorization_service.categorize_expense(
        expense.merchant,
        expense.amount,
        user_id
    )
    
    return jsonify({
        'current_category': expense.category,
        'suggested_category': categorization['category'],
        'confidence': categorization['confidence'],
        'alternatives': categorization['alternatives']
    })
