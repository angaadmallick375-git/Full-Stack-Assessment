# TaskFlow — Full-Stack Team Task Manager

TaskFlow is a state-of-the-art team task management application designed with a beautiful glassmorphic dark UI. It allows teams to create projects, assign tasks, manage member permissions, and track progress using an interactive Kanban board with role-based access controls.

## 🚀 Key Features

- **Authentication**: Secure signup/login with JWT tokens, bcrypt password hashing, and profile/password management.
- **Role-Based Access Control (RBAC)**:
  - **Global Admin**: Create projects, manage all users and their roles, full project control.
  - **Global Member**: Join projects they're invited to; update status on assigned tasks only.
  - **Project Admin / Member**: Per-project roles for granular team permissions.
- **Project & Team Management**: Create/edit/delete projects, add/remove members, change project roles, activity timeline.
- **Task Management**: Create, assign, prioritize, tag, set due dates, task dependencies (`blocked_by`), comments, and markdown descriptions.
- **Interactive Kanban Board**: Drag-and-drop tasks between *To Do*, *In Progress*, and *Done* columns with filters (status, priority, assignee, search).
- **Dashboard**: Visual stats, overdue task alerts, priority breakdown, and per-project progress overview.
- **Team Page**: View all workspace users, project counts, and active task loads (admins can manage global roles).
- **Settings**: Update display name and change password.
- **Attendance (Punch In/Out)**: Clock in when you start work and clock out when you finish; live timer, daily hours summary, history, and admin team view.

## 🛠️ Technology Stack

### Backend
- **Node.js** & **Express** REST API
- **PostgreSQL** Relational Database
- **JSON Web Tokens (JWT)** for session security
- **bcryptjs** for credential hashing

### Frontend
- **React.js** (Vite-powered SPA)
- **React Router Dom v6** for client routing
- **Vanilla CSS** custom design system matching modern UI design guidelines
- **React Hot Toast** for beautiful notifications

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
Ensure your repository is on GitHub (required for Railway).

### 2. Create Railway project
1. Go to [railway.app](https://railway.app) and create a new project from your repo.
2. Set the **root directory** to `server` (or deploy from repo root and adjust paths).
3. Add a **PostgreSQL** plugin — Railway injects `DATABASE_URL` automatically.

### 3. Environment variables (Railway → Variables)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Auto-filled by PostgreSQL plugin |
| `JWT_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your public Railway URL (e.g. `https://your-app.up.railway.app`) |
| `SERVE_CLIENT` | `true` (serves built React app from same service) |

### 4. Build & start
- **Start command:** `npm start` (from `server/`)
- **Health check:** `GET /api/health`
- The included `server/railway.toml` builds the client with `VITE_API_URL=/api` so the SPA talks to the API on the same domain.

### 5. Verify deployment
- Visit `https://your-app.up.railway.app/api/health` — should return `{"status":"ok",...}`
- Open the app URL, sign up, create a project, and test tasks.

### Separate frontend service (optional)
If you host the client separately:
1. Set `SERVE_CLIENT=false` on the API service.
2. Build the client with `VITE_API_URL=https://your-api.up.railway.app/api`.
3. Deploy `client/dist` to Railway Static, Vercel, or Netlify.
4. Add the frontend URL to `CLIENT_URL` on the API (comma-separated if multiple).

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
