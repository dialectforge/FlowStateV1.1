"""MCP tool definitions for FlowState."""

import os
import subprocess
import shutil
import hashlib
from pathlib import Path
from typing import Optional, Any
from datetime import datetime
from .database import Database
from .models import ProjectContext


# Global database instance (initialized by server)
_db: Optional[Database] = None


# ============================================================
# LEAN RESPONSE UTILITIES (v1.4)
# ============================================================

def _compact_dict(d: dict, max_text_len: int = 100) -> dict:
    """
    Create a compact version of a dict:
    - Remove None values
    - Remove empty strings/lists
    - Truncate long text fields
    - Remove timestamp fields unless essential
    """
    if not isinstance(d, dict):
        return d
    
    result = {}
    skip_fields = {'created_at', 'updated_at', 'solved_at', 'completed_at', 
                   'promoted_at', 'last_used', 'started_at', 'ended_at'}
    truncate_fields = {'description', 'insight', 'context', 'reason', 
                       'notes', 'summary', 'code_snippet', 'key_insight',
                       'old_value', 'new_value', 'skill', 'focus_summary'}
    
    for k, v in d.items():
        # Skip None and empty values
        if v is None or v == '' or v == []:
            continue
        # Skip timestamp fields
        if k in skip_fields:
            continue
        # Truncate long text
        if k in truncate_fields and isinstance(v, str) and len(v) > max_text_len:
            result[k] = v[:max_text_len] + '...'
        elif isinstance(v, dict):
            result[k] = _compact_dict(v, max_text_len)
        elif isinstance(v, list) and v and isinstance(v[0], dict):
            result[k] = [_compact_dict(item, max_text_len) for item in v]
        else:
            result[k] = v
    
    return result


def _compact_list(items: list, max_text_len: int = 100) -> list:
    """Compact a list of dicts."""
    return [_compact_dict(item, max_text_len) for item in items]


def get_db() -> Database:
    """Get the database instance."""
    global _db
    if _db is None:
        _db = Database()
    return _db


def set_db(db: Database) -> None:
    """Set the database instance (for testing)."""
    global _db
    _db = db


# ============================================================
# TOOL IMPLEMENTATIONS
# ============================================================

def list_projects(status: Optional[str] = None) -> list[dict]:
    """
    List all projects with their status and stats.
    
    Args:
        status: Optional filter ('active', 'paused', 'completed', 'archived')
    
    Returns:
        List of projects with basic info
    """
    db = get_db()
    projects = db.list_projects(status)
    return [p.model_dump() for p in projects]


def create_project(name: str, description: Optional[str] = None) -> dict:
    """
    Create a new project.
    
    Args:
        name: Project name (must be unique)
        description: Optional description
    
    Returns:
        The created project
    """
    db = get_db()
    project = db.create_project(name, description)
    return project.model_dump()


def get_project(project_id: int) -> Optional[dict]:
    """
    Get project details by ID.
    
    Args:
        project_id: The project ID
    
    Returns:
        Project details or None if not found
    """
    db = get_db()
    project = db.get_project(project_id)
    return project.model_dump() if project else None


def update_project(
    project_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None
) -> Optional[dict]:
    """
    Update project fields.
    
    Args:
        project_id: The project ID
        name: New name (optional)
        description: New description (optional)
        status: New status (optional)
    
    Returns:
        Updated project or None if not found
    """
    db = get_db()
    project = db.update_project(project_id, name=name, description=description, status=status)
    return project.model_dump() if project else None


def get_project_context(project_name: str, hours: int = 48, include_files: bool = True) -> Optional[dict]:
    """
    THE KILLER TOOL: Get everything needed to work on a project.
    
    Returns:
    - Project details
    - All components
    - Active problems (open, investigating)
    - Recent changes (last 24-48 hours)
    - High-priority todos
    - Recent learnings
    - Current session if any
    - File attachments with content locations (v1.1)
    
    Args:
        project_name: Name of the project
        hours: How many hours back to look for changes (default 48)
        include_files: Include file attachments in context (default True)
    
    Returns:
        Full project context or None if project not found
    """
    db = get_db()
    ctx = db.get_project_context(project_name, hours)
    if ctx is None:
        return None
    
    result = {
        "project": ctx.project.model_dump(),
        "components": [c.model_dump() for c in ctx.components],
        "open_problems": [p.model_dump() for p in ctx.open_problems],
        "recent_changes": [c.model_dump() for c in ctx.recent_changes],
        "high_priority_todos": [t.model_dump() for t in ctx.high_priority_todos],
        "recent_learnings": [l.model_dump() for l in ctx.recent_learnings],
        "current_session": ctx.current_session.model_dump() if ctx.current_session else None
    }
    
    # Add file attachments if requested (v1.1)
    if include_files:
        attachments = get_attachments(project_id=ctx.project.id)
        result["attachments"] = attachments
        
        # Get content locations for attachments
        conn = db._conn()
        try:
            for att in attachments:
                locations = conn.execute(
                    "SELECT * FROM content_locations WHERE attachment_id = ?",
                    (att['id'],)
                ).fetchall()
                att['content_locations'] = [dict(l) for l in locations]
        finally:
            conn.close()
    
    return result


# ============================================================
# v1.2 ADDITIONS: PROJECT KNOWLEDGE BASE
# ============================================================

