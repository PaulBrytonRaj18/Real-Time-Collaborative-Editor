# COLLABORATIVE-EDITOR-TASK-3

*Company*: CODTECH IT SOLUTIONS

*Name*: Paul Bryton Raj

*INTERN ID*: CY06DY2622

*DOMAIN*: Full Stack Developement

*DURATION*: 4 weeks

*MENTOR*: **NEELA SANTHOSH**


**Output**

<img width="1919" height="893" alt="image" src="https://github.com/user-attachments/assets/8d0570a8-6390-436e-8d2e-fdd9ba8141ee" />


<img width="1897" height="1009" alt="image" src="https://github.com/user-attachments/assets/64f8fe42-b768-4348-8ba3-cbd03cec7980" />


Collaborative editor task by codtech internship



***

# 🚀 Collaborative Document Editor

An exceptionally smooth, feature-packed **real-time collaborative editor** crafted for teams, creators, and anyone who values seamless document sharing and productivity.

***

## 🌟 Highlights

- **Live Collaboration:** Work together instantly with zero conflicts—perfect for teams and classrooms.
- **Rich Text Editing:** Format documents powerfully with bold, italics, headings, lists, and more.
- **Lightning-Fast Sync:** Edits appear for all users in real time, powered by Yjs CRDT and TipTap Editor.
- **Robust Versioning:** Effortlessly save, restore, and manage document histories.
- **In-Editor Comments:** Discuss ideas with threaded comments, replies, and reactions.
- **Folder Organization:** Arrange documents into intuitive folders for clarity and speed.
- **Custom Sharing:** One-click share links, granular editor/viewer permissions, and secure access.
- **Simple Export:** Download polished PDFs or clean text files with a single click.
- **Adaptive UI:** Elegant dark/light modes and active user indicators.
- **Secure by Design:** Session-based auth and PBKDF2 password hashing—from the ground up.

***

## 🛠️ Technologies

**Frontend:**
React 18 · TipTap · Yjs · Socket.IO · Tailwind CSS · Vite

**Backend:**
Flask + Flask-SocketIO · MongoDB · Eventlet · REST API

***

## ⚡ Getting Started

**Requirements:**

- Node.js 18+
- Python 3.10+
- MongoDB 5.0+ (local or Atlas)

**Quick Install:**

<details>
<summary>Backend</summary>

```bash
cd backend
python -m venv venv
source venv/bin/activate        # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
# Add .env with your keys and MongoDB URI
python app.py
```
</details>
<details>
<summary>Frontend</summary>

```bash
cd frontend
npm install
npm install @tailwindcss/typography
# Add .env with backend URLs
npm run dev
```
</details>
- Ready to go:
    - Backend at `http://localhost:5000`
    - Frontend at `http://localhost:5173`

***

## ✨ How It Works

- **Sign Up**: Simple registration, strong password security.
- **Create \& Edit**: Start new documents, invite collaborators, see everyone online.
- **Organize**: Drag-and-drop into folders, filter documents by tags or sharing status.
- **Comment \& Discuss**: Highlight text and add comments anywhere, reply to threads in context.
- **History \& Recovery**: Instantly snapshot and restore any past version.
- **Share**: Generate live edit/view links, manage permissions by user.
- **Export**: Download docs as PDF or TXT, always with latest changes.

***

## 📚 Project Structure

```
collaborative-editor/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env
└── README.md
```


***

## 🛡️ Security First

- PBKDF2-SHA256 password hashing
- HTTP-only session cookies
- Strict CORS enforcement
- On-the-fly permission checks
- Fully sandboxed document sharing

***

## 💻 API Guide

Explore intuitive REST endpoints for users, docs, folders, versions, comments, and sharing. Example endpoints:


| Feature | Endpoint |
| :-- | :-- |
| Auth | `POST /api/auth/register` |
| Documents | `GET /api/documents/:id` |
| Folders | `POST /api/folders` |
| Versions | `POST /api/documents/:id/versions` |
| Comments | `POST /api/documents/:id/comments` |
| Sharing | `POST /api/documents/:id/share` |

Full list in `/api` documentation.

***

## 🔗 WebSocket Events

Real-time sync is powered by custom events:

- **Client ➔ Server:**
`join_document`, `leave_document`, `yjs_update`
- **Server ➔ Client:**
`user_joined`, `user_left`, `active_users`, `yjs_update`

***

## 📄 License

MIT License — open for learning, building, and sharing.

***

## ❤️ Acknowledgments

- **TipTap** — the gold standard for editor UX.
- **Yjs** — unbeatable CRDT-based sync.
- **Flask-SocketIO** — real-time power, made simple.
- **MongoDB** — flexible document storage for real teams.

***

> **Built for creators, teams, and visionaries who want their ideas to flow and grow—together.**

***
