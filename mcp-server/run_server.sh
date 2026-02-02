#!/bin/bash
# FlowState MCP Server launcher
# This script ensures the module is found regardless of working directory

cd "/Users/johnmartin/code/FlowState/mcp-server"
export PYTHONPATH="/Users/johnmartin/code/FlowState/mcp-server:$PYTHONPATH"
exec /Library/Frameworks/Python.framework/Versions/3.12/bin/python3 -m flowstate.server
