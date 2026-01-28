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


# ============================================================
# v1.3 INTELLIGENCE LAYER MODELS
# ============================================================

# Type hints for v1.3 enums
SkillType = str  # 'tool_capability', 'user_preference', 'approach', 'gotcha', 'project_specific'
StateType = str  # 'start', 'checkpoint', 'handoff', 'end'
PatternType = str  # 'tool_sequence', 'response_style', 'checkpoint_trigger', 'task_approach'
PatternSource = str  # 'default', 'learned', 'user_defined'
MetricType = str  # 'checkpoint_timing', 'tool_choice', 'response_quality', 'prediction_accuracy', 'skill_application', 'promotion'


class LearnedSkill(BaseModel):
    """Knowledge Claude has learned about tools, user, and project."""
    id: Optional[int] = None
    skill_type: SkillType
    skill: str
    context: Optional[str] = None
    project_id: Optional[int] = None  # NULL = global skill
    tool_name: Optional[str] = None
    source_type: Optional[str] = None  # 'observation', 'correction', 'explicit', 'inference'
    source_session_id: Optional[int] = None
    confidence: float = 0.6
    session_count: int = 1
    times_applied: int = 0
    times_succeeded: int = 0
    promoted: bool = False
    promoted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SessionState(BaseModel):
    """Claude's working memory at checkpoints."""
    id: Optional[int] = None
    project_id: int
    state_type: StateType
    focus_summary: Optional[str] = None
    active_problem_ids: Optional[list[int]] = None  # JSON in DB
    active_component_ids: Optional[list[int]] = None  # JSON in DB
    pending_decisions: Optional[list[str]] = None  # JSON in DB
    key_facts: Optional[list[str]] = None  # JSON in DB
    previous_state_id: Optional[int] = None
    tool_calls_this_session: int = 0
    estimated_tokens: Optional[int] = None
    created_at: Optional[datetime] = None


class ToolRegistryEntry(BaseModel):
    """Knowledge about an MCP tool."""
    id: Optional[int] = None
    mcp_server: str
    tool_name: str
    effective_for: Optional[list[str]] = None  # JSON in DB
    common_parameters: Optional[dict] = None  # JSON in DB
    gotchas: Optional[list[str]] = None  # JSON in DB
    pairs_with: Optional[list[str]] = None  # JSON in DB
    times_used: int = 0
    times_succeeded: int = 0
    success_rate: float = 0.0
    last_used: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ToolUsage(BaseModel):
    """Log of an actual tool call."""
    id: Optional[int] = None
    project_id: Optional[int] = None
    session_state_id: Optional[int] = None
    tool_registry_id: Optional[int] = None
    mcp_server: str
    tool_name: str
    parameters: Optional[dict] = None  # JSON in DB
    result_size: Optional[int] = None
    execution_time_ms: Optional[int] = None
    task_type: Optional[str] = None  # 'read', 'write', 'search', 'create', etc.
    trigger: Optional[str] = None  # 'user_request', 'chained', 'automatic'
    preceding_tool_id: Optional[int] = None
    was_useful: Optional[bool] = None
    user_correction: Optional[str] = None
    created_at: Optional[datetime] = None


class BehaviorPattern(BaseModel):
    """A sequence or approach that works well."""
    id: Optional[int] = None
    project_id: Optional[int] = None  # NULL = global pattern
    pattern_type: PatternType
    pattern_name: str
    trigger_conditions: Optional[dict] = None  # JSON in DB
    actions: Optional[list[str]] = None  # JSON in DB
    times_used: int = 0
    times_succeeded: int = 0
    success_rate: float = 0.0
    source: PatternSource = "learned"
    confidence: float = 0.5
    session_count: int = 1
    promoted: bool = False
    promoted_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AlgorithmMetric(BaseModel):
    """Self-tuning feedback data."""
    id: Optional[int] = None
    project_id: Optional[int] = None
    session_state_id: Optional[int] = None
    metric_type: MetricType
    context: Optional[str] = None
    action_taken: Optional[str] = None
    outcome: Optional[str] = None
    effectiveness_score: Optional[float] = None
    user_feedback: Optional[str] = None
    should_adjust: Optional[bool] = None
    suggested_adjustment: Optional[str] = None
    created_at: Optional[datetime] = None


class IntelligenceContext(BaseModel):
    """Context for Claude session intelligence - returned by initialize_session."""
    session_state: SessionState
    applicable_skills: list[LearnedSkill] = Field(default_factory=list)
    tool_recommendations: list[ToolRegistryEntry] = Field(default_factory=list)
    active_patterns: list[BehaviorPattern] = Field(default_factory=list)
    previous_state_chain: list[SessionState] = Field(default_factory=list)
