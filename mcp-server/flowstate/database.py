"""SQLite database operations for FlowState."""

import json
import os
import platform
import sqlite3
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

from .models import (
    Project, Component, Change, Problem, SolutionAttempt, 
    Solution, Todo, Conversation, Learning, Session, ProjectContext
)


# Default database location - use same path as Tauri GUI
# macOS: ~/Library/Application Support/flowstate/flowstate.db
# Linux: ~/.local/share/flowstate/flowstate.db
# Windows: %LOCALAPPDATA%/flowstate/flowstate.db
import platform
if platform.system() == "Darwin":
    DEFAULT_DB_PATH = Path.home() / "Library" / "Application Support" / "flowstate" / "flowstate.db"
elif platform.system() == "Windows":
    DEFAULT_DB_PATH = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "flowstate" / "flowstate.db"
else:
    DEFAULT_DB_PATH = Path.home() / ".local" / "share" / "flowstate" / "flowstate.db"
SCHEMA_PATH = Path(__file__).parent.parent.parent / "database" / "schema.sql"


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Get a database connection with row factory."""
    path = db_path or DEFAULT_DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize the database with schema."""
    conn = get_connection(db_path)
    try:
        with open(SCHEMA_PATH) as f:
            conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()


class Database:
    """Database operations for FlowState."""
    
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        # Ensure DB exists
        if not self.db_path.exists():
            init_db(self.db_path)
    
    def _conn(self) -> sqlite3.Connection:
        return get_connection(self.db_path)
    
    # ========================================================
    # PROJECTS
    # ========================================================
    
    def create_project(self, name: str, description: Optional[str] = None) -> Project:
        """Create a new project."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                "INSERT INTO projects (name, description) VALUES (?, ?)",
                (name, description)
            )
            conn.commit()
            return self.get_project(cursor.lastrowid)
        finally:
            conn.close()
    
    def get_project(self, project_id: int) -> Optional[Project]:
        """Get a project by ID."""
        conn = self._conn()
        try:
            row = conn.execute(
                "SELECT * FROM projects WHERE id = ?", (project_id,)
            ).fetchone()
            return Project(**dict(row)) if row else None
        finally:
            conn.close()
    
    def get_project_by_name(self, name: str) -> Optional[Project]:
        """Get a project by name."""
        conn = self._conn()
        try:
            row = conn.execute(
                "SELECT * FROM projects WHERE name = ?", (name,)
            ).fetchone()
            return Project(**dict(row)) if row else None
        finally:
            conn.close()
    
    def list_projects(self, status: Optional[str] = None) -> list[Project]:
        """List all projects, optionally filtered by status."""
        conn = self._conn()
        try:
            if status:
                rows = conn.execute(
                    "SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC",
                    (status,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM projects ORDER BY updated_at DESC"
                ).fetchall()
            return [Project(**dict(row)) for row in rows]
        finally:
            conn.close()
    
    def update_project(self, project_id: int, **kwargs) -> Optional[Project]:
        """Update project fields."""
        allowed = {'name', 'description', 'status'}
        updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not updates:
            return self.get_project(project_id)
        
        conn = self._conn()
        try:
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            conn.execute(
                f"UPDATE projects SET {set_clause} WHERE id = ?",
                (*updates.values(), project_id)
            )
            conn.commit()
            return self.get_project(project_id)
        finally:
            conn.close()
    
    # ========================================================
    # COMPONENTS
    # ========================================================
    
    def create_component(
        self, 
        project_id: int, 
        name: str, 
        description: Optional[str] = None,
        parent_component_id: Optional[int] = None
    ) -> Component:
        """Create a new component."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO components 
                   (project_id, name, description, parent_component_id) 
                   VALUES (?, ?, ?, ?)""",
                (project_id, name, description, parent_component_id)
            )
            conn.commit()
            return self.get_component(cursor.lastrowid)
        finally:
            conn.close()
    
    def get_component(self, component_id: int) -> Optional[Component]:
        """Get a component by ID."""
        conn = self._conn()
        try:
            row = conn.execute(
                "SELECT * FROM components WHERE id = ?", (component_id,)
            ).fetchone()
            return Component(**dict(row)) if row else None
        finally:
            conn.close()
    
    def get_component_by_name(self, project_id: int, name: str) -> Optional[Component]:
        """Get a component by project and name."""
        conn = self._conn()
        try:
            row = conn.execute(
                "SELECT * FROM components WHERE project_id = ? AND name = ?",
                (project_id, name)
            ).fetchone()
            return Component(**dict(row)) if row else None
        finally:
            conn.close()
    
    def list_components(self, project_id: int) -> list[Component]:
        """List all components in a project."""
        conn = self._conn()
        try:
            rows = conn.execute(
                "SELECT * FROM components WHERE project_id = ? ORDER BY name",
                (project_id,)
            ).fetchall()
            return [Component(**dict(row)) for row in rows]
        finally:
            conn.close()
    
    def update_component(self, component_id: int, **kwargs) -> Optional[Component]:
        """Update component fields."""
        allowed = {'name', 'description', 'status', 'parent_component_id'}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return self.get_component(component_id)
        
        conn = self._conn()
        try:
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            conn.execute(
                f"UPDATE components SET {set_clause} WHERE id = ?",
                (*updates.values(), component_id)
            )
            conn.commit()
            return self.get_component(component_id)
        finally:
            conn.close()
    
    # ========================================================
    # CHANGES
    # ========================================================
    
    def log_change(
        self,
        component_id: int,
        field_name: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        change_type: Optional[str] = None,
        reason: Optional[str] = None
    ) -> Change:
        """Log a change to a component."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO changes 
                   (component_id, field_name, old_value, new_value, change_type, reason)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (component_id, field_name, old_value, new_value, change_type, reason)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM changes WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return Change(**dict(row))
        finally:
            conn.close()
    
    def get_recent_changes(
        self, 
        project_id: Optional[int] = None,
        component_id: Optional[int] = None,
        hours: int = 24
    ) -> list[Change]:
        """Get recent changes."""
        conn = self._conn()
        try:
            cutoff = datetime.now() - timedelta(hours=hours)
            
            if component_id:
                rows = conn.execute(
                    """SELECT * FROM changes 
                       WHERE component_id = ? AND created_at > ?
                       ORDER BY created_at DESC""",
                    (component_id, cutoff.isoformat())
                ).fetchall()
            elif project_id:
                rows = conn.execute(
                    """SELECT c.* FROM changes c
                       JOIN components comp ON c.component_id = comp.id
                       WHERE comp.project_id = ? AND c.created_at > ?
                       ORDER BY c.created_at DESC""",
                    (project_id, cutoff.isoformat())
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT * FROM changes 
                       WHERE created_at > ?
                       ORDER BY created_at DESC""",
                    (cutoff.isoformat(),)
                ).fetchall()
            
            return [Change(**dict(row)) for row in rows]
        finally:
            conn.close()
    
    # ========================================================
    # PROBLEMS
    # ========================================================
    
    def log_problem(
        self,
        component_id: int,
        title: str,
        description: Optional[str] = None,
        severity: str = "medium"
    ) -> Problem:
        """Log a new problem."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO problems (component_id, title, description, severity)
                   VALUES (?, ?, ?, ?)""",
                (component_id, title, description, severity)
            )
            conn.commit()
            return self.get_problem(cursor.lastrowid)
        finally:
            conn.close()
    
    def get_problem(self, problem_id: int) -> Optional[Problem]:
        """Get a problem by ID."""
        conn = self._conn()
        try:
            row = conn.execute(
                "SELECT * FROM problems WHERE id = ?", (problem_id,)
            ).fetchone()
            return Problem(**dict(row)) if row else None
        finally:
            conn.close()
    
    def get_open_problems(
        self, 
        project_id: Optional[int] = None,
        component_id: Optional[int] = None
    ) -> list[Problem]:
        """Get all open/investigating problems."""
        conn = self._conn()
        try:
            if component_id:
                rows = conn.execute(
                    """SELECT * FROM problems 
                       WHERE component_id = ? AND status IN ('open', 'investigating')
                       ORDER BY severity DESC, created_at DESC""",
                    (component_id,)
                ).fetchall()
            elif project_id:
                rows = conn.execute(
                    """SELECT p.* FROM problems p
                       JOIN components c ON p.component_id = c.id
                       WHERE c.project_id = ? AND p.status IN ('open', 'investigating')
                       ORDER BY p.severity DESC, p.created_at DESC""",
                    (project_id,)
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT * FROM problems 
                       WHERE status IN ('open', 'investigating')
                       ORDER BY severity DESC, created_at DESC"""
                ).fetchall()
            
            return [Problem(**dict(row)) for row in rows]
        finally:
            conn.close()
    
    def update_problem(self, problem_id: int, **kwargs) -> Optional[Problem]:
        """Update problem fields."""
        allowed = {'title', 'description', 'status', 'severity', 'root_cause'}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return self.get_problem(problem_id)
        
        conn = self._conn()
        try:
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            conn.execute(
                f"UPDATE problems SET {set_clause} WHERE id = ?",
                (*updates.values(), problem_id)
            )
            conn.commit()
            return self.get_problem(problem_id)
        finally:
            conn.close()
    
    # ========================================================
    # SOLUTION ATTEMPTS
    # ========================================================
    
    def log_attempt(
        self,
        problem_id: int,
        description: str,
        parent_attempt_id: Optional[int] = None
    ) -> SolutionAttempt:
        """Log a solution attempt."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO solution_attempts 
                   (problem_id, description, parent_attempt_id)
                   VALUES (?, ?, ?)""",
                (problem_id, description, parent_attempt_id)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM solution_attempts WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return SolutionAttempt(**dict(row))
        finally:
            conn.close()
    
    def mark_attempt_outcome(
        self,
        attempt_id: int,
        outcome: str,
        notes: Optional[str] = None,
        confidence: str = "attempted"
    ) -> Optional[SolutionAttempt]:
        """Mark the outcome of an attempt."""
        conn = self._conn()
        try:
            conn.execute(
                """UPDATE solution_attempts 
                   SET outcome = ?, notes = ?, confidence = ?
                   WHERE id = ?""",
                (outcome, notes, confidence, attempt_id)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM solution_attempts WHERE id = ?", (attempt_id,)
            ).fetchone()
            return SolutionAttempt(**dict(row)) if row else None
        finally:
            conn.close()
    
    def get_attempts_for_problem(self, problem_id: int) -> list[SolutionAttempt]:
        """Get all attempts for a problem."""
        conn = self._conn()
        try:
            rows = conn.execute(
                """SELECT * FROM solution_attempts 
                   WHERE problem_id = ?
                   ORDER BY created_at""",
                (problem_id,)
            ).fetchall()
            return [SolutionAttempt(**dict(row)) for row in rows]
        finally:
            conn.close()
    
    # ========================================================
    # SOLUTIONS
    # ========================================================
    
    def mark_problem_solved(
        self,
        problem_id: int,
        winning_attempt_id: Optional[int],
        summary: str,
        key_insight: Optional[str] = None,
        code_snippet: Optional[str] = None
    ) -> Solution:
        """Mark a problem as solved."""
        conn = self._conn()
        try:
            # Update problem status
            conn.execute(
                "UPDATE problems SET status = 'solved' WHERE id = ?",
                (problem_id,)
            )
            
            # Create solution record
            cursor = conn.execute(
                """INSERT INTO solutions 
                   (problem_id, winning_attempt_id, summary, key_insight, code_snippet)
                   VALUES (?, ?, ?, ?, ?)""",
                (problem_id, winning_attempt_id, summary, key_insight, code_snippet)
            )
            conn.commit()
            
            row = conn.execute(
                "SELECT * FROM solutions WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return Solution(**dict(row))
        finally:
            conn.close()
    
    def get_solution(self, problem_id: int) -> Optional[Solution]:
        """Get the solution for a problem."""
        conn = self._conn()
        try:
            row = conn.execute(
                "SELECT * FROM solutions WHERE problem_id = ?", (problem_id,)
            ).fetchone()
            return Solution(**dict(row)) if row else None
        finally:
            conn.close()
    
    # ========================================================
    # TODOS
    # ========================================================
    
    def add_todo(
        self,
        project_id: int,
        title: str,
        description: Optional[str] = None,
        priority: str = "medium",
        component_id: Optional[int] = None,
        due_date: Optional[str] = None
    ) -> Todo:
        """Add a todo item."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO todos 
                   (project_id, title, description, priority, component_id, due_date)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (project_id, title, description, priority, component_id, due_date)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM todos WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return Todo(**dict(row))
        finally:
            conn.close()
    
    def get_todos(
        self,
        project_id: int,
        status: Optional[str] = None,
        priority: Optional[str] = None
    ) -> list[Todo]:
        """Get todos with optional filters."""
        conn = self._conn()
        try:
            query = "SELECT * FROM todos WHERE project_id = ?"
            params = [project_id]
            
            if status:
                query += " AND status = ?"
                params.append(status)
            if priority:
                query += " AND priority = ?"
                params.append(priority)
            
            query += " ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC"
            
            rows = conn.execute(query, params).fetchall()
            return [Todo(**dict(row)) for row in rows]
        finally:
            conn.close()
    
    def update_todo(self, todo_id: int, **kwargs) -> Optional[Todo]:
        """Update todo fields."""
        allowed = {'title', 'description', 'priority', 'status', 'due_date', 'blocked_by_problem_id'}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            conn = self._conn()
            try:
                row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
                return Todo(**dict(row)) if row else None
            finally:
                conn.close()
        
        conn = self._conn()
        try:
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            conn.execute(
                f"UPDATE todos SET {set_clause} WHERE id = ?",
                (*updates.values(), todo_id)
            )
            conn.commit()
            row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
            return Todo(**dict(row)) if row else None
        finally:
            conn.close()
    
    # ========================================================
    # LEARNINGS
    # ========================================================
    
    def log_learning(
        self,
        project_id: int,
        insight: str,
        category: Optional[str] = None,
        context: Optional[str] = None,
        component_id: Optional[int] = None,
        source: str = "experience"
    ) -> Learning:
        """Log a learning/insight."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO learnings 
                   (project_id, insight, category, context, component_id, source)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (project_id, insight, category, context, component_id, source)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM learnings WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return Learning(**dict(row))
        finally:
            conn.close()
    
    def get_learnings(
        self,
        project_id: Optional[int] = None,
        category: Optional[str] = None,
        verified_only: bool = False
    ) -> list[Learning]:
        """Get learnings with optional filters."""
        conn = self._conn()
        try:
            query = "SELECT * FROM learnings WHERE 1=1"
            params = []
            
            if project_id:
                query += " AND project_id = ?"
                params.append(project_id)
            if category:
                query += " AND category = ?"
                params.append(category)
            if verified_only:
                query += " AND verified = 1"
            
            query += " ORDER BY created_at DESC"
            
            rows = conn.execute(query, params).fetchall()
            return [Learning(**dict(row)) for row in rows]
        finally:
            conn.close()
    
    # ========================================================
    # CONVERSATIONS
    # ========================================================
    
    def log_conversation(
        self,
        project_id: int,
        user_prompt_summary: str,
        assistant_response_summary: Optional[str] = None,
        key_decisions: Optional[list[str]] = None,
        session_id: Optional[str] = None,
        problems_referenced: Optional[list[int]] = None,
        solutions_created: Optional[list[int]] = None
    ) -> Conversation:
        """Log a conversation exchange."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO conversations 
                   (project_id, user_prompt_summary, assistant_response_summary, 
                    key_decisions, session_id, problems_referenced, solutions_created)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    project_id, 
                    user_prompt_summary, 
                    assistant_response_summary,
                    json.dumps(key_decisions) if key_decisions else None,
                    session_id,
                    json.dumps(problems_referenced) if problems_referenced else None,
                    json.dumps(solutions_created) if solutions_created else None
                )
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM conversations WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            data = dict(row)
            # Parse JSON fields
            if data.get('key_decisions'):
                data['key_decisions'] = json.loads(data['key_decisions'])
            if data.get('problems_referenced'):
                data['problems_referenced'] = json.loads(data['problems_referenced'])
            if data.get('solutions_created'):
                data['solutions_created'] = json.loads(data['solutions_created'])
            return Conversation(**data)
        finally:
            conn.close()
    
    # ========================================================
    # SESSIONS
    # ========================================================
    
    def start_session(
        self,
        project_id: int,
        focus_component_id: Optional[int] = None,
        focus_problem_id: Optional[int] = None
    ) -> Session:
        """Start a new work session."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO sessions 
                   (project_id, focus_component_id, focus_problem_id)
                   VALUES (?, ?, ?)""",
                (project_id, focus_component_id, focus_problem_id)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM sessions WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return Session(**dict(row))
        finally:
            conn.close()
    
    def end_session(
        self,
        session_id: int,
        summary: Optional[str] = None,
        outcomes: Optional[list[str]] = None
    ) -> Optional[Session]:
        """End a session."""
        conn = self._conn()
        try:
            # Calculate duration
            row = conn.execute(
                "SELECT started_at FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
            if not row:
                return None
            
            started = datetime.fromisoformat(row['started_at'])
            duration = int((datetime.now() - started).total_seconds() / 60)
            
            conn.execute(
                """UPDATE sessions 
                   SET ended_at = CURRENT_TIMESTAMP, summary = ?, outcomes = ?, duration_minutes = ?
                   WHERE id = ?""",
                (summary, json.dumps(outcomes) if outcomes else None, duration, session_id)
            )
            conn.commit()
            
            row = conn.execute(
                "SELECT * FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
            data = dict(row)
            if data.get('outcomes'):
                data['outcomes'] = json.loads(data['outcomes'])
            return Session(**data)
        finally:
            conn.close()
    
    def get_current_session(self, project_id: Optional[int] = None) -> Optional[Session]:
        """Get the current active session."""
        conn = self._conn()
        try:
            if project_id:
                row = conn.execute(
                    """SELECT * FROM sessions 
                       WHERE project_id = ? AND ended_at IS NULL
                       ORDER BY started_at DESC LIMIT 1""",
                    (project_id,)
                ).fetchone()
            else:
                row = conn.execute(
                    """SELECT * FROM sessions 
                       WHERE ended_at IS NULL
                       ORDER BY started_at DESC LIMIT 1"""
                ).fetchone()
            
            if row:
                data = dict(row)
                if data.get('outcomes'):
                    data['outcomes'] = json.loads(data['outcomes'])
                return Session(**data)
            return None
        finally:
            conn.close()
    
    # ========================================================
    # THE KILLER FEATURE: GET PROJECT CONTEXT
    # ========================================================
    
    def get_project_context(
        self,
        project_name: str,
        hours: int = 48
    ) -> Optional[ProjectContext]:
        """
        Get everything needed to work on a project.
        This is what Claude calls at the start of every session.
        """
        project = self.get_project_by_name(project_name)
        if not project:
            return None
        
        return ProjectContext(
            project=project,
            components=self.list_components(project.id),
            open_problems=self.get_open_problems(project_id=project.id),
            recent_changes=self.get_recent_changes(project_id=project.id, hours=hours),
            high_priority_todos=self.get_todos(project.id, status="pending"),
            recent_learnings=self.get_learnings(project_id=project.id)[:10],
            current_session=self.get_current_session(project.id)
        )
    
    # ========================================================
    # SEARCH (FTS for now, embeddings later)
    # ========================================================
    
    def search(
        self,
        query: str,
        project_id: Optional[int] = None,
        content_types: Optional[list[str]] = None,
        limit: int = 10
    ) -> list[dict]:
        """Search across all content using FTS."""
        conn = self._conn()
        try:
            # Build FTS query
            fts_query = f'"{query}"'  # Phrase search
            
            sql = """
                SELECT content_type, content_id, project_id, 
                       snippet(memory_fts, 3, '>>>', '<<<', '...', 32) as snippet,
                       rank
                FROM memory_fts
                WHERE memory_fts MATCH ?
            """
            params = [fts_query]
            
            if project_id:
                sql += " AND project_id = ?"
                params.append(str(project_id))
            
            if content_types:
                placeholders = ",".join("?" * len(content_types))
                sql += f" AND content_type IN ({placeholders})"
                params.extend(content_types)
            
            sql += " ORDER BY rank LIMIT ?"
            params.append(limit)
            
            rows = conn.execute(sql, params).fetchall()
            return [dict(row) for row in rows]
        except sqlite3.OperationalError:
            # FTS table might be empty
            return []
        finally:
            conn.close()
    
    def index_for_search(
        self,
        content_type: str,
        content_id: int,
        project_id: int,
        searchable_text: str
    ) -> None:
        """Index content for FTS search."""
        conn = self._conn()
        try:
            # Delete existing entry
            conn.execute(
                "DELETE FROM memory_fts WHERE content_type = ? AND content_id = ?",
                (content_type, content_id)
            )
            # Insert new entry
            conn.execute(
                """INSERT INTO memory_fts 
                   (content_type, content_id, project_id, searchable_text)
                   VALUES (?, ?, ?, ?)""",
                (content_type, str(content_id), str(project_id), searchable_text)
            )
            conn.commit()
        finally:
            conn.close()
    
    # ========================================================
    # COMPONENT HISTORY
    # ========================================================
    
    def get_component_history(
        self,
        component_id: int,
        days: int = 30
    ) -> dict:
        """
        Get full history for a component over time.
        Returns changes, problems, solutions all in one view.
        """
        conn = self._conn()
        try:
            cutoff = datetime.now() - timedelta(days=days)
            cutoff_str = cutoff.isoformat()
            
            # Get the component
            component = self.get_component(component_id)
            if not component:
                return {}
            
            # Get changes
            changes = conn.execute(
                """SELECT * FROM changes 
                   WHERE component_id = ? AND created_at > ?
                   ORDER BY created_at DESC""",
                (component_id, cutoff_str)
            ).fetchall()
            
            # Get problems (all time, not just recent)
            problems = conn.execute(
                """SELECT * FROM problems 
                   WHERE component_id = ?
                   ORDER BY created_at DESC""",
                (component_id,)
            ).fetchall()
            
            # Get solutions for those problems
            problem_ids = [p['id'] for p in problems]
            solutions = []
            if problem_ids:
                placeholders = ','.join('?' * len(problem_ids))
                solutions = conn.execute(
                    f"""SELECT * FROM solutions 
                       WHERE problem_id IN ({placeholders})""",
                    problem_ids
                ).fetchall()
            
            # Get learnings
            learnings = conn.execute(
                """SELECT * FROM learnings 
                   WHERE component_id = ?
                   ORDER BY created_at DESC""",
                (component_id,)
            ).fetchall()
            
            return {
                "component": component.model_dump(),
                "changes": [Change(**dict(r)).model_dump() for r in changes],
                "problems": [Problem(**dict(r)).model_dump() for r in problems],
                "solutions": [Solution(**dict(r)).model_dump() for r in solutions],
                "learnings": [Learning(**dict(r)).model_dump() for r in learnings],
                "period_days": days
            }
        finally:
            conn.close()
    
    # ========================================================
    # CONVERSATION HISTORY
    # ========================================================
    
    def get_conversation_history(
        self,
        project_id: int,
        session_id: Optional[str] = None,
        limit: int = 20
    ) -> list[Conversation]:
        """Get conversation history for a project."""
        conn = self._conn()
        try:
            if session_id:
                rows = conn.execute(
                    """SELECT * FROM conversations 
                       WHERE project_id = ? AND session_id = ?
                       ORDER BY created_at DESC LIMIT ?""",
                    (project_id, session_id, limit)
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT * FROM conversations 
                       WHERE project_id = ?
                       ORDER BY created_at DESC LIMIT ?""",
                    (project_id, limit)
                ).fetchall()
            
            result = []
            for row in rows:
                data = dict(row)
                # Parse JSON fields
                if data.get('key_decisions'):
                    data['key_decisions'] = json.loads(data['key_decisions'])
                if data.get('problems_referenced'):
                    data['problems_referenced'] = json.loads(data['problems_referenced'])
                if data.get('solutions_created'):
                    data['solutions_created'] = json.loads(data['solutions_created'])
                result.append(Conversation(**data))
            return result
        finally:
            conn.close()
    
    # ========================================================
    # CROSS-REFERENCES
    # ========================================================
    
    def link_items(
        self,
        source_project_id: int,
        source_type: str,
        source_id: int,
        target_project_id: int,
        target_type: str,
        target_id: int,
        relationship: str,
        notes: Optional[str] = None
    ) -> dict:
        """Create a cross-reference between items."""
        conn = self._conn()
        try:
            cursor = conn.execute(
                """INSERT INTO cross_references 
                   (source_project_id, source_type, source_id,
                    target_project_id, target_type, target_id,
                    relationship, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (source_project_id, source_type, source_id,
                 target_project_id, target_type, target_id,
                 relationship, notes)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM cross_references WHERE id = ?",
                (cursor.lastrowid,)
            ).fetchone()
            return dict(row)
        finally:
            conn.close()
    
    def find_related(
        self,
        item_type: str,
        item_id: int
    ) -> list[dict]:
        """Find all items related to this one (in either direction)."""
        conn = self._conn()
        try:
            # Find where this item is the source
            as_source = conn.execute(
                """SELECT *, 'outgoing' as direction FROM cross_references 
                   WHERE source_type = ? AND source_id = ?""",
                (item_type, item_id)
            ).fetchall()
            
            # Find where this item is the target
            as_target = conn.execute(
                """SELECT *, 'incoming' as direction FROM cross_references 
                   WHERE target_type = ? AND target_id = ?""",
                (item_type, item_id)
            ).fetchall()
            
            return [dict(r) for r in as_source] + [dict(r) for r in as_target]
        finally:
            conn.close()
    
    def delete_cross_reference(self, ref_id: int) -> bool:
        """Delete a cross-reference."""
        conn = self._conn()
        try:
            conn.execute("DELETE FROM cross_references WHERE id = ?", (ref_id,))
            conn.commit()
            return True
        finally:
            conn.close()
    
    # ========================================================
    # STORY GENERATION DATA
    # ========================================================
    
    def get_project_story_data(self, project_id: int) -> dict:
        """
        Get all data needed to generate a project story.
        Returns structured data for the story generator.
        """
        conn = self._conn()
        try:
            project = self.get_project(project_id)
            if not project:
                return {}
            
            # Get all components
            components = self.list_components(project_id)
            
            # Get all problems with their solutions
            all_problems = conn.execute(
                """SELECT p.* FROM problems p
                   JOIN components c ON p.component_id = c.id
                   WHERE c.project_id = ?
                   ORDER BY p.created_at""",
                (project_id,)
            ).fetchall()
            
            problems_with_solutions = []
            for prob in all_problems:
                prob_dict = Problem(**dict(prob)).model_dump()
                
                # Get attempts for this problem
                attempts = conn.execute(
                    """SELECT * FROM solution_attempts 
                       WHERE problem_id = ? ORDER BY created_at""",
                    (prob['id'],)
                ).fetchall()
                prob_dict['attempts'] = [SolutionAttempt(**dict(a)).model_dump() for a in attempts]
                
                # Get solution if exists
                solution = conn.execute(
                    "SELECT * FROM solutions WHERE problem_id = ?",
                    (prob['id'],)
                ).fetchone()
                prob_dict['solution'] = Solution(**dict(solution)).model_dump() if solution else None
                
                problems_with_solutions.append(prob_dict)
            
            # Get all changes ordered by time
            changes = conn.execute(
                """SELECT ch.*, comp.name as component_name FROM changes ch
                   JOIN components comp ON ch.component_id = comp.id
                   WHERE comp.project_id = ?
                   ORDER BY ch.created_at""",
                (project_id,)
            ).fetchall()
            
            # Get all learnings
            learnings = self.get_learnings(project_id=project_id)
            
            # Get all sessions
            sessions = conn.execute(
                """SELECT * FROM sessions 
                   WHERE project_id = ? ORDER BY started_at""",
                (project_id,)
            ).fetchall()
            
            # Calculate stats
            stats = {
                "total_problems": len(all_problems),
                "solved_problems": len([p for p in all_problems if p['status'] == 'solved']),
                "total_changes": len(changes),
                "total_learnings": len(learnings),
                "total_sessions": len(sessions),
                "components_count": len(components),
                "first_activity": min(
                    [project.created_at] + 
                    [Problem(**dict(p)).created_at for p in all_problems if Problem(**dict(p)).created_at]
                ) if all_problems else project.created_at,
                "last_activity": project.updated_at
            }
            
            return {
                "project": project.model_dump(),
                "components": [c.model_dump() for c in components],
                "problems": problems_with_solutions,
                "changes": [dict(c) for c in changes],
                "learnings": [l.model_dump() for l in learnings],
                "sessions": [dict(s) for s in sessions],
                "stats": stats
            }
        finally:
            conn.close()
    
    def get_problem_journey_data(self, problem_id: int) -> dict:
        """
        Get all data needed to visualize a problem's solution journey.
        Returns the full decision tree with all attempts.
        """
        conn = self._conn()
        try:
            problem = self.get_problem(problem_id)
            if not problem:
                return {}
            
            # Get component info
            component = self.get_component(problem.component_id)
            
            # Get all attempts
            attempts = conn.execute(
                """SELECT * FROM solution_attempts 
                   WHERE problem_id = ? ORDER BY created_at""",
                (problem_id,)
            ).fetchall()
            
            # Build tree structure
            attempts_list = [SolutionAttempt(**dict(a)).model_dump() for a in attempts]
            
            # Get solution if exists
            solution = self.get_solution(problem_id)
            
            # Get related learnings (learnings created around the time of the solution)
            related_learnings = []
            if solution:
                related_learnings = conn.execute(
                    """SELECT * FROM learnings 
                       WHERE component_id = ? 
                       AND created_at BETWEEN datetime(?, '-1 day') AND datetime(?, '+1 day')""",
                    (problem.component_id, 
                     solution.created_at.isoformat() if solution.created_at else datetime.now().isoformat(),
                     solution.created_at.isoformat() if solution.created_at else datetime.now().isoformat())
                ).fetchall()
            
            # Calculate journey stats
            failed_attempts = len([a for a in attempts_list if a.get('outcome') == 'failure'])
            total_attempts = len(attempts_list)
            
            return {
                "problem": problem.model_dump(),
                "component": component.model_dump() if component else None,
                "attempts": attempts_list,
                "solution": solution.model_dump() if solution else None,
                "related_learnings": [Learning(**dict(l)).model_dump() for l in related_learnings],
                "journey_stats": {
                    "total_attempts": total_attempts,
                    "failed_attempts": failed_attempts,
                    "success_rate": (1 / total_attempts * 100) if total_attempts > 0 else 0,
                    "is_solved": problem.status == 'solved'
                }
            }
        finally:
            conn.close()
    
    def get_architecture_data(self, project_id: int) -> dict:
        """
        Get data for generating architecture diagrams.
        Shows component hierarchy and problem hotspots.
        """
        conn = self._conn()
        try:
            project = self.get_project(project_id)
            if not project:
                return {}
            
            # Get all components with their relationships
            components = self.list_components(project_id)
            
            # Get problem counts per component
            problem_counts = conn.execute(
                """SELECT component_id, 
                          COUNT(*) as total,
                          SUM(CASE WHEN status IN ('open', 'investigating') THEN 1 ELSE 0 END) as open_count,
                          SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END) as solved_count
                   FROM problems 
                   WHERE component_id IN (SELECT id FROM components WHERE project_id = ?)
                   GROUP BY component_id""",
                (project_id,)
            ).fetchall()
            problem_map = {r['component_id']: dict(r) for r in problem_counts}
            
            # Get cross-references between components in this project
            cross_refs = conn.execute(
                """SELECT * FROM cross_references 
                   WHERE source_project_id = ? AND target_project_id = ?
                   AND source_type = 'component' AND target_type = 'component'""",
                (project_id, project_id)
            ).fetchall()
            
            # Build component nodes with metadata
            nodes = []
            for comp in components:
                comp_dict = comp.model_dump()
                comp_dict['problem_stats'] = problem_map.get(comp.id, {
                    'total': 0, 'open_count': 0, 'solved_count': 0
                })
                # Determine if this is a "hot" component (many open problems)
                open_count = comp_dict['problem_stats'].get('open_count', 0)
                comp_dict['heat_level'] = 'hot' if open_count >= 3 else 'warm' if open_count >= 1 else 'cool'
                nodes.append(comp_dict)
            
            # Build edges from parent relationships and cross-refs
            edges = []
            for comp in components:
                if comp.parent_component_id:
                    edges.append({
                        'source': comp.parent_component_id,
                        'target': comp.id,
                        'type': 'hierarchy'
                    })
            
            for ref in cross_refs:
                edges.append({
                    'source': ref['source_id'],
                    'target': ref['target_id'],
                    'type': ref['relationship'],
                    'notes': ref['notes']
                })
            
            return {
                "project": project.model_dump(),
                "nodes": nodes,
                "edges": edges
            }
        finally:
            conn.close()
