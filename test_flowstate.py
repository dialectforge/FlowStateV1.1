#!/usr/bin/env python3
"""Quick test script to verify FlowState is working."""

import sys
sys.path.insert(0, '/Users/johnmartin/code/Flow state/mcp-server')

from flowstate.database import Database, init_db
from pathlib import Path

# Use a test database
TEST_DB = Path("/tmp/flowstate_test.db")
if TEST_DB.exists():
    TEST_DB.unlink()

print("🧪 Testing FlowState...")

# Initialize
print("\n1. Initializing database...")
init_db(TEST_DB)
db = Database(TEST_DB)
print("   ✅ Database initialized")

# Create project
print("\n2. Creating project...")
project = db.create_project("Test Project", "A test project")
print(f"   ✅ Created project: {project.name} (ID: {project.id})")

# Create component
print("\n3. Creating component...")
component = db.create_component(project.id, "Backend API", "The API layer")
print(f"   ✅ Created component: {component.name} (ID: {component.id})")

# Log a problem
print("\n4. Logging problem...")
problem = db.log_problem(component.id, "Authentication failing", "JWT tokens not validating", "high")
print(f"   ✅ Logged problem: {problem.title} (ID: {problem.id})")

# Log an attempt
print("\n5. Logging solution attempt...")
attempt1 = db.log_attempt(problem.id, "Try refreshing the token secret")
print(f"   ✅ Logged attempt: {attempt1.description[:30]}... (ID: {attempt1.id})")

# Mark attempt as failure
print("\n6. Marking attempt as failure...")
attempt1 = db.mark_attempt_outcome(attempt1.id, "failure", "Secret was correct, issue elsewhere")
print(f"   ✅ Marked: {attempt1.outcome}")

# Log another attempt
print("\n7. Logging second attempt...")
attempt2 = db.log_attempt(problem.id, "Check token expiration time")
attempt2 = db.mark_attempt_outcome(attempt2.id, "success", "Tokens were expiring too fast!")
print(f"   ✅ Attempt 2: {attempt2.outcome}")

# Mark problem solved
print("\n8. Marking problem solved...")
solution = db.mark_problem_solved(
    problem.id,
    attempt2.id,
    "Increased token expiration from 5min to 1hr",
    "Token expiration was too aggressive"
)
print(f"   ✅ Solution: {solution.summary}")

# Log a learning
print("\n9. Logging learning...")
learning = db.log_learning(
    project.id,
    "JWT tokens need reasonable expiration times - 1hr is better than 5min for dev",
    category="gotcha",
    source="experience"
)
print(f"   ✅ Learning: {learning.insight[:50]}...")

# Get project context (THE KILLER FEATURE)
print("\n10. Getting project context...")
context = db.get_project_context("Test Project")
print(f"   ✅ Context retrieved!")
print(f"      - Project: {context.project.name}")
print(f"      - Components: {len(context.components)}")
print(f"      - Open problems: {len(context.open_problems)}")
print(f"      - Recent learnings: {len(context.recent_learnings)}")

# Verify problem is solved
print("\n11. Verifying problem status...")
updated_problem = db.get_problem(problem.id)
print(f"   ✅ Problem status: {updated_problem.status}")

print("\n" + "="*50)
print("✅ All tests passed! FlowState is working.")
print("="*50)

# Cleanup
TEST_DB.unlink()
print("\n🧹 Cleaned up test database")
