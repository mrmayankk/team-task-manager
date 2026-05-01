# Team Task Manager (Full‑Stack)

A **full-stack Team Task Manager** where users can create projects, assign tasks, track progress, and enforce **role-based access** (**Admin / Member**). Built to be **demo-ready** and easy to run.

## Highlights

- **Authentication**: Signup/Login with **hashed passwords** + **JWT**
- **RBAC (Admin/Member)**:
  - **Admin**: create/delete projects, manage team, create/assign/delete tasks
  - **Member**: can view only projects they are part of and **update status only for assigned tasks**
- **Task management**: status workflow (**Pending → In Progress → Completed**), assignment, due dates
- **Overdue tracking**: tasks show **OVERDUE** when due date passed and not completed
- **Database**: embedded datastore (no external DB installation needed for local demo)
- **Single-command local demo**: backend serves the frontend

## Tech Stack

- **Backend**: Node.js, Express, JWT, bcrypt
- **DB**: NeDB (file-backed embedded DB)
- **Frontend**: Vanilla HTML/CSS/JS (responsive, separate dashboards)

## Quickstart (Local)

```bash
cd backend
npm install
npm run dev
```

Open:

- `http://localhost:5000/`

## Demo accounts (1‑click)

On the login page, use:

- **Login as Admin (demo)**
- **Login as User (demo)**

These auto-seed demo data and sign in instantly.

Manual demo credentials:

- **Admin**: `demo@team.local` / `demo1234`
- **Member**: `member@team.local` / `member1234`

## Pages

- **Landing/Login**: `http://localhost:5000/`
- **Admin dashboard**: `http://localhost:5000/admin.html`
- **Member dashboard**: `http://localhost:5000/member.html`

## REST API (Core)

- **Auth**
  - `POST /auth/signup`
  - `POST /auth/login`
- **Projects (JWT required)**
  - `GET /projects` (Admin: owned projects, Member: projects where they are a member)
  - `POST /projects` (**Admin only**)
  - `DELETE /projects/:id` (**Admin only**)
  - `GET /projects/:id/members`
  - `POST /projects/:id/members` (**Admin only**) add by email
  - `DELETE /projects/:id/members/:memberId` (**Admin only**)
- **Tasks (JWT required)**
  - `GET /tasks?projectId=...`
  - `POST /tasks`
  - `PUT /tasks/:id`
  - `DELETE /tasks/:id` (**Admin only**)
  - `GET /tasks/my` (member view: tasks assigned to current user)
- **Demo/Seed**
  - `POST /seed` create/reset demo users + project + tasks

## Railway Deployment (Live URL)

1. Push this repo to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Set:
   - **Root directory**: `backend`
   - **Start command**: `npm run start`
4. Add environment variable (recommended):
   - `JWT_SECRET` = a strong secret string
5. Deploy → open the Railway URL

Note: The app serves the frontend from the backend, so the same Railway URL hosts the UI.

## 2–5 minute demo script (suggested)

1. **Login as Admin (demo)** → show Admin dashboard
2. Create a project → add a member by email → assign tasks + due date
3. Show **OVERDUE** behavior and status transitions
4. Logout → **Login as User (demo)** → show “My Tasks”
5. Update task status as member (and show restricted actions)

