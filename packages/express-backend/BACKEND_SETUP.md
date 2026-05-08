# Supabase Backend Setup - Complete Guide

## ✅ What Has Been Set Up

Your Express backend is now configured to work with Supabase PostgreSQL
database. Here's what was created:

### 1. **Dependencies Added**

- `@supabase/supabase-js` - Supabase JavaScript client

### 2. **Project Structure**

```
packages/express-backend/
├── src/
│   ├── config/
│   │   └── supabase.js              # Supabase client initialization
│   ├── services/
│   │   └── db.js                    # Database query functions (sessions, queue)
│   ├── routes/
│   │   └── api.js                   # API endpoints for sessions & queue
│   ├── db/
│   │   └── schema.sql               # Database table definitions
│   └── index.js                     # Updated to use API routes
├── .env                             # Environment variables (YOUR KEYS GO HERE)
├── .env.example                     # Template for environment variables
├── SUPABASE_SETUP.md               # Detailed Supabase setup instructions
└── package.json                     # Updated with Supabase dependency
```

### 3. **API Endpoints Created**

#### **Session Management**

- `POST /api/sessions` - Create office-hours session
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/join/:joinCode` - Join session by code
- `GET /api/hosts/:hostId/sessions` - Get all host's sessions
- `PATCH /api/sessions/:id/status` - Change session status
  (active/paused/closed)

#### **Queue Management**

- `POST /api/sessions/:sessionId/queue` - Add student to queue
- `GET /api/sessions/:sessionId/queue` - Get queue for session
- `PATCH /api/queue/:entryId/status` - Update entry status
  (waiting/in_progress/completed/removed)
- `DELETE /api/queue/:entryId` - Remove queue entry
- `GET /api/sessions/:sessionId/stats` - Get queue statistics

### 4. **Database Schema**

Two tables created with support for real-time updates:

**`sessions` table:**

- id (UUID, primary key)
- host_id (TEXT)
- join_code (VARCHAR, unique)
- title (VARCHAR)
- description (TEXT)
- status (active/paused/closed)
- created_at, updated_at

**`queue_entries` table:**

- id (UUID, primary key)
- session_id (UUID, foreign key)
- student_name (VARCHAR)
- question (TEXT)
- status (waiting/in_progress/completed/removed)
- position (INTEGER)
- created_at, updated_at

## 🚀 Next Steps: Configure Supabase

### Step 1: Create Supabase Account & Project

1. Visit [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Create new project:
   - Name: `helpq` (or your choice)
   - Password: Create strong password
   - Region: Choose nearest to you
4. Wait 2-3 minutes for initialization

### Step 2: Get API Keys

1. Go to **Settings → API** in Supabase dashboard
2. Copy these three values to `.env`:
   ```
   SUPABASE_URL=https://[your-id].supabase.co
   SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
   ```

### Step 3: Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Click "New Query"
3. Open file: `packages/express-backend/src/db/schema.sql`
4. Copy all SQL code
5. Paste into Supabase SQL Editor
6. Click "Run"

### Step 4: Enable Real-time (Optional but Recommended)

1. Go to **Database → Publications** in Supabase
2. Enable for tables: `sessions` and `queue_entries`
3. This allows Socket.IO to push updates to connected clients

### Step 5: Test Configuration

```bash
cd packages/express-backend
npm install
npm start
```

The server should start on `http://localhost:3001` without errors.

## 📋 Environment Variables

**File: `.env` (in express-backend directory)**

```env
PORT=3001
NODE_ENV=development

# Supabase Configuration (get from dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **Security Note:**

- Never commit `.env` to Git (included in `.gitignore`)
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Use `.env.example` to document required variables

## 🧪 Example API Usage

### Create a Session

```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "hostId": "prof-123",
    "title": "Office Hours - Week 5",
    "description": "Help with recursion and arrays"
  }'
```

### Join Queue

```bash
curl -X POST http://localhost:3001/api/sessions/[SESSION_ID]/queue \
  -H "Content-Type: application/json" \
  -d '{
    "studentName": "Alice Johnson",
    "question": "How do I debug a recursive function?"
  }'
```

### Get Queue Status

```bash
curl http://localhost:3001/api/sessions/[SESSION_ID]/queue
```

## 📚 File Reference

| File                                             | Purpose                    |
| ------------------------------------------------ | -------------------------- |
| [src/config/supabase.js](src/config/supabase.js) | Initialize Supabase client |
| [src/services/db.js](src/services/db.js)         | All database queries       |
| [src/routes/api.js](src/routes/api.js)           | Express route handlers     |
| [src/db/schema.sql](src/db/schema.sql)           | SQL table definitions      |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md)           | Detailed setup guide       |

## ⚠️ Important Security Notes

### Development Phase

- Add authentication middleware to protect endpoints
- Validate all user inputs before database operations
- Use service role key only on backend (never expose to frontend)
- Use anon key for frontend client operations

### Before Deployment

- Enable Row Level Security (RLS) in Supabase
- Set up proper authentication (JWT, OAuth, etc.)
- Implement rate limiting on API endpoints
- Use HTTPS in production
- Set appropriate CORS policies

## 🔧 Database Service Layer Functions

The `src/services/db.js` file provides these functions:

**Sessions:**

- `createSession(hostId, title, description)`
- `getSessionByJoinCode(joinCode)`
- `getSessionById(sessionId)`
- `getSessionsByHostId(hostId)`
- `updateSessionStatus(sessionId, status)`

**Queue:**

- `addQueueEntry(sessionId, studentName, question)`
- `getQueueBySessionId(sessionId)`
- `updateQueueEntryStatus(entryId, status)`
- `removeQueueEntry(entryId)`
- `getQueuePosition(sessionId, entryId)`
- `getQueueStats(sessionId)`

## 📖 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Basics](https://www.postgresql.org/docs/)

## 🆘 Troubleshooting

**Server won't start:**

- Check `.env` file exists in `packages/express-backend/`
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Run `npm install` to ensure all dependencies installed

**"Cannot connect to database":**

- Check Supabase project is active
- Verify API keys are correct (copy-paste carefully)
- Check internet connection

**Tables don't exist:**

- Go to Supabase SQL Editor
- Paste schema.sql content and run it
- Check for SQL syntax errors in editor

---

**Next Task:** Set up Socket.IO for real-time queue updates!
