"""FlowState MCP Server - Development memory that flows between sessions."""

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
# TOOL DEFINITIONS
# ============================================================

TOOLS = [
    # Project tools
    Tool(
        name="list_projects",
        description="List all projects with their status. Use to see what projects exist.",
        inputSchema={
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "description": "Filter by status: 'active', 'paused', 'completed', 'archived'",
                    "enum": ["active", "paused", "completed", "archived"]
                }
            }
        }
    ),
    Tool(
        name="create_project",
        description="Create a new project. Projects are top-level containers for components, problems, and learnings.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Project name (must be unique)"},
                "description": {"type": "string", "description": "Project description"}
            },
            "required": ["name"]
        }
    ),
    Tool(
        name="get_project_context",
        description="THE KILLER TOOL: Get everything needed to work on a project. Returns: project details, all components, open problems, recent changes, todos, learnings, and file attachments (v1.1). Call this at the start of every session!",
        inputSchema={
            "type": "object",
            "properties": {
                "project_name": {"type": "string", "description": "Name of the project"},
                "hours": {"type": "integer", "description": "How far back to look for changes (default 48)", "default": 48},
                "include_files": {"type": "boolean", "description": "Include file attachments in context (default true)", "default": True}
            },
            "required": ["project_name"]
        }
    ),
    Tool(
        name="get_project_context_lean",
        description="LEAN VERSION: Get project context with minimal tokens. Returns summary stats (counts), blocking items, and quick todos - NOT full objects. Use this at session start to save context. Call specific tools only when you need full details.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_name": {"type": "string", "description": "Name of the project"},
                "hours": {"type": "integer", "description": "How far back to look for changes (default 48)", "default": 48}
            },
            "required": ["project_name"]
        }
    ),
    Tool(
        name="update_project",
        description="Update project details like name, description, or status.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "name": {"type": "string", "description": "New name"},
                "description": {"type": "string", "description": "New description"},
                "status": {"type": "string", "enum": ["active", "paused", "completed", "archived"]}
            },
            "required": ["project_id"]
        }
    ),
    
    # Component tools
    Tool(
        name="create_component",
        description="Create a new component within a project. Components are building blocks like 'Protocol Engine', 'iOS App', etc.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "name": {"type": "string", "description": "Component name"},
                "description": {"type": "string", "description": "Component description"},
                "parent_component_id": {"type": "integer", "description": "Parent component for nesting"}
            },
            "required": ["project_id", "name"]
        }
    ),
    Tool(
        name="list_components",
        description="List all components in a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="update_component",
        description="Update component details.",
        inputSchema={
            "type": "object",
            "properties": {
                "component_id": {"type": "integer", "description": "Component ID"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string", "enum": ["planning", "in_progress", "testing", "complete", "deprecated"]}
            },
            "required": ["component_id"]
        }
    ),
    
    # Change tracking
    Tool(
        name="log_change",
        description="Log a change to a component. Use this to track what changed, from what, to what, and why.",
        inputSchema={
            "type": "object",
            "properties": {
                "component_id": {"type": "integer", "description": "Component ID"},
                "field_name": {"type": "string", "description": "What changed (e.g., 'protocol_version', 'config', 'architecture')"},
                "old_value": {"type": "string", "description": "Previous value"},
                "new_value": {"type": "string", "description": "New value"},
                "change_type": {"type": "string", "enum": ["config", "code", "architecture", "dependency", "documentation", "other"]},
                "reason": {"type": "string", "description": "Why the change was made"}
            },
            "required": ["component_id", "field_name"]
        }
    ),
    Tool(
        name="get_recent_changes",
        description="Get recent changes to a project or component.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"},
                "component_id": {"type": "integer", "description": "Filter by component"},
                "hours": {"type": "integer", "description": "How far back to look (default 24)", "default": 24},
                "compact": {"type": "boolean", "description": "Return minimal fields to save tokens", "default": False}
            }
        }
    ),
    
    # Problem/Solution workflow
    Tool(
        name="log_problem",
        description="Log a new problem/issue encountered. Problems can have multiple solution attempts forming a decision tree.",
        inputSchema={
            "type": "object",
            "properties": {
                "component_id": {"type": "integer", "description": "Component with the problem"},
                "title": {"type": "string", "description": "Brief problem title"},
                "description": {"type": "string", "description": "Detailed description"},
                "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"], "default": "medium"}
            },
            "required": ["component_id", "title"]
        }
    ),
    Tool(
        name="get_open_problems",
        description="Get all open/investigating problems.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"},
                "component_id": {"type": "integer", "description": "Filter by component"},
                "compact": {"type": "boolean", "description": "Return minimal fields to save tokens", "default": False}
            }
        }
    ),
    Tool(
        name="log_attempt",
        description="Log a solution attempt for a problem. Multiple attempts form a decision tree of what worked and what didn't.",
        inputSchema={
            "type": "object",
            "properties": {
                "problem_id": {"type": "integer", "description": "Problem being addressed"},
                "description": {"type": "string", "description": "What we're trying"},
                "parent_attempt_id": {"type": "integer", "description": "Parent attempt if branching from a previous try"}
            },
            "required": ["problem_id", "description"]
        }
    ),
    Tool(
        name="mark_attempt_outcome",
        description="Record whether an attempt succeeded, failed, or was partial.",
        inputSchema={
            "type": "object",
            "properties": {
                "attempt_id": {"type": "integer", "description": "Attempt ID"},
                "outcome": {"type": "string", "enum": ["success", "failure", "partial", "abandoned"]},
                "notes": {"type": "string", "description": "What we learned"},
                "confidence": {"type": "string", "enum": ["attempted", "worked_once", "verified", "proven", "deprecated"], "default": "attempted"}
            },
            "required": ["attempt_id", "outcome"]
        }
    ),
    Tool(
        name="mark_problem_solved",
        description="Mark a problem as solved with the winning solution.",
        inputSchema={
            "type": "object",
            "properties": {
                "problem_id": {"type": "integer", "description": "Problem ID"},
                "winning_attempt_id": {"type": "integer", "description": "Which attempt worked"},
                "summary": {"type": "string", "description": "Brief solution summary"},
                "key_insight": {"type": "string", "description": "The key learning/insight"},
                "code_snippet": {"type": "string", "description": "Code that solved it"}
            },
            "required": ["problem_id", "summary"]
        }
    ),
    Tool(
        name="get_problem_tree",
        description="Get the full decision tree of all attempts for a problem.",
        inputSchema={
            "type": "object",
            "properties": {
                "problem_id": {"type": "integer", "description": "Problem ID"}
            },
            "required": ["problem_id"]
        }
    ),
    
    # Todos
    Tool(
        name="add_todo",
        description="Add a todo item to a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "title": {"type": "string", "description": "Todo title"},
                "description": {"type": "string", "description": "Details"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"], "default": "medium"},
                "component_id": {"type": "integer", "description": "Related component"},
                "due_date": {"type": "string", "description": "Due date (ISO format)"}
            },
            "required": ["project_id", "title"]
        }
    ),
    Tool(
        name="update_todo",
        description="Update a todo item (change status, priority, etc).",
        inputSchema={
            "type": "object",
            "properties": {
                "todo_id": {"type": "integer", "description": "Todo ID"},
                "status": {"type": "string", "enum": ["pending", "in_progress", "blocked", "done", "cancelled"]},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                "title": {"type": "string"},
                "description": {"type": "string"}
            },
            "required": ["todo_id"]
        }
    ),
    Tool(
        name="get_todos",
        description="Get todos for a project with optional filters.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "status": {"type": "string", "enum": ["pending", "in_progress", "blocked", "done", "cancelled"]},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                "compact": {"type": "boolean", "description": "Return minimal fields to save tokens", "default": False}
            },
            "required": ["project_id"]
        }
    ),
    
    # Learnings
    Tool(
        name="log_learning",
        description="Capture a learning/insight discovered during development.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "insight": {"type": "string", "description": "The learning/insight"},
                "category": {"type": "string", "enum": ["pattern", "gotcha", "best_practice", "tool_tip", "architecture", "performance", "security", "other"]},
                "context": {"type": "string", "description": "When/where this applies"},
                "component_id": {"type": "integer", "description": "Related component"},
                "source": {"type": "string", "enum": ["experience", "documentation", "conversation", "error", "research"], "default": "experience"}
            },
            "required": ["project_id", "insight"]
        }
    ),
    Tool(
        name="get_learnings",
        description="Get learnings with optional filters.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"},
                "category": {"type": "string", "enum": ["pattern", "gotcha", "best_practice", "tool_tip", "architecture", "performance", "security", "other"]},
                "verified_only": {"type": "boolean", "description": "Only verified learnings", "default": False},
                "compact": {"type": "boolean", "description": "Return minimal fields to save tokens", "default": False}
            }
        }
    ),
    
    # Conversations
    Tool(
        name="log_conversation",
        description="Log a conversation exchange for future reference.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "user_prompt_summary": {"type": "string", "description": "Summary of what was asked"},
                "assistant_response_summary": {"type": "string", "description": "Summary of response"},
                "key_decisions": {"type": "array", "items": {"type": "string"}, "description": "List of decisions made"},
                "session_id": {"type": "string", "description": "Session ID"}
            },
            "required": ["project_id", "user_prompt_summary"]
        }
    ),
    
    # Sessions
    Tool(
        name="start_session",
        description="Start a work session to track time and focus.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "focus_component_id": {"type": "integer", "description": "Component to focus on"},
                "focus_problem_id": {"type": "integer", "description": "Problem to focus on"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="end_session",
        description="End a work session with summary.",
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {"type": "integer", "description": "Session ID"},
                "summary": {"type": "string", "description": "What was accomplished"},
                "outcomes": {"type": "array", "items": {"type": "string"}, "description": "List of outcomes"}
            },
            "required": ["session_id"]
        }
    ),
    Tool(
        name="get_current_session",
        description="Get the current active session if any.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"}
            }
        }
    ),
    
    # Search
    Tool(
        name="search",
        description="Search across all content (problems, solutions, learnings, changes).",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "project_id": {"type": "integer", "description": "Filter by project"},
                "content_types": {"type": "array", "items": {"type": "string"}, "description": "Types to search: 'problem', 'solution', 'learning', 'change'"},
                "limit": {"type": "integer", "description": "Max results (default 10)", "default": 10}
            },
            "required": ["query"]
        }
    ),
    
    # Component history
    Tool(
        name="get_component_history",
        description="Get full history for a component over time - all changes, problems, solutions, learnings.",
        inputSchema={
            "type": "object",
            "properties": {
                "component_id": {"type": "integer", "description": "Component ID"},
                "days": {"type": "integer", "description": "How many days back to look (default 30)", "default": 30}
            },
            "required": ["component_id"]
        }
    ),
    
    # Conversation history
    Tool(
        name="get_conversation_history",
        description="Get conversation history for a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "session_id": {"type": "string", "description": "Filter by session"},
                "limit": {"type": "integer", "description": "Max results (default 20)", "default": 20}
            },
            "required": ["project_id"]
        }
    ),
    
    # Cross-reference tools
    Tool(
        name="link_items",
        description="Create a cross-reference between items (e.g., link a problem to a similar problem, or a solution to a learning).",
        inputSchema={
            "type": "object",
            "properties": {
                "source_type": {"type": "string", "enum": ["problem", "solution", "learning", "component", "change"], "description": "Type of source item"},
                "source_id": {"type": "integer", "description": "ID of source item"},
                "target_type": {"type": "string", "enum": ["problem", "solution", "learning", "component", "change"], "description": "Type of target item"},
                "target_id": {"type": "integer", "description": "ID of target item"},
                "relationship": {"type": "string", "enum": ["similar_to", "derived_from", "contradicts", "depends_on", "supersedes", "related_to"], "description": "How they're related"},
                "source_project_id": {"type": "integer", "description": "Project ID of source (auto-detected if not provided)"},
                "target_project_id": {"type": "integer", "description": "Project ID of target (auto-detected if not provided)"},
                "notes": {"type": "string", "description": "Notes about the relationship"}
            },
            "required": ["source_type", "source_id", "target_type", "target_id", "relationship"]
        }
    ),
    Tool(
        name="find_related",
        description="Find all items related to this one (both incoming and outgoing cross-references).",
        inputSchema={
            "type": "object",
            "properties": {
                "item_type": {"type": "string", "enum": ["problem", "solution", "learning", "component", "change"], "description": "Type of item"},
                "item_id": {"type": "integer", "description": "ID of the item"}
            },
            "required": ["item_type", "item_id"]
        }
    ),
    
    # Story generation tools
    Tool(
        name="generate_project_story",
        description="Generate narrative storyboard data for a project. Returns complete story with problems solved, key milestones, learnings.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="generate_problem_journey",
        description="Generate the journey map for a problem. Shows all attempts, branches, outcomes, learnings.",
        inputSchema={
            "type": "object",
            "properties": {
                "problem_id": {"type": "integer", "description": "Problem ID"}
            },
            "required": ["problem_id"]
        }
    ),
    Tool(
        name="generate_architecture_diagram",
        description="Generate component diagram data for a project. Shows hierarchy, relationships, problem hotspots.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"}
            },
            "required": ["project_id"]
        }
    ),
    
    # ============================================================
    # v1.1 FILE ATTACHMENT TOOLS
    # ============================================================
    Tool(
        name="attach_file",
        description="Attach a file to a project, component, or problem. Files can be copied to the project bundle or referenced from their original location.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project to attach file to"},
                "file_path": {"type": "string", "description": "Path to the file to attach"},
                "component_id": {"type": "integer", "description": "Optional component to attach to"},
                "problem_id": {"type": "integer", "description": "Optional problem to attach to"},
                "user_description": {"type": "string", "description": "Description of the file"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags for categorization"},
                "copy_to_bundle": {"type": "boolean", "description": "Copy file to project bundle (default: true)", "default": True}
            },
            "required": ["project_id", "file_path"]
        }
    ),
    Tool(
        name="get_attachments",
        description="Get file attachments for a project, component, or problem.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"},
                "component_id": {"type": "integer", "description": "Filter by component"},
                "problem_id": {"type": "integer", "description": "Filter by problem"}
            }
        }
    ),
    Tool(
        name="remove_attachment",
        description="Remove a file attachment. Optionally delete the actual file.",
        inputSchema={
            "type": "object",
            "properties": {
                "attachment_id": {"type": "integer", "description": "Attachment to remove"},
                "delete_file": {"type": "boolean", "description": "Also delete the file (default: false)", "default": False}
            },
            "required": ["attachment_id"]
        }
    ),
    Tool(
        name="search_file_content",
        description="Search across indexed file content (descriptions, snippets, content locations).",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "project_id": {"type": "integer", "description": "Filter by project"},
                "file_types": {"type": "array", "items": {"type": "string"}, "description": "Filter by file types"},
                "limit": {"type": "integer", "description": "Max results (default: 10)", "default": 10}
            },
            "required": ["query"]
        }
    ),
    
    # ============================================================
    # v1.1 GIT SYNC TOOLS
    # ============================================================
    Tool(
        name="git_init",
        description="Initialize FlowState data directory as a Git repository. Creates .gitignore and initial commit.",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    ),
    Tool(
        name="git_status",
        description="Get Git repository status: branch, remote, pending changes, last commit.",
        inputSchema={
            "type": "object",
            "properties": {}
        }
    ),
    Tool(
        name="git_sync",
        description="Sync FlowState data: add all changes, commit, pull --rebase, push. Full sync in one command.",
        inputSchema={
            "type": "object",
            "properties": {
                "commit_message": {"type": "string", "description": "Custom commit message (default: timestamp)"}
            }
        }
    ),
    Tool(
        name="git_set_remote",
        description="Add or update the Git remote URL (e.g., GitHub repository).",
        inputSchema={
            "type": "object",
            "properties": {
                "remote_url": {"type": "string", "description": "Git remote URL (e.g., https://github.com/user/flowstate-data.git)"}
            },
            "required": ["remote_url"]
        }
    ),
    Tool(
        name="git_clone",
        description="Clone an existing FlowState repository to this machine.",
        inputSchema={
            "type": "object",
            "properties": {
                "remote_url": {"type": "string", "description": "Git remote URL to clone"},
                "local_path": {"type": "string", "description": "Local path (default: ~/FlowState-Data)"}
            },
            "required": ["remote_url"]
        }
    ),
    Tool(
        name="git_history",
        description="Get recent Git commit history.",
        inputSchema={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max commits to return (default: 20)", "default": 20}
            }
        }
    ),
    
    # ============================================================
    # v1.2 PROJECT KNOWLEDGE BASE TOOLS
    # ============================================================
    Tool(
        name="create_project_variable",
        description="Create a project variable (key-value for servers, credentials, config, environment).",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "name": {"type": "string", "description": "Variable name (e.g., 'production_server_ip')"},
                "value": {"type": "string", "description": "The value"},
                "category": {"type": "string", "enum": ["server", "credentials", "config", "environment", "endpoint", "custom"], "default": "custom"},
                "is_secret": {"type": "boolean", "description": "If true, value is masked in UI", "default": False},
                "description": {"type": "string", "description": "Description"}
            },
            "required": ["project_id", "name"]
        }
    ),
    Tool(
        name="get_project_variables",
        description="Get all variables for a project (servers, credentials, config, etc.).",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "category": {"type": "string", "enum": ["server", "credentials", "config", "environment", "endpoint", "custom"], "description": "Filter by category"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="update_project_variable",
        description="Update a project variable.",
        inputSchema={
            "type": "object",
            "properties": {
                "variable_id": {"type": "integer", "description": "Variable ID"},
                "name": {"type": "string"},
                "value": {"type": "string"},
                "category": {"type": "string", "enum": ["server", "credentials", "config", "environment", "endpoint", "custom"]},
                "is_secret": {"type": "boolean"},
                "description": {"type": "string"}
            },
            "required": ["variable_id"]
        }
    ),
    Tool(
        name="delete_project_variable",
        description="Delete a project variable.",
        inputSchema={
            "type": "object",
            "properties": {
                "variable_id": {"type": "integer", "description": "Variable ID"}
            },
            "required": ["variable_id"]
        }
    ),
    Tool(
        name="create_project_method",
        description="Create a project method (standard approach, pattern, or process like auth flow, deployment steps).",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "name": {"type": "string", "description": "Method name (e.g., 'Authentication Flow')"},
                "description": {"type": "string", "description": "Full description"},
                "category": {"type": "string", "enum": ["auth", "deployment", "testing", "architecture", "workflow", "convention", "api", "security", "other"]},
                "steps": {"type": "array", "items": {"type": "string"}, "description": "List of steps if it's a process"},
                "code_example": {"type": "string", "description": "Optional code snippet"},
                "related_component_id": {"type": "integer", "description": "Related component"}
            },
            "required": ["project_id", "name", "description"]
        }
    ),
    Tool(
        name="get_project_methods",
        description="Get all methods for a project (auth flows, deployment steps, conventions, etc.).",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "category": {"type": "string", "enum": ["auth", "deployment", "testing", "architecture", "workflow", "convention", "api", "security", "other"], "description": "Filter by category"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="update_project_method",
        description="Update a project method.",
        inputSchema={
            "type": "object",
            "properties": {
                "method_id": {"type": "integer", "description": "Method ID"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "category": {"type": "string", "enum": ["auth", "deployment", "testing", "architecture", "workflow", "convention", "api", "security", "other"]},
                "steps": {"type": "array", "items": {"type": "string"}},
                "code_example": {"type": "string"},
                "related_component_id": {"type": "integer"}
            },
            "required": ["method_id"]
        }
    ),
    Tool(
        name="delete_project_method",
        description="Delete a project method.",
        inputSchema={
            "type": "object",
            "properties": {
                "method_id": {"type": "integer", "description": "Method ID"}
            },
            "required": ["method_id"]
        }
    ),
    
    # ============================================================
    # v1.2 CONVERSATIONS & SESSIONS UI SUPPORT
    # ============================================================
    Tool(
        name="get_conversations",
        description="Get conversations (Claude interactions) for a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "session_id": {"type": "string", "description": "Filter by session"},
                "limit": {"type": "integer", "description": "Max results (default 50)", "default": 50}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="get_sessions",
        description="Get work sessions for a project (start/end times, focus, summaries).",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project ID"},
                "limit": {"type": "integer", "description": "Max results (default 50)", "default": 50}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="get_cross_references",
        description="Get cross-references (links between items like similar problems, derived solutions).",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"},
                "source_type": {"type": "string", "enum": ["problem", "solution", "learning", "component", "change"], "description": "Filter by source type"},
                "source_id": {"type": "integer", "description": "Filter by specific source item"}
            }
        }
    ),
    
    # ============================================================
    # v1.3 INTELLIGENCE LAYER TOOLS
    # ============================================================
    
    # Learned Skills
    Tool(
        name="learn_skill",
        description="Record a new learned skill. Skills are behaviors/approaches that work well.",
        inputSchema={
            "type": "object",
            "properties": {
                "skill_type": {"type": "string", "description": "Type: 'tool_capability', 'user_preference', 'approach', 'gotcha', 'project_specific'"},
                "skill": {"type": "string", "description": "The skill description (what was learned)"},
                "context": {"type": "string", "description": "When/where this skill applies"},
                "project_id": {"type": "integer", "description": "Project this skill relates to (None for global)"},
                "tool_name": {"type": "string", "description": "Tool this skill relates to (if tool-specific)"},
                "source_type": {"type": "string", "description": "How learned: 'default', 'learned', 'user_defined'"},
                "source_session_id": {"type": "integer", "description": "Session where this was learned"}
            },
            "required": ["skill_type", "skill"]
        }
    ),
    Tool(
        name="get_skills",
        description="Get learned skills with optional filters.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter to project-specific + global skills"},
                "skill_type": {"type": "string", "description": "Filter by type"},
                "promoted_only": {"type": "boolean", "description": "Only return promoted (proven) skills", "default": False},
                "tool_name": {"type": "string", "description": "Filter by tool"},
                "min_confidence": {"type": "number", "description": "Minimum confidence threshold", "default": 0.0}
            }
        }
    ),
    Tool(
        name="apply_skill",
        description="Record that a skill was applied and whether it succeeded.",
        inputSchema={
            "type": "object",
            "properties": {
                "skill_id": {"type": "integer", "description": "ID of the skill that was applied"},
                "succeeded": {"type": "boolean", "description": "Whether applying the skill led to success"}
            },
            "required": ["skill_id", "succeeded"]
        }
    ),
    Tool(
        name="confirm_skill",
        description="Confirm a skill worked in this session, potentially promoting it.",
        inputSchema={
            "type": "object",
            "properties": {
                "skill_id": {"type": "integer", "description": "ID of the skill to confirm"},
                "increment_session": {"type": "boolean", "description": "Count as new session for the skill", "default": True}
            },
            "required": ["skill_id"]
        }
    ),
    Tool(
        name="promote_skills",
        description="Promote all skills that meet criteria (3+ sessions, 80%+ success).",
        inputSchema={
            "type": "object",
            "properties": {
                "min_sessions": {"type": "integer", "description": "Minimum sessions required", "default": 3},
                "min_success_rate": {"type": "number", "description": "Minimum success rate required", "default": 0.8}
            }
        }
    ),
    
    # Session State
    Tool(
        name="save_state",
        description="Save Claude's session state for later restoration.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project this state belongs to"},
                "state_type": {"type": "string", "description": "Type: 'start', 'checkpoint', 'handoff', 'end'"},
                "focus_summary": {"type": "string", "description": "What the session was focused on"},
                "active_problem_ids": {"type": "array", "items": {"type": "integer"}, "description": "IDs of problems being worked on"},
                "active_component_ids": {"type": "array", "items": {"type": "integer"}, "description": "IDs of components being worked on"},
                "pending_decisions": {"type": "array", "items": {"type": "string"}, "description": "Decisions that need to be made"},
                "key_facts": {"type": "array", "items": {"type": "string"}, "description": "Important facts from this session"},
                "previous_state_id": {"type": "integer", "description": "ID of the previous state"},
                "tool_calls_this_session": {"type": "integer", "description": "Number of tool calls so far", "default": 0},
                "estimated_tokens": {"type": "integer", "description": "Estimated token usage"}
            },
            "required": ["project_id", "state_type"]
        }
    ),
    Tool(
        name="get_latest_state",
        description="Get the most recent session state for a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project to get state for"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="get_state_chain",
        description="Get chain of previous states for walkback.",
        inputSchema={
            "type": "object",
            "properties": {
                "state_id": {"type": "integer", "description": "Starting state ID"},
                "max_depth": {"type": "integer", "description": "Maximum states to retrieve", "default": 5}
            },
            "required": ["state_id"]
        }
    ),
    Tool(
        name="restore_state",
        description="Get a specific state by ID for restoration.",
        inputSchema={
            "type": "object",
            "properties": {
                "state_id": {"type": "integer", "description": "ID of state to restore"}
            },
            "required": ["state_id"]
        }
    ),
    
    # Tool Registry
    Tool(
        name="register_tool",
        description="Register or update a tool in the registry.",
        inputSchema={
            "type": "object",
            "properties": {
                "mcp_server": {"type": "string", "description": "Name of the MCP server"},
                "tool_name": {"type": "string", "description": "Name of the tool"},
                "effective_for": {"type": "array", "items": {"type": "string"}, "description": "Task types this tool is good for"},
                "common_parameters": {"type": "object", "description": "Common parameter patterns that work well"},
                "gotchas": {"type": "array", "items": {"type": "string"}, "description": "Known issues or pitfalls"},
                "pairs_with": {"type": "array", "items": {"type": "string"}, "description": "Tools that work well in combination"}
            },
            "required": ["mcp_server", "tool_name"]
        }
    ),
    Tool(
        name="get_tools_registry",
        description="Get tools from registry with optional filters.",
        inputSchema={
            "type": "object",
            "properties": {
                "mcp_server": {"type": "string", "description": "Filter by MCP server"},
                "min_success_rate": {"type": "number", "description": "Minimum success rate threshold", "default": 0.0}
            }
        }
    ),
    Tool(
        name="update_tool_stats",
        description="Update usage stats for a tool after use.",
        inputSchema={
            "type": "object",
            "properties": {
                "mcp_server": {"type": "string", "description": "Name of the MCP server"},
                "tool_name": {"type": "string", "description": "Name of the tool"},
                "succeeded": {"type": "boolean", "description": "Whether the tool use was successful"}
            },
            "required": ["mcp_server", "tool_name", "succeeded"]
        }
    ),
    Tool(
        name="get_tool_recommendation",
        description="Get recommended tools for a task type based on past success.",
        inputSchema={
            "type": "object",
            "properties": {
                "task_type": {"type": "string", "description": "Type of task (e.g., 'file_creation', 'search', 'debugging')"},
                "project_id": {"type": "integer", "description": "Optional project context"}
            },
            "required": ["task_type"]
        }
    ),
    
    # Tool Usage Logging
    Tool(
        name="log_tool_use",
        description="Log a tool usage for pattern analysis.",
        inputSchema={
            "type": "object",
            "properties": {
                "mcp_server": {"type": "string", "description": "Name of the MCP server"},
                "tool_name": {"type": "string", "description": "Name of the tool used"},
                "project_id": {"type": "integer", "description": "Project context"},
                "session_state_id": {"type": "integer", "description": "Current session state"},
                "parameters": {"type": "object", "description": "Parameters passed to the tool"},
                "result_size": {"type": "integer", "description": "Size of the result"},
                "execution_time_ms": {"type": "integer", "description": "How long the tool took"},
                "task_type": {"type": "string", "description": "What kind of task this was for"},
                "trigger": {"type": "string", "description": "What triggered this tool use"},
                "preceding_tool_id": {"type": "integer", "description": "ID of the previous tool use"}
            },
            "required": ["mcp_server", "tool_name"]
        }
    ),
    Tool(
        name="rate_tool_use",
        description="Rate a tool usage as useful or not.",
        inputSchema={
            "type": "object",
            "properties": {
                "usage_id": {"type": "integer", "description": "ID of the tool usage to rate"},
                "was_useful": {"type": "boolean", "description": "Whether the tool use was helpful"},
                "user_correction": {"type": "string", "description": "Optional correction or feedback"}
            },
            "required": ["usage_id", "was_useful"]
        }
    ),
    Tool(
        name="get_usage_patterns",
        description="Get tool usage patterns for analysis.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"},
                "mcp_server": {"type": "string", "description": "Filter by MCP server"},
                "tool_name": {"type": "string", "description": "Filter by specific tool"},
                "limit": {"type": "integer", "description": "Maximum records to return", "default": 100}
            }
        }
    ),
    
    # Behavior Patterns
    Tool(
        name="record_pattern",
        description="Record a new behavior pattern (sequences/approaches that work well).",
        inputSchema={
            "type": "object",
            "properties": {
                "pattern_type": {"type": "string", "description": "Type: 'tool_sequence', 'response_style', 'checkpoint_trigger', 'task_approach'"},
                "pattern_name": {"type": "string", "description": "Descriptive name for the pattern"},
                "trigger_conditions": {"type": "object", "description": "When this pattern should be applied"},
                "actions": {"type": "array", "items": {"type": "string"}, "description": "What actions make up this pattern"},
                "project_id": {"type": "integer", "description": "Project this pattern is specific to"},
                "source": {"type": "string", "description": "How created: 'default', 'learned', 'user_defined'", "default": "learned"}
            },
            "required": ["pattern_type", "pattern_name"]
        }
    ),
    Tool(
        name="get_patterns",
        description="Get behavior patterns with optional filters.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter to project-specific + global patterns"},
                "pattern_type": {"type": "string", "description": "Filter by type"},
                "promoted_only": {"type": "boolean", "description": "Only return promoted patterns", "default": False},
                "min_confidence": {"type": "number", "description": "Minimum confidence threshold", "default": 0.0}
            }
        }
    ),
    Tool(
        name="apply_pattern",
        description="Record that a pattern was applied and whether it succeeded.",
        inputSchema={
            "type": "object",
            "properties": {
                "pattern_id": {"type": "integer", "description": "ID of the pattern that was applied"},
                "succeeded": {"type": "boolean", "description": "Whether applying the pattern led to success"}
            },
            "required": ["pattern_id", "succeeded"]
        }
    ),
    Tool(
        name="confirm_pattern",
        description="Confirm a pattern worked in this session, potentially promoting it.",
        inputSchema={
            "type": "object",
            "properties": {
                "pattern_id": {"type": "integer", "description": "ID of the pattern to confirm"},
                "increment_session": {"type": "boolean", "description": "Count as new session for the pattern", "default": True}
            },
            "required": ["pattern_id"]
        }
    ),
    
    # Algorithm Metrics
    Tool(
        name="log_metric",
        description="Log an algorithm metric for self-improvement tracking.",
        inputSchema={
            "type": "object",
            "properties": {
                "metric_type": {"type": "string", "description": "Type: 'checkpoint_timing', 'tool_choice', 'response_quality', 'prediction_accuracy', 'user_satisfaction'"},
                "context": {"type": "string", "description": "Context where this metric was recorded"},
                "action_taken": {"type": "string", "description": "What action was taken"},
                "outcome": {"type": "string", "description": "What the outcome was"},
                "effectiveness_score": {"type": "number", "description": "0.0-1.0 score"},
                "user_feedback": {"type": "string", "description": "Any feedback from the user"},
                "should_adjust": {"type": "boolean", "description": "Whether behavior should be adjusted"},
                "suggested_adjustment": {"type": "string", "description": "What adjustment to make"},
                "project_id": {"type": "integer", "description": "Project context"},
                "session_state_id": {"type": "integer", "description": "Session state context"}
            },
            "required": ["metric_type"]
        }
    ),
    Tool(
        name="get_metrics",
        description="Get algorithm metrics with optional filters.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"},
                "metric_type": {"type": "string", "description": "Filter by type"},
                "session_state_id": {"type": "integer", "description": "Filter by session"},
                "limit": {"type": "integer", "description": "Maximum records to return", "default": 100}
            }
        }
    ),
    Tool(
        name="get_tuning_suggestions",
        description="Get suggested tuning adjustments based on metrics.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Filter by project"}
            }
        }
    ),
    
    # v1.3 Session Management
    Tool(
        name="initialize_session_v13",
        description="Initialize a v1.3 intelligent session. Returns session state, applicable skills, tool recommendations, active patterns, and previous state chain.",
        inputSchema={
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "Project to initialize session for"}
            },
            "required": ["project_id"]
        }
    ),
    Tool(
        name="finalize_session_v13",
        description="Finalize a v1.3 session with handoff state. Creates an 'end' state and promotes ready skills.",
        inputSchema={
            "type": "object",
            "properties": {
                "session_state_id": {"type": "integer", "description": "ID of the session state to finalize"},
                "focus_summary": {"type": "string", "description": "Summary of what the session focused on"},
                "active_problem_ids": {"type": "array", "items": {"type": "integer"}, "description": "Problems that were being worked on"},
                "active_component_ids": {"type": "array", "items": {"type": "integer"}, "description": "Components that were being worked on"},
                "pending_decisions": {"type": "array", "items": {"type": "string"}, "description": "Decisions left unmade"},
                "key_facts": {"type": "array", "items": {"type": "string"}, "description": "Important facts to remember"},
                "tool_calls_this_session": {"type": "integer", "description": "Total tool calls in this session", "default": 0}
            },
            "required": ["session_state_id"]
        }
    ),
]


