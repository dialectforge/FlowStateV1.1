-- ============================================================
-- FLOWSTATE DATABASE SCHEMA v1.0
-- ============================================================

-- Projects: Top-level containers
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Components: Building blocks within projects (nestable)
CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_component_id INTEGER REFERENCES components(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'in_progress' CHECK(status IN ('planning', 'in_progress', 'testing', 'complete', 'deprecated')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- Changes: Track what changed over time
CREATE TABLE IF NOT EXISTS changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT CHECK(change_type IN ('config', 'code', 'architecture', 'dependency', 'documentation', 'other')),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems: Issues encountered
CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'blocked', 'solved', 'wont_fix')),
    severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    root_cause TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    solved_at TIMESTAMP
);

-- Solution Attempts: The decision tree of what we tried
CREATE TABLE IF NOT EXISTS solution_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    parent_attempt_id INTEGER REFERENCES solution_attempts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    outcome TEXT CHECK(outcome IN ('success', 'failure', 'partial', 'abandoned', 'pending')),
    confidence TEXT DEFAULT 'attempted' CHECK(confidence IN ('attempted', 'worked_once', 'verified', 'proven', 'deprecated')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Solutions: The winning solution for a problem
CREATE TABLE IF NOT EXISTS solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id INTEGER UNIQUE NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    winning_attempt_id INTEGER REFERENCES solution_attempts(id) ON DELETE SET NULL,
    summary TEXT NOT NULL,
    code_snippet TEXT,
    key_insight TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Todos: Task tracking
CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES components(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'blocked', 'done', 'cancelled')),
    due_date TIMESTAMP,
    blocked_by_problem_id INTEGER REFERENCES problems(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Conversations: Log of Claude interactions
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT,
    user_prompt_summary TEXT NOT NULL,
    assistant_response_summary TEXT,
    key_decisions TEXT, -- JSON array: ["decided X", "rejected Y"]
    problems_referenced TEXT, -- JSON array of problem IDs
    solutions_created TEXT, -- JSON array of solution IDs
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learnings: Insights and patterns
CREATE TABLE IF NOT EXISTS learnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES components(id) ON DELETE SET NULL,
    category TEXT CHECK(category IN ('pattern', 'gotcha', 'best_practice', 'tool_tip', 'architecture', 'performance', 'security', 'other')),
    insight TEXT NOT NULL,
    context TEXT,
    source TEXT CHECK(source IN ('experience', 'documentation', 'conversation', 'error', 'research')),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cross References: Links between items across projects
CREATE TABLE IF NOT EXISTS cross_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK(source_type IN ('problem', 'solution', 'learning', 'component', 'change')),
    source_id INTEGER NOT NULL,
    target_project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK(target_type IN ('problem', 'solution', 'learning', 'component', 'change')),
    target_id INTEGER NOT NULL,
    relationship TEXT NOT NULL CHECK(relationship IN ('similar_to', 'derived_from', 'contradicts', 'depends_on', 'supersedes', 'related_to')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions: Track work sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    focus_component_id INTEGER REFERENCES components(id) ON DELETE SET NULL,
    focus_problem_id INTEGER REFERENCES problems(id) ON DELETE SET NULL,
    summary TEXT,
    outcomes TEXT, -- JSON
    duration_minutes INTEGER
);

-- ============================================================
-- FULL-TEXT SEARCH
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    content_type,
    content_id UNINDEXED,
    project_id UNINDEXED,
    searchable_text,
    tokenize='porter'
);

-- ============================================================
-- SEMANTIC SEARCH (sqlite-vec)
-- Note: This requires sqlite-vec extension to be loaded
-- Falls back gracefully if not available
-- ============================================================

-- Embeddings storage table (standard SQL, always created)
-- The actual vector search uses sqlite-vec virtual table
CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type TEXT NOT NULL CHECK(content_type IN ('problem', 'solution', 'learning', 'change', 'conversation')),
    content_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
    embedding BLOB,  -- Stored as binary for efficiency
    text_hash TEXT,  -- To detect if re-embedding needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_project ON embeddings(project_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(content_type);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_components_project ON components(project_id);
CREATE INDEX IF NOT EXISTS idx_changes_component ON changes(component_id);
CREATE INDEX IF NOT EXISTS idx_changes_created ON changes(created_at);
CREATE INDEX IF NOT EXISTS idx_problems_component ON problems(component_id);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_attempts_problem ON solution_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================

CREATE TRIGGER IF NOT EXISTS update_project_timestamp 
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_component_timestamp 
AFTER UPDATE ON components
BEGIN
    UPDATE components SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS set_problem_solved_at
AFTER UPDATE OF status ON problems
WHEN NEW.status = 'solved' AND OLD.status != 'solved'
BEGIN
    UPDATE problems SET solved_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS set_todo_completed_at
AFTER UPDATE OF status ON todos
WHEN NEW.status = 'done' AND OLD.status != 'done'
BEGIN
    UPDATE todos SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
