"""Pydantic models for FlowState data structures."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ============================================================
# ENUMS AS LITERALS (simpler than actual enums for JSON)
# ============================================================

ProjectStatus = str  # 'active', 'paused', 'completed', 'archived'
ComponentStatus = str  # 'planning', 'in_progress', 'testing', 'complete', 'deprecated'
ChangeType = str  # 'config', 'code', 'architecture', 'dependency', 'documentation', 'other'
ProblemStatus = str  # 'open', 'investigating', 'blocked', 'solved', 'wont_fix'
Severity = str  # 'low', 'medium', 'high', 'critical'
AttemptOutcome = str  # 'success', 'failure', 'partial', 'abandoned', 'pending'
Confidence = str  # 'attempted', 'worked_once', 'verified', 'proven', 'deprecated'
Priority = str  # 'low', 'medium', 'high', 'critical'
TodoStatus = str  # 'pending', 'in_progress', 'blocked', 'done', 'cancelled'
LearningCategory = str  # 'pattern', 'gotcha', 'best_practice', 'tool_tip', 'architecture', 'performance', 'security', 'other'
LearningSource = str  # 'experience', 'documentation', 'conversation', 'error', 'research'


# ============================================================
# CORE MODELS
# ============================================================

class Project(BaseModel):
    """A top-level project container."""
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: ProjectStatus = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Component(BaseModel):
    """A building block within a project."""
    id: Optional[int] = None
    project_id: int
    parent_component_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: ComponentStatus = "in_progress"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Change(BaseModel):
    """A logged change to a component."""
    id: Optional[int] = None
    component_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_type: Optional[ChangeType] = None
    reason: Optional[str] = None
    created_at: Optional[datetime] = None


class Problem(BaseModel):
    """An issue encountered during development."""
    id: Optional[int] = None
    component_id: int
    title: str
    description: Optional[str] = None
    status: ProblemStatus = "open"
    severity: Severity = "medium"
    root_cause: Optional[str] = None
    created_at: Optional[datetime] = None
    solved_at: Optional[datetime] = None


class SolutionAttempt(BaseModel):
    """An attempt to solve a problem (forms decision tree)."""
    id: Optional[int] = None
    problem_id: int
    parent_attempt_id: Optional[int] = None
    description: str
    outcome: Optional[AttemptOutcome] = "pending"
    confidence: Confidence = "attempted"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class Solution(BaseModel):
    """The winning solution for a problem."""
    id: Optional[int] = None
    problem_id: int
    winning_attempt_id: Optional[int] = None
    summary: str
    code_snippet: Optional[str] = None
    key_insight: Optional[str] = None
    created_at: Optional[datetime] = None


class Todo(BaseModel):
    """A task to complete."""
    id: Optional[int] = None
    project_id: int
    component_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: Priority = "medium"
    status: TodoStatus = "pending"
    due_date: Optional[datetime] = None
    blocked_by_problem_id: Optional[int] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class Conversation(BaseModel):
    """A logged Claude interaction."""
    id: Optional[int] = None
    project_id: int
    session_id: Optional[str] = None
    user_prompt_summary: str
    assistant_response_summary: Optional[str] = None
    key_decisions: Optional[list[str]] = None
    problems_referenced: Optional[list[int]] = None
    solutions_created: Optional[list[int]] = None
    tokens_used: Optional[int] = None
    created_at: Optional[datetime] = None


class Learning(BaseModel):
    """An insight or pattern discovered."""
    id: Optional[int] = None
    project_id: int
    component_id: Optional[int] = None
    category: Optional[LearningCategory] = None
    insight: str
    context: Optional[str] = None
    source: Optional[LearningSource] = "experience"
    verified: bool = False
    created_at: Optional[datetime] = None


class Session(BaseModel):
    """A work session."""
    id: Optional[int] = None
    project_id: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    focus_component_id: Optional[int] = None
    focus_problem_id: Optional[int] = None
    summary: Optional[str] = None
    outcomes: Optional[list[str]] = None
    duration_minutes: Optional[int] = None


# ============================================================
# CONTEXT MODELS (for get_project_context)
# ============================================================

class ProjectContext(BaseModel):
    """Everything needed to work on a project."""
    project: Project
    components: list[Component] = Field(default_factory=list)
    open_problems: list[Problem] = Field(default_factory=list)
    recent_changes: list[Change] = Field(default_factory=list)
    high_priority_todos: list[Todo] = Field(default_factory=list)
    recent_learnings: list[Learning] = Field(default_factory=list)
    current_session: Optional[Session] = None


class SearchResult(BaseModel):
    """A search result with relevance score."""
    content_type: str  # 'problem', 'solution', 'learning', etc.
    content_id: int
    project_id: int
    project_name: str
    title: str
    snippet: str
    relevance_score: float
