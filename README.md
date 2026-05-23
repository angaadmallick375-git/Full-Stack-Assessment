# Full Stack Assessment - TaskFlow

A modern, full-stack team task management application with role-based access control, project management, task tracking via Kanban board, and attendance management. Built with React, Express, and PostgreSQL.

## 🚀 Key Features

- **User Authentication & Authorization**
  - Secure signup and login with JWT tokens
  - bcrypt password hashing for security
  - Profile and password management
  - Protected routes with role-based access

- **Role-Based Access Control (RBAC)**
  - Global Admin: Manage all users, projects, and permissions
  - Global Member: Access assigned projects and tasks
  - Project-level Admin/Member roles for granular permissions

- **Project Management**
  - Create, edit, and delete projects
  - Add/remove team members
  - View project details and activity timeline
  - Project-specific role assignments

- **Task Management**
  - Create, assign, and prioritize tasks
  - Set due dates and task dependencies
  - Add tags, comments, and markdown descriptions
  - Full CRUD operations

- **Interactive Kanban Board**
  - Drag-and-drop tasks between To Do, In Progress, and Done columns
  - Filter by status, priority, assignee, and search
  - Real-time task status updates

- **Dashboard**
  - Visual statistics and analytics
  - Overdue task alerts
  - Priority breakdown
  - Per-project progress overview

- **Team Management**
  - View all team members with activity details
  - Project counts and active task loads
  - Admin controls for user role management

- **Attendance Tracking**
  - Punch in/out functionality
  - Live timer and daily hours summary
  - Attendance history and records
  - Admin team view

- **User Settings**
  - Update display name and preferences
  - Change password

## 🛠️ Technology Stack

### Backend
- **Node.js** & **Express** - REST API server
- **PostgreSQL** - Relational database
- **JWT (JSON Web Tokens)** - Secure authentication
- **bcryptjs** - Password hashing

### Frontend
- **React.js** - UI library
- **Vite** - Fast build tool and dev server
- **React Router Dom v6** - Client-side routing
- **Axios** - HTTP client for API requests
- **CSS3** - Responsive styling

---

## 💻 Local Setup Instructions

### 1. Database Setup
Ensure you have a PostgreSQL database running locally or remotely (e.g., from Neon.tech or Supabase).

### 2. Backend Config
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Create/edit the `.env` file (based on `.env.example`):
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the backend:
   ```bash
   npm run dev
   ```
   *Note: Database migrations will run automatically on startup.*

### 3. Frontend Config
1. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Local dev without PostgreSQL:** If `DATABASE_URL` is not set, the server uses embedded PGlite (`server/db_data`). For production you **must** use PostgreSQL.

---

## 🚂 Deploy to Railway

