# Supabase Backend Setup

This guide explains how to set up Supabase for the HelpQ backend.

## What is Supabase?

Supabase is an open-source Firebase alternative that provides:

- PostgreSQL database hosting
- Real-time API with WebSockets
- Authentication (optional)
- Storage (optional)

Perfect for building real-time applications like HelpQ's live queue system.

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Name**: helpq (or similar)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
5. Wait for project to initialize (2-3 minutes)

### 2. Get Your API Keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy the following and paste into `.env`:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (keep this private!)

Example:

```env
SUPABASE_URL=https://abcdefg.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 3. Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy the contents of `src/db/schema.sql`
4. Paste into the SQL Editor
5. Click "Run"

This creates:

- `sessions` table - for office-hours sessions
- `queue_entries` table - for student queue entries

### 4. Enable Real-time (Optional)

For Socket.IO integration later:

1. Go to **Database → Publications** (or **Realtime** tab)
2. Enable realtime for `sessions` and `queue_entries` tables
3. Check that `schema: public` is selected

### 5. Test the Connection

```bash
cd packages/express-backend
npm install
npm start
```

Server should start without errors on port 3001.

## Available API Endpoints

### Sessions

- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session by ID
- `GET /api/sessions/join/:joinCode` - Get session by join code
- `GET /api/hosts/:hostId/sessions` - Get all sessions for a host
- `PATCH /api/sessions/:id/status` - Update session status

### Queue

- `POST /api/sessions/:sessionId/queue` - Add queue entry
- `GET /api/sessions/:sessionId/queue` - Get queue
- `PATCH /api/queue/:entryId/status` - Update entry status
- `DELETE /api/queue/:entryId` - Remove entry
- `GET /api/sessions/:sessionId/stats` - Get queue statistics

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Project Structure

```
src/
├── config/
│   └── supabase.js          # Supabase client initialization
├── services/
│   └── db.js                 # Database service layer
├── routes/
│   └── api.js               # API endpoints
├── db/
│   └── schema.sql           # Database schema
└── index.js                 # Main server file
```

## Next Steps

1. Add authentication middleware for API endpoints
2. Set up Socket.IO for real-time updates
3. Add input validation and error handling
4. Connect React frontend to these API endpoints

## Troubleshooting

**Error: "Missing Supabase configuration"**

- Check that `.env` file exists in the project root
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

**Error: "Connection refused"**

- Check your internet connection
- Verify Supabase project is active
- Check API keys are correct

**Database tables not created**

- Go to Supabase SQL Editor
- Run the schema.sql script again
- Check for error messages in the editor
