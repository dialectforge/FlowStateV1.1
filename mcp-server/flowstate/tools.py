"""MCP tool definitions for FlowState."""

from typing import Optional
from .database import Database
from .models import ProjectContext


# Global database instance (initialized by server)
_db: Optional[Database] = None


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


def get_project_context(project_name: str, hours: int = 48) -> Optional[dict]:
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
    
    Args:
        project_name: Name of the project
        hours: How many hours back to look for changes (default 48)
    
    Returns:
        Full project context or None if project not found
    """
    db = get_db()
    ctx = db.get_project_context(project_name, hours)
    if ctx is None:
        return None
    
    return {
        "project": ctx.project.model_dump(),
        "components": [c.model_dump() for c in ctx.components],
        "open_problems": [p.model_dump() for p in ctx.open_problems],
        "recent_changes": [c.model_dump() for c in ctx.recent_changes],
        "high_priority_todos": [t.model_dump() for t in ctx.high_priority_todos],
        "recent_learnings": [l.model_dump() for l in ctx.recent_learnings],
        "current_session": ctx.current_session.model_dump() if ctx.current_session else None
    }


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
    hours: int = 24
) -> list[dict]:
    """
    Get recent changes.
    
    Args:
        project_id: Filter by project (optional)
        component_id: Filter by component (optional)
        hours: How far back to look (default 24)
    
    Returns:
        List of recent changes
    """
    db = get_db()
    changes = db.get_recent_changes(project_id, component_id, hours)
    return [c.model_dump() for c in changes]


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
    component_id: Optional[int] = None
) -> list[dict]:
    """
    Get all open/investigating problems.
    
    Args:
        project_id: Filter by project (optional)
        component_id: Filter by component (optional)
    
    Returns:
        List of open problems
    """
    db = get_db()
    problems = db.get_open_problems(project_id, component_id)
    return [p.model_dump() for p in problems]


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
    priority: Optional[str] = None
) -> list[dict]:
    """
    Get todos with optional filters.
    
    Args:
        project_id: The project ID
        status: Filter by status (optional)
        priority: Filter by priority (optional)
    
    Returns:
        List of todos
    """
    db = get_db()
    todos = db.get_todos(project_id, status, priority)
    return [t.model_dump() for t in todos]


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
    verified_only: bool = False
) -> list[dict]:
    """
    Get learnings with optional filters.
    
    Args:
        project_id: Filter by project (optional)
        category: Filter by category (optional)
        verified_only: Only return verified learnings
    
    Returns:
        List of learnings
    """
    db = get_db()
    learnings = db.get_learnings(project_id, category, verified_only)
    return [l.model_dump() for l in learnings]


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