### 1. Push code to GitHub
Push this repo to GitHub, then connect it in [Railway](https://railway.app).

### 2. Create the Railway project
1. **New Project** → **Deploy from GitHub repo**
2. Leave **Root Directory** empty (use the repo root, not `server/`)
3. Click **+ New** → **Database** → **PostgreSQL**
4. Open your **web service** → **Variables** → **Add Reference** → link `DATABASE_URL` from Postgres

### 3. Required environment variables

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Reference from PostgreSQL service (required) |
| `JWT_SECRET` | Long random string (required) |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your public URL, e.g. `https://your-app.up.railway.app` |

Optional: `SERVE_CLIENT=false` only if the frontend is hosted elsewhere.

### 4. Build & start (auto from `railway.toml`)
Railway uses the root `railway.toml`:
- **Build:** installs deps + builds React to `client/dist` with `VITE_API_URL=/api`
- **Start:** `npm start` → runs the API and serves the React app

Manual override (if needed):

| Setting | Value |
|---------|--------|
| Build Command | `npm install --prefix server && npm install --prefix client && VITE_API_URL=/api npm run build --prefix client` |
| Start Command | `npm start` |
| Healthcheck Path | `/api/health` |

### 5. Verify
- Open `https://YOUR-APP.up.railway.app/api/health` → should show `"status":"ok"` and `"database":"configured"`

---

## 📁 Project Structure

```
Full Stack Assessment/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   │   ├── AttendanceCard.jsx   # Attendance display
│   │   │   ├── KanbanBoard.jsx      # Interactive Kanban board
│   │   │   ├── Navbar.jsx           # Navigation bar
│   │   │   ├── ProtectedRoute.jsx   # Route protection wrapper
│   │   │   ├── TaskCard.jsx         # Task card component
│   │   │   └── TaskModal.jsx        # Task creation/edit modal
│   │   ├── pages/                   # Page components
│   │   │   ├── Attendance.jsx       # Attendance tracking
│   │   │   ├── Dashboard.jsx        # Main dashboard
│   │   │   ├── Landing.jsx          # Landing page
│   │   │   ├── Login.jsx            # Login page
│   │   │   ├── ProjectDetails.jsx   # Project detail view
│   │   │   ├── Projects.jsx         # Projects listing
│   │   │   ├── Settings.jsx         # User settings
│   │   │   ├── Signup.jsx           # Signup page
│   │   │   └── Team.jsx             # Team members view
│   │   ├── contexts/                # React contexts
│   │   │   └── AuthContext.jsx      # Authentication context
│   │   ├── api/                     # API utilities
│   │   │   └── axios.js             # Axios instance configuration
│   │   ├── App.jsx                  # Main app component
│   │   ├── index.css                # Global styles
│   │   └── main.jsx                 # React entry point
│   ├── index.html                   # HTML template
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.js               # Vite configuration
│
├── server/                          # Express backend
│   ├── routes/                      # API route handlers
│   │   ├── auth.js                  # Authentication endpoints
│   │   ├── projects.js              # Project management endpoints
│   │   ├── tasks.js                 # Task management endpoints
│   │   ├── users.js                 # User management endpoints
│   │   └── attendance.js            # Attendance tracking endpoints
│   ├── middleware/                  # Custom middleware
│   │   ├── auth.js                  # JWT authentication
│   │   └── roles.js                 # Role-based access control
│   ├── db/                          # Database layer
│   │   ├── connection.js            # PostgreSQL connection
│   │   └── migrate.js               # Database migrations
│   ├── db_data/                     # PostgreSQL data directory
│   ├── index.js                     # Express server entry point
│   ├── package.json                 # Backend dependencies
│   └── railway.toml                 # Railway deployment config
│
├── package.json                     # Root package.json
├── railway.toml                     # Railway root config
└── README.md                        # This file
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /signup` - Register a new user
- `POST /login` - Login and receive JWT token
- `POST /logout` - Logout user (client-side token removal)
- `GET /profile` - Get current user profile

### Projects (`/api/projects`)
- `GET /` - Get all projects for the user
- `GET /:id` - Get project details
- `POST /` - Create a new project (Admin)
- `PUT /:id` - Update project (Project Admin)
- `DELETE /:id` - Delete project (Project Admin)
- `POST /:id/members` - Add team member (Project Admin)
- `DELETE /:id/members/:userId` - Remove team member (Project Admin)

### Tasks (`/api/tasks`)
- `GET /` - Get all tasks (with filters)
- `GET /:id` - Get task details
- `POST /` - Create a new task
- `PUT /:id` - Update task
- `DELETE /:id` - Delete task
- `PATCH /:id/status` - Update task status (via Kanban drag-drop)

### Users (`/api/users`)
- `GET /` - Get all users (Admin only)
- `GET /:id` - Get user details
- `PUT /:id` - Update user profile
- `DELETE /:id` - Delete user (Admin only)
- `PATCH /:id/role` - Change user global role (Admin only)

### Attendance (`/api/attendance`)
- `GET /` - Get user's attendance records
- `POST /punch-in` - Clock in
- `POST /punch-out` - Clock out
- `GET /team` - Get team attendance (Admin only)
- `GET /summary` - Get daily/weekly summary

---

## 🔐 Authentication & Security

- **JWT Tokens** stored in browser localStorage after login
- **bcryptjs** hashing for password security
- **Role-based middleware** for protected routes
- **CORS** enabled for frontend-backend communication
- **Protected routes** that require valid JWT and appropriate role

### Sample JWT Payload
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin|member",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

## 📊 Database Schema

Key tables in PostgreSQL:
- **users** - User accounts, emails, password hashes, global roles
- **projects** - Project details, metadata
- **project_members** - Project-user associations with per-project roles
- **tasks** - Task details, status, priority, assignee
- **task_comments** - Comments on tasks
- **attendance** - Punch in/out records, duration tracking
- **teams** - Team grouping and relationships

---

## 🧪 Running the Application

### Development (Both frontend and backend)

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

### Production Build

**Build frontend:**
```bash
cd client
npm run build
```
Creates optimized build in `client/dist/`

**Start server with built frontend:**
```bash
cd server
npm install
npm start
```
Server serves the React app from `client/dist/`

---

## 🤝 Contributing

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Commit with clear messages:
   ```bash
   git commit -m "Add: description of your feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Create a Pull Request to `main`

---

## 📝 Environment Variables

### Server (`.env`)
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication
JWT_SECRET=your_super_secret_key_here_make_it_long

# Server Config
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# Optional: Disable client serving if frontend is hosted separately
SERVE_CLIENT=true
```

### Client (`.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 📧 Support & Issues

Found a bug or have a feature request? [Create an issue on GitHub](https://github.com/angaadmallick375-git/Full-Stack-Assessment/issues)

---

## 📄 License

This project is part of a Full Stack Assessment.

---

**Built with ❤️ by Angad Mallick**  
**Repository:** [Full-Stack-Assessment](https://github.com/angaadmallick375-git/Full-Stack-Assessment)
- Open the main URL → sign up and create a project

### Common Railway errors

| Error | Fix |
|-------|-----|
| `JWT_SECRET is not set` | Add `JWT_SECRET` in Variables |
| `DATABASE_URL is required on Railway` | Add PostgreSQL and link `DATABASE_URL` to the web service |
| `client/dist not found` | Build failed — check build logs; ensure root directory is repo root |
| Build only runs `server` | Set Root Directory to **/** (repo root), not `server` |
| `Cannot find module 'express'` | Build must run `npm install --prefix server` (see `railway.toml`) |
| PostgreSQL SSL / connection failed | Use linked `DATABASE_URL`; internal URLs skip SSL automatically |

---

## 📁 Project Structure

```
├── client/
│   ├── src/
│   │   ├── api/          # Axios configurations and global interceptors
│   │   ├── components/   # Reusable UI components (Navbar, KanbanBoard, modals)
│   │   ├── contexts/     # Context providers (AuthContext)
│   │   ├── pages/        # View Pages (Dashboard, Projects, ProjectDetails, Team, Settings, Login, Signup)
│   │   ├── App.jsx       # Routing layout and initialization
│   │   ├── main.jsx      # Entrypoint
│   │   └── index.css     # Global Design System tokens & custom utilities
│   ├── package.json
│   └── vite.config.js
└── server/
    ├── db/               # PostgreSQL Connection & migration logic
    ├── middleware/       # JWT Auth and Role guards
    ├── routes/           # REST endpoints (auth, projects, tasks, users)
    ├── index.js          # App Server starter
    └── package.json
```
