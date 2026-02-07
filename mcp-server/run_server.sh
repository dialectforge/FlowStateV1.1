#!/bin/bash
# FlowState MCP Server launcher
# This script ensures the module is found regardless of working directory

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"
exec /Library/Frameworks/Python.framework/Versions/3.12/bin/python3 -m flowstate.server
