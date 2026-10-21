# LabMatrix

A lab management system for a college: lab and computer inventory, software licences,
lab sessions with attendance, lab booking with admin approval, and fault reports with
repair jobs. Built for the CS203 DBMS project (SVNIT Surat), Team TriByte.

**Stack:** MySQL 8, Node.js + Express (REST API), React + Vite + Tailwind CSS.

## Folder layout

```
LabMatrix/
├── database/
│   ├── schema.sql              16 tables, 5 triggers, 1 procedure, 5 views, indexes
│   ├── seed.sql                small demo data (use this for everyday work)
│   ├── seed_large.sql          big data set (20,000 computers) for the index experiment
│   ├── queries.sql             project queries (dashboard / reports)
│   └── assignment_queries.sql  DBMS lab assignment, sections A, B and C
├── backend/
│   ├── server.js, app.js       start-up and Express setup
│   ├── config/db.js            MySQL connection pool
│   ├── middleware/             auth (JWT), role, validate, stripEmpty, errorHandler
│   ├── routes/                 one file per module (mounted in routes/index.js)
│   ├── utils/crudFactory.js    shared list / get / create / update / delete router
│   ├── controllers, models, services, validators   (auth, users, batches, courses, Query Lab)
│   └── scripts/createAdmin.js  creates a first admin (only needed without the seed)
└── frontend/
    └── src/                    pages, components, api client, config/entities.js
```

## Run it on a new laptop

Install Git, Node.js (LTS) and MySQL 8 first.

```powershell
git clone https://github.com/UniverseAstha456/LabMatrix.git
cd LabMatrix
git checkout develop
```

**1. Database** (from the folder that contains `database/`). Load `schema.sql` once, then ONE seed file:
```powershell
mysql -u root -p -e "source database/schema.sql"
mysql -u root -p -e "source database/seed.sql"
```
`schema.sql` drops and recreates the `LabMatrix` database, so only run it when you want a clean start.
Use `seed_large.sql` instead of `seed.sql` for the index timing experiment. Never load both.

**2. Backend**
```powershell
cd backend
npm install
copy .env.example .env
```
Open `.env` and set `DB_PASSWORD` to your own MySQL password (and keep `DB_NAME=LabMatrix`). Then:
```powershell
npm run dev
```
It should print `Server running on port 5000`. Check `http://localhost:5000/api/health`.

**3. Frontend** (a second terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. Both servers must stay running.

## Demo accounts

Which accounts exist depends on the seed file you loaded. In both, the password is `Password@123`
(the admin you made with `createAdmin.js` keeps the password you gave it).

| Role | `seed.sql` (small) | `seed_large.sql` (big) |
|---|---|---|
| Admin | admin@labmatrix.com | admin@labmatrix.com |
| Faculty | anita.desai@labmatrix.com, rajesh.patel@labmatrix.com, meera.shah@labmatrix.com | faculty1@labmatrix.edu ... faculty12@labmatrix.edu |
| Technician | kiran.joshi@labmatrix.com, suresh.mehta@labmatrix.com | tech1@labmatrix.edu ... tech6@labmatrix.edu |
| Student | student01@labmatrix.com ... student24@labmatrix.com | student1@labmatrix.edu ... student1200@labmatrix.edu |

If login says "Invalid email or password", the account is not in your database. Check with
`mysql -u root -p LabMatrix -e "SELECT email, role FROM app_user;"`.

## What each role can do

| Role | Can do |
|---|---|
| Admin | everything: users, labs, computers, equipment, software, sessions, bookings (approve / reject), fault reports, repair jobs, Query Lab |
| Faculty | create and edit their own lab sessions, take attendance, request lab bookings (cancel their own), report faults, view resources |
| Technician | maintain computers, equipment and installations, handle their own repair jobs, see all fault reports |
| Student | view sessions of their own batch, report faults and see their own reports |

## API summary

All routes are under `/api`, need `Authorization: Bearer <token>` (except login) and reply
`{ success, data, message }`. Paged lists accept `?page=&limit=&q=` plus filters (`status`, `lab_id` ...)
and also return `meta: { total, page, limit, pages }`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Users, batches, courses | `/users`, `/batches`, `/courses` (Admin writes) |
| Resources | `/labs`, `/computers`, `/equipment`, `/software`, `/installs` |
| Academics | `/sessions` (+ `GET/PUT /sessions/:id/attendance`), `/bookings` (+ `POST /bookings/:id/approve`) |
| Maintenance | `/requests` (fault reports), `/maintenance` (repair jobs) |
| Dropdown data | `GET /options/{labs,faculty,technicians,courses,batches,software,requests}` |
| Reports | `GET /views/{lab_health,expiring_licenses,lab_usage,student_attendance,frequent_maintenance}` |
| Query Lab (Admin) | `/querylab/...` runs the assignment queries Q1 to Q8; `GET /querylab/stats` feeds the dashboard |

## Business rules enforced by the database

- No two approved bookings overlap in one lab (trigger). Approval runs through the `approve_booking` procedure.
- A fault report sets the computer or equipment to *Under Maintenance*; resolving the last open report sets it back to *Working*.
- A software title cannot be installed on more computers than it has licence seats (trigger).
- Dates, times, capacity and cost are checked by `CHECK` constraints; asset numbers, emails and codes are `UNIQUE`.

## DBMS assignment map

| Part | Where |
|---|---|
| A (8 queries), B (indexes), C (view, procedure, trigger) | `database/assignment_queries.sql` |
| D (frontend for the queries) | **Query Lab** page (Admin menu) |
| E (dashboard with statistics of all tables) | **Dashboard** page |

## Team workflow

1. `git checkout develop` then `git pull origin develop` before starting.
2. Work on your own branch, commit, `git push`, open a pull request into `develop`.
3. Change tables only in `database/schema.sql`, tell the team, and everyone reloads it.
4. Never commit `.env` or `node_modules`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Access denied for user` | wrong `DB_PASSWORD` in `backend/.env`; restart the backend after editing it |
| `Unknown database` | `schema.sql` has not been loaded yet |
| Page shows `Unable to connect` / proxy error | the backend is not running |
| `Cannot find module` | run `npm install` inside `backend` or `frontend` |
