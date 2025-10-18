from flask import Flask, request, jsonify, session, Response, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from flask_session import Session
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
import os
from dotenv import load_dotenv
import secrets
import json
from io import BytesIO

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

CORS(app, supports_credentials=True, origins=[os.environ.get('FRONTEND_URL', 'http://localhost:5173')])
Session(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# MongoDB connection
mongo_client = MongoClient(os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'))
db = mongo_client['collab_editor']
users = db['users']
documents = db['documents']
versions = db['versions']
comments = db['comments']
folders = db['folders']
active_sessions = db['active_sessions']

# Create indexes
users.create_index('username', unique=True)
documents.create_index('owner_id')
documents.create_index('share_link')
versions.create_index('document_id')
comments.create_index('document_id')

# Active users tracking
active_users = {}

# Auth decorator
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def check_document_permission(document_id, required_role='viewer'):
    user_id = session.get('user_id')
    if not user_id:
        return False
    
    try:
        doc = documents.find_one({'_id': ObjectId(document_id)})
        if not doc:
            return False
        
        # Owner has full access
        if str(doc['owner_id']) == user_id:
            return True
        
        # Check permissions
        for perm in doc.get('permissions', []):
            if str(perm['user_id']) == user_id:
                if required_role == 'viewer':
                    return True
                elif required_role == 'editor' and perm['role'] == 'editor':
                    return True
        
        return False
    except:
        return False

# ==================== AUTH ROUTES ====================
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    if users.find_one({'username': username}):
        return jsonify({'error': 'Username already exists'}), 409
    
    password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    
    user_id = users.insert_one({
        'username': username,
        'password_hash': password_hash,
        'created_at': datetime.utcnow()
    }).inserted_id
    
    session['user_id'] = str(user_id)
    session['username'] = username
    
    return jsonify({
        'message': 'User registered successfully',
        'user': {'id': str(user_id), 'username': username}
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    user = users.find_one({'username': username})
    
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    session['user_id'] = str(user['_id'])
    session['username'] = user['username']
    
    return jsonify({
        'message': 'Login successful',
        'user': {'id': str(user['_id']), 'username': user['username']}
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    user_id = session.get('user_id')
    user = users.find_one({'_id': ObjectId(user_id)})
    
    return jsonify({
        'id': str(user['_id']),
        'username': user['username']
    }), 200

# ==================== DOCUMENT ROUTES ====================
@app.route('/api/documents', methods=['GET'])
@require_auth
def get_documents():
    user_id = session.get('user_id')
    
    # Get owned documents
    owned_docs = list(documents.find({
        'owner_id': ObjectId(user_id)
    }))
    
    # Get shared documents
    shared_docs = list(documents.find({
        'permissions.user_id': ObjectId(user_id)
    }))
    
    all_docs = owned_docs + shared_docs
    
    result = []
    for doc in all_docs:
        result.append({
            'id': str(doc['_id']),
            'title': doc['title'],
            'owner_id': str(doc['owner_id']),
            'folder_id': str(doc['folder_id']) if doc.get('folder_id') else None,
            'created_at': doc['created_at'].isoformat(),
            'updated_at': doc['updated_at'].isoformat()
        })
    
    return jsonify(result), 200

@app.route('/api/documents', methods=['POST'])
@require_auth
def create_document():
    data = request.json
    user_id = session.get('user_id')
    
    doc_id = documents.insert_one({
        'title': data.get('title', 'Untitled Document'),
        'content': '',
        'owner_id': ObjectId(user_id),
        'folder_id': ObjectId(data['folder_id']) if data.get('folder_id') else None,
        'permissions': [],
        'share_link': None,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }).inserted_id
    
    return jsonify({
        'id': str(doc_id),
        'message': 'Document created successfully'
    }), 201

@app.route('/api/documents/<document_id>', methods=['GET'])
@require_auth
def get_document(document_id):
    if not check_document_permission(document_id):
        return jsonify({'error': 'Access denied'}), 403
    
    doc = documents.find_one({'_id': ObjectId(document_id)})
    
    return jsonify({
        'id': str(doc['_id']),
        'title': doc['title'],
        'content': doc['content'],
        'owner_id': str(doc['owner_id']),
        'permissions': [
            {'user_id': str(p['user_id']), 'role': p['role']}
            for p in doc.get('permissions', [])
        ]
    }), 200

@app.route('/api/documents/<document_id>', methods=['PUT'])
@require_auth
def update_document(document_id):
    if not check_document_permission(document_id, 'editor'):
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.json
    
    update_fields = {'updated_at': datetime.utcnow()}
    if 'title' in data:
        update_fields['title'] = data['title']
    if 'content' in data:
        update_fields['content'] = data['content']
    
    documents.update_one(
        {'_id': ObjectId(document_id)},
        {'$set': update_fields}
    )
    
    return jsonify({'message': 'Document updated'}), 200

@app.route('/api/documents/<document_id>', methods=['DELETE'])
@require_auth
def delete_document(document_id):
    user_id = session.get('user_id')
    doc = documents.find_one({'_id': ObjectId(document_id)})
    
    if str(doc['owner_id']) != user_id:
        return jsonify({'error': 'Only owner can delete'}), 403
    
    documents.delete_one({'_id': ObjectId(document_id)})
    versions.delete_many({'document_id': ObjectId(document_id)})
    comments.delete_many({'document_id': ObjectId(document_id)})
    
    return jsonify({'message': 'Document deleted'}), 200

# ==================== FOLDER ROUTES ====================
@app.route('/api/folders', methods=['GET'])
@require_auth
def get_folders():
    user_id = session.get('user_id')
    
    user_folders = list(folders.find({
        'owner_id': ObjectId(user_id)
    }))
    
    result = []
    for folder in user_folders:
        result.append({
            'id': str(folder['_id']),
            'name': folder['name'],
            'parent_folder_id': str(folder['parent_folder_id']) if folder.get('parent_folder_id') else None,
            'created_at': folder['created_at'].isoformat()
        })
    
    return jsonify(result), 200

@app.route('/api/folders', methods=['POST'])
@require_auth
def create_folder():
    data = request.json
    user_id = session.get('user_id')
    
    folder_id = folders.insert_one({
        'name': data.get('name', 'New Folder'),
        'owner_id': ObjectId(user_id),
        'parent_folder_id': ObjectId(data['parent_folder_id']) if data.get('parent_folder_id') else None,
        'created_at': datetime.utcnow()
    }).inserted_id
    
    return jsonify({
        'id': str(folder_id),
        'message': 'Folder created successfully'
    }), 201

@app.route('/api/folders/<folder_id>', methods=['DELETE'])
@require_auth
def delete_folder(folder_id):
    user_id = session.get('user_id')
    folder = folders.find_one({'_id': ObjectId(folder_id)})
    
    if not folder or str(folder['owner_id']) != user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    documents.update_many(
        {'folder_id': ObjectId(folder_id)},
        {'$set': {'folder_id': None}}
    )
    
    folders.delete_many({'parent_folder_id': ObjectId(folder_id)})
    folders.delete_one({'_id': ObjectId(folder_id)})
    
    return jsonify({'message': 'Folder deleted'}), 200

# ==================== VERSION ROUTES ====================
@app.route('/api/documents/<document_id>/versions', methods=['GET'])
@require_auth
def get_versions(document_id):
    if not check_document_permission(document_id):
        return jsonify({'error': 'Access denied'}), 403
    
    doc_versions = list(versions.find({
        'document_id': ObjectId(document_id)
    }).sort('created_at', -1).limit(50))
    
    result = []
    for v in doc_versions:
        created_by_user = users.find_one({'_id': v['created_by']})
        result.append({
            'id': str(v['_id']),
            'document_id': str(v['document_id']),
            'created_by': created_by_user['username'] if created_by_user else 'Unknown',
            'created_at': v['created_at'].isoformat(),
            'description': v.get('description', '')
        })
    
    return jsonify(result), 200

@app.route('/api/documents/<document_id>/versions', methods=['POST'])
@require_auth
def create_version(document_id):
    if not check_document_permission(document_id, 'editor'):
        return jsonify({'error': 'Access denied'}), 403
    
    user_id = session.get('user_id')
    doc = documents.find_one({'_id': ObjectId(document_id)})
    data = request.json
    
    version_id = versions.insert_one({
        'document_id': ObjectId(document_id),
        'content': doc['content'],
        'created_by': ObjectId(user_id),
        'created_at': datetime.utcnow(),
        'description': data.get('description', 'Manual save')
    }).inserted_id
    
    return jsonify({
        'id': str(version_id),
        'message': 'Version saved successfully'
    }), 201

# ==================== EXPORT ROUTES ====================
@app.route('/api/documents/<document_id>/export', methods=['GET'])
@require_auth
def export_document(document_id):
    if not check_document_permission(document_id):
        return jsonify({'error': 'Access denied'}), 403
    
    doc = documents.find_one({'_id': ObjectId(document_id)})
    export_format = request.args.get('format', 'txt')
    
    if export_format == 'txt':
        try:
            content_json = json.loads(doc['content']) if doc['content'] else {}
            
            def extract_text(node):
                text = ''
                if isinstance(node, dict):
                    if node.get('text'):
                        text += node['text']
                    if node.get('content'):
                        for child in node['content']:
                            text += extract_text(child)
                    text += '\n'
                return text
            
            plain_text = extract_text(content_json)
            
            return Response(
                plain_text,
                mimetype='text/plain',
                headers={'Content-Disposition': f'attachment; filename={doc["title"]}.txt'}
            )
        except:
            return Response('Error exporting document', mimetype='text/plain')
    
    return jsonify({'error': 'Invalid export format'}), 400

# ==================== SOCKET.IO HANDLERS ====================
@socketio.on('join_document')
def handle_join_document(data):
    document_id = data['document_id']
    user_id = session.get('user_id')
    username = session.get('username')
    
    if not check_document_permission(document_id):
        return
    
    join_room(document_id)
    
    if document_id not in active_users:
        active_users[document_id] = {}
    
    active_users[document_id][request.sid] = {
        'user_id': user_id,
        'username': username
    }
    
    emit('user_joined', {
        'user_id': user_id,
        'username': username
    }, room=document_id)
    
    emit('active_users', list(active_users[document_id].values()), room=document_id)

@socketio.on('leave_document')
def handle_leave_document(data):
    document_id = data['document_id']
    user_id = session.get('user_id')
    
    leave_room(document_id)
    
    if document_id in active_users and request.sid in active_users[document_id]:
        del active_users[document_id][request.sid]
        
        emit('user_left', {'user_id': user_id}, room=document_id)
        emit('active_users', list(active_users[document_id].values()), room=document_id)

@socketio.on('yjs_update')
def handle_yjs_update(data):
    document_id = data['document_id']
    update = data['update']
    
    emit('yjs_update', {'update': update}, room=document_id, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    for doc_id, users_dict in active_users.items():
        if request.sid in users_dict:
            user_info = users_dict[request.sid]
            del users_dict[request.sid]
            
            emit('user_left', {'user_id': user_info['user_id']}, room=doc_id)
            emit('active_users', list(users_dict.values()), room=doc_id)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)