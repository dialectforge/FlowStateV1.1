"""Todo management tools."""

from typing import Optional
from .utils import get_db, _compact_list

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