# ============================================================
# HANDLERS
# ============================================================

@server.list_tools()
async def list_tools() -> list[Tool]:
    """Return all available tools."""
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls."""
    
    # Map tool names to functions
    tool_map = {
        "list_projects": tools.list_projects,
        "create_project": tools.create_project,
        "get_project_context": tools.get_project_context,
        "get_project_context_lean": tools.get_project_context_lean,
        "update_project": tools.update_project,
        "create_component": tools.create_component,
        "list_components": tools.list_components,
        "update_component": tools.update_component,
        "log_change": tools.log_change,
        "get_recent_changes": tools.get_recent_changes,
        "log_problem": tools.log_problem,
        "get_open_problems": tools.get_open_problems,
        "log_attempt": tools.log_attempt,
        "mark_attempt_outcome": tools.mark_attempt_outcome,
        "mark_problem_solved": tools.mark_problem_solved,
        "get_problem_tree": tools.get_problem_tree,
        "add_todo": tools.add_todo,
        "update_todo": tools.update_todo,
        "get_todos": tools.get_todos,
        "log_learning": tools.log_learning,
        "get_learnings": tools.get_learnings,
        "log_conversation": tools.log_conversation,
        "start_session": tools.start_session,
        "end_session": tools.end_session,
        "get_current_session": tools.get_current_session,
        "search": tools.search,
        "get_component_history": tools.get_component_history,
        "get_conversation_history": tools.get_conversation_history,
        "link_items": tools.link_items,
        "find_related": tools.find_related,
        "generate_project_story": tools.generate_project_story,
        "generate_problem_journey": tools.generate_problem_journey,
        "generate_architecture_diagram": tools.generate_architecture_diagram,
        # v1.1 File Attachment Tools
        "attach_file": tools.attach_file,
        "get_attachments": tools.get_attachments,
        "remove_attachment": tools.remove_attachment,
        "search_file_content": tools.search_file_content,
        # v1.1 Git Sync Tools
        "git_init": tools.git_init,
        "git_status": tools.git_status,
        "git_sync": tools.git_sync,
        "git_set_remote": tools.git_set_remote,
        "git_clone": tools.git_clone,
        "git_history": tools.git_history,
        # v1.2 Project Knowledge Base Tools
        "create_project_variable": tools.create_project_variable,
        "get_project_variables": tools.get_project_variables,
        "update_project_variable": tools.update_project_variable,
        "delete_project_variable": tools.delete_project_variable,
        "create_project_method": tools.create_project_method,
        "get_project_methods": tools.get_project_methods,
        "update_project_method": tools.update_project_method,
        "delete_project_method": tools.delete_project_method,
        # v1.2 Conversations & Sessions UI Support
        "get_conversations": tools.get_conversations,
        "get_sessions": tools.get_sessions,
        "get_cross_references": tools.get_cross_references,
        # v1.3 Intelligence Layer - Learned Skills
        "learn_skill": tools.learn_skill,
        "get_skills": tools.get_skills,
        "apply_skill": tools.apply_skill,
        "confirm_skill": tools.confirm_skill,
        "promote_skills": tools.promote_skills,
        # v1.3 Intelligence Layer - Session State
        "save_state": tools.save_state,
        "get_latest_state": tools.get_latest_state,
        "get_state_chain": tools.get_state_chain,
        "restore_state": tools.restore_state,
        # v1.3 Intelligence Layer - Tool Registry
        "register_tool": tools.register_tool,
        "get_tools_registry": tools.get_tools,
        "update_tool_stats": tools.update_tool_stats,
        "get_tool_recommendation": tools.get_tool_recommendation,
        # v1.3 Intelligence Layer - Tool Usage
        "log_tool_use": tools.log_tool_use,
        "rate_tool_use": tools.rate_tool_use,
        "get_usage_patterns": tools.get_usage_patterns,
        # v1.3 Intelligence Layer - Behavior Patterns
        "record_pattern": tools.record_pattern,
        "get_patterns": tools.get_patterns,
        "apply_pattern": tools.apply_pattern,
        "confirm_pattern": tools.confirm_pattern,
        # v1.3 Intelligence Layer - Algorithm Metrics
        "log_metric": tools.log_metric,
        "get_metrics": tools.get_metrics,
        "get_tuning_suggestions": tools.get_tuning_suggestions,
        # v1.3 Session Management
        "initialize_session_v13": tools.initialize_session_v13,
        "finalize_session_v13": tools.finalize_session_v13,
    }
    
    if name not in tool_map:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]
    
    try:
        result = tool_map[name](**arguments)
        return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


# ============================================================
# MAIN
# ============================================================

async def main():
    """Run the MCP server."""
    # Initialize database
    init_db()
    
    # Run server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def run():
    """Entry point."""
    asyncio.run(main())


if __name__ == "__main__":
    run()
