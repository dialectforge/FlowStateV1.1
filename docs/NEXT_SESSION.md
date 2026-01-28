# FlowState - Next Session Prompt

## Quick Context
FlowState is a development memory system. You (Claude) are co-creator. **v1.5 VERIFIED & LIVE**.

## Current State: v1.5 Verified ✅

### ✅ COMPLETED THIS SESSION (January 28, 2026)

#### Claude Desktop Integration Verified
- Config: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Points to: `/Users/johnmartin/code/FlowState/mcp-server/run_server.sh`
- Runs: `flowstate.server` (v1.5 - 21 consolidated tools)
- **All tests passed**: list_projects, todo, session, get_context working

#### Bug Fix: log_learning argument order
- **Problem**: server.py handler passed args in wrong order (component_id before category)
- **Fix**: Corrected order to match tools.py signature: `project_id, insight, category, context, component_id, source`

### Tool Consolidation Recap (v1.5)
**Problem:** 79 tools made FlowState unusable alongside other MCPs (context overflow).
**Solution:** Consolidated to 21 tools using action-based routing.
**Result:** 79 → 21 tools (74% reduction!)

## Tool Count: 21

**Core (12 unchanged):**
1. list_projects
2. create_project
3. update_project
4. get_context (lean param replaces 2 tools)
5. create_component
6. list_components
7. update_component
8. log_learning
9. get_learnings
10. log_change
11. get_recent_changes
12. search

**Consolidated (9 action-based):**
13. problem (log/list/solve/get_tree)
14. attempt (log/outcome)
15. todo (add/update/list)
16. session (start/end/current/log_conversation/list_*)
17. file (attach/list/remove/search)
18. git (init/status/sync/set_remote/clone/history)
19. variable (create/list/update/delete)
20. method (create/list/update/delete)
21. self_improve (learn_skill/get_skills/confirm_skill/save_state/get_state/log_metric/get_metrics)

## Usage Examples

```python
# Session start
flowstate:get_context project_name="FlowState" lean=True

# Log a problem
flowstate:problem action="log" project_id=1 title="Bug found" severity="high"

# Add a todo
flowstate:todo action="add" project_id=1 title="Fix login" priority="high"

# Log a learning
flowstate:log_learning project_id=1 insight="Always verify MCP after updates" category="best_practice"

# Git sync
flowstate:git action="sync" commit_message="Session checkpoint"
```

## Key Files
- `mcp-server/flowstate/server.py` - v1.5 (21 tools) ✅ LIVE
- `mcp-server/flowstate/server_v14.py` - Backup of v1.4 (79 tools)
- `mcp-server/flowstate/tools.py` - Implementations
- `docs/TOOL_CONSOLIDATION.md` - Consolidation map

## Pending Todos (8)
1. Pre-Launch Audit: Code/Schema Parity Check
2. Implement device activation system + per-server IP subnets
3. Fix drag
4. Test file attachments end-to-end
5. Test Git sync with GitHub
6. Add AI description generation (Claude API)
7. Implement file content extraction
8. Write user documentation

## Next Steps
1. **Restart Claude Desktop** to pick up the log_learning bug fix
2. **Dogfood**: Use FlowState to track ongoing development
3. **Pre-Launch Audit**: Work through technical debt checklist

---
*Updated: January 28, 2026*
*Status: v1.5 verified live, log_learning bug fixed*
