#!/bin/bash
# FlowState MCP Server launcher
# This script ensures the module is found regardless of working directory

cd "/Users/johnmartin/code/FlowState/mcp-server"
export PYTHONPATH="/Users/johnmartin/code/FlowState/mcp-server:$PYTHONPATH"
exec python3 -m flowstate.server
