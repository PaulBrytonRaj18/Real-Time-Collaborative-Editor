# 🎯 Real-Time Collaborative Document Editor

A minimal, feature-rich collaborative document editor built with React, Flask, TipTap, and Yjs CRDT technology.

## ✨ Features

- **Real-time Collaboration**: Multiple users can edit simultaneously with conflict-free synchronization
- **Rich Text Editing**: Bold, italic, strikethrough, headings (H1-H3), bullet lists
- **Auto-Save**: Automatic saving every 3 seconds with debouncing
- **Version History**: Manual version snapshots with restore capability
- **Comments & Replies**: Inline commenting system with threaded discussions
- **Document Organization**: Folder structure for organizing documents
- **Sharing & Permissions**: Share documents with editor or viewer permissions
- **Export**: Download documents as PDF or plain text
- **Dark Mode**: Toggle between light and dark themes
- **Active Users**: See who's currently editing the document
- **Session-Based Auth**: Secure username/password authentication

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with Hooks
- TipTap (ProseMirror wrapper) for rich text editing
- Yjs for CRDT-based synchronization
- Socket.IO client for real-time communication
- Tailwind CSS for styling
- Vite for bundling

**Backend:**
- Flask (Python) REST API
- Flask-SocketIO for WebSocket support
- MongoDB for data persistence
- Session-based authentication
- EventLet for async support

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB 5.0+ (local or MongoDB Atlas)

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Create `.env` file:**
```env
MONGODB_URI=mongodb://localhost:27017/collab_editor
SECRET_KEY=your-secret-key-generate-random-string
FLASK_ENV=development
FRONTEND_URL=http://localhost:5173
```

5. **Start MongoDB:**
```bash
# If using local MongoDB
mongod --dbpath /path/to/data

# Or use MongoDB Atlas cloud database
```

6. **Run the Flask server:**
```bash
python app.py
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Install additional required package:**
```bash
npm install @tailwindcss/typography
```

4. **Create `.env` file:**
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

5. **Run the development server:**
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 🚀 Usage

1. **Register/Login:**
   - Open `http://localhost:5173`
   - Create a new account or login
   - Password must be at least 8 characters

2. **Create Document:**
   - Click "New Document" in the sidebar
   - Start typing in the editor

3. **Format Text:**
   - Use toolbar buttons for formatting
   - Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic)

4. **Real-time Collaboration:**
   - Share document with other users
   - See active users count in header
   - Changes sync automatically

5. **Version Management:**
   - Click save icon to create version snapshot
   - View version history from menu
   - Restore any previous version

6. **Comments:**
   - Select text and add comments
   - Reply to existing comments
   - Delete your own comments

7. **Export:**
   - Export as PDF or TXT from document menu

## 📁 Project Structure

```
collaborative-editor/
├── backend/
│   ├── app.py                    # Main Flask application
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React component
│   │   └── main.jsx             # React entry point
│   ├── package.json             # Node dependencies
│   ├── vite.config.js           # Vite configuration
│   ├── tailwind.config.js       # Tailwind CSS config
│   └── .env                     # Environment variables
│
└── README.md                     # This file
```

## 🔒 Security Features

- Password hashing with PBKDF2-SHA256
- Session-based authentication with HTTP-only cookies
- CORS protection
- Input validation and sanitization
- Permission-based access control
- Secure document sharing tokens

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List user's documents
- `POST /api/documents` - Create document
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/export` - Export document

### Folders
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `PUT /api/folders/:id` - Rename folder
- `DELETE /api/folders/:id` - Delete folder

### Versions
- `GET /api/documents/:id/versions` - List versions
- `POST /api/documents/:id/versions` - Create version
- `GET /api/versions/:id` - Get version content
- `POST /api/versions/:id/restore` - Restore version

### Comments
- `GET /api/documents/:id/comments` - List comments
- `POST /api/documents/:id/comments` - Create comment
- `POST /api/comments/:id/replies` - Reply to comment
- `DELETE /api/comments/:id` - Delete comment

### Sharing
- `POST /api/documents/:id/share` - Generate share link
- `PUT /api/documents/:id/permissions` - Update permissions
- `DELETE /api/documents/:id/share` - Remove share link
- `GET /api/shared/:token` - Access shared document

## 🔌 WebSocket Events

**Client → Server:**
- `join_document` - Join document room
- `leave_document` - Leave document room
- `yjs_update` - Broadcast Yjs update

**Server → Client:**
- `user_joined` - User joined notification
- `user_left` - User left notification
- `active_users` - List of active users
- `yjs_update` - Yjs update from other clients

## 🚢 Deployment

### Deploy to Render.com

1. **Create `render.yaml`:**
```yaml
services:
  - type: web
    name: collab-editor-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn -k eventlet -w 1 app:app
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: SECRET_KEY
        generateValue: true
      - key: FLASK_ENV
        value: production
      - key: FRONTEND_URL
        value: https://your-frontend.onrender.com

  - type: web
    name: collab-editor-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_URL
        value: https://collab-editor-backend.onrender.com
      - key: VITE_WS_URL
        value: wss://collab-editor-backend.onrender.com
```

2. **Push to GitHub**
3. **Connect to Render**
4. **Set MongoDB URI** in Render dashboard (use MongoDB Atlas free tier)

### Environment Variables for Production

**Backend:**
- `MONGODB_URI`: MongoDB connection string
- `SECRET_KEY`: Random secure string (auto-generated by Render)
- `FLASK_ENV`: production
- `FRONTEND_URL`: Your frontend URL

**Frontend:**
- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket URL (wss:// for production)

## 🧪 Testing

1. **Test Authentication:**
   - Register multiple users
   - Login/logout functionality

2. **Test Real-time Sync:**
   - Open same document in multiple browsers
   - Edit simultaneously
   - Verify changes sync in real-time

3. **Test Permissions:**
   - Share document with viewer permission
   - Verify viewer cannot edit

4. **Test Version History:**
   - Create multiple versions
   - Restore previous version
   - Verify content restored correctly

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify network connectivity

**WebSocket Connection Failed:**
- Check CORS settings
- Verify Socket.IO versions match
- Check firewall settings

**Auto-save Not Working:**
- Check browser console for errors
- Verify backend API is responding
- Check session authentication

**Real-time Sync Issues:**
- Ensure Yjs and y-websocket versions compatible
- Check WebSocket connection in network tab
- Verify both users are in same document room

## 📝 Development Notes

- Auto-save debounces for 3 seconds after last edit
- Maximum 50 versions stored per document
- WebSocket fallback to polling if WebSocket unavailable
- Session cookies expire after browser close
- MongoDB indexes created automatically on startup

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🙏 Acknowledgments

- TipTap for excellent rich text editing
- Yjs for CRDT implementation
- Flask-SocketIO for real-time capabilities
- MongoDB for flexible document storage

---

**Built with ❤️ for collaborative productivity**