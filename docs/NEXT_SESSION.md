# FlowState - Next Session Prompt

Copy this to start the next chat:

---

## CONTEXT

I'm building **FlowState** - a development memory system with SQLite + MCP Server + Tauri GUI.

**Project Location:** `/Users/johnmartin/code/FlowState/`

**Spec File:** Read `/mnt/project/Flow_state.md` for full architecture

**Build Log:** `/Users/johnmartin/code/FlowState/docs/BUILD_LOG.md`

---

## CURRENT STATUS

### ✅ Working (9/9 views + help system)
All views work: Dashboard, TreeView, KanbanBoard, Timeline, SearchPanel, DecisionTree, StoryMode, ArchitectureDiagram, QuickCapture

HelpSystem works: User Guide, Keyboard Shortcuts, MCP Setup, About

### ⚠️ BROKEN: MenuBar

**The Problem:** Custom React menu bar has a bug where View menu items stop working after navigating to certain views (especially TreeView and StoryMode). You can click File, Edit, View, etc. but the dropdown items don't trigger their actions.

**What I want:**
```
File:
  - New Project (⌘N)
  - Open Recent →
  - Export Project… (⌘E)
  - Close Window (⌘W)

Edit:
  - Undo/Redo
  - Cut/Copy/Paste (standard)
  - Quick Capture (⌘⇧M)

View:
  - Dashboard
  - Timeline
  - Kanban Board
  - Toggle Sidebar (⌘\)

Window:
  - Minimize (⌘M)
  - Zoom
  - FlowState (bring to front)

Help:
  - FlowState Help
  - Keyboard Shortcuts (⌘?)
  - Check for Updates…
  - About FlowState
```

**Options to consider:**
1. Use Tauri's native menu API (most reliable)
2. Use a proper React dropdown library (Radix UI, Headless UI)
3. Debug why the custom menu breaks in certain views

---

## KEY FILES

```
/Users/johnmartin/code/FlowState/gui/src/App.tsx           # Main app
/Users/johnmartin/code/FlowState/gui/src/components/MenuBar.tsx  # BROKEN - needs rework
/Users/johnmartin/code/FlowState/gui/src/components/HelpSystem.tsx  # Working
/Users/johnmartin/code/FlowState/gui/src/stores/appStore.ts  # Zustand store
```

---

## TASK FOR THIS SESSION

**Fix or replace the MenuBar component** so that:
1. All menu items work reliably
2. View switching works from any current view
3. Help menu opens the HelpSystem modal
4. File > New Project opens create project modal
5. Edit > Quick Capture opens quick capture modal

---

## QUICK START

```bash
cd "/Users/johnmartin/code/FlowState/gui"
cargo tauri dev
```

---

**Session 7 left off with a buggy menu bar that needs to be reworked.**
