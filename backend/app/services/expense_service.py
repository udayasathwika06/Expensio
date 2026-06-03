from datetime import datetime, timedelta
from collections import defaultdict
from ..models import Expense, db

class ExpenseService:
    @staticmethod
    def get_user_expenses(user_id, start_date=None, end_date=None):
        """Get expenses for a user with date filtering"""
        query = Expense.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(Expense.date >= start_date)
        if end_date:
            query = query.filter(Expense.date <= end_date)
        
        return query.order_by(Expense.date.desc()).all()
    
    @staticmethod
    def get_monthly_summary(user_id, year, month):
        """Get monthly expense summary"""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        
        expenses = ExpenseService.get_user_expenses(user_id, start_date, end_date)
        
        total = sum(exp.amount for exp in expenses)
        category_totals = defaultdict(float)
        
        for exp in expenses:
            category_totals[exp.category] += exp.amount
        
        return {
            'total': total,
            'category_totals': dict(category_totals),
            'expense_count': len(expenses),
            'average_daily': total / 30 if total > 0 else 0
        }
    
    @staticmethod
    def get_spending_trends(user_id, months=6):
        """Get spending trends over time"""
        trends = []
        current_date = datetime.now()
        
        for i in range(months):
            date = current_date - timedelta(days=30 * i)
            summary = ExpenseService.get_monthly_summary(user_id, date.year, date.month)
            trends.append({
                'month': date.strftime('%B %Y'),
                'total': summary['total'],
                'expense_count': summary['expense_count']
            })
        
        return trends[::-1]  # Reverse to show oldest first
    
    @staticmethod
    def get_category_distribution(user_id, days=30):
        """Get category distribution for last N days"""
        start_date = datetime.now() - timedelta(days=days)
        expenses = ExpenseService.get_user_expenses(user_id, start_date)
        
        distribution = defaultdict(float)
        for exp in expenses:
            distribution[exp.category] += exp.amount
        
        return dict(distribution)
    
    @staticmethod
    def get_insights(user_id):
        """Generate AI-powered insights"""
        insights = []
        expenses = ExpenseService.get_user_expenses(user_id, datetime.now() - timedelta(days=30))
        
        if not expenses:
            return ["No expenses found for insights. Start uploading receipts!"]
        
        # Highest spending category
        category_totals = defaultdict(float)
        for exp in expenses:
            category_totals[exp.category] += exp.amount
        
        if category_totals:
            top_category = max(category_totals, key=category_totals.get)
            insights.append(f"💡 Your highest spending category is {top_category} (₹{category_totals[top_category]:,.2f})")
        
        # Largest single expense
        largest_expense = max(expenses, key=lambda x: x.amount)
        insights.append(f"💰 Largest expense: {largest_expense.merchant} - ₹{largest_expense.amount:,.2f}")
        
        # Most frequent merchant
        merchant_count = defaultdict(int)
        for exp in expenses:
            if exp.merchant:
                merchant_count[exp.merchant] += 1
        
        if merchant_count:
            top_merchant = max(merchant_count, key=merchant_count.get)
            insights.append(f"🏪 Most frequent merchant: {top_merchant} ({merchant_count[top_merchant]} times)")
        
        # Weekly comparison
        this_week = sum(e.amount for e in expenses if e.date >= datetime.now() - timedelta(days=7))
        last_week = sum(e.amount for e in expenses if e.date >= datetime.now() - timedelta(days=14) 
                        and e.date < datetime.now() - timedelta(days=7))
        
        if last_week > 0:
            change = ((this_week - last_week) / last_week) * 100
            if change > 0:
                insights.append(f"📈 Spending increased by {change:.1f}% compared to last week")
            elif change < 0:
                insights.append(f"📉 Spending decreased by {abs(change):.1f}% compared to last week")
        
        # Average transaction
        avg_transaction = sum(e.amount for e in expenses) / len(expenses)
        insights.append(f"💳 Average transaction: ₹{avg_transaction:,.2f}")
        
        return insights[:5]  # Return top 5 insights
