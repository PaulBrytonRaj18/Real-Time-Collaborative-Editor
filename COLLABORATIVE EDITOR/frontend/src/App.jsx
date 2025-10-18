import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { io } from 'socket.io-client';
import { 
  Bold, Italic, Underline, List, Heading1, Heading2, 
  Heading3, Save, Users, Moon, Sun, Menu, LogOut, Plus 
} from 'lucide-react';

const API_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';

export default function CollaborativeEditor() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const ydoc = useRef(null);
  const provider = useRef(null);
  const socket = useRef(null);
  const saveTimeout = useRef(null);
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none p-8',
      },
    },
  });

  useEffect(() => {
    if (!currentDoc || !user || !editor) return;

    ydoc.current = new Y.Doc();
    
    provider.current = new WebsocketProvider(
      WS_URL,
      `doc-${currentDoc.id}`,
      ydoc.current
    );

    socket.current = io(API_URL, { withCredentials: true });
    
    socket.current.emit('join_document', { 
      document_id: currentDoc.id,
      user_id: user.id 
    });

    socket.current.on('user_joined', (data) => {
      console.log('User joined:', data);
    });

    socket.current.on('user_left', (data) => {
      console.log('User left:', data);
    });

    socket.current.on('active_users', (users) => {
      setActiveUsers(users);
    });

    ydoc.current.on('update', () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      saveTimeout.current = setTimeout(() => {
        autoSave();
      }, 3000);
    });

    return () => {
      if (socket.current) {
        socket.current.emit('leave_document', { document_id: currentDoc.id });
        socket.current.disconnect();
      }
      if (provider.current) provider.current.destroy();
      if (ydoc.current) ydoc.current.destroy();
    };
  }, [currentDoc, user, editor]);

  const autoSave = async () => {
    if (!editor || !currentDoc) return;
    
    const content = JSON.stringify(editor.getJSON());
    
    try {
      await fetch(`${API_URL}/api/documents/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content })
      });
      console.log('Auto-saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUser(data.user);
        loadDocuments();
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        credentials: 'include'
      });
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const createDocument = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: 'Untitled Document' })
      });
      
      const data = await res.json();
      loadDocuments();
      openDocument(data.id);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const openDocument = async (docId) => {
    try {
      const res = await fetch(`${API_URL}/api/documents/${docId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setCurrentDoc(data);
      
      if (editor && data.content) {
        try {
          const content = JSON.parse(data.content);
          editor.commands.setContent(content);
        } catch {
          editor.commands.setContent('');
        }
      }
    } catch (err) {
      console.error('Failed to open document:', err);
    }
  };

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
    setCurrentDoc(null);
    setDocuments([]);
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          <h1 className="text-3xl font-bold mb-6 text-center">
            Collaborative Editor
          </h1>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded ${authMode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded ${authMode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Register
            </button>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth(e)}
              className={`w-full px-4 py-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`}
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth(e)}
              className={`w-full px-4 py-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`}
            />
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <header className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-200 rounded">
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold">
            {currentDoc ? currentDoc.title : 'Collaborative Editor'}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
              <Users size={16} />
              <span className="text-sm font-medium">{activeUsers.length} online</span>
            </div>
          )}
          
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-gray-200 rounded">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex">
        {showSidebar && (
          <aside className={`w-64 border-r ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200'} p-4 h-[calc(100vh-60px)] overflow-y-auto`}>
            <button
              onClick={createDocument}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded mb-4 hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              New Document
            </button>
            
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Your Documents</div>
            
            <div className="space-y-2">
              {documents.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No documents yet</p>
              )}
              {documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => openDocument(doc.id)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    currentDoc?.id === doc.id 
                      ? 'bg-blue-600 text-white' 
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">{doc.title}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col">
          {currentDoc && editor && (
            <>
              <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} p-2 flex gap-1 flex-wrap`}>
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive('bold') ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive('italic') ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive('strike') ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Strikethrough"
                >
                  <Underline size={18} />
                </button>
                
                <div className={`w-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} mx-2`}></div>
                
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-2 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Heading 1"
                >
                  <Heading1 size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Heading 2"
                >
                  <Heading2 size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-2 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Heading 3"
                >
                  <Heading3 size={18} />
                </button>
                
                <div className={`w-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} mx-2`}></div>
                
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Bullet List"
                >
                  <List size={18} />
                </button>
                
                <div className="flex-1"></div>
                
                <button 
                  onClick={autoSave} 
                  className={`p-2 rounded transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  title="Save Now"
                >
                  <Save size={18} />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <EditorContent editor={editor} className="h-full" />
              </div>
            </>
          )}
          
          {!currentDoc && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Welcome to Collaborative Editor</h2>
                <p className="mb-4">Select a document from the sidebar or create a new one to start editing</p>
                <button
                  onClick={createDocument}
                  className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create Your First Document
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}