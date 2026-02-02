# FlowState Build Log

## v1.5 - Tool Consolidation (✅ COMPLETE & VERIFIED)

**Completed:** January 28, 2026

### Goal
Reduce tool count to make FlowState usable alongside other MCPs.

### Results
- **Before:** 79 tools
- **After:** 21 tools (74% reduction)
- **Method:** Action-based routing (e.g., `todo` with actions: add/update/list)

### Verification (January 28, 2026)
- ✅ Claude Desktop config verified pointing to v1.5 server
- ✅ `list_projects` working
- ✅ `todo action=list` working with compact mode
- ✅ `session action=current` working
- ✅ `get_context lean=True` working

### Bug Fix: log_learning argument order
- **Issue:** server.py handler passed `component_id` before `category`
- **Effect:** Category values triggered FK constraint failure
- **Fix:** Corrected to match tools.py: `(project_id, insight, category, context, component_id, source)`

---

## v1.4 - Lean Responses (✅ COMPLETE)

**Completed:** January 28, 2026

### Goal
Reduce context token consumption from MCP tool responses.

### Completed Components

#### Merged: get_context with lean parameter
Single tool with `lean=True/False` parameter:
- `lean=True`: Returns stats, blocking items, quick todos (minimal tokens)
- `lean=False`: Returns full objects with all details

#### Compact Mode
Added `compact=True` parameter to list-returning tools:
- `get_learnings(compact=True)`
- `problem action="list" compact=True`
- `get_recent_changes(compact=True)`
- `todo action="list" compact=True`

Compact mode:
- Removes null/empty values
- Strips timestamp fields
- Truncates text fields > 100 chars

---

## v1.3 - Intelligence Layer (✅ COMPLETE)

**Completed:** January 28, 2026

### Goal
Self-learning system that remembers across sessions.

### Completed Components

#### Database Schema
6 v1.3 tables: learned_skills, session_state, tool_registry, tool_usage, behavior_patterns, algorithm_metrics

#### MCP Tools (now consolidated into `self_improve`)
Actions: learn_skill, get_skills, confirm_skill, save_state, get_state, log_metric, get_metrics

#### Bootstrap Data
8 learned skills seeded covering approaches, gotchas, and user preferences.

---

## v1.2 - Project Knowledge Base (✅ COMPLETE)

**Completed:** January 28, 2026

### Features
- `project_variables` table: Store server addresses, credentials, config
- `project_methods` table: Document patterns, workflows, conventions
- 5 new GUI views: KnowledgeView, ConversationsView, SessionsView, TodoBoard, DataBrowser

---

## v1.1 - File Handling & Git Sync (✅ COMPLETE)

**Completed:** January 27, 2026

### Features
- File attachments with drag-and-drop
- Git-based sync across machines
- Settings panel
- Native macOS menu bar integration

---

## v1.0 - Core System (✅ COMPLETE)

**Completed:** January 26, 2026

### Features
- SQLite database with full schema
- Python MCP server
- Tauri GUI with 9 views
- Problem → Attempt → Solution workflow

---

## Version Summary

| Version | Status | Description |
|---------|--------|-------------|
| v1.0 | ✅ Complete | Core system |
| v1.1 | ✅ Complete | File handling + Git sync |
| v1.2 | ✅ Complete | Project Knowledge Base |
| v1.3 | ✅ Complete | Intelligence Layer |
| v1.4 | ✅ Complete | Lean Responses |
| v1.5 | ✅ Complete | Tool Consolidation (79→21) |

---

*Last updated: January 28, 2026*

---

## MCP Toggle Script (✅ COMPLETE)

**Started:** February 1, 2026

### Goal
Create a CLI tool to selectively enable/disable MCP servers in Claude Desktop config without manual JSON editing. Solves context overflow when running multiple MCPs (FlowState + XcodeBuildMCP + GitHub = 120+ tools).

### Problem
- XcodeBuildMCP alone adds ~50+ tools to every conversation
- Combined with other MCPs, context fills before useful work begins
- Manual config editing is error-prone and tedious

