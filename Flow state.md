# FlowState: Complete Project Specification

## “Context that flows between sessions”

**Version:** 1.0  
**Author:** John + Claude  
**Date:** January 23, 2026  
**License:** MIT (Open Source)

-----

# EXECUTIVE SUMMARY

FlowState is a development memory system that thinks about software building as a *process* — not just facts to store. It combines a SQLite database, Claude MCP server, and visual GUI to give developers persistent context across sessions.

**The Problem:** Every conversation with AI starts fresh. You re-explain your project, your architecture, what you tried, what failed. Existing memory solutions store generic “knowledge” but don’t understand the structure of building software.

**The Solution:** A project-centric memory system with:

- Hierarchical organization (Project → Component → Changes/Problems/Solutions)
- Decision tree tracking (what failed, what worked, why)
- Conversation logging (what prompts led to what outcomes)
- Visual GUI for management
- **Story generation** (turn your build journey into visual narratives)

**The Gift:** Free and open source. A thank-you to the community that built MCP, the tools, and the ecosystem that makes AI-assisted development possible.

-----

# PART 1: ARCHITECTURE OVERVIEW

## System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FLOWSTATE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │   TAURI GUI     │     │   SQLite DB     │     │   MCP SERVER    │   │
│  │   (Visual)      │     │   (Brain)       │     │   (Claude API)  │   │
│  │                 │     │                 │     │                 │   │
│  │ • Dashboard     │     │ • projects      │     │ • get_context   │   │
│  │ • Tree View     │◀───▶│ • components    │◀───▶│ • log_problem   │   │
│  │ • Kanban Board  │     │ • changes       │     │ • log_solution  │   │
│  │ • Timeline      │     │ • problems      │     │ • search        │   │
│  │ • Story Gen     │     │ • solutions     │     │ • log_learning  │   │
│  │ • Flow Charts   │     │ • conversations │     │                 │   │
│  │ • Quick Capture │     │ • learnings     │     │                 │   │
│  └─────────────────┘     │ • embeddings    │     └─────────────────┘   │
│                          └─────────────────┘              ▲            │
│                                   ▲                       │            │
│                                   │                       │            │
│                                   └───────────────────────┘            │
│                                    Single Source of Truth              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │  Claude Desktop │
                              │  (or Claude.ai) │
                              └─────────────────┘
```

## Data Flow

1. **Claude writes** → MCP Server → SQLite DB
1. **GUI reads** → SQLite DB → Visual Display
1. **You write** → GUI → SQLite DB
1. **Claude reads** → MCP Server → SQLite DB → Context

Both Claude and the GUI see the same data. Changes sync automatically via file watching.

-----

# PART 2: DATABASE SCHEMA

## Core Tables

```sql
-- ============================================================
-- FLOWSTATE DATABASE SCHEMA v1.0
-- ============================================================

