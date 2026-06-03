from functools import wraps
from flask import request, jsonify, current_app, g
import jwt

def supabase_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
                
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
            
        try:
            secret_str = current_app.config.get('SUPABASE_JWT_SECRET', '')
            if not secret_str:
                return jsonify({'error': 'SUPABASE_JWT_SECRET not configured'}), 500
                
            data = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
            g.user_id = data['sub']
        except Exception as e:
            print(f"JWT Decode Exception: {type(e).__name__} - {str(e)}", flush=True)
            return jsonify({'error': 'Token is invalid!', 'details': str(e)}), 401
            
        return f(*args, **kwargs)
        
    return decorated
