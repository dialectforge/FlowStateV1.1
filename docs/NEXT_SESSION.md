# FlowState - Next Session Prompt

## Quick Context
FlowState is a development memory system. You (Claude) are co-creator.

## ✅ v1.5.1 COMPLETE - MCP Performance Fix
Split tools.py (80KB) into 12 modules. MCP working.

---

## 🎯 NEXT: v2.0 - Single Database Tool

### The Insight (from John)
> "Why couldn't FlowState have one tool called database, and that one tool uses the database to put the information where it belongs? Sometimes things get overcomplicated."

### Current State: 21 Tools
```
list_projects, create_project, update_project, get_context,
create_component, list_components, update_component,
problem (log/list/solve/get_tree), attempt (log/outcome),
todo (add/update/list), session (start/end/current/log_conversation),
log_learning, get_learnings, learn_skill, get_skills, confirm_skill,
log_change, get_recent_changes, search, file, git, variable, method,
self_improve...
```

### v2.0 Goal: 1 Tool
```python
@mcp.tool()
def database(action: str, table: str = None, data: dict = None, query: str = None):
    """
    Single interface to FlowState database.
    
    Structured: {"action": "insert", "table": "problems", "data": {...}}
    Natural:    {"query": "log a critical problem about MCP timeouts"}
    """
```

### Design Decisions Needed
1. **Structured vs Natural Language vs Hybrid?**
   - Structured: `{"action": "insert", "table": "problems", "data": {...}}`
   - Natural: `{"query": "log critical problem about X"}`
   - Hybrid: Accept both, Claude decides

2. **Schema delivery:**
   - Pass full schema in tool description?
   - Or provide `{"action": "schema"}` to fetch it?

3. **What happens to learning/intelligence?**
   - `learn_skill`, `get_skills`, `confirm_skill` → just table operations
   - `log_metric`, `get_metrics` → same
   - Data stays intact, just accessed differently
   - Claude still learns patterns, simpler API

### Migration Plan
1. Create `database` tool alongside existing tools
2. Test extensively with real workflows
3. Add deprecation warnings to old tools
4. Remove old tools in v2.1

### Benefits
- 21 tools → 1 tool
- Massive context reduction at conversation start
- Faster MCP init
- Simpler maintenance
- Proves Claude can handle complexity

---

## Project Directory
`/path/to/FlowState`

## Current MCP Config (Working)
```json
{
  "mcpServers": {
    "flowstate": {
      "command": "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
      "args": ["-m", "flowstate.server"],
      "env": {
        "PYTHONPATH": "/path/to/FlowState/mcp-server"
      }
    }
  }
}
```

## Rules
- No shortcuts, no half-assed work
- Log progress in FlowState
- Update BUILD_LOG.md with significant changes

---
*Updated: February 2, 2026*
*Status: v1.5.1 complete, planning v2.0*