### Solution
Python script: `/Users/johnmartin/code/FlowState/scripts/mcp-toggle.py`

### Features Planned
- `mcp-toggle list` - Show all MCPs and status (enabled/disabled)
- `mcp-toggle enable <name>` - Enable specific MCP
- `mcp-toggle disable <name>` - Disable specific MCP
- `mcp-toggle only <name> [name2...]` - Enable only specified MCPs
- `mcp-toggle preset <name>` - Apply preset configs (ios, python, minimal, all)
- `mcp-toggle save <name>` - Save current config as preset
- `mcp-toggle restore` - Restore from backup

### Implementation Details
- Renames disabled MCPs with `_DISABLED` suffix in config
- Auto-creates backup on first change
- Stores presets in `~/Library/Application Support/Claude/mcp_presets.json`
- Default presets: ios, python, minimal, all

### Current State: ✅ COMPLETE
- Script fully functional (386 lines)
- All commands working: list, enable, disable, only, preset, presets, restore, backup
- Tested successfully - shows 3 MCPs (flowstate enabled, github/XcodeBuildMCP disabled)

### Usage
```bash
python3 /Users/johnmartin/code/FlowState/scripts/mcp-toggle.py list
python3 /Users/johnmartin/code/FlowState/scripts/mcp-toggle.py disable xcode
python3 /Users/johnmartin/code/FlowState/scripts/mcp-toggle.py preset minimal
```

**Note:** Restart Claude Desktop and start new chat for changes to take effect.

### File Locations
- Script: `/Users/johnmartin/code/FlowState/scripts/mcp-toggle.py`
- Wrapper: `/Users/johnmartin/code/FlowState/scripts/mcp-toggle`
- Config: `~/Library/Application Support/Claude/claude_desktop_config.json`

---

*Last updated: February 1, 2026*


---

## v1.5.1 - MCP Performance Fix
**Date:** February 2, 2026

### Problem Solved
FlowState MCP was causing timeouts and slowdowns affecting ALL other MCPs. Root cause: `tools.py` was 2,767 lines / 80KB with 90 functions. Python had to parse this massive file on every MCP initialization.

### Solution: Modular Architecture
Split monolithic `tools.py` into `tools/` package with 12 modules:

```
/mcp-server/flowstate/tools/
├── __init__.py      # Re-exports all 83 functions for backward compatibility
├── core.py          # Projects, components, search
├── problems.py      # Problems, attempts, solutions
├── learning.py      # Skills, learnings, self_improve
├── files.py         # File attachments
├── git_ops.py       # Git operations
├── sessions.py      # Sessions, conversations
├── variables.py     # Project variables, methods
├── todos.py         # Todo management
├── intelligence.py  # Tool recommendations, patterns
├── story.py         # Story generation
└── utils.py         # Shared utilities (get_db, set_db)
```

### MCP Config Fix
**Gotcha discovered:** Claude Desktop ignores `cwd` parameter in MCP config.

**Old config (broken):**
```json
{
  "command": "python3",
  "args": ["-m", "flowstate.server"],
  "cwd": "/path/to/mcp-server"  // IGNORED!
}
```

**New config (working):**
```json
{
  "command": "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
  "args": ["-m", "flowstate.server"],
  "env": {
    "PYTHONPATH": "/Users/johnmartin/code/FlowState/mcp-server"
  }
}
```

### Files Changed
- Created: `tools/` directory with 12 module files
- Created: `tools/__init__.py` (120 lines, exports 83 functions)
- Renamed: `tools.py` → `tools.py.bak` (kept as backup)
- Updated: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Verification
- ✅ All 83 functions export correctly
- ✅ `server.py` imports work unchanged
- ✅ MCP connects and responds
- ✅ FlowState tools functional

### Learnings Logged
- Learning #81: Claude Desktop ignores 'cwd', use PYTHONPATH env var
- Learning #82: Split large MCP servers into modular packages

---

*Last updated: February 2, 2026*