-- Projects: Top-level containers
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Components: Building blocks within projects (nestable)
CREATE TABLE components (
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
CREATE TABLE changes (
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
CREATE TABLE problems (
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
CREATE TABLE solution_attempts (
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
CREATE TABLE solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id INTEGER UNIQUE NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    winning_attempt_id INTEGER REFERENCES solution_attempts(id) ON DELETE SET NULL,
    summary TEXT NOT NULL,
    code_snippet TEXT,
    key_insight TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Todos: Task tracking
CREATE TABLE todos (
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
CREATE TABLE conversations (
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
CREATE TABLE learnings (
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
CREATE TABLE cross_references (
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
CREATE TABLE sessions (
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
-- SEMANTIC SEARCH SUPPORT
-- ============================================================

-- Embeddings for semantic search (sqlite-vec)
-- This table stores vector embeddings for searchable content
CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(
    id INTEGER PRIMARY KEY,
    content_type TEXT,      -- 'problem', 'solution', 'learning', 'change', 'conversation'
    content_id INTEGER,     -- ID in the source table
    project_id INTEGER,     -- For filtering
    embedding FLOAT[384]    -- Vector embedding (384 for all-MiniLM-L6-v2)
);

-- Full-text search fallback
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    content_type,
    content_id UNINDEXED,
    project_id UNINDEXED,
    searchable_text,
    tokenize='porter'
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_components_project ON components(project_id);
CREATE INDEX idx_changes_component ON changes(component_id);
CREATE INDEX idx_changes_created ON changes(created_at);
CREATE INDEX idx_problems_component ON problems(component_id);
CREATE INDEX idx_problems_status ON problems(status);
CREATE INDEX idx_attempts_problem ON solution_attempts(problem_id);
CREATE INDEX idx_todos_project ON todos(project_id);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_conversations_project ON conversations(project_id);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_learnings_project ON learnings(project_id);
CREATE INDEX idx_sessions_project ON sessions(project_id);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================

-- Update project timestamp when modified
CREATE TRIGGER update_project_timestamp 
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update component timestamp when modified
CREATE TRIGGER update_component_timestamp 
AFTER UPDATE ON components
BEGIN
    UPDATE components SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Set solved_at when problem status changes to solved
CREATE TRIGGER set_problem_solved_at
AFTER UPDATE OF status ON problems
WHEN NEW.status = 'solved' AND OLD.status != 'solved'
BEGIN
    UPDATE problems SET solved_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Set completed_at when todo status changes to done
CREATE TRIGGER set_todo_completed_at
AFTER UPDATE OF status ON todos
WHEN NEW.status = 'done' AND OLD.status != 'done'
BEGIN
    UPDATE todos SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

-----

# PART 3: MCP SERVER TOOLS

## Tool Definitions

```python
# ============================================================
# FLOWSTATE MCP TOOLS
# ============================================================

# ----------------------------------------------------------
# PROJECT MANAGEMENT
# ----------------------------------------------------------

def list_projects() -> list[Project]:
    """List all projects with their status and stats."""
    
def create_project(name: str, description: str = None) -> Project:
    """Create a new project."""
    
def get_project(project_id: int) -> Project:
    """Get project details including component tree."""
    
def update_project(project_id: int, **kwargs) -> Project:
    """Update project fields (name, description, status)."""

def get_project_context(project_name: str, query: str = None) -> Context:
    """
    THE KILLER TOOL: Get everything needed to work on a project.
    
    Returns:
    - Active problems (open, investigating)
    - Recent changes (last 24-48 hours)
    - High-priority todos
    - Recent learnings
    - If query provided: semantically relevant memories
    
    This is what Claude calls at the start of every session.
    """

# ----------------------------------------------------------
# COMPONENT TRACKING
# ----------------------------------------------------------

def list_components(project_id: int) -> list[Component]:
    """List all components in a project with hierarchy."""
    
def create_component(
    project_id: int, 
    name: str, 
    description: str = None,
    parent_component_id: int = None
) -> Component:
    """Create a component (optionally nested under parent)."""
    
def get_component_history(component_id: int, days: int = 30) -> History:
    """Get all changes, problems, solutions for a component over time."""
    
def update_component(component_id: int, **kwargs) -> Component:
    """Update component fields."""

# ----------------------------------------------------------
# CHANGE TRACKING
# ----------------------------------------------------------

def log_change(
    component_id: int,
    field_name: str,
    old_value: str,
    new_value: str,
    change_type: str = 'code',
    reason: str = None
) -> Change:
    """Log a change to a component."""
    
def get_recent_changes(
    project_id: int = None,
    component_id: int = None,
    hours: int = 24
) -> list[Change]:
    """Get recent changes, optionally filtered."""

# ----------------------------------------------------------
# PROBLEM/SOLUTION WORKFLOW
# ----------------------------------------------------------

def log_problem(
    component_id: int,
    title: str,
    description: str = None,
    severity: str = 'medium'
) -> Problem:
    """Log a new problem."""
    
def get_open_problems(
    project_id: int = None,
    component_id: int = None
) -> list[Problem]:
    """Get all open/investigating problems."""
    
def log_attempt(
    problem_id: int,
    description: str,
    parent_attempt_id: int = None
) -> SolutionAttempt:
    """Log a solution attempt (can branch from parent)."""
    
def mark_attempt_outcome(
    attempt_id: int,
    outcome: str,  # 'success', 'failure', 'partial', 'abandoned'
    notes: str = None,
    confidence: str = 'attempted'
) -> SolutionAttempt:
    """Record the outcome of an attempt."""
    
def mark_problem_solved(
    problem_id: int,
    winning_attempt_id: int,
    summary: str,
    key_insight: str = None,
    code_snippet: str = None
) -> Solution:
    """Mark a problem as solved with the winning solution."""
    
def get_problem_tree(problem_id: int) -> ProblemTree:
    """Get full decision tree of all attempts for a problem."""

# ----------------------------------------------------------
# TODO MANAGEMENT
# ----------------------------------------------------------

def add_todo(
    project_id: int,
    title: str,
    description: str = None,
    priority: str = 'medium',
    due_date: str = None,
    component_id: int = None
) -> Todo:
    """Add a todo item."""
    
def update_todo(todo_id: int, **kwargs) -> Todo:
    """Update todo fields (status, priority, etc)."""
    
def get_todos(
    project_id: int,
    status: str = None,
    priority: str = None
) -> list[Todo]:
    """Get todos with optional filters."""

# ----------------------------------------------------------
# LEARNING CAPTURE
# ----------------------------------------------------------

def log_learning(
    project_id: int,
    insight: str,
    category: str = 'pattern',
    context: str = None,
    component_id: int = None,
    source: str = 'experience'
) -> Learning:
    """Capture a learning/insight."""
    
def get_learnings(
    project_id: int = None,
    category: str = None,
    verified_only: bool = False
) -> list[Learning]:
    """Get learnings with optional filters."""

# ----------------------------------------------------------
# CONVERSATION LOGGING
# ----------------------------------------------------------

def log_conversation(
    project_id: int,
    user_prompt_summary: str,
    assistant_response_summary: str = None,
    key_decisions: list[str] = None,
    session_id: str = None
) -> Conversation:
    """Log a conversation exchange."""
    
def get_conversation_history(
    project_id: int,
    session_id: str = None,
    limit: int = 20
) -> list[Conversation]:
    """Get recent conversations."""

# ----------------------------------------------------------
# SESSION MANAGEMENT
# ----------------------------------------------------------

def start_session(
    project_id: int,
    focus_component_id: int = None,
    focus_problem_id: int = None
) -> Session:
    """Start a work session."""
    
def end_session(
    session_id: int,
    summary: str = None,
    outcomes: list[str] = None
) -> Session:
    """End a session with optional summary."""
    
def get_current_session() -> Session | None:
    """Get the active session if any."""

# ----------------------------------------------------------
# SEMANTIC SEARCH
# ----------------------------------------------------------

def search(
    query: str,
    project_id: int = None,
    content_types: list[str] = None,  # ['problem', 'solution', 'learning', ...]
    limit: int = 10
) -> list[SearchResult]:
    """
    Semantic search across all content.
    Uses embeddings for similarity + FTS for keyword matching.
    """

# ----------------------------------------------------------
# CROSS-REFERENCES
# ----------------------------------------------------------

def link_items(
    source_type: str,
    source_id: int,
    target_type: str,
    target_id: int,
    relationship: str,
    notes: str = None
) -> CrossReference:
    """Create a cross-reference between items."""
    
def find_related(
    item_type: str,
    item_id: int
) -> list[CrossReference]:
    """Find all items related to this one."""

# ----------------------------------------------------------
# STORY GENERATION (for GUI)
# ----------------------------------------------------------

def generate_project_story(project_id: int) -> ProjectStory:
    """
    Generate narrative storyboard data for visualization.
    Returns structured data that GUI renders as visual story.
    """
    
def generate_problem_journey(problem_id: int) -> ProblemJourney:
    """
    Generate the journey map for a problem.
    Shows all attempts, branches, outcomes, learnings.
    """
    
def generate_architecture_diagram(project_id: int) -> ArchitectureDiagram:
    """
    Generate component diagram data.
    Shows hierarchy, relationships, problem hotspots.
    """
```

-----

# PART 4: GUI APPLICATION

## Tech Stack

|Layer            |Technology           |Why                                     |
|-----------------|---------------------|----------------------------------------|
|**Framework**    |Tauri 2.0            |5MB binary, Rust backend, cross-platform|
|**Frontend**     |React 18 + TypeScript|You know it, fast to build              |
|**Styling**      |Tailwind CSS         |Rapid UI development                    |
|**State**        |Zustand              |Simple, fast state management           |
|**Visualization**|D3.js + Recharts     |Flexible for custom diagrams            |
|**Database**     |SQLite (via Tauri)   |Direct file access, no network          |

## Views

### 1. Project Dashboard (Home)

The landing page showing all projects at a glance.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FlowState                                    [+ New Project]  [⚙️]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔷 DialectForge VPN                                   [Active] │   │
│  │  ──────────────────────────────────────────────────────────────│   │
│  │  Components: Protocol Engine • iOS App • Server Infra          │   │
│  │  ⚡ 3 open problems  │  ✅ 15 solved  │  📋 5 todos            │   │
│  │  Last activity: 2 hours ago                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔷 QuickExport                                        [Active] │   │
│  │  ──────────────────────────────────────────────────────────────│   │
│  │  Components: iOS App • App Store                                │   │
│  │  ✅ All clear  │  📋 2 todos                                    │   │
│  │  Last activity: 3 days ago                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔷 AuthShield                                         [Paused] │   │
│  │  ──────────────────────────────────────────────────────────────│   │
│  │  ⏸️ 1 blocked problem                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Click project card to expand/enter
- Color-coded status badges
- Quick stats visible
- Drag to reorder
- Search/filter projects

### 2. Component Tree View

Hierarchical view of project structure.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    DialectForge VPN                    [Timeline] [Board] [Story]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ├── 🔧 Protocol Engine                                    [in_progress]│
│  │   ├── 📝 Changes (14)                                               │
│  │   │   └── Jan 23: protocol_version 2.3 → 2.4                        │
│  │   ├── 🔴 Problems                                                    │
│  │   │   ├── DPI detection on port 443                      [SOLVED ✅]│
│  │   │   │   └── Attempts: ❌ → ❌ → ✅ Cipher rotation                 │
│  │   │   └── Memory leak in handshake                       [SOLVED ✅]│
│  │   └── 💡 Learnings (3)                                              │
│  │       └── "Static headers are always detectable"                    │
│  │                                                                      │
│  ├── 📱 iOS App                                            [in_progress]│
│  │   ├── 🔴 Problems                                                    │
│  │   │   ├── Apple review rejection                         [OPEN 🔴]  │
│  │   │   └── Background connection drops                    [OPEN 🟡]  │
│  │   └── 📋 Todos (3)                                                  │
│  │                                                                      │
│  ├── 🖥️ Server Infrastructure                              [complete ✅]│
│  │   └── Singapore • Virginia • Helsinki                               │
│  │                                                                      │
│  └── 🌐 Website                                            [complete ✅]│
│      └── dialectforge.com                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Expand/collapse nodes
- Click to see details
- Right-click context menu (add child, add problem, etc.)
- Drag to reorganize hierarchy
- Status icons and colors

### 3. Problem Board (Kanban)

Drag-and-drop problem management.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Problems: DialectForge VPN          [Filter: All ▼] [+ New Problem]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OPEN           INVESTIGATING      BLOCKED          SOLVED              │
│  ────────────   ────────────────   ────────────     ────────────        │
│  ┌──────────┐   ┌──────────────┐   ┌──────────┐     ┌──────────┐       │
│  │ 🔴 Apple │   │ 🟡 Background│   │ ⬛ Cert  │     │ ✅ DPI   │       │
│  │ review   │   │ connection   │   │ expiry   │     │ detection│       │
│  │ rejection│   │ drops        │   │          │     │          │       │
│  │──────────│   │──────────────│   │──────────│     │──────────│       │
│  │ iOS App  │   │ iOS App      │   │ Server   │     │ Protocol │       │
│  │ 0 attemps│   │ 1 attempt    │   │ waiting  │     │ 3 attemps│       │
│  │ High     │   │ Medium       │   │ on Apple │     │ SOLVED   │       │
│  └──────────┘   └──────────────┘   └──────────┘     │──────────│       │
│                                                      │ Jan 23   │       │
│                                                      └──────────┘       │
│                                                                         │
│                                                      ┌──────────┐       │
│                                                      │ ✅ Memory│       │
│                                                      │ leak     │       │
│                                                      │──────────│       │
│                                                      │ Protocol │       │
│                                                      └──────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Drag cards between columns
- Click card to open detail modal
- Filter by component, severity
- Shows attempt count
- Color-coded severity

### 4. Timeline View

Chronological activity stream.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Timeline: DialectForge VPN           [Filter ▼] [Date Range] [Export]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TODAY ─────────────────────────────────────────────────────────────── │
│                                                                         │
│    10:42 AM   📝 CHANGE                                                │
│               Protocol Engine: protocol_version                         │
│               2.3 → 2.4 (Added cipher rotation)                        │
│                                                                         │
│    10:38 AM   ✅ SOLVED                                                 │
│               DPI detection on port 443                                 │
│               Solution: AI-negotiated cipher rotation every 2 min      │
│               Key insight: "Can't fingerprint what keeps changing"     │
│                                                                         │
│    09:15 AM   💡 LEARNING                                               │
│               Protocol Engine                                           │
│               "Static headers are detectable regardless of content"    │
│                                                                         │
│    08:30 AM   🔴 PROBLEM                                                │
│               iOS App: Apple review rejection                           │
│               Severity: High                                            │
│                                                                         │
│  YESTERDAY ────────────────────────────────────────────────────────── │
│                                                                         │
│    11:49 PM   💬 CONVERSATION                                          │
│               Discussed activist outreach strategy                      │
│               Key decisions: Contact GreatFire, ASL19, Access Now      │
│                                                                         │
│    06:30 PM   📝 CHANGE                                                │
│               Server Infrastructure: locations                          │
│               "Singapore, Virginia" → "Singapore, Virginia, Helsinki"  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Infinite scroll
- Filter by event type
- Click to expand details
- Group by day/week/month
- Export to PDF/markdown

### 5. Decision Tree Visualizer

Visual journey through problem-solving.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Problem Journey: DPI detection on port 443                   [Export]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    ┌─────────────────────────┐                         │
│                    │ 🔴 PROBLEM IDENTIFIED   │                         │
│                    │ DPI detection on 443    │                         │
│                    │ Jan 21, 10:38 AM        │                         │
│                    └───────────┬─────────────┘                         │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────────┐                         │
│                    │ 💡 ATTEMPT 1            │                         │
│                    │ Random padding          │                         │
│                    │ "Add random bytes to    │                         │
│                    │  packet headers"        │                         │
│                    └───────────┬─────────────┘                         │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────────┐                         │
│                    │ ❌ FAILED               │                         │
│                    │ "Padding pattern itself │                         │
│                    │  was detectable"        │                         │
│                    │ ─────────────────────── │                         │
│                    │ Learning: Randomness    │                         │
│                    │ isn't enough if struct- │                         │
│                    │ ure is predictable      │                         │
│                    └───────────┬─────────────┘                         │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────────┐                         │
│                    │ 💡 ATTEMPT 2            │                         │
│                    │ Timing jitter           │                         │
│                    └───────────┬─────────────┘                         │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────────┐                         │
│                    │ ❌ FAILED               │                         │
│                    │ "200ms latency, still   │                         │
│                    │  detected"              │                         │
│                    │ ─────────────────────── │                         │
│                    │ Learning: They finger-  │                         │
│                    │ print protocol, not     │                         │
│                    │ timing                  │                         │
│                    └───────────┬─────────────┘                         │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────────┐                         │
│                    │ 💡 ATTEMPT 3            │                         │
│                    │ AI cipher rotation      │                         │
│                    │ "Protocol changes every │                         │
│                    │  2 minutes"             │                         │
│                    └───────────┬─────────────┘                         │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────────┐                         │
│                    │ ✅ SUCCESS              │                         │
│                    │ "DPI sees random noise" │                         │
│                    │ ─────────────────────── │                         │
│                    │ Key Insight: "Can't     │                         │
│                    │ fingerprint what keeps  │                         │
│                    │ changing"               │                         │
│                    └─────────────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Vertical flow diagram
- Clickable nodes for details
- Shows branching (if multiple attempts from same parent)
- Learning extraction at each failure
- Export as SVG/PNG

### 6. Project Story Mode

Cinematic narrative of the entire project journey.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📖 The DialectForge Story                    [Export PDF] [Share]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│  CHAPTER 1: GENESIS                                     December 2025   │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │    "What if VPN protocols changed constantly?"                   │   │
│  │                                                                   │   │
│  │    The idea came from an unlikely place: automotive security.    │   │
│  │    A protocol designed for CAN bus systems, adapted for the      │   │
│  │    internet. AI-negotiated cipher rotation that makes traffic    │   │
│  │    impossible to fingerprint.                                    │   │
│  │                                                                   │   │
│  │    Components conceived:                                         │   │
│  │    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │   │
│  │    │   Protocol   │ │   Client     │ │   Server     │           │   │
│  │    │   Engine     │ │   Apps       │ │   Infra      │           │   │
│  │    └──────────────┘ └──────────────┘ └──────────────┘           │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  CHAPTER 2: THE STORM                                   January 2026    │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │    "Told everyone 3 weeks. Hadn't started. Then a snowstorm     │   │
│  │     hit Michigan's Upper Peninsula."                             │   │
│  │                                                                   │   │
│  │    4 days locked in. 18-hour coding sessions.                   │   │
│  │                                                                   │   │
│  │    Progress:                                                     │   │
│  │    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% │   │
│  │    Day 1: Protocol engine core                                   │   │
│  │    Day 2: Server deployment (Singapore, Virginia)                │   │
│  │    Day 3: iOS app complete                                       │   │
│  │    Day 4: Helsinki server, Android, Windows, macOS              │   │
│  │                                                                   │   │
│  │                    🌨️ ❄️ ⛈️                                      │   │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐                    │   │
│  │    │ 🇸🇬      │───▶│ 🇺🇸      │───▶│ 🇫🇮      │                    │   │
│  │    │Singapore│    │Virginia │    │Helsinki │                    │   │
│  │    └─────────┘    └─────────┘    └─────────┘                    │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  CHAPTER 3: THE WALL                                    January 21      │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │    🔴 PROBLEM: Deep Packet Inspection was detecting the VPN     │   │
│  │                                                                   │   │
│  │    The journey to solve it:                                      │   │
│  │                                                                   │   │
│  │    ❌ Attempt 1: Random padding                                  │   │
│  │       └─ "Still fingerprinted. Headers too consistent."         │   │
│  │                                                                   │   │
│  │    ❌ Attempt 2: Timing jitter                                   │   │
│  │       └─ "Added latency. Still detected."                       │   │
│  │                                                                   │   │
│  │    ✅ Attempt 3: AI cipher rotation                              │   │
│  │       └─ "Protocol changes every 2 minutes. DPI sees noise."    │   │
│  │                                                                   │   │
│  │    ┌─────────────────────────────────────────────────────────┐  │   │
│  │    │  KEY INSIGHT                                             │  │   │
│  │    │  "You can't fingerprint what doesn't have a pattern"    │  │   │
│  │    └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  CHAPTER 4: LAUNCH                                      January 27      │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │    "More secure than a CIA server."                              │   │
│  │                                                                   │   │
│  │    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │   │
│  │    │   iOS   │ │  macOS  │ │ Windows │ │ Android │              │   │
│  │    │    ✅   │ │    ✅   │ │    ✅   │ │    ✅   │              │   │
│  │    └─────────┘ └─────────┘ └─────────┘ └─────────┘              │   │
│  │                                                                   │   │
│  │    Price: $10.99/month | $105/year                               │   │
│  │    Mission: Free accounts for activists in China & Iran          │   │
│  │                                                                   │   │
│  │    dialectforge.com                                              │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│  STATS                                                                  │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│    📅 Duration: 7 days (concept to launch)                             │
│    🔧 Components: 4                                                     │
│    🔴 Problems encountered: 5                                           │
│    ✅ Problems solved: 5                                                │
│    💡 Key learnings: 8                                                  │
│    📝 Changes logged: 47                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Auto-generated from project data
- Chapter breaks at major milestones
- Embeds decision trees inline
- Quote extraction from conversations
- Stats summary
- Export to PDF, HTML, or video storyboard

### 7. Architecture Diagram Generator

Auto-generates system architecture from components.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Architecture: DialectForge VPN                    [Edit] [Export SVG]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                              CLIENTS                                    │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│    │     iOS     │  │    macOS    │  │   Windows   │  │   Android   │ │
│    │     App     │  │  Extension  │  │    Client   │  │     APK     │ │
│    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│           │                │                │                │         │
│           └────────────────┼────────────────┼────────────────┘         │
│                            │                │                          │
│                            ▼                ▼                          │
│    ┌───────────────────────────────────────────────────────────────┐  │
│    │                    PROTOCOL ENGINE                             │  │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│    │  │   Cipher    │  │     AI      │  │   Packet    │            │  │
│    │  │  Rotation   │──│ Negotiation │──│ Obfuscation │            │  │
│    │  │  (2 min)    │  │   Layer     │  │             │            │  │
│    │  └─────────────┘  └─────────────┘  └─────────────┘            │  │
│    │                                                                │  │
│    │  🔴 Former problem area: DPI detection (SOLVED)               │  │
│    └───────────────────────────────────────────────────────────────┘  │
│                            │                                           │
│           ┌────────────────┼────────────────┐                         │
│           │                │                │                         │
│           ▼                ▼                ▼                         │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│    │ 🇸🇬 Singapore│  │ 🇺🇸 Virginia │  │ 🇫🇮 Helsinki │                 │
│    │   Primary   │  │  US Users   │  │  EU Users   │                 │
│    │   Server    │  │   Server    │  │   Server    │                 │
│    └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                        │
│    ─────────────────────────────────────────────────────────────────  │
│    Legend:                                                             │
│    ── Data flow    ┌─┐ Component    🔴 Problem (solved)               │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Auto-layout from component hierarchy
- Shows data flow connections
- Highlights problem areas
- Customizable (drag nodes, add labels)
- Export to SVG, PNG, Mermaid

### 8. Quick Capture (Menu Bar Widget)

Always-accessible capture tool.

```
┌──────────────────────────────────────┐
│ 🧠 FlowState                    ─ □ x│
├──────────────────────────────────────┤
│                                      │
│ Project: [DialectForge VPN      ▼]  │
│                                      │
│ Type:                                │
│   ○ Problem    ○ Learning           │
│   ○ Change     ○ Todo               │
│   ○ Note                            │
│                                      │
│ Component: [Protocol Engine     ▼]  │
│                                      │
│ ┌──────────────────────────────────┐│
│ │                                  ││
│ │                                  ││
│ │  Type or paste here...          ││
│ │                                  ││
│ │                                  ││
│ └──────────────────────────────────┘│
│                                      │
│ Priority: [Medium ▼]  (if todo)     │
│                                      │
│      [Cancel]        [Save ⌘+Enter] │
└──────────────────────────────────────┘
```

**Features:**

- Global hotkey: ⌘+Shift+M (Mac) / Ctrl+Shift+M (Win)
- Always in menu bar / system tray
- Auto-detects project from current directory
- Remembers last project selection
- Keyboard-navigable

### 9. Search Panel

Semantic search across everything.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔍 Search FlowState                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ protocol rotation cipher detection                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Filters: [All Projects ▼] [All Types ▼] [Any Time ▼]                 │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────   │
│                                                                         │
│  Results (sorted by relevance):                                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✅ SOLUTION                                           92% match │   │
│  │ DPI detection on port 443                                       │   │
│  │ "AI-negotiated cipher rotation every 2 minutes"                 │   │
│  │ Project: DialectForge VPN → Protocol Engine                     │   │
│  │ Jan 23, 2026                                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🔴 PROBLEM                                            89% match │   │
│  │ DPI detection on port 443                                       │   │
│  │ "China's GFW detecting our VPN traffic despite obfuscation"    │   │
│  │ Project: DialectForge VPN → Protocol Engine                     │   │
│  │ Jan 21, 2026                                          [SOLVED]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 💡 LEARNING                                           76% match │   │
│  │ Static headers are always detectable                            │   │
│  │ "Regardless of payload encryption, consistent header struc..."  │   │
│  │ Project: DialectForge VPN → Protocol Engine                     │   │
│  │ Jan 21, 2026                                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📝 CHANGE                                             68% match │   │
│  │ protocol_version: 2.3 → 2.4                                     │   │
│  │ "Added cipher rotation support"                                 │   │
│  │ Project: DialectForge VPN → Protocol Engine                     │   │
│  │ Jan 23, 2026                                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Semantic search (not just keyword matching)
- Filter by project, type, date
- Relevance scoring shown
- Click result to navigate
- Global hotkey: ⌘+K / Ctrl+K

-----

# PART 5: FILE STRUCTURE

```
flowstate/
│
├── README.md
├── LICENSE (MIT)
├── .gitignore
│
├── database/
│   └── schema.sql                    # Complete database schema
│
├── mcp-server/                       # Claude MCP Server (Python)
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── flowstate/
│   │   ├── __init__.py
│   │   ├── server.py                 # MCP server entry point
│   │   ├── database.py               # SQLite operations
│   │   ├── tools.py                  # MCP tool definitions
│   │   ├── embeddings.py             # sqlite-vec integration
│   │   ├── search.py                 # Semantic search
│   │   ├── story.py                  # Story generation
│   │   └── models.py                 # Pydantic models
│   └── tests/
│       └── ...
│
├── gui/                              # Tauri Desktop App
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   │
│   ├── src/                          # React Frontend
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── TreeView.tsx
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── ProblemCard.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── TimelineEvent.tsx
│   │   │   ├── DecisionTree.tsx
│   │   │   ├── StoryMode.tsx
│   │   │   ├── ArchitectureDiagram.tsx
│   │   │   ├── QuickCapture.tsx
│   │   │   ├── SearchPanel.tsx
│   │   │   └── SessionPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useDatabase.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useProblems.ts
│   │   │   ├── useSearch.ts
│   │   │   └── useSession.ts
│   │   ├── stores/
│   │   │   └── appStore.ts           # Zustand store
│   │   ├── utils/
│   │   │   ├── storyGenerator.ts
│   │   │   └── diagramGenerator.ts
│   │   └── styles/
│   │       └── globals.css
│   │
│   └── src-tauri/                    # Rust Backend
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       ├── src/
│       │   ├── main.rs
│       │   ├── database.rs           # SQLite operations
│       │   ├── commands.rs           # Tauri commands
│       │   ├── watcher.rs            # File change detection
│       │   └── embeddings.rs         # Embedding generation
│       └── icons/
│           └── ...
│
├── shared/
│   └── types.ts                      # Shared TypeScript types
│
└── docs/
    ├── INSTALLATION.md
    ├── MCP_SETUP.md
    ├── GUI_GUIDE.md
    └── CONTRIBUTING.md
```

-----

# PART 6: QUICK START GUIDE

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/flowstate.git
cd flowstate
```

### 2. Set Up MCP Server

```bash
cd mcp-server
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### 3. Initialize Database

```bash
python -c "from flowstate.database import init_db; init_db()"
```

### 4. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flowstate": {
      "command": "python",
      "args": ["-m", "flowstate.server"],
      "cwd": "/path/to/flowstate/mcp-server"
    }
  }
}
```

### 5. Build GUI (Optional)

```bash
cd gui
npm install
npm run tauri build
```

### 6. Start Using

In Claude Desktop:

```
"Create a new project called DialectForge VPN"
"Add a component called Protocol Engine"
"Log a problem: DPI detection on port 443"
"What's my current project context?"
```

-----

# PART 7: ROADMAP

## Phase 1: Core (Week 1)

- [x] Database schema
- [ ] Basic MCP server with CRUD operations
- [ ] Project/component/problem/solution tools
- [ ] Simple search (FTS)

## Phase 2: Intelligence (Week 2)

- [ ] Semantic search with sqlite-vec
- [ ] Smart context tool (get_project_context)
- [ ] Conversation logging
- [ ] Session management

## Phase 3: GUI Foundation (Week 3)

- [ ] Tauri app scaffold
- [ ] Dashboard view
- [ ] Tree view
- [ ] Kanban board

## Phase 4: Visualization (Week 4)

- [ ] Timeline view
- [ ] Decision tree visualizer
- [ ] Quick capture widget

## Phase 5: Story Mode (Week 5)

- [ ] Project story generator
- [ ] Architecture diagram generator
- [ ] Problem journey maps
- [ ] Export functionality (PDF, SVG, PNG)

## Phase 6: Polish (Week 6)

- [ ] Cross-project references
- [ ] Global search
- [ ] Settings/preferences
- [ ] Documentation

-----

# PART 8: WHY THIS MATTERS

## For Solo Builders

- Never re-explain your project to Claude again
- See your build journey as a visual story
- Learn from your own decision patterns
- Pick up exactly where you left off

## For the Community

- Open source gift to the ecosystem
- Pattern for how AI memory should work
- Proof that context > knowledge

## For BrainTrust

- Demonstrates the architecture at small scale
- Proof of concept for investor pitches
- Dogfooding while building the bigger thing

-----

# PART 9: LICENSE

MIT License

Copyright (c) 2026 John [Last Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

-----

# END OF SPECIFICATION

**Ready to build. Let’s make context flow.**