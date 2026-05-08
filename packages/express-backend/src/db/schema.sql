-- Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id TEXT NOT NULL,
  join_code VARCHAR(10) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, paused, closed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue Entries Table
CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'waiting', -- waiting, in_progress, completed, removed
  position INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_sessions_host_id ON sessions(host_id);
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_queue_entries_session_id ON queue_entries(session_id);
CREATE INDEX idx_queue_entries_status ON queue_entries(status);

-- Enable Real-time Replication (for Socket.IO integration)
ALTER PUBLICATION supabase_realtime ADD TABLE sessions, queue_entries;
