# Team Task Manager

A full-stack team task management web application built with React + Vite frontend and Express API backend.

## Architecture

**Monorepo structure (pnpm workspaces):**
- `artifacts/task-manager` — React + Vite frontend (`@workspace/task-manager`)
- `artifacts/api-server` — Express 5 API server (`@workspace/api-server`)
- `lib/api-spec` — OpenAPI spec (`@workspace/api-spec`)
- `lib/api-client-react` — Generated TanStack Query hooks (`@workspace/api-client-react`)
- `lib/api-zod` — Generated Zod schemas (`@workspace/api-zod`)
- `lib/db` — Drizzle ORM schema + client (`@workspace/db`)

## Stack

- **Frontend:** React 19, Vite, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS v4
- **Backend:** Express 5, Drizzle ORM, PostgreSQL, JWT auth (jsonwebtoken + bcryptjs)
- **Codegen:** Orval → generates hooks from OpenAPI spec

## Features

- Authentication: signup, login, logout with JWT (stored in localStorage as `auth_token`)
- Dashboard: stats summary (total projects, tasks, completed, overdue), status/priority breakdowns, overdue task list, recent activity feed
- Projects: list, create, delete with task/member counts and progress bars
- Project Detail: task management (create/edit/delete), member management (add/remove), tabs UI
- My Tasks: view all tasks assigned to current user, quick status updates, overdue grouping
- Settings: account profile display

## Routes

**Frontend routes:**
- `/` → Dashboard
- `/login` → Login
- `/signup` → Signup
- `/dashboard` → Dashboard
- `/projects` → Projects list
- `/projects/:id` → Project detail (tasks + members tabs)
- `/projects/:id/tasks` → Project detail (tasks tab)
- `/tasks` → My Tasks
- `/settings` → Settings

**API routes (all under `/api`):**
- `POST /auth/signup` → create account + JWT
- `POST /auth/login` → login + JWT
- `POST /auth/logout` → logout
- `GET /auth/me` → get current user
- `GET/POST /projects` → list/create projects
- `GET/PATCH/DELETE /projects/:id` → get/update/delete project
- `GET/POST /projects/:id/members` → list/add members
- `PATCH/DELETE /projects/:id/members/:userId` → update/remove member
- `GET/POST /projects/:id/tasks` → list/create tasks
- `GET/PATCH/DELETE /tasks/:id` → get/update/delete task
- `GET /tasks/my` → current user's assigned tasks
- `GET /dashboard/summary` → aggregate stats
- `GET /dashboard/overdue-tasks` → overdue tasks list
- `GET /dashboard/activity` → recent activity feed

## Database Schema (PostgreSQL + Drizzle ORM)

- `users` — id, name, email, passwordHash, role (member|admin), createdAt
- `projects` — id, name, description, ownerId, status (active|archived), createdAt, updatedAt
- `project_members` — userId, projectId, role (admin|member), joinedAt
- `tasks` — id, projectId, title, description, status (todo|in_progress|done), priority (low|medium|high), assigneeId, dueDate, createdAt, updatedAt
- `activity` — id, type, description, userId, projectId, taskId, createdAt

## Authentication

JWT stored in `localStorage` as `auth_token`, sent as `Authorization: Bearer <token>` header. The `requireAuth` middleware validates the token and attaches `req.user`. `JWT_SECRET` is read from the `SESSION_SECRET` environment variable.

## Demo Data

Three demo users pre-seeded (password: `password123`):
- `alex@example.com` — Alex Johnson (project owner)
- `sarah@example.com` — Sarah Chen (member on both projects)
- `marcus@example.com` — Marcus Lee (member on Website Redesign)

Two projects with 6 tasks and activity entries.

## Environment Variables

- `SESSION_SECRET` — used as JWT secret (set in Replit secrets)
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
- `PORT` — server port (set by Replit workflow system)

## Codegen

After modifying `lib/api-spec/openapi.yaml`:
```
pnpm --filter @workspace/api-spec run codegen
```

This regenerates `lib/api-client-react/src/generated/api.ts` and `lib/api-zod/src/generated/api.ts`.
