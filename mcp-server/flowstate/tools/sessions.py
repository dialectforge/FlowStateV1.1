"""Session and conversation management tools."""

from typing import Optional
import json
from .utils import get_db

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
