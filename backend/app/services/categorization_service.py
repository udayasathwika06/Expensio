import re
from collections import defaultdict
from ..models import LearningPattern, db

class CategorizationService:
    def __init__(self):
        self.category_keywords = {
            'Food': ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining', 'kitchen', 'pizza', 'burger', 'starbucks', 'coffee'],
            'Shopping': ['amazon', 'flipkart', 'myntra', 'shopping', 'store', 'mall', 'walmart', 'target', 'ebay', 'aliexpress'],
            'Travel': ['uber', 'ola', 'travel', 'flight', 'hotel', 'booking', 'airbnb', 'train', 'bus', 'taxi', 'lyft'],
            'Medical': ['medical', 'pharmacy', 'hospital', 'clinic', 'doctor', 'medicare', 'health', 'medicine', 'drugstore'],
            'Entertainment': ['netflix', 'amazon prime', 'hotstar', 'movie', 'cinema', 'spotify', 'game', 'theatre', 'disney+'],
            'Bills': ['electricity', 'water', 'gas', 'broadband', 'mobile', 'internet', 'bill', 'utility', 'rent'],
            'Groceries': ['grocery', 'supermarket', 'vegetables', 'fruits', 'daily needs', 'departmental', 'bigbasket']
        }
        
        # Learn from corrections
        self.learned_patterns = {}
    
    def load_learned_patterns(self, user_id):
        """Load user-specific learned patterns from database"""
        patterns = LearningPattern.query.filter_by(user_id=user_id).all()
        for pattern in patterns:
            if pattern.merchant not in self.learned_patterns:
                self.learned_patterns[pattern.merchant] = {}
            self.learned_patterns[pattern.merchant][pattern.category] = pattern.confidence
    
    def calculate_confidence(self, merchant, suggested_category, match_score):
        """Calculate confidence score for categorization"""
        confidence = match_score * 0.7  # Base confidence from keyword matching
        
        # Check learned patterns
        if merchant in self.learned_patterns:
            if suggested_category in self.learned_patterns[merchant]:
                confidence += self.learned_patterns[merchant][suggested_category] * 0.3
            else:
                # User has corrected this merchant differently
                confidence *= 0.8
        
        return min(confidence, 1.0)
    
    def categorize_expense(self, merchant, amount, user_id=None):
        """Categorize expense based on merchant name and amount"""
        if user_id:
            self.load_learned_patterns(user_id)
            
        if not merchant:
            return {'category': 'Others', 'confidence': 0.3, 'alternatives': [], 'is_high_confidence': False, 'is_medium_confidence': False, 'is_low_confidence': True}
        
        merchant_lower = merchant.lower()
        match_scores = defaultdict(float)
        
        # Keyword matching
        for category, keywords in self.category_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in merchant_lower:
                    score += 1
                # Check word boundaries
                if re.search(r'\b' + re.escape(keyword) + r'\b', merchant_lower):
                    score += 0.5
            if score > 0:
                match_scores[category] = score / len(keywords)
        
        # Amount-based heuristics
        if amount:
            if amount > 5000:
                match_scores['Shopping'] = match_scores.get('Shopping', 0) + 0.2
            elif amount < 500:
                match_scores['Food'] = match_scores.get('Food', 0) + 0.1
        
        # Get best matching category
        if match_scores:
            best_category = max(match_scores, key=match_scores.get)
            best_score = match_scores[best_category]
        else:
            best_category = 'Others'
            best_score = 0.2
        
        # Calculate confidence with learning
        confidence = self.calculate_confidence(merchant, best_category, best_score)
        
        # Get alternative suggestions
        alternatives = [
            {'category': cat, 'score': score}
            for cat, score in sorted(match_scores.items(), key=lambda x: x[1], reverse=True)[1:4]
        ]
        
        return {
            'category': best_category,
            'confidence': confidence,
            'alternatives': alternatives,
            'is_high_confidence': confidence > 0.7,
            'is_medium_confidence': 0.4 <= confidence <= 0.7,
            'is_low_confidence': confidence < 0.4
        }
    
    def record_correction(self, user_id, merchant, original_category, corrected_category, amount):
        """Record manual category correction for learning"""
        # Store in database
        from ..models import CategoryCorrection, LearningPattern
        
        correction = CategoryCorrection(
            user_id=user_id,
            merchant=merchant,
            original_category=original_category,
            corrected_category=corrected_category,
            amount=amount
        )
        db.session.add(correction)
        
        # Update learning patterns
        pattern = LearningPattern.query.filter_by(
            user_id=user_id,
            merchant=merchant
        ).first()
        
        if pattern:
            if pattern.category == corrected_category:
                pattern.occurrence_count += 1
                pattern.confidence = min(1.0, pattern.confidence + 0.1)
            else:
                # Changed category
                pattern.category = corrected_category
                pattern.confidence = 0.7
                pattern.occurrence_count = 1
            pattern.last_updated = db.func.now()
        else:
            pattern = LearningPattern(
                user_id=user_id,
                merchant=merchant,
                category=corrected_category,
                confidence=0.7,
                occurrence_count=1
            )
            db.session.add(pattern)
        
        db.session.commit()
        
        # Update in-memory patterns
        if merchant not in self.learned_patterns:
            self.learned_patterns[merchant] = {}
        self.learned_patterns[merchant][corrected_category] = pattern.confidence