def create_project_variable(
    project_id: int,
    name: str,
    value: Optional[str] = None,
    category: str = 'custom',
    is_secret: bool = False,
    description: Optional[str] = None
) -> dict:
    """
    Create a project variable (key-value for servers, credentials, config).
    
    Args:
        project_id: The project ID
        name: Variable name (e.g., 'production_server_ip')
        value: The value (will be masked in UI if is_secret=True)
        category: 'server', 'credentials', 'config', 'environment', 'endpoint', 'custom'
        is_secret: If True, value is masked in UI
        description: Optional description
    
    Returns:
        The created variable
    """
    db = get_db()
    conn = db._conn()
    try:
        cursor = conn.execute(
            """INSERT INTO project_variables 
               (project_id, name, value, category, is_secret, description)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (project_id, name, value, category, is_secret, description)
        )
        conn.commit()
        var = conn.execute(
            "SELECT * FROM project_variables WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()
        return dict(var)
    finally:
        conn.close()


def get_project_variables(
    project_id: int,
    category: Optional[str] = None
) -> list[dict]:
    """
    Get all variables for a project.
    
    Args:
        project_id: The project ID
        category: Optional filter by category
    
    Returns:
        List of variables
    """
    db = get_db()
    conn = db._conn()
    try:
        if category:
            rows = conn.execute(
                "SELECT * FROM project_variables WHERE project_id = ? AND category = ? ORDER BY category, name",
                (project_id, category)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM project_variables WHERE project_id = ? ORDER BY category, name",
                (project_id,)
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_project_variable(
    variable_id: int,
    name: Optional[str] = None,
    value: Optional[str] = None,
    category: Optional[str] = None,
    is_secret: Optional[bool] = None,
    description: Optional[str] = None
) -> Optional[dict]:
    """
    Update a project variable.
    
    Args:
        variable_id: The variable ID
        name: New name (optional)
        value: New value (optional)
        category: New category (optional)
        is_secret: New secret flag (optional)
        description: New description (optional)
    
    Returns:
        Updated variable or None if not found
    """
    db = get_db()
    conn = db._conn()
    try:
        updates = []
        params = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if value is not None:
            updates.append("value = ?")
            params.append(value)
        if category is not None:
            updates.append("category = ?")
            params.append(category)
        if is_secret is not None:
            updates.append("is_secret = ?")
            params.append(is_secret)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        
        if not updates:
            return None
        
        params.append(variable_id)
        conn.execute(
            f"UPDATE project_variables SET {', '.join(updates)} WHERE id = ?",
            params
        )
        conn.commit()
        
        var = conn.execute(
            "SELECT * FROM project_variables WHERE id = ?",
            (variable_id,)
        ).fetchone()
        return dict(var) if var else None
    finally:
        conn.close()


def delete_project_variable(variable_id: int) -> bool:
    """
    Delete a project variable.
    
    Args:
        variable_id: The variable ID
    
    Returns:
        True if deleted, False if not found
    """
    db = get_db()
    conn = db._conn()
    try:
        cursor = conn.execute(
            "DELETE FROM project_variables WHERE id = ?",
            (variable_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def create_project_method(
    project_id: int,
    name: str,
    description: str,
    category: Optional[str] = None,
    steps: Optional[list[str]] = None,
    code_example: Optional[str] = None,
    related_component_id: Optional[int] = None
) -> dict:
    """
    Create a project method (standard approach, pattern, or process).
    
    Args:
        project_id: The project ID
        name: Method name (e.g., 'Authentication Flow')
        description: Full description
        category: 'auth', 'deployment', 'testing', 'architecture', 'workflow', 'convention', 'api', 'security', 'other'
        steps: Optional list of steps if it's a process
        code_example: Optional code snippet
        related_component_id: Optional related component
    
    Returns:
        The created method
    """
    import json
    db = get_db()
    conn = db._conn()
    try:
        steps_json = json.dumps(steps) if steps else None
        cursor = conn.execute(
            """INSERT INTO project_methods 
               (project_id, name, description, category, steps, code_example, related_component_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (project_id, name, description, category, steps_json, code_example, related_component_id)
        )
        conn.commit()
        method = conn.execute(
            "SELECT * FROM project_methods WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()
        result = dict(method)
        if result.get('steps'):
            result['steps'] = json.loads(result['steps'])
        return result
    finally:
        conn.close()


def get_project_methods(
    project_id: int,
    category: Optional[str] = None
) -> list[dict]:
    """
    Get all methods for a project.
    
    Args:
        project_id: The project ID
        category: Optional filter by category
    
    Returns:
        List of methods
    """
    import json
    db = get_db()
    conn = db._conn()
    try:
        if category:
            rows = conn.execute(
                "SELECT * FROM project_methods WHERE project_id = ? AND category = ? ORDER BY category, name",
                (project_id, category)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM project_methods WHERE project_id = ? ORDER BY category, name",
                (project_id,)
            ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get('steps'):
                d['steps'] = json.loads(d['steps'])
            results.append(d)
        return results
    finally:
        conn.close()


def update_project_method(
    method_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    category: Optional[str] = None,
    steps: Optional[list[str]] = None,
    code_example: Optional[str] = None,
    related_component_id: Optional[int] = None
) -> Optional[dict]:
    """
    Update a project method.
    
    Args:
        method_id: The method ID
        name: New name (optional)
        description: New description (optional)
        category: New category (optional)
        steps: New steps list (optional)
        code_example: New code example (optional)
        related_component_id: New related component (optional)
    
    Returns:
        Updated method or None if not found
    """
    import json
    db = get_db()
    conn = db._conn()
    try:
        updates = []
        params = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        if category is not None:
            updates.append("category = ?")
            params.append(category)
        if steps is not None:
            updates.append("steps = ?")
            params.append(json.dumps(steps))
        if code_example is not None:
            updates.append("code_example = ?")
            params.append(code_example)
        if related_component_id is not None:
            updates.append("related_component_id = ?")
            params.append(related_component_id)
        
        if not updates:
            return None
        
        params.append(method_id)
        conn.execute(
            f"UPDATE project_methods SET {', '.join(updates)} WHERE id = ?",
            params
        )
        conn.commit()
        
        method = conn.execute(
            "SELECT * FROM project_methods WHERE id = ?",
            (method_id,)
        ).fetchone()
        if method:
            result = dict(method)
            if result.get('steps'):
                result['steps'] = json.loads(result['steps'])
            return result
        return None
    finally:
        conn.close()


def delete_project_method(method_id: int) -> bool:
    """
    Delete a project method.
    
    Args:
        method_id: The method ID
    
    Returns:
        True if deleted, False if not found
    """
    db = get_db()
    conn = db._conn()
    try:
        cursor = conn.execute(
            "DELETE FROM project_methods WHERE id = ?",
            (method_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ============================================================
# v1.2 ADDITIONS: CONVERSATIONS & SESSIONS UI SUPPORT
# ============================================================

def get_conversations(
    project_id: int,
    session_id: Optional[str] = None,
    limit: int = 50
) -> list[dict]:
    """
    Get conversations for a project.
    
    Args:
        project_id: The project ID
        session_id: Optional filter by session
        limit: Max results (default 50)
    
    Returns:
        List of conversations
    """
    import json
    db = get_db()
    conn = db._conn()
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
        results = []
        for r in rows:
            d = dict(r)
            if d.get('key_decisions'):
                try:
                    d['key_decisions'] = json.loads(d['key_decisions'])
                except:
                    pass
            results.append(d)
        return results
    finally:
        conn.close()


def get_sessions(
    project_id: int,
    limit: int = 50
) -> list[dict]:
    """
    Get work sessions for a project.
    
    Args:
        project_id: The project ID
        limit: Max results (default 50)
    
    Returns:
        List of sessions
    """
    import json
    db = get_db()
    conn = db._conn()
    try:
        rows = conn.execute(
            """SELECT * FROM sessions 
               WHERE project_id = ? 
               ORDER BY started_at DESC LIMIT ?""",
            (project_id, limit)
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get('outcomes'):
                try:
                    d['outcomes'] = json.loads(d['outcomes'])
                except:
                    pass
            results.append(d)
        return results
    finally:
        conn.close()


def get_cross_references(
    project_id: Optional[int] = None,
    source_type: Optional[str] = None,
    source_id: Optional[int] = None
) -> list[dict]:
    """
    Get cross-references (links between items).
    
    Args:
        project_id: Optional filter by project
        source_type: Optional filter by source type ('problem', 'solution', etc.)
        source_id: Optional filter by specific source item
    
    Returns:
        List of cross-references
    """
    db = get_db()
    conn = db._conn()
    try:
        query = "SELECT * FROM cross_references WHERE 1=1"
        params = []
        if project_id:
            query += " AND (source_project_id = ? OR target_project_id = ?)"
            params.extend([project_id, project_id])
        if source_type:
            query += " AND source_type = ?"
            params.append(source_type)
        if source_id:
            query += " AND source_id = ?"
            params.append(source_id)
        query += " ORDER BY created_at DESC"
        
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ============================================================
# COMPONENT TOOLS
# ============================================================

def create_component(
    project_id: int,
    name: str,
    description: Optional[str] = None,
    parent_component_id: Optional[int] = None
) -> dict:
    """
    Create a new component in a project.
    
    Args:
        project_id: The project ID
        name: Component name
        description: Optional description
        parent_component_id: Optional parent for nesting
    
    Returns:
        The created component
    """
    db = get_db()
    component = db.create_component(project_id, name, description, parent_component_id)
    return component.model_dump()


def list_components(project_id: int) -> list[dict]:
    """
    List all components in a project.
    
    Args:
        project_id: The project ID
    
    Returns:
        List of components
    """
    db = get_db()
    components = db.list_components(project_id)
    return [c.model_dump() for c in components]


def update_component(
    component_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None
) -> Optional[dict]:
    """
    Update component fields.
    
    Args:
        component_id: The component ID
        name: New name (optional)
        description: New description (optional)
        status: New status (optional)
    
    Returns:
        Updated component or None
    """
    db = get_db()
    component = db.update_component(component_id, name=name, description=description, status=status)
    return component.model_dump() if component else None


# ============================================================
# CHANGE TRACKING TOOLS
# ============================================================

def log_change(
    component_id: int,
    field_name: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    change_type: str = "code",
    reason: Optional[str] = None
) -> dict:
    """
    Log a change to a component.
    
    Args:
        component_id: The component that changed
        field_name: What field/aspect changed
        old_value: Previous value
        new_value: New value
        change_type: Type of change ('config', 'code', 'architecture', 'dependency', 'documentation', 'other')
        reason: Why the change was made
    
    Returns:
        The logged change
    """
    db = get_db()
    change = db.log_change(component_id, field_name, old_value, new_value, change_type, reason)
    
    # Index for search
    search_text = f"{field_name} {old_value or ''} {new_value or ''} {reason or ''}"
    component = db.get_component(component_id)
    if component:
        db.index_for_search("change", change.id, component.project_id, search_text)
    
    return change.model_dump()


def get_recent_changes(
    project_id: Optional[int] = None,
    component_id: Optional[int] = None,
    hours: int = 24,
    compact: bool = False
) -> list[dict]:
    """
    Get recent changes.
    
    Args:
        project_id: Filter by project (optional)
        component_id: Filter by component (optional)
        hours: How far back to look (default 24)
        compact: Return minimal fields to save tokens (default False)
    
    Returns:
        List of recent changes
    """
    db = get_db()
    changes = db.get_recent_changes(project_id, component_id, hours)
    result = [c.model_dump() for c in changes]
    return _compact_list(result) if compact else result


# ============================================================
# PROBLEM/SOLUTION TOOLS
# ============================================================

def log_problem(
    component_id: int,
    title: str,
    description: Optional[str] = None,
    severity: str = "medium"
) -> dict:
    """
    Log a new problem.
    
    Args:
        component_id: Which component has the problem
        title: Brief problem title
        description: Detailed description
        severity: 'low', 'medium', 'high', 'critical'
    
    Returns:
        The logged problem
    """
    db = get_db()
    problem = db.log_problem(component_id, title, description, severity)
    
    # Index for search
    search_text = f"{title} {description or ''}"
    component = db.get_component(component_id)
    if component:
        db.index_for_search("problem", problem.id, component.project_id, search_text)
    
    return problem.model_dump()


def get_open_problems(
    project_id: Optional[int] = None,
    component_id: Optional[int] = None,
    compact: bool = False
) -> list[dict]:
    """
    Get all open/investigating problems.
    
    Args:
        project_id: Filter by project (optional)
        component_id: Filter by component (optional)
        compact: Return minimal fields to save tokens (default False)
    
    Returns:
        List of open problems
    """
    db = get_db()
    problems = db.get_open_problems(project_id, component_id)
    result = [p.model_dump() for p in problems]
    return _compact_list(result) if compact else result


def log_attempt(
    problem_id: int,
    description: str,
    parent_attempt_id: Optional[int] = None
) -> dict:
    """
    Log a solution attempt.
    
    Args:
        problem_id: Which problem this attempts to solve
        description: What we're trying
        parent_attempt_id: Optional parent attempt (for branching)
    
    Returns:
        The logged attempt
    """
    db = get_db()
    attempt = db.log_attempt(problem_id, description, parent_attempt_id)
    return attempt.model_dump()


def mark_attempt_outcome(
    attempt_id: int,
    outcome: str,
    notes: Optional[str] = None,
    confidence: str = "attempted"
) -> Optional[dict]:
    """
    Record the outcome of an attempt.
    
    Args:
        attempt_id: The attempt ID
        outcome: 'success', 'failure', 'partial', 'abandoned'
        notes: What we learned
        confidence: 'attempted', 'worked_once', 'verified', 'proven', 'deprecated'
    
    Returns:
        Updated attempt
    """
    db = get_db()
    attempt = db.mark_attempt_outcome(attempt_id, outcome, notes, confidence)
    return attempt.model_dump() if attempt else None


def mark_problem_solved(
    problem_id: int,
    winning_attempt_id: Optional[int],
    summary: str,
    key_insight: Optional[str] = None,
    code_snippet: Optional[str] = None
) -> dict:
    """
    Mark a problem as solved.
    
    Args:
        problem_id: The problem ID
        winning_attempt_id: Which attempt worked
        summary: Brief solution summary
        key_insight: The key learning/insight
        code_snippet: Optional code that solved it
    
    Returns:
        The solution record
    """
    db = get_db()
    solution = db.mark_problem_solved(problem_id, winning_attempt_id, summary, key_insight, code_snippet)
    
    # Index for search
    problem = db.get_problem(problem_id)
    component = db.get_component(problem.component_id) if problem else None
    if component:
        search_text = f"{summary} {key_insight or ''}"
        db.index_for_search("solution", solution.id, component.project_id, search_text)
    
    return solution.model_dump()


def get_problem_tree(problem_id: int) -> dict:
    """
    Get full decision tree of all attempts for a problem.
    
    Args:
        problem_id: The problem ID
    
    Returns:
        Problem with all attempts and solution if solved
    """
    db = get_db()
    problem = db.get_problem(problem_id)
    if not problem:
        return {}
    
    attempts = db.get_attempts_for_problem(problem_id)
    solution = db.get_solution(problem_id)
    
    return {
        "problem": problem.model_dump(),
        "attempts": [a.model_dump() for a in attempts],
        "solution": solution.model_dump() if solution else None
    }


# ============================================================
# TODO TOOLS
# ============================================================

def add_todo(
    project_id: int,
    title: str,
    description: Optional[str] = None,
    priority: str = "medium",
    component_id: Optional[int] = None,
    due_date: Optional[str] = None
) -> dict:
    """
    Add a todo item.
    
    Args:
        project_id: Which project
        title: Todo title
        description: Details
        priority: 'low', 'medium', 'high', 'critical'
        component_id: Optional component this relates to
        due_date: Optional due date (ISO format)
    
    Returns:
        The created todo
    """
    db = get_db()
    todo = db.add_todo(project_id, title, description, priority, component_id, due_date)
    return todo.model_dump()


def update_todo(
    todo_id: int,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    title: Optional[str] = None,
    description: Optional[str] = None
) -> Optional[dict]:
    """
    Update a todo item.
    
    Args:
        todo_id: The todo ID
        status: New status (optional)
        priority: New priority (optional)
        title: New title (optional)
        description: New description (optional)
    
    Returns:
        Updated todo
    """
    db = get_db()
    todo = db.update_todo(todo_id, status=status, priority=priority, title=title, description=description)
    return todo.model_dump() if todo else None


def get_todos(
    project_id: int,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    compact: bool = False
) -> list[dict]:
    """
    Get todos with optional filters.
    
    Args:
        project_id: The project ID
        status: Filter by status (optional)
        priority: Filter by priority (optional)
        compact: Return minimal fields to save tokens (default False)
    
    Returns:
        List of todos
    """
    db = get_db()
    todos = db.get_todos(project_id, status, priority)
    result = [t.model_dump() for t in todos]
    return _compact_list(result) if compact else result


# ============================================================
# LEARNING TOOLS
# ============================================================

def log_learning(
    project_id: int,
    insight: str,
    category: Optional[str] = None,
    context: Optional[str] = None,
    component_id: Optional[int] = None,
    source: str = "experience"
) -> dict:
    """
    Capture a learning/insight.
    
    Args:
        project_id: Which project
        insight: The learning
        category: 'pattern', 'gotcha', 'best_practice', 'tool_tip', 'architecture', 'performance', 'security', 'other'
        context: When/where this applies
        component_id: Optional related component
        source: 'experience', 'documentation', 'conversation', 'error', 'research'
    
    Returns:
        The logged learning
    """
    db = get_db()
    learning = db.log_learning(project_id, insight, category, context, component_id, source)
    
    # Index for search
    search_text = f"{insight} {context or ''} {category or ''}"
    db.index_for_search("learning", learning.id, project_id, search_text)
    
    return learning.model_dump()


def get_learnings(
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    verified_only: bool = False,
    compact: bool = False
) -> list[dict]:
    """
    Get learnings with optional filters.
    
    Args:
        project_id: Filter by project (optional)
        category: Filter by category (optional)
        verified_only: Only return verified learnings
        compact: Return minimal fields to save tokens (default False)
    
    Returns:
        List of learnings
    """
    db = get_db()
    learnings = db.get_learnings(project_id, category, verified_only)
    result = [l.model_dump() for l in learnings]
    return _compact_list(result) if compact else result


# ============================================================
# CONVERSATION TOOLS
# ============================================================

def log_conversation(
    project_id: int,
    user_prompt_summary: str,
    assistant_response_summary: Optional[str] = None,
    key_decisions: Optional[list[str]] = None,
    session_id: Optional[str] = None
) -> dict:
    """
    Log a conversation exchange.
    
    Args:
        project_id: Which project
        user_prompt_summary: Summary of what was asked
        assistant_response_summary: Summary of response
        key_decisions: List of decisions made
        session_id: Optional session ID
    
    Returns:
        The logged conversation
    """
    db = get_db()
    conv = db.log_conversation(
        project_id, 
        user_prompt_summary, 
        assistant_response_summary,
        key_decisions,
        session_id
    )
    return conv.model_dump()


# ============================================================
# SESSION TOOLS
# ============================================================

def start_session(
    project_id: int,
    focus_component_id: Optional[int] = None,
    focus_problem_id: Optional[int] = None
) -> dict:
    """
    Start a work session.
    
    Args:
        project_id: Which project
        focus_component_id: Optional component to focus on
        focus_problem_id: Optional problem to focus on
    
    Returns:
        The new session
    """
    db = get_db()
    session = db.start_session(project_id, focus_component_id, focus_problem_id)
    return session.model_dump()


def end_session(
    session_id: int,
    summary: Optional[str] = None,
    outcomes: Optional[list[str]] = None
) -> Optional[dict]:
    """
    End a session with optional summary.
    
    Args:
        session_id: The session ID
        summary: What was accomplished
        outcomes: List of outcomes
    
    Returns:
        The completed session
    """
    db = get_db()
    session = db.end_session(session_id, summary, outcomes)
    return session.model_dump() if session else None


def get_current_session(project_id: Optional[int] = None) -> Optional[dict]:
    """
    Get the active session if any.
    
    Args:
        project_id: Optional project filter
    
    Returns:
        Current session or None
    """
    db = get_db()
    session = db.get_current_session(project_id)
    return session.model_dump() if session else None


# ============================================================
# SEARCH TOOLS
# ============================================================

def search(
    query: str,
    project_id: Optional[int] = None,
    content_types: Optional[list[str]] = None,
    limit: int = 10
) -> list[dict]:
    """
    Search across all content.
    
    Args:
        query: Search query
        project_id: Optional project filter
        content_types: Optional list of types to search ('problem', 'solution', 'learning', 'change')
        limit: Max results (default 10)
    
    Returns:
        List of search results with snippets
    """
    db = get_db()
    return db.search(query, project_id, content_types, limit)


# ============================================================
# COMPONENT HISTORY
# ============================================================

def get_component_history(
    component_id: int,
    days: int = 30
) -> dict:
    """
    Get full history for a component over time.
    
    Args:
        component_id: The component ID
        days: How many days back to look (default 30)
    
    Returns:
        Component with all changes, problems, solutions, learnings
    """
    db = get_db()
    return db.get_component_history(component_id, days)


# ============================================================
# CONVERSATION HISTORY
# ============================================================

def get_conversation_history(
    project_id: int,
    session_id: Optional[str] = None,
    limit: int = 20
) -> list[dict]:
    """
    Get conversation history for a project.
    
    Args:
        project_id: The project ID
        session_id: Optional session filter
        limit: Max results (default 20)
    
    Returns:
        List of conversations
    """
    db = get_db()
    conversations = db.get_conversation_history(project_id, session_id, limit)
    return [c.model_dump() for c in conversations]


# ============================================================
# CROSS-REFERENCE TOOLS
# ============================================================

def link_items(
    source_type: str,
    source_id: int,
    target_type: str,
    target_id: int,
    relationship: str,
    source_project_id: Optional[int] = None,
    target_project_id: Optional[int] = None,
    notes: Optional[str] = None
) -> dict:
    """
    Create a cross-reference between items.
    
    Args:
        source_type: Type of source item ('problem', 'solution', 'learning', 'component', 'change')
        source_id: ID of source item
        target_type: Type of target item
        target_id: ID of target item
        relationship: How they're related ('similar_to', 'derived_from', 'contradicts', 'depends_on', 'supersedes', 'related_to')
        source_project_id: Project ID of source (auto-detected if not provided)
        target_project_id: Project ID of target (auto-detected if not provided)
        notes: Optional notes about the relationship
    
    Returns:
        The created cross-reference
    """
    db = get_db()
    
    # Auto-detect project IDs if not provided
    if source_project_id is None:
        source_project_id = _get_project_id_for_item(db, source_type, source_id)
    if target_project_id is None:
        target_project_id = _get_project_id_for_item(db, target_type, target_id)
    
    return db.link_items(
        source_project_id, source_type, source_id,
        target_project_id, target_type, target_id,
        relationship, notes
    )


def _get_project_id_for_item(db, item_type: str, item_id: int) -> int:
    """Helper to get project_id for any item type."""
    if item_type == 'component':
        comp = db.get_component(item_id)
        return comp.project_id if comp else 0
    elif item_type == 'problem':
        prob = db.get_problem(item_id)
        if prob:
            comp = db.get_component(prob.component_id)
            return comp.project_id if comp else 0
    elif item_type == 'solution':
        sol = db.get_solution(item_id)
        if sol:
            prob = db.get_problem(sol.problem_id)
            if prob:
                comp = db.get_component(prob.component_id)
                return comp.project_id if comp else 0
    elif item_type == 'learning':
        learnings = db.get_learnings()
        for l in learnings:
            if l.id == item_id:
                return l.project_id
    elif item_type == 'change':
        # Need to trace through component
        pass
    return 0


def find_related(
    item_type: str,
    item_id: int
) -> list[dict]:
    """
    Find all items related to this one.
    
    Args:
        item_type: Type of item ('problem', 'solution', 'learning', 'component', 'change')
        item_id: ID of the item
    
    Returns:
        List of cross-references (both incoming and outgoing)
    """
    db = get_db()
    return db.find_related(item_type, item_id)


# ============================================================
# STORY GENERATION TOOLS
# ============================================================

def generate_project_story(project_id: int) -> dict:
    """
    Generate narrative storyboard data for a project.
    Returns structured data that GUI renders as visual story.
    
    Args:
        project_id: The project ID
    
    Returns:
        Complete story data with project, components, problems, solutions,
        changes, learnings, sessions, and stats
    """
    db = get_db()
    return db.get_project_story_data(project_id)


def generate_problem_journey(problem_id: int) -> dict:
    """
    Generate the journey map for a problem.
    Shows all attempts, branches, outcomes, learnings.
    
    Args:
        problem_id: The problem ID
    
    Returns:
        Problem journey with attempts tree, solution, related learnings, stats
    """
    db = get_db()
    return db.get_problem_journey_data(problem_id)


def generate_architecture_diagram(project_id: int) -> dict:
    """
    Generate component diagram data for a project.
    Shows hierarchy, relationships, problem hotspots.
    
    Args:
        project_id: The project ID
    
    Returns:
        Diagram data with nodes (components) and edges (relationships)
    """
    db = get_db()
    return db.get_architecture_data(project_id)


# ============================================================
# v1.1 FILE ATTACHMENT TOOLS
# ============================================================

# Default data directory for FlowState
FLOWSTATE_DATA_DIR = Path.home() / "FlowState-Data"


def _get_project_bundle_path(project_name: str) -> Path:
    """Get the path to a project's bundle directory."""
    return FLOWSTATE_DATA_DIR / "projects" / f"{project_name.lower().replace(' ', '-')}.flowstate"


def _compute_file_hash(file_path: Path) -> str:
    """Compute SHA256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def _get_file_type(file_path: Path) -> str:
    """Determine file type category from extension."""
    ext = file_path.suffix.lower()
    if ext in ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf']:
        return 'document'
    elif ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']:
        return 'image'
    elif ext in ['.py', '.js', '.ts', '.swift', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.jsx', '.tsx', '.css', '.html']:
        return 'code'
    else:
        return 'other'


def attach_file(
    project_id: int,
    file_path: str,
    component_id: Optional[int] = None,
    problem_id: Optional[int] = None,
    user_description: Optional[str] = None,
    tags: Optional[list[str]] = None,
    copy_to_bundle: bool = True
) -> dict:
    """
    Attach a file to a project, component, or problem.
    
    Args:
        project_id: Which project to attach to
        file_path: Path to the file to attach
        component_id: Optional component to attach to
        problem_id: Optional problem to attach to
        user_description: Optional description from user
        tags: Optional list of tags
        copy_to_bundle: If True, copy file to project bundle; else reference external path
    
    Returns:
        The created attachment record
    """
    db = get_db()
    source_path = Path(file_path)
    
    if not source_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Get project info
    project = db.get_project(project_id)
    if not project:
        raise ValueError(f"Project not found: {project_id}")
    
    # Compute file metadata
    file_name = source_path.name
    file_type = source_path.suffix.lstrip('.').lower()
    file_size = source_path.stat().st_size
    file_hash = _compute_file_hash(source_path)
    
    # Determine storage path
    if copy_to_bundle:
        bundle_path = _get_project_bundle_path(project.name)
        attachments_dir = bundle_path / "attachments"
        attachments_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy file to bundle
        dest_path = attachments_dir / file_name
        # Handle name collision
        counter = 1
        while dest_path.exists():
            stem = source_path.stem
            dest_path = attachments_dir / f"{stem}_{counter}{source_path.suffix}"
            counter += 1
        
        shutil.copy2(source_path, dest_path)
        stored_path = str(dest_path.relative_to(bundle_path))
        is_external = False
    else:
        stored_path = str(source_path.absolute())
        is_external = True
    
    # Insert into database
    conn = db._conn()
    try:
        cursor = conn.execute(
            """INSERT INTO attachments 
               (project_id, component_id, problem_id, file_name, file_path, 
                file_type, file_size, file_hash, is_external, user_description, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (project_id, component_id, problem_id, file_name, stored_path,
             file_type, file_size, file_hash, is_external, user_description,
             ','.join(tags) if tags else None)
        )
        conn.commit()
        attachment_id = cursor.lastrowid
        
        # Fetch and return the created attachment
        row = conn.execute("SELECT * FROM attachments WHERE id = ?", (attachment_id,)).fetchone()
        return dict(row) if row else {"id": attachment_id}
    finally:
        conn.close()


def get_attachments(
    project_id: Optional[int] = None,
    component_id: Optional[int] = None,
    problem_id: Optional[int] = None
) -> list[dict]:
    """
    Get file attachments with optional filters.
    
    Args:
        project_id: Filter by project
        component_id: Filter by component
        problem_id: Filter by problem
    
    Returns:
        List of attachment records
    """
    db = get_db()
    conn = db._conn()
    try:
        conditions = []
        params = []
        
        if project_id is not None:
            conditions.append("project_id = ?")
            params.append(project_id)
        if component_id is not None:
            conditions.append("component_id = ?")
            params.append(component_id)
        if problem_id is not None:
            conditions.append("problem_id = ?")
            params.append(problem_id)
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        rows = conn.execute(
            f"SELECT * FROM attachments WHERE {where_clause} ORDER BY created_at DESC",
            params
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def remove_attachment(
    attachment_id: int,
    delete_file: bool = False
) -> dict:
    """
    Remove an attachment record, optionally deleting the file.
    
    Args:
        attachment_id: The attachment to remove
        delete_file: If True and file is in bundle, delete the actual file
    
    Returns:
        Success status and info
    """
    db = get_db()
    conn = db._conn()
    try:
        # Get attachment first
        row = conn.execute("SELECT * FROM attachments WHERE id = ?", (attachment_id,)).fetchone()
        if not row:
            return {"success": False, "error": "Attachment not found"}
        
        attachment = dict(row)
        
        # Delete file if requested and not external
        if delete_file and not attachment['is_external']:
            project = db.get_project(attachment['project_id'])
            if project:
                bundle_path = _get_project_bundle_path(project.name)
                file_path = bundle_path / attachment['file_path']
                if file_path.exists():
                    os.remove(file_path)
        
        # Delete from database
        conn.execute("DELETE FROM attachments WHERE id = ?", (attachment_id,))
        conn.commit()
        
        return {"success": True, "deleted_attachment": attachment}
    finally:
        conn.close()


def search_file_content(
    query: str,
    project_id: Optional[int] = None,
    file_types: Optional[list[str]] = None,
    limit: int = 10
) -> list[dict]:
    """
    Search across indexed file content (content_locations table).
    
    Args:
        query: Search query
        project_id: Optional project filter
        file_types: Optional list of file types to search
        limit: Max results
    
    Returns:
        List of matching content locations with file info
    """
    db = get_db()
    conn = db._conn()
    try:
        # Build query
        sql = """
            SELECT cl.*, a.file_name, a.file_path, a.file_type, a.project_id
            FROM content_locations cl
            JOIN attachments a ON cl.attachment_id = a.id
            WHERE cl.description LIKE ? OR cl.snippet LIKE ?
        """
        params = [f"%{query}%", f"%{query}%"]
        
        if project_id is not None:
            sql += " AND a.project_id = ?"
            params.append(project_id)
        
        if file_types:
            placeholders = ",".join(["?"] * len(file_types))
            sql += f" AND a.file_type IN ({placeholders})"
            params.extend(file_types)
        
        sql += f" ORDER BY cl.created_at DESC LIMIT ?"
        params.append(limit)
        
        rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


# ============================================================
# v1.1 GIT SYNC TOOLS
# ============================================================

def _run_git_command(args: list[str], cwd: Optional[Path] = None) -> tuple[bool, str, str]:
    """Run a git command and return (success, stdout, stderr)."""
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=cwd or FLOWSTATE_DATA_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Git command timed out"
    except Exception as e:
        return False, "", str(e)


def git_init() -> dict:
    """
    Initialize FlowState data directory as a Git repository.
    Creates standard .gitignore for FlowState.
    
    Returns:
        Git status info
    """
    # Ensure data directory exists
    FLOWSTATE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    projects_dir = FLOWSTATE_DATA_DIR / "projects"
    projects_dir.mkdir(exist_ok=True)
    
    # Check if already initialized
    git_dir = FLOWSTATE_DATA_DIR / ".git"
    if git_dir.exists():
        return git_status()
    
    # Initialize git
    success, stdout, stderr = _run_git_command(["init"])
    if not success:
        return {"success": False, "error": stderr}
    
    # Create .gitignore
    gitignore_content = """# OS files
.DS_Store
Thumbs.db

# Temporary files
*.sqlite-journal
*.sqlite-wal
*.sqlite-shm
*.tmp
*.bak

# Local backups (don't sync conflict backups)
*.local-backup-*

# Large media (optional - user can toggle)
# *.mp4
# *.mov
"""
    gitignore_path = FLOWSTATE_DATA_DIR / ".gitignore"
    gitignore_path.write_text(gitignore_content)
    
    # Create README
    readme_content = """# FlowState Data

This repository contains your FlowState development memory.

**Do not manually edit these files.**

Manage through the FlowState app or MCP server.
"""
    readme_path = FLOWSTATE_DATA_DIR / "README.md"
    readme_path.write_text(readme_content)
    
    # Initial commit
    _run_git_command(["add", "."])
    _run_git_command(["commit", "-m", "FlowState initialized"])
    
    return git_status()


def git_status() -> dict:
    """
    Get current Git repository status.
    
    Returns:
        Git status with pending changes, remote, branch info
    """
    git_dir = FLOWSTATE_DATA_DIR / ".git"
    if not git_dir.exists():
        return {
            "initialized": False,
            "has_remote": False,
            "branch": None,
            "pending_changes": 0,
            "error": "Not a git repository. Run git_init first."
        }
    
    # Get branch
    success, stdout, _ = _run_git_command(["branch", "--show-current"])
    branch = stdout.strip() if success else "unknown"
    
    # Get remote
    success, stdout, _ = _run_git_command(["remote", "-v"])
    has_remote = bool(stdout.strip())
    remote_url = None
    if has_remote:
        lines = stdout.strip().split("\n")
        if lines:
            parts = lines[0].split()
            if len(parts) >= 2:
                remote_url = parts[1]
    
    # Get status (pending changes)
    success, stdout, _ = _run_git_command(["status", "--porcelain"])
    pending_changes = len(stdout.strip().split("\n")) if stdout.strip() else 0
    
    # Get last commit info
    success, stdout, _ = _run_git_command(["log", "-1", "--format=%H|%s|%ai"])
    last_commit = None
    if success and stdout.strip():
        parts = stdout.strip().split("|")
        if len(parts) >= 3:
            last_commit = {
                "hash": parts[0][:8],
                "message": parts[1],
                "date": parts[2]
            }
    
    return {
        "initialized": True,
        "has_remote": has_remote,
        "remote_url": remote_url,
        "branch": branch,
        "pending_changes": pending_changes,
        "last_commit": last_commit
    }


def git_sync(commit_message: Optional[str] = None) -> dict:
    """
    Perform full sync: add all, commit, pull --rebase, push.
    
    Args:
        commit_message: Custom commit message (default: timestamp)
    
    Returns:
        Sync result with status info
    """
    git_dir = FLOWSTATE_DATA_DIR / ".git"
    if not git_dir.exists():
        return {"success": False, "error": "Not a git repository. Run git_init first."}
    
    # Check for remote
    status = git_status()
    
    # Add all changes
    success, stdout, stderr = _run_git_command(["add", "."])
    if not success:
        return {"success": False, "step": "add", "error": stderr}
    
    # Check if there's anything to commit
    success, stdout, _ = _run_git_command(["status", "--porcelain"])
    has_changes = bool(stdout.strip())
    
    # Commit if there are changes
    if has_changes:
        msg = commit_message or f"FlowState sync - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        success, stdout, stderr = _run_git_command(["commit", "-m", msg])
        if not success:
            return {"success": False, "step": "commit", "error": stderr}
    
    # Pull and push if remote exists
    if status.get("has_remote"):
        # Pull with rebase
        success, stdout, stderr = _run_git_command(["pull", "--rebase", "origin", status.get("branch", "main")])
        if not success and "Could not resolve host" not in stderr:
            # Might be a conflict - save local backup
            backup_time = datetime.now().strftime("%Y%m%d%H%M%S")
            return {
                "success": False, 
                "step": "pull", 
                "error": stderr,
                "conflict": True,
                "backup_hint": f"Local changes may need manual resolution"
            }
        
        # Push
        success, stdout, stderr = _run_git_command(["push", "origin", status.get("branch", "main")])
        if not success and "Could not resolve host" not in stderr:
            return {"success": False, "step": "push", "error": stderr}
    
    return {
        "success": True,
        "committed": has_changes,
        "pushed": status.get("has_remote", False),
        "message": commit_message or "FlowState sync"
    }


def git_set_remote(remote_url: str) -> dict:
    """
    Add or update the remote URL.
    
    Args:
        remote_url: Git remote URL (e.g., https://github.com/user/repo.git)
    
    Returns:
        Status info
    """
    git_dir = FLOWSTATE_DATA_DIR / ".git"
    if not git_dir.exists():
        return {"success": False, "error": "Not a git repository. Run git_init first."}
    
    # Check if remote exists
    success, stdout, _ = _run_git_command(["remote", "-v"])
    has_origin = "origin" in stdout
    
    if has_origin:
        # Update existing remote
        success, stdout, stderr = _run_git_command(["remote", "set-url", "origin", remote_url])
    else:
        # Add new remote
        success, stdout, stderr = _run_git_command(["remote", "add", "origin", remote_url])
    
    if not success:
        return {"success": False, "error": stderr}
    
    return {"success": True, "remote_url": remote_url}


def git_clone(remote_url: str, local_path: Optional[str] = None) -> dict:
    """
    Clone an existing FlowState repository.
    
    Args:
        remote_url: Git remote URL to clone
        local_path: Optional local path (default: FlowState data directory)
    
    Returns:
        Clone result
    """
    target_path = Path(local_path) if local_path else FLOWSTATE_DATA_DIR
    
    # Don't clone if directory already has content
    if target_path.exists() and any(target_path.iterdir()):
        return {"success": False, "error": f"Directory not empty: {target_path}"}
    
    # Clone
    target_path.parent.mkdir(parents=True, exist_ok=True)
    success, stdout, stderr = _run_git_command(
        ["clone", remote_url, str(target_path)],
        cwd=target_path.parent
    )
    
    if not success:
        return {"success": False, "error": stderr}
    
    return {"success": True, "path": str(target_path), "remote_url": remote_url}


def git_history(limit: int = 20) -> list[dict]:
    """
    Get recent commit history.
    
    Args:
        limit: Max number of commits to return
    
    Returns:
        List of commit records
    """
    git_dir = FLOWSTATE_DATA_DIR / ".git"
    if not git_dir.exists():
        return []
    
    success, stdout, _ = _run_git_command([
        "log", f"-{limit}", "--format=%H|%s|%ai|%an"
    ])
    
    if not success or not stdout.strip():
        return []
    
    commits = []
    for line in stdout.strip().split("\n"):
        parts = line.split("|")
        if len(parts) >= 4:
            commits.append({
                "hash": parts[0][:8],
                "full_hash": parts[0],
                "message": parts[1],
                "date": parts[2],
                "author": parts[3]
            })
    
    return commits


# ============================================================
# v1.1 UPDATED TOOLS
# ============================================================

def get_project_context_v11(
    project_name: str, 
    hours: int = 48,
    include_files: bool = True
) -> Optional[dict]:
    """
    v1.1 KILLER TOOL: Get everything needed to work on a project.
    Now includes file attachments!
    
    Returns:
    - Project details
    - All components
    - Active problems (open, investigating)
    - Recent changes (last 24-48 hours)
    - High-priority todos
    - Recent learnings
    - Current session if any
    - File attachments with key locations (NEW in v1.1)
    
    Args:
        project_name: Name of the project
        hours: How many hours back to look for changes (default 48)
        include_files: Include file attachments in context (default True)
    
    Returns:
        Full project context or None if project not found
    """
    db = get_db()
    ctx = db.get_project_context(project_name, hours)
    if ctx is None:
        return None
    
    result = {
        "project": ctx.project.model_dump(),
        "components": [c.model_dump() for c in ctx.components],
        "open_problems": [p.model_dump() for p in ctx.open_problems],
        "recent_changes": [c.model_dump() for c in ctx.recent_changes],
        "high_priority_todos": [t.model_dump() for t in ctx.high_priority_todos],
        "recent_learnings": [l.model_dump() for l in ctx.recent_learnings],
        "current_session": ctx.current_session.model_dump() if ctx.current_session else None
    }
    
    # Add file attachments if requested (v1.1)
    if include_files:
        attachments = get_attachments(project_id=ctx.project.id)
        result["attachments"] = attachments
        
        # Get content locations for attachments
        conn = db._conn()
        try:
            for att in attachments:
                locations = conn.execute(
                    "SELECT * FROM content_locations WHERE attachment_id = ?",
                    (att['id'],)
                ).fetchall()
                att['content_locations'] = [dict(l) for l in locations]
        finally:
            conn.close()
    
    return result


def get_project_context_lean(
    project_name: str,
    hours: int = 48
) -> Optional[dict]:
    """
    LEAN VERSION: Get project context with minimal token footprint.
    
    Returns summary stats instead of full objects. Use this at session start
    to avoid context overflow. Call specific tools (get_open_problems, etc.)
    only when you need full details.
    
    Args:
        project_name: Name of the project
        hours: How many hours back for changes (default 48)
    
    Returns:
        Compact context with:
        - project: id, name, status only
        - stats: counts of components, problems, todos, etc.
        - recent_focus: last problem/component worked on
        - blocking: any critical/high priority open items
        - quick_todos: up to 3 pending todo titles
    """
    db = get_db()
    ctx = db.get_project_context(project_name, hours)
    if ctx is None:
        return None
    
    # Build lean response
    project = ctx.project
    
    # Get blocking items (high/critical open problems)
    blocking = [
        {"id": p.id, "title": p.title[:60]}
        for p in ctx.open_problems 
        if p.severity in ('critical', 'high')
    ][:3]
    
    # Get top 3 pending todos (title only)
    quick_todos = [
        t.title[:50] for t in ctx.high_priority_todos[:3]
    ]
    
    # Get recent focus from changes
    recent_focus = None
    if ctx.recent_changes:
        last_change = ctx.recent_changes[0]
        recent_focus = f"Component {last_change.component_id}: {last_change.field_name}"
    
    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "status": project.status
        },
        "stats": {
            "components": len(ctx.components),
            "open_problems": len(ctx.open_problems),
            "pending_todos": len(ctx.high_priority_todos),
            "recent_changes": len(ctx.recent_changes),
            "learnings": len(ctx.recent_learnings)
        },
        "blocking": blocking,
        "quick_todos": quick_todos,
        "recent_focus": recent_focus,
        "has_active_session": ctx.current_session is not None
    }


# ============================================================
# v1.3 INTELLIGENCE LAYER TOOLS
# ============================================================

# -------------------- LEARNED SKILLS --------------------

def learn_skill(
    skill_type: str,
    skill: str,
    context: str = None,
    project_id: int = None,
    tool_name: str = None,
    source_type: str = None,
    source_session_id: int = None
) -> dict:
    """
    Record a new learned skill.
    
    Skills are behaviors or approaches that Claude learns work well.
    They can be tool-specific, project-specific, or general.
    
    Args:
        skill_type: Type of skill - 'tool_capability', 'user_preference', 
                   'approach', 'gotcha', 'project_specific'
        skill: The skill description (what was learned)
        context: When/where this skill applies
        project_id: Project this skill relates to (None for global)
        tool_name: Tool this skill relates to (if tool-specific)
        source_type: How it was learned - 'default', 'learned', 'user_defined'
        source_session_id: Session where this was learned
    
    Returns:
        The created skill record
    """
    db = get_db()
    return db.learn_skill(
        skill_type=skill_type,
        skill=skill,
        context=context,
        project_id=project_id,
        tool_name=tool_name,
        source_type=source_type,
        source_session_id=source_session_id
    )


def get_skills(
    project_id: int = None,
    skill_type: str = None,
    promoted_only: bool = False,
    tool_name: str = None,
    min_confidence: float = 0.0
) -> list[dict]:
    """
    Get learned skills with optional filters.
    
    Args:
        project_id: Filter to project-specific + global skills
        skill_type: Filter by type
        promoted_only: Only return promoted (proven) skills
        tool_name: Filter by tool
        min_confidence: Minimum confidence threshold
    
    Returns:
        List of skill records
    """
    db = get_db()
    return db.get_skills(
        project_id=project_id,
        skill_type=skill_type,
        promoted_only=promoted_only,
        tool_name=tool_name,
        min_confidence=min_confidence
    )


def apply_skill(skill_id: int, succeeded: bool) -> dict:
    """
    Record that a skill was applied and whether it succeeded.
    
    Updates the skill's confidence score based on outcome.
    
    Args:
        skill_id: ID of the skill that was applied
        succeeded: Whether applying the skill led to success
    
    Returns:
        Updated skill record
    """
    db = get_db()
    return db.apply_skill(skill_id, succeeded)


def confirm_skill(skill_id: int, increment_session: bool = True) -> dict:
    """
    Confirm a skill worked in this session, potentially promoting it.
    
    Skills are promoted when they work across 3+ sessions with 80%+ success.
    
    Args:
        skill_id: ID of the skill to confirm
        increment_session: Whether to count this as a new session for the skill
    
    Returns:
        Updated skill record (may now be promoted)
    """
    db = get_db()
    return db.confirm_skill(skill_id, increment_session)


def promote_skills(min_sessions: int = 3, min_success_rate: float = 0.8) -> list[dict]:
    """
    Promote all skills that meet criteria.
    
    Promoted skills are considered proven and get higher priority.
    
    Args:
        min_sessions: Minimum sessions where skill was used
        min_success_rate: Minimum success rate required
    
    Returns:
        List of newly promoted skills
    """
    db = get_db()
    return db.promote_skills(min_sessions, min_success_rate)


# -------------------- SESSION STATE --------------------

def save_state(
    project_id: int,
    state_type: str,
    focus_summary: str = None,
    active_problem_ids: list = None,
    active_component_ids: list = None,
    pending_decisions: list = None,
    key_facts: list = None,
    previous_state_id: int = None,
    tool_calls_this_session: int = 0,
    estimated_tokens: int = None
) -> dict:
    """
    Save Claude's session state for later restoration.
    
    State types:
    - 'start': Beginning of a session
    - 'checkpoint': Mid-session save point
    - 'handoff': End of session, ready for next session
    - 'end': Final state
    
    Args:
        project_id: Project this state belongs to
        state_type: Type of state checkpoint
        focus_summary: What the session was focused on
        active_problem_ids: IDs of problems being worked on
        active_component_ids: IDs of components being worked on
        pending_decisions: Decisions that need to be made
        key_facts: Important facts from this session
        previous_state_id: ID of the previous state (for chaining)
        tool_calls_this_session: Number of tool calls so far
        estimated_tokens: Estimated token usage
    
    Returns:
        The created state record
    """
    db = get_db()
    return db.save_state(
        project_id=project_id,
        state_type=state_type,
        focus_summary=focus_summary,
        active_problem_ids=active_problem_ids,
        active_component_ids=active_component_ids,
        pending_decisions=pending_decisions,
        key_facts=key_facts,
        previous_state_id=previous_state_id,
        tool_calls_this_session=tool_calls_this_session,
        estimated_tokens=estimated_tokens
    )


def get_latest_state(project_id: int) -> Optional[dict]:
    """
    Get the most recent session state for a project.
    
    Args:
        project_id: Project to get state for
    
    Returns:
        Latest state record or None
    """
    db = get_db()
    return db.get_latest_state(project_id)


def get_state_chain(state_id: int, max_depth: int = 5) -> list[dict]:
    """
    Get chain of previous states for walkback.
    
    Useful for understanding the history of a session.
    
    Args:
        state_id: Starting state ID
        max_depth: Maximum number of states to retrieve
    
    Returns:
        List of states from newest to oldest
    """
    db = get_db()
    return db.get_state_chain(state_id, max_depth)


def restore_state(state_id: int) -> Optional[dict]:
    """
    Get a specific state by ID for restoration.
    
    Args:
        state_id: ID of state to restore
    
    Returns:
        State record or None
    """
    db = get_db()
    return db.restore_state(state_id)


# -------------------- TOOL REGISTRY --------------------

def register_tool(
    mcp_server: str,
    tool_name: str,
    effective_for: list = None,
    common_parameters: dict = None,
    gotchas: list = None,
    pairs_with: list = None
) -> dict:
    """
    Register or update a tool in the registry.
    
    The tool registry tracks available tools and their effectiveness.
    
    Args:
        mcp_server: Name of the MCP server providing this tool
        tool_name: Name of the tool
        effective_for: List of task types this tool is good for
        common_parameters: Common parameter patterns that work well
        gotchas: Known issues or pitfalls with this tool
        pairs_with: Tools that work well in combination with this one
    
    Returns:
        The tool registry record
    """
    db = get_db()
    return db.register_tool(
        mcp_server=mcp_server,
        tool_name=tool_name,
        effective_for=effective_for,
        common_parameters=common_parameters,
        gotchas=gotchas,
        pairs_with=pairs_with
    )


def get_tools(
    mcp_server: str = None,
    min_success_rate: float = 0.0
) -> list[dict]:
    """
    Get tools from registry with optional filters.
    
    Args:
        mcp_server: Filter by MCP server
        min_success_rate: Minimum success rate threshold
    
    Returns:
        List of tool registry records
    """
    db = get_db()
    return db.get_tools(mcp_server=mcp_server, min_success_rate=min_success_rate)


def update_tool_stats(mcp_server: str, tool_name: str, succeeded: bool) -> dict:
    """
    Update usage stats for a tool after use.
    
    Args:
        mcp_server: Name of the MCP server
        tool_name: Name of the tool
        succeeded: Whether the tool use was successful
    
    Returns:
        Updated tool registry record
    """
    db = get_db()
    return db.update_tool_stats(mcp_server, tool_name, succeeded)


def get_tool_recommendation(task_type: str, project_id: int = None) -> list[dict]:
    """
    Get recommended tools for a task type based on past success.
    
    Args:
        task_type: Type of task (e.g., 'file_creation', 'search', 'debugging')
        project_id: Optional project context
    
    Returns:
        List of recommended tools with their stats
    """
    db = get_db()
    return db.get_tool_recommendation(task_type, project_id)


# -------------------- TOOL USAGE LOGGING --------------------

def log_tool_use(
    mcp_server: str,
    tool_name: str,
    project_id: int = None,
    session_state_id: int = None,
    parameters: dict = None,
    result_size: int = None,
    execution_time_ms: int = None,
    task_type: str = None,
    trigger: str = None,
    preceding_tool_id: int = None
) -> dict:
    """
    Log a tool usage for pattern analysis.
    
    Args:
        mcp_server: Name of the MCP server
        tool_name: Name of the tool used
        project_id: Project context
        session_state_id: Current session state
        parameters: Parameters passed to the tool
        result_size: Size of the result (for tracking)
        execution_time_ms: How long the tool took
        task_type: What kind of task this was for
        trigger: What triggered this tool use
        preceding_tool_id: ID of the previous tool use (for sequences)
    
    Returns:
        The tool usage record
    """
    db = get_db()
    return db.log_tool_use(
        mcp_server=mcp_server,
        tool_name=tool_name,
        project_id=project_id,
        session_state_id=session_state_id,
        parameters=parameters,
        result_size=result_size,
        execution_time_ms=execution_time_ms,
        task_type=task_type,
        trigger=trigger,
        preceding_tool_id=preceding_tool_id
    )


def rate_tool_use(usage_id: int, was_useful: bool, user_correction: str = None) -> dict:
    """
    Rate a tool usage as useful or not.
    
    This feedback improves tool recommendations over time.
    
    Args:
        usage_id: ID of the tool usage to rate
        was_useful: Whether the tool use was helpful
        user_correction: Optional correction or feedback
    
    Returns:
        Updated tool usage record
    """
    db = get_db()
    return db.rate_tool_use(usage_id, was_useful, user_correction)


def get_usage_patterns(
    project_id: int = None,
    mcp_server: str = None,
    tool_name: str = None,
    limit: int = 100
) -> list[dict]:
    """
    Get tool usage patterns for analysis.
    
    Args:
        project_id: Filter by project
        mcp_server: Filter by MCP server
        tool_name: Filter by specific tool
        limit: Maximum records to return
    
    Returns:
        List of tool usage records
    """
    db = get_db()
    return db.get_usage_patterns(
        project_id=project_id,
        mcp_server=mcp_server,
        tool_name=tool_name,
        limit=limit
    )


# -------------------- BEHAVIOR PATTERNS --------------------

def record_pattern(
    pattern_type: str,
    pattern_name: str,
    trigger_conditions: dict = None,
    actions: list = None,
    project_id: int = None,
    source: str = "learned"
) -> dict:
    """
    Record a new behavior pattern.
    
    Patterns are sequences or approaches that work well in certain situations.
    
    Args:
        pattern_type: Type - 'tool_sequence', 'response_style', 
                     'checkpoint_trigger', 'task_approach'
        pattern_name: Descriptive name for the pattern
        trigger_conditions: When this pattern should be applied
        actions: What actions make up this pattern
        project_id: Project this pattern is specific to (None for global)
        source: How pattern was created - 'default', 'learned', 'user_defined'
    
    Returns:
        The created pattern record
    """
    db = get_db()
    return db.record_pattern(
        pattern_type=pattern_type,
        pattern_name=pattern_name,
        trigger_conditions=trigger_conditions,
        actions=actions,
        project_id=project_id,
        source=source
    )


def get_patterns(
    project_id: int = None,
    pattern_type: str = None,
    promoted_only: bool = False,
    min_confidence: float = 0.0
) -> list[dict]:
    """
    Get behavior patterns with optional filters.
    
    Args:
        project_id: Filter to project-specific + global patterns
        pattern_type: Filter by type
        promoted_only: Only return promoted (proven) patterns
        min_confidence: Minimum confidence threshold
    
    Returns:
        List of pattern records
    """
    db = get_db()
    return db.get_patterns(
        project_id=project_id,
        pattern_type=pattern_type,
        promoted_only=promoted_only,
        min_confidence=min_confidence
    )


def apply_pattern(pattern_id: int, succeeded: bool) -> dict:
    """
    Record that a pattern was applied and whether it succeeded.
    
    Updates the pattern's confidence score based on outcome.
    
    Args:
        pattern_id: ID of the pattern that was applied
        succeeded: Whether applying the pattern led to success
    
    Returns:
        Updated pattern record
    """
    db = get_db()
    return db.apply_pattern(pattern_id, succeeded)


def confirm_pattern(pattern_id: int, increment_session: bool = True) -> dict:
    """
    Confirm a pattern worked in this session, potentially promoting it.
    
    Patterns are promoted when they work across 3+ sessions with 80%+ success.
    
    Args:
        pattern_id: ID of the pattern to confirm
        increment_session: Whether to count this as a new session for the pattern
    
    Returns:
        Updated pattern record (may now be promoted)
    """
    db = get_db()
    return db.confirm_pattern(pattern_id, increment_session)


# -------------------- ALGORITHM METRICS --------------------

def log_metric(
    metric_type: str,
    context: str = None,
    action_taken: str = None,
    outcome: str = None,
    effectiveness_score: float = None,
    user_feedback: str = None,
    should_adjust: bool = None,
    suggested_adjustment: str = None,
    project_id: int = None,
    session_state_id: int = None
) -> dict:
    """
    Log an algorithm metric for self-improvement tracking.
    
    Metrics track how well Claude's behaviors are working.
    
    Args:
        metric_type: Type - 'checkpoint_timing', 'tool_choice', 
                    'response_quality', 'prediction_accuracy', 'user_satisfaction'
        context: Context where this metric was recorded
        action_taken: What action was taken
        outcome: What the outcome was
        effectiveness_score: 0.0-1.0 score
        user_feedback: Any feedback from the user
        should_adjust: Whether behavior should be adjusted
        suggested_adjustment: What adjustment to make
        project_id: Project context
        session_state_id: Session state context
    
    Returns:
        The created metric record
    """
    db = get_db()
    return db.log_metric(
        metric_type=metric_type,
        context=context,
        action_taken=action_taken,
        outcome=outcome,
        effectiveness_score=effectiveness_score,
        user_feedback=user_feedback,
        should_adjust=should_adjust,
        suggested_adjustment=suggested_adjustment,
        project_id=project_id,
        session_state_id=session_state_id
    )


def get_metrics(
    project_id: int = None,
    metric_type: str = None,
    session_state_id: int = None,
    limit: int = 100
) -> list[dict]:
    """
    Get algorithm metrics with optional filters.
    
    Args:
        project_id: Filter by project
        metric_type: Filter by type
        session_state_id: Filter by session
        limit: Maximum records to return
    
    Returns:
        List of metric records
    """
    db = get_db()
    return db.get_metrics(
        project_id=project_id,
        metric_type=metric_type,
        session_state_id=session_state_id,
        limit=limit
    )


def get_tuning_suggestions(project_id: int = None) -> list[dict]:
    """
    Get suggested tuning adjustments based on metrics.
    
    Returns adjustments that have been suggested multiple times.
    
    Args:
        project_id: Filter by project
    
    Returns:
        List of suggested adjustments with occurrence counts
    """
    db = get_db()
    return db.get_tuning_suggestions(project_id)


# -------------------- v1.3 SESSION MANAGEMENT --------------------

def initialize_session_v13(project_id: int) -> dict:
    """
    Initialize a v1.3 intelligent session.
    
    This is the enhanced session initialization that loads:
    - Previous session state for context
    - Applicable learned skills
    - Tool recommendations
    - Active behavior patterns
    - State chain for history
    
    Args:
        project_id: Project to initialize session for
    
    Returns:
        Dictionary containing:
        - session_state: The new session state
        - applicable_skills: Skills that may apply
        - tool_recommendations: Recommended tools
        - active_patterns: Patterns to follow
        - previous_state_chain: Recent state history
    """
    db = get_db()
    return db.initialize_session_v13(project_id)


def finalize_session_v13(
    session_state_id: int,
    focus_summary: str = None,
    active_problem_ids: list = None,
    active_component_ids: list = None,
    pending_decisions: list = None,
    key_facts: list = None,
    tool_calls_this_session: int = 0
) -> dict:
    """
    Finalize a v1.3 session with handoff state.
    
    Creates an 'end' state that can be used to resume next session.
    Also promotes any skills that are ready for promotion.
    
    Args:
        session_state_id: ID of the session state to finalize
        focus_summary: Summary of what the session focused on
        active_problem_ids: Problems that were being worked on
        active_component_ids: Components that were being worked on
        pending_decisions: Decisions left unmade
        key_facts: Important facts to remember
        tool_calls_this_session: Total tool calls in this session
    
    Returns:
        Dictionary containing:
        - end_state: The final session state
        - promoted_skills: Any skills that were promoted
    """
    db = get_db()
    return db.finalize_session_v13(
        session_state_id=session_state_id,
        focus_summary=focus_summary,
        active_problem_ids=active_problem_ids,
        active_component_ids=active_component_ids,
        pending_decisions=pending_decisions,
        key_facts=key_facts,
        tool_calls_this_session=tool_calls_this_session
    )
