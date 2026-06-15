# Local LMS

React/Vite frontend and Node.js/Express backend for a role-based LMS.

## Stack

- Frontend: React, Vite, Tailwind
- Backend: Node.js, Express
- Database: PostgreSQL with raw SQL
- Cache/session support: Redis
- Auth: username/password, JWT access token, refresh token
- Video storage: local VPS filesystem prepared for 480p, 720p, 1080p

## Local Setup

1. Create PostgreSQL database:

   ```bash
   createdb lms_dev
   ```

2. Copy backend env:

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Install dependencies:

   ```bash
   npm run install:all
   ```

4. Load schema and seed data:

   ```bash
   psql postgresql://postgres:postgres@localhost:5432/lms_dev -f backend/sql/schema.sql
   psql postgresql://postgres:postgres@localhost:5432/lms_dev -f backend/sql/seed.sql
   ```

5. Start dev servers:

   ```bash
   npm run dev
   ```

Frontend: http://localhost:5173

Backend: http://localhost:4000

## Manual Start Guide

Open two terminals from this project folder.

### Terminal 1: backend

```bash
cd backend
node src/server.js
```

Or with auto-restart during development:

```bash
cd backend
npm run dev
```

Check backend:

```bash
curl http://localhost:4000/health
```

Expected:

```json
{"ok":true}
```

### Terminal 2: frontend

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173/login
```

### PostgreSQL

Your local database URL is stored in:

```text
backend/.env
```

Current local value:

```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/lms_dev
```

If you need to recreate the database tables:

```bash
psql postgresql://postgres:root@localhost:5432/lms_dev -f backend/sql/schema.sql
psql postgresql://postgres:root@localhost:5432/lms_dev -f backend/sql/seed.sql
```

If you already have the database and only need to apply later updates:

```bash
psql postgresql://postgres:root@localhost:5432/lms_dev -f backend/sql/migrations/001_user_management_and_quiz_questions.sql
```

### Redis

Redis is optional for local development right now. The backend will start even when Redis is not running.

On Ubuntu/VPS:

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping
```

Expected:

```text
PONG
```

On Windows local development, the simplest reliable option is usually WSL Ubuntu:

```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
redis-cli ping
```

The backend expects Redis at:

```env
REDIS_URL=redis://localhost:6379
```

## Seed Logins

- superadmin / SuperAdmin123!
- admin / Admin123!
- plant_user / Student123!

## Notes

- Class access is configured for Sunday 16:00-23:59 Asia/Makassar time by default.
- Users belong to one active class at a time.
- Students must complete each step before the next step unlocks.
- Essay quiz answers unlock the next step after submission, with grading available later from admin pages.
- Forward video seeking is blocked unless the admin setting `allow_forward_seek` is enabled.
