"""FlowState MCP Server v1.5 - Consolidated Tools Edition.

Reduces 79 tools → 21 tools while preserving all functionality.
"""

import asyncio
import json
from pathlib import Path
from typing import Any, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from . import tools
from .database import Database, init_db


# Create server instance
server = Server("flowstate")


# ============================================================
# TOOL DEFINITIONS - v1.5 Consolidated
# ============================================================

TOOLS = [
    # ----------------------------------------
    # PROJECT TOOLS (3 tools)
    # ----------------------------------------
    Tool(
        name="list_projects",
        description="List all projects with their status.",
        inputSchema={
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["active", "paused", "completed", "archived"],
                    "description": "Filter by status"
                }
            }
        }
    ),
    Tool(
        name="create_project",
        description="Create a new project.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Project name (unique)"},
                "description": {"type": "string", "description": "Project description"}
            },
            "required": ["name"]
        }
    ),
    Tool(
        name="update_project",
        description="Update project details.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string", "enum": ["active", "paused", "completed", "archived"]}
            },
            "required": ["project_id"]
        }
    ),
    
    # ----------------------------------------
    # CONTEXT TOOL (1 tool - replaces 2)
    # ----------------------------------------
    Tool(
        name="get_context",
        description="Get project context. Use lean=True (default) for minimal tokens at session start. Use lean=False for full details when needed.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_name": {"type": "string", "description": "Project name"},
                "lean": {"type": "boolean", "description": "Minimal tokens (default True)", "default": True},
                "hours": {"type": "integer", "description": "Hours back for changes", "default": 48}
            },
            "required": ["project_name"]
        }
    ),
    
    # ----------------------------------------
    # COMPONENT TOOLS (3 tools)
    # ----------------------------------------
    Tool(
        name="create_component",
        description="Create a component within a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "parent_component_id": {"type": "integer", "description": "For nesting"}
            },
            "required": ["project_id", "name"]
        }
    ),
    Tool(
        name="list_components",
        description="List components in a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="update_component",
        description="Update a component.",
        inputSchema={
            "type": "object",
            "properties": {
                "component_id": {"type": "integer"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string", "enum": ["planning", "in_progress", "testing", "complete", "deprecated"]}
            },
            "required": ["component_id"]
        }
    ),
    
    # ----------------------------------------
    # LEARNING TOOLS (2 tools) - Core memory!
    # ----------------------------------------
    Tool(
        name="log_learning",
        description="Capture an insight or learning. This is your memory - use it!",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"},
                "insight": {"type": "string", "description": "The learning/insight"},
                "component_id": {"type": "integer"},
                "category": {"type": "string", "enum": ["pattern", "gotcha", "best_practice", "tool_tip", "architecture", "performance", "security", "other"]},
                "context": {"type": "string", "description": "When this applies"},
                "source": {"type": "string", "enum": ["experience", "documentation", "conversation", "error", "research"], "default": "experience"}
            },
            "required": ["project_id", "insight"]
        }
    ),
    Tool(
        name="get_learnings",
        description="Get learnings. Use compact=True to save tokens.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"},
                "category": {"type": "string", "enum": ["pattern", "gotcha", "best_practice", "tool_tip", "architecture", "performance", "security", "other"]},
                "compact": {"type": "boolean", "default": False}
            }
        }
    ),
    
    # ----------------------------------------
    # CHANGE TOOLS (2 tools)
    # ----------------------------------------
    Tool(
        name="log_change",
        description="Log a change to a component.",
        inputSchema={
            "type": "object",
            "properties": {
                "component_id": {"type": "integer"},
                "field_name": {"type": "string", "description": "What changed"},
                "old_value": {"type": "string"},
                "new_value": {"type": "string"},
                "reason": {"type": "string"},
                "change_type": {"type": "string", "enum": ["config", "code", "architecture", "dependency", "documentation", "other"]}
            },
            "required": ["component_id", "field_name"]
        }
    ),
    Tool(
        name="get_recent_changes",
        description="Get recent changes. Use compact=True to save tokens.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"},
                "component_id": {"type": "integer"},
                "hours": {"type": "integer", "default": 24},
                "compact": {"type": "boolean", "default": False}
            }
        }
    ),
    
    # ----------------------------------------
    # SEARCH TOOL (1 tool)
    # ----------------------------------------
    Tool(
        name="search",
        description="Search across problems, solutions, learnings, changes.",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "project_id": {"type": "integer"},
                "content_types": {"type": "array", "items": {"type": "string"}, "description": "Filter: problem, solution, learning, change"},
                "limit": {"type": "integer", "default": 10}
            },
            "required": ["query"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: PROBLEM (1 tool replaces 4)
    # ----------------------------------------
    Tool(
        name="problem",
        description="Manage problems. Actions: log, list, solve, get_tree",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["log", "list", "solve", "get_tree"]},
                # For log:
                "component_id": {"type": "integer"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"], "default": "medium"},
                # For list:
                "project_id": {"type": "integer"},
                "compact": {"type": "boolean", "default": False},
                # For solve:
                "problem_id": {"type": "integer"},
                "summary": {"type": "string"},
                "key_insight": {"type": "string"},
                "winning_attempt_id": {"type": "integer"},
                "code_snippet": {"type": "string"}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: ATTEMPT (1 tool replaces 2)
    # ----------------------------------------
    Tool(
        name="attempt",
        description="Manage solution attempts. Actions: log, outcome",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["log", "outcome"]},
                # For log:
                "problem_id": {"type": "integer"},
                "description": {"type": "string"},
                "parent_attempt_id": {"type": "integer"},
                # For outcome:
                "attempt_id": {"type": "integer"},
                "outcome": {"type": "string", "enum": ["success", "failure", "partial", "abandoned"]},
                "notes": {"type": "string"},
                "confidence": {"type": "string", "enum": ["attempted", "worked_once", "verified", "proven", "deprecated"], "default": "attempted"}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: TODO (1 tool replaces 3)
    # ----------------------------------------
    Tool(
        name="todo",
        description="Manage todos. Actions: add, update, list",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["add", "update", "list"]},
                # For add:
                "project_id": {"type": "integer"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "component_id": {"type": "integer"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"], "default": "medium"},
                "due_date": {"type": "string"},
                # For update:
                "todo_id": {"type": "integer"},
                "status": {"type": "string", "enum": ["pending", "in_progress", "blocked", "done", "cancelled"]},
                # For list:
                "compact": {"type": "boolean", "default": False}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: SESSION (1 tool replaces 6)
    # ----------------------------------------
    Tool(
        name="session",
        description="Manage sessions. Actions: start, end, current, log_conversation, list_conversations, list_sessions",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["start", "end", "current", "log_conversation", "list_conversations", "list_sessions"]},
                # For start:
                "project_id": {"type": "integer"},
                "focus_component_id": {"type": "integer"},
                "focus_problem_id": {"type": "integer"},
                # For end:
                "session_id": {"type": "integer"},
                "summary": {"type": "string"},
                "outcomes": {"type": "array", "items": {"type": "string"}},
                # For log_conversation:
                "user_prompt_summary": {"type": "string"},
                "assistant_response_summary": {"type": "string"},
                "key_decisions": {"type": "array", "items": {"type": "string"}},
                # For list:
                "limit": {"type": "integer", "default": 20}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: FILE (1 tool replaces 4)
    # ----------------------------------------
    Tool(
        name="file",
        description="Manage file attachments. Actions: attach, list, remove, search",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["attach", "list", "remove", "search"]},
                # For attach:
                "project_id": {"type": "integer"},
                "file_path": {"type": "string"},
                "component_id": {"type": "integer"},
                "problem_id": {"type": "integer"},
                "user_description": {"type": "string"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "copy_to_bundle": {"type": "boolean", "default": True},
                # For remove:
                "attachment_id": {"type": "integer"},
                "delete_file": {"type": "boolean", "default": False},
                # For search:
                "query": {"type": "string"},
                "file_types": {"type": "array", "items": {"type": "string"}},
                "limit": {"type": "integer", "default": 10}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: GIT (1 tool replaces 6)
    # ----------------------------------------
    Tool(
        name="git",
        description="Git operations. Actions: init, status, sync, set_remote, clone, history",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["init", "status", "sync", "set_remote", "clone", "history"]},
                # For sync:
                "commit_message": {"type": "string"},
                # For set_remote/clone:
                "remote_url": {"type": "string"},
                "local_path": {"type": "string"},
                # For history:
                "limit": {"type": "integer", "default": 20}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: VARIABLE (1 tool replaces 4)
    # ----------------------------------------
    Tool(
        name="variable",
        description="Manage project variables (servers, credentials, config). Actions: create, list, update, delete",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["create", "list", "update", "delete"]},
                "project_id": {"type": "integer"},
                "variable_id": {"type": "integer"},
                "name": {"type": "string"},
                "value": {"type": "string"},
                "description": {"type": "string"},
                "category": {"type": "string", "enum": ["server", "credentials", "config", "environment", "endpoint", "custom"], "default": "custom"},
                "is_secret": {"type": "boolean", "default": False}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: METHOD (1 tool replaces 4)
    # ----------------------------------------
    Tool(
        name="method",
        description="Manage project methods (auth flows, deployment steps, patterns). Actions: create, list, update, delete",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["create", "list", "update", "delete"]},
                "project_id": {"type": "integer"},
                "method_id": {"type": "integer"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "category": {"type": "string", "enum": ["auth", "deployment", "testing", "architecture", "workflow", "convention", "api", "security", "other"]},
                "steps": {"type": "array", "items": {"type": "string"}},
                "code_example": {"type": "string"},
                "related_component_id": {"type": "integer"}
            },
            "required": ["action"]
        }
    ),
    
    # ----------------------------------------
    # CONSOLIDATED: SELF_IMPROVE (1 tool replaces 23!)
    # The living skill system - keeps Claude learning
    # ----------------------------------------
    Tool(
        name="self_improve",
        description="Manage Claude's learned skills and session state. Actions: learn_skill, get_skills, confirm_skill, save_state, get_state, log_metric, get_metrics",
        inputSchema={
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": ["learn_skill", "get_skills", "confirm_skill", "save_state", "get_state", "log_metric", "get_metrics"]},
                # For learn_skill:
                "skill": {"type": "string", "description": "What was learned"},
                "skill_type": {"type": "string", "enum": ["tool_capability", "user_preference", "approach", "gotcha", "project_specific"]},
                "context": {"type": "string", "description": "When this applies"},
                "tool_name": {"type": "string"},
                # For get_skills:
                "project_id": {"type": "integer"},
                "promoted_only": {"type": "boolean", "default": False},
                # For confirm_skill:
                "skill_id": {"type": "integer"},
                # For save_state:
                "focus_summary": {"type": "string"},
                "key_facts": {"type": "array", "items": {"type": "string"}},
                "pending_decisions": {"type": "array", "items": {"type": "string"}},
                "active_problem_ids": {"type": "array", "items": {"type": "integer"}},
                "active_component_ids": {"type": "array", "items": {"type": "integer"}},
                # For get_state:
                # (uses project_id)
                # For log_metric:
                "metric_type": {"type": "string", "enum": ["checkpoint_timing", "tool_choice", "response_quality", "prediction_accuracy", "user_satisfaction"]},
                "effectiveness_score": {"type": "number", "description": "0.0-1.0"},
                "action_taken": {"type": "string"},
                "outcome": {"type": "string"}
            },
            "required": ["action"]
        }
    ),
]

# Total: 21 tools (down from 79!)


# ============================================================
# TOOL HANDLER - Routes consolidated tools to implementations
# ============================================================

@server.list_tools()
async def list_tools() -> list[Tool]:
    """Return available tools."""
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls with routing for consolidated tools."""
    try:
        result = await _route_tool(name, arguments)
        return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]


async def _route_tool(name: str, args: dict) -> Any:
    """Route tool calls to implementations."""
    
    # Direct tools (no action routing needed)
    if name == "list_projects":
        return tools.list_projects(args.get("status"))
    
    elif name == "create_project":
        return tools.create_project(args["name"], args.get("description"))
    
    elif name == "update_project":
        return tools.update_project(
            args["project_id"],
            args.get("name"),
            args.get("description"),
            args.get("status")
        )
    
    elif name == "get_context":
        lean = args.get("lean", True)
        if lean:
            return tools.get_project_context_lean(args["project_name"], args.get("hours", 48))
        else:
            return tools.get_project_context(args["project_name"], args.get("hours", 48))
    
    elif name == "create_component":
        return tools.create_component(
            args["project_id"],
            args["name"],
            args.get("description"),
            args.get("parent_component_id")
        )
    
    elif name == "list_components":
        return tools.list_components(args["project_id"])
    
    elif name == "update_component":
        return tools.update_component(
            args["component_id"],
            args.get("name"),
            args.get("description"),
            args.get("status")
        )
    
    elif name == "log_learning":
        return tools.log_learning(
            args["project_id"],
            args["insight"],
            args.get("category"),
            args.get("context"),
            args.get("component_id"),
            args.get("source", "experience")
        )
    
    elif name == "get_learnings":
        return tools.get_learnings(
            args.get("project_id"),
            args.get("category"),
            args.get("verified_only", False),
            args.get("compact", False)
        )
    
    elif name == "log_change":
        return tools.log_change(
            args["component_id"],
            args["field_name"],
            args.get("old_value"),
            args.get("new_value"),
            args.get("reason"),
            args.get("change_type")
        )
    
    elif name == "get_recent_changes":
        return tools.get_recent_changes(
            args.get("project_id"),
            args.get("component_id"),
            args.get("hours", 24),
            args.get("compact", False)
        )
    
    elif name == "search":
        return tools.search(
            args["query"],
            args.get("project_id"),
            args.get("content_types"),
            args.get("limit", 10)
        )
    
    # ----------------------------------------
    # CONSOLIDATED TOOL ROUTING
    # ----------------------------------------
    
    elif name == "problem":
        action = args["action"]
        if action == "log":
            return tools.log_problem(
                args["component_id"],
                args["title"],
                args.get("description"),
                args.get("severity", "medium")
            )
        elif action == "list":
            return tools.get_open_problems(
                args.get("project_id"),
                args.get("component_id"),
                args.get("compact", False)
            )
        elif action == "solve":
            return tools.mark_problem_solved(
                args["problem_id"],
                args["summary"],
                args.get("winning_attempt_id"),
                args.get("key_insight"),
                args.get("code_snippet")
            )
        elif action == "get_tree":
            return tools.get_problem_tree(args["problem_id"])
    
    elif name == "attempt":
        action = args["action"]
        if action == "log":
            return tools.log_attempt(
                args["problem_id"],
                args["description"],
                args.get("parent_attempt_id")
            )
        elif action == "outcome":
            return tools.mark_attempt_outcome(
                args["attempt_id"],
                args["outcome"],
                args.get("notes"),
                args.get("confidence", "attempted")
            )
    
    elif name == "todo":
        action = args["action"]
        if action == "add":
            return tools.add_todo(
                args["project_id"],
                args["title"],
                args.get("description"),
                args.get("component_id"),
                args.get("priority", "medium"),
                args.get("due_date")
            )
        elif action == "update":
            return tools.update_todo(
                args["todo_id"],
                args.get("title"),
                args.get("description"),
                args.get("status"),
                args.get("priority")
            )
        elif action == "list":
            return tools.get_todos(
                args["project_id"],
                args.get("status"),
                args.get("priority"),
                args.get("compact", False)
            )
    
    elif name == "session":
        action = args["action"]
        if action == "start":
            return tools.start_session(
                args["project_id"],
                args.get("focus_component_id"),
                args.get("focus_problem_id")
            )
        elif action == "end":
            return tools.end_session(
                args["session_id"],
                args.get("summary"),
                args.get("outcomes")
            )
        elif action == "current":
            return tools.get_current_session(args.get("project_id"))
        elif action == "log_conversation":
            return tools.log_conversation(
                args["project_id"],
                args["user_prompt_summary"],
                args.get("assistant_response_summary"),
                args.get("key_decisions"),
                args.get("session_id")
            )
        elif action == "list_conversations":
            return tools.get_conversations(
                args["project_id"],
                args.get("session_id"),
                args.get("limit", 20)
            )
        elif action == "list_sessions":
            return tools.get_sessions(
                args["project_id"],
                args.get("limit", 20)
            )
    
    elif name == "file":
        action = args["action"]
        if action == "attach":
            return tools.attach_file(
                args["project_id"],
                args["file_path"],
                args.get("component_id"),
                args.get("problem_id"),
                args.get("user_description"),
                args.get("tags"),
                args.get("copy_to_bundle", True)
            )
        elif action == "list":
            return tools.get_attachments(
                args.get("project_id"),
                args.get("component_id"),
                args.get("problem_id")
            )
        elif action == "remove":
            return tools.remove_attachment(
                args["attachment_id"],
                args.get("delete_file", False)
            )
        elif action == "search":
            return tools.search_file_content(
                args["query"],
                args.get("project_id"),
                args.get("file_types"),
                args.get("limit", 10)
            )
    
    elif name == "git":
        action = args["action"]
        if action == "init":
            return tools.git_init()
        elif action == "status":
            return tools.git_status()
        elif action == "sync":
            return tools.git_sync(args.get("commit_message"))
        elif action == "set_remote":
            return tools.git_set_remote(args["remote_url"])
        elif action == "clone":
            return tools.git_clone(args["remote_url"], args.get("local_path"))
        elif action == "history":
            return tools.git_history(args.get("limit", 20))
    
    elif name == "variable":
        action = args["action"]
        if action == "create":
            return tools.create_project_variable(
                args["project_id"],
                args["name"],
                args.get("value"),
                args.get("description"),
                args.get("category", "custom"),
                args.get("is_secret", False)
            )
        elif action == "list":
            return tools.get_project_variables(
                args["project_id"],
                args.get("category")
            )
        elif action == "update":
            return tools.update_project_variable(
                args["variable_id"],
                args.get("name"),
                args.get("value"),
                args.get("description"),
                args.get("category"),
                args.get("is_secret")
            )
        elif action == "delete":
            return tools.delete_project_variable(args["variable_id"])
    
    elif name == "method":
        action = args["action"]
        if action == "create":
            return tools.create_project_method(
                args["project_id"],
                args["name"],
                args["description"],
                args.get("category"),
                args.get("steps"),
                args.get("code_example"),
                args.get("related_component_id")
            )
        elif action == "list":
            return tools.get_project_methods(
                args["project_id"],
                args.get("category")
            )
        elif action == "update":
            return tools.update_project_method(
                args["method_id"],
                args.get("name"),
                args.get("description"),
                args.get("category"),
                args.get("steps"),
                args.get("code_example"),
                args.get("related_component_id")
            )
        elif action == "delete":
            return tools.delete_project_method(args["method_id"])
    
    elif name == "self_improve":
        action = args["action"]
        if action == "learn_skill":
            return tools.learn_skill(
                args["skill"],
                args["skill_type"],
                args.get("context"),
                args.get("tool_name"),
                args.get("project_id"),
                args.get("source_session_id"),
                args.get("source_type", "learned")
            )
        elif action == "get_skills":
            return tools.get_skills(
                args.get("project_id"),
                args.get("skill_type"),
                args.get("tool_name"),
                args.get("min_confidence", 0),
                args.get("promoted_only", False)
            )
        elif action == "confirm_skill":
            return tools.confirm_skill(args["skill_id"], args.get("increment_session", True))
        elif action == "save_state":
            return tools.save_state(
                args["project_id"],
                "checkpoint",  # state_type
                args.get("focus_summary"),
                args.get("key_facts"),
                args.get("pending_decisions"),
                args.get("active_problem_ids"),
                args.get("active_component_ids"),
                args.get("previous_state_id"),
                args.get("tool_calls_this_session", 0),
                args.get("estimated_tokens")
            )
        elif action == "get_state":
            return tools.get_latest_state(args["project_id"])
        elif action == "log_metric":
            return tools.log_metric(
                args["metric_type"],
                args.get("project_id"),
                args.get("session_state_id"),
                args.get("context"),
                args.get("action_taken"),
                args.get("outcome"),
                args.get("effectiveness_score"),
                args.get("should_adjust"),
                args.get("suggested_adjustment"),
                args.get("user_feedback")
            )
        elif action == "get_metrics":
            return tools.get_metrics(
                args.get("project_id"),
                args.get("metric_type"),
                args.get("session_state_id"),
                args.get("limit", 100)
            )
    
    else:
        return {"error": f"Unknown tool: {name}"}


# ============================================================
# SERVER STARTUP
# ============================================================

async def run_server():
    """Run the MCP server."""
    # Initialize database
    db = init_db()
    tools.set_db(db)
    
    # Run server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def main():
    """Entry point."""
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
