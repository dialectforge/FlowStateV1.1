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
                "hours": {"type": "integer", "description": "How far back to look (default 24)", "default": 24}
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
                "component_id": {"type": "integer", "description": "Filter by component"}
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
                "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]}
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
                "verified_only": {"type": "boolean", "description": "Only verified learnings", "default": False}
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
