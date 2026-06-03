from flask import Blueprint, request, jsonify
from flask_bcrypt import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..models import db, User

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'User already exists'}), 409
    
    hashed_password = generate_password_hash(data['password']).decode('utf-8')
    
    user = User(
        email=data['email'],
        password_hash=hashed_password,
        name=data.get('name', data['email'].split('@')[0])
    )
    
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'User created successfully',
        'access_token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name
        }
    }), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    username = data.get('username')
    user = User.query.filter_by(name=username).first()
    
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name
        }
    }), 200

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'created_at': user.created_at.isoformat()
    })
