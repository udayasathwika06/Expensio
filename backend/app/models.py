from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    merchant = db.Column(db.String(200))
    date = db.Column(db.DateTime, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    original_text = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'amount': self.amount,
            'merchant': self.merchant,
            'date': self.date.isoformat(),
            'category': self.category,
            'original_text': self.original_text,
            'image_url': self.image_url
        }

class CategoryCorrection(db.Model):
    __tablename__ = 'category_corrections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False)
    merchant = db.Column(db.String(200))
    original_category = db.Column(db.String(50))
    corrected_category = db.Column(db.String(50))
    amount = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LearningPattern(db.Model):
    __tablename__ = 'learning_patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False)
    merchant = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, default=1.0)
    occurrence_count = db.Column(db.Integer, default=1)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
