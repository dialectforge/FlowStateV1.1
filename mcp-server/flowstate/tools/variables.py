"""Project variables and methods tools."""

from typing import Optional
import json
from .utils import get_db

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
