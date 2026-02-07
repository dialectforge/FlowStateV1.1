#!/usr/bin/env python3
"""Split tools.py into modules."""

import re
import os

# Read the original file
with open(os.path.join(os.path.dirname(__file__), 'tools.py'), 'r') as f:
    content = f.read()
    lines = content.split('\n')

# Define the module structure based on function groupings
MODULES = {
    'utils': {
        'functions': ['_compact_dict', '_compact_list', 'get_db', 'set_db'],
        'imports': '''"""Utility functions for FlowState tools."""

from typing import Optional
from ..database import Database


# Global database instance (initialized by server)
_db: Optional[Database] = None

'''
    },
    'core': {
        'functions': [
            'list_projects', 'create_project', 'get_project', 'update_project',
            'get_project_context', 'create_component', 'list_components', 
            'update_component', 'log_change', 'get_recent_changes', 'search',
            'get_component_history', 'link_items', '_get_project_id_for_item',
            'find_related', 'get_cross_references',
            'get_project_context_v11', 'get_project_context_lean'
        ],
        'imports': '''"""Core project and component tools."""

from typing import Optional, Any
from datetime import datetime
from .utils import get_db, _compact_list

'''
    },
    'problems': {
        'functions': [
            'log_problem', 'get_open_problems', 'log_attempt', 
            'mark_attempt_outcome', 'mark_problem_solved', 'get_problem_tree'
        ],
        'imports': '''"""Problem tracking and solution tools."""

from typing import Optional
from .utils import get_db, _compact_list

'''
    },
    'sessions': {
        'functions': [
            'start_session', 'end_session', 'get_current_session',
            'log_conversation', 'get_conversations', 'get_sessions',
            'get_conversation_history', 'initialize_session_v13', 'finalize_session_v13'
        ],
        'imports': '''"""Session and conversation management tools."""

from typing import Optional
import json
from .utils import get_db

'''
    },
    'todos': {
        'functions': ['add_todo', 'update_todo', 'get_todos'],
        'imports': '''"""Todo management tools."""

from typing import Optional
from .utils import get_db, _compact_list

'''
    },
    'learning': {
        'functions': [
            'log_learning', 'get_learnings', 'learn_skill', 'get_skills',
            'apply_skill', 'confirm_skill', 'promote_skills',
            'save_state', 'get_latest_state', 'get_state_chain', 'restore_state'
        ],
        'imports': '''"""Learning and skill tracking tools."""

from typing import Optional
import json
from datetime import datetime
from .utils import get_db, _compact_list

'''
    },
    'variables': {
        'functions': [
            'create_project_variable', 'get_project_variables',
            'update_project_variable', 'delete_project_variable',
            'create_project_method', 'get_project_methods',
            'update_project_method', 'delete_project_method'
        ],
        'imports': '''"""Project variables and methods tools."""

from typing import Optional
import json
from .utils import get_db

'''
    },
    'files': {
        'functions': [
            '_get_project_bundle_path', '_compute_file_hash', '_get_file_type',
            'attach_file', 'get_attachments', 'remove_attachment', 'search_file_content'
        ],
        'imports': '''"""File attachment tools."""

import os
import shutil
import hashlib
from pathlib import Path
from typing import Optional
from datetime import datetime
from .utils import get_db

'''
    },
    'git_ops': {
        'functions': [
            '_run_git_command', 'git_init', 'git_status', 'git_sync',
            'git_set_remote', 'git_clone', 'git_history'
        ],
        'imports': '''"""Git operations tools."""

import subprocess
from pathlib import Path
from typing import Optional
from datetime import datetime
from .utils import get_db

'''
    },
    'intelligence': {
        'functions': [
            'register_tool', 'get_tools', 'update_tool_stats', 'get_tool_recommendation',
            'log_tool_use', 'rate_tool_use', 'get_usage_patterns',
            'record_pattern', 'get_patterns', 'apply_pattern', 'confirm_pattern',
            'log_metric', 'get_metrics', 'get_tuning_suggestions'
        ],
        'imports': '''"""Intelligence layer tools (v1.3) - tool tracking, patterns, metrics."""

from typing import Optional
import json
from datetime import datetime
from .utils import get_db

'''
    },
    'story': {
        'functions': [
            'generate_project_story', 'generate_problem_journey', 
            'generate_architecture_diagram'
        ],
        'imports': '''"""Story generation tools."""

from .utils import get_db

'''
    }
}

def find_function_bounds(lines, func_name):
    """Find the start and end line indices for a function."""
    start = None
    for i, line in enumerate(lines):
        if re.match(rf'^def {func_name}\(', line):
            start = i
            break
    
    if start is None:
        return None, None
    
    # Find the end (next function or end of file)
    indent_level = 0
    in_docstring = False
    docstring_char = None
    
    for i in range(start + 1, len(lines)):
        line = lines[i]
        
        # Check for next function definition at same level
        if re.match(r'^def \w+\(', line):
            return start, i
        
        # Check for section comments (which mark boundaries)
        if re.match(r'^# ===', line):
            return start, i
    
    return start, len(lines)

# Create the tools directory
tools_dir = os.path.join(os.path.dirname(__file__), 'tools')
os.makedirs(tools_dir, exist_ok=True)

# Track which functions we've processed
processed = set()

# Generate each module
for module_name, config in MODULES.items():
    module_content = config['imports']
    
    for func_name in config['functions']:
        start, end = find_function_bounds(lines, func_name)
        if start is not None:
            func_code = '\n'.join(lines[start:end]).rstrip()
            module_content += func_code + '\n\n\n'
            processed.add(func_name)
            print(f"  {func_name} -> {module_name}.py")
        else:
            print(f"  WARNING: {func_name} not found!")
    
    # Write the module
    module_path = os.path.join(tools_dir, f'{module_name}.py')
    with open(module_path, 'w') as f:
        f.write(module_content.rstrip() + '\n')
    print(f"Created {module_name}.py")

# Check for unprocessed functions
all_funcs = set(re.findall(r'^def (\w+)\(', content, re.MULTILINE))
unprocessed = all_funcs - processed
if unprocessed:
    print(f"\nWARNING: Unprocessed functions: {unprocessed}")

print(f"\nProcessed {len(processed)} functions into {len(MODULES)} modules")
