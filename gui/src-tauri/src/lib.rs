// FlowState - Tauri Application Entry Point
// Complete implementation with all commands

mod database;

use database::{Database, get_default_db_path};
use std::sync::Mutex;
use tauri::State;

// ============================================================
// APP STATE
// ============================================================

struct AppState {
    db: Mutex<Database>,
}

// ============================================================
// PROJECT COMMANDS
// ============================================================

#[tauri::command]
fn list_projects(state: State<AppState>, status: Option<String>) -> Result<Vec<database::Project>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_projects(status.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_project(state: State<AppState>, name: String, description: Option<String>) -> Result<database::Project, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_project(&name, description.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_project(state: State<AppState>, id: i64) -> Result<database::Project, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_project(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_project(
    state: State<AppState>,
    id: i64,
    name: Option<String>,
    description: Option<String>,
    status: Option<String>
) -> Result<database::Project, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_project(id, name.as_deref(), description.as_deref(), status.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_project(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_project(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_project_context(state: State<AppState>, project_name: String, hours: Option<i32>) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let hours = hours.unwrap_or(48);
    
    let project = db.get_project_by_name(&project_name).map_err(|e| e.to_string())?;
    let components = db.list_components(project.id).map_err(|e| e.to_string())?;
    let open_problems = db.get_open_problems(Some(project.id), None).map_err(|e| e.to_string())?;
    let recent_changes = db.get_recent_changes(Some(project.id), None, hours).map_err(|e| e.to_string())?;
    let high_priority_todos = db.get_todos(project.id, None, None).map_err(|e| e.to_string())?;
    let recent_learnings = db.get_learnings(Some(project.id), None, false).map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "project": project,
        "components": components,
        "open_problems": open_problems,
        "recent_changes": recent_changes,
        "high_priority_todos": high_priority_todos,
        "recent_learnings": recent_learnings,
    }))
}

#[tauri::command]
fn get_project_stats(state: State<AppState>, project_id: i64) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_project_stats(project_id).map_err(|e| e.to_string())
}

// ============================================================
// COMPONENT COMMANDS
// ============================================================

#[tauri::command]
fn list_components(state: State<AppState>, project_id: i64) -> Result<Vec<database::Component>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_components(project_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_component(
    state: State<AppState>,
    project_id: i64,
    name: String,
    description: Option<String>,
    parent_component_id: Option<i64>
) -> Result<database::Component, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_component(project_id, &name, description.as_deref(), parent_component_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_component(state: State<AppState>, id: i64) -> Result<database::Component, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_component(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_component(
    state: State<AppState>,
    id: i64,
    name: Option<String>,
    description: Option<String>,
    status: Option<String>
) -> Result<database::Component, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_component(id, name.as_deref(), description.as_deref(), status.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_component(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_component(id).map_err(|e| e.to_string())
}

// ============================================================
// CHANGE COMMANDS
// ============================================================

#[tauri::command]
fn log_change(
    state: State<AppState>,
    component_id: i64,
    field_name: String,
    old_value: Option<String>,
    new_value: Option<String>,
    change_type: Option<String>,
    reason: Option<String>
) -> Result<database::Change, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let change_type = change_type.unwrap_or_else(|| "code".to_string());
    db.log_change(component_id, &field_name, old_value.as_deref(), new_value.as_deref(), &change_type, reason.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_recent_changes(
    state: State<AppState>,
    project_id: Option<i64>,
    component_id: Option<i64>,
    hours: Option<i32>
) -> Result<Vec<database::Change>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let hours = hours.unwrap_or(24);
    db.get_recent_changes(project_id, component_id, hours).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_changes(
    state: State<AppState>,
    project_id: Option<i64>,
    component_id: Option<i64>
) -> Result<Vec<database::Change>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_changes(project_id, component_id).map_err(|e| e.to_string())
}

// ============================================================
// PROBLEM COMMANDS
// ============================================================

#[tauri::command]
fn log_problem(
    state: State<AppState>,
    component_id: i64,
    title: String,
    description: Option<String>,
    severity: Option<String>
) -> Result<database::Problem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let severity = severity.unwrap_or_else(|| "medium".to_string());
    db.log_problem(component_id, &title, description.as_deref(), &severity)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_problem(state: State<AppState>, id: i64) -> Result<database::Problem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_problem(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_open_problems(
    state: State<AppState>,
    project_id: Option<i64>,
    component_id: Option<i64>
) -> Result<Vec<database::Problem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_open_problems(project_id, component_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_problems(
    state: State<AppState>,
    project_id: Option<i64>,
    component_id: Option<i64>
) -> Result<Vec<database::Problem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_problems(project_id, component_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_problem(
    state: State<AppState>,
    id: i64,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    severity: Option<String>,
    root_cause: Option<String>
) -> Result<database::Problem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_problem(id, title.as_deref(), description.as_deref(), status.as_deref(), severity.as_deref(), root_cause.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_problem(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_problem(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_problem_tree(state: State<AppState>, problem_id: i64) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_problem_tree(problem_id).map_err(|e| e.to_string())
}

// ============================================================
// SOLUTION ATTEMPT COMMANDS
// ============================================================

#[tauri::command]
fn log_attempt(
    state: State<AppState>,
    problem_id: i64,
    description: String,
    parent_attempt_id: Option<i64>
) -> Result<database::SolutionAttempt, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.log_attempt(problem_id, &description, parent_attempt_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn mark_attempt_outcome(
    state: State<AppState>,
    id: i64,
    outcome: String,
    notes: Option<String>,
    confidence: Option<String>
) -> Result<database::SolutionAttempt, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.mark_attempt_outcome(id, &outcome, notes.as_deref(), confidence.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_attempts_for_problem(state: State<AppState>, problem_id: i64) -> Result<Vec<database::SolutionAttempt>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_attempts_for_problem(problem_id).map_err(|e| e.to_string())
}

// ============================================================
// SOLUTION COMMANDS
// ============================================================

#[tauri::command]
fn mark_problem_solved(
    state: State<AppState>,
    problem_id: i64,
    winning_attempt_id: Option<i64>,
    summary: String,
    code_snippet: Option<String>,
    key_insight: Option<String>
) -> Result<database::Solution, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.mark_problem_solved(problem_id, winning_attempt_id, &summary, code_snippet.as_deref(), key_insight.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_solution_for_problem(state: State<AppState>, problem_id: i64) -> Result<Option<database::Solution>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_solution_for_problem(problem_id).map_err(|e| e.to_string())
}

// ============================================================
// TODO COMMANDS
// ============================================================

#[tauri::command]
fn add_todo(
    state: State<AppState>,
    project_id: i64,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    component_id: Option<i64>,
    due_date: Option<String>
) -> Result<database::Todo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let priority = priority.unwrap_or_else(|| "medium".to_string());
    db.add_todo(project_id, &title, description.as_deref(), &priority, component_id, due_date.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_todo(state: State<AppState>, id: i64) -> Result<database::Todo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_todo(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_todos(
    state: State<AppState>,
    project_id: i64,
    status: Option<String>,
    priority: Option<String>
) -> Result<Vec<database::Todo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_todos(project_id, status.as_deref(), priority.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_todo(
    state: State<AppState>,
    id: i64,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    due_date: Option<String>
) -> Result<database::Todo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_todo(id, title.as_deref(), description.as_deref(), status.as_deref(), priority.as_deref(), due_date.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_todo(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_todo(id).map_err(|e| e.to_string())
}

// ============================================================
// LEARNING COMMANDS
// ============================================================

#[tauri::command]
fn log_learning(
    state: State<AppState>,
    project_id: i64,
    insight: String,
    category: Option<String>,
    context: Option<String>,
    component_id: Option<i64>,
    source: Option<String>
) -> Result<database::Learning, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let source = source.unwrap_or_else(|| "experience".to_string());
    db.log_learning(project_id, &insight, category.as_deref(), context.as_deref(), component_id, &source)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_learning(state: State<AppState>, id: i64) -> Result<database::Learning, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_learning(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_learnings(
    state: State<AppState>,
    project_id: Option<i64>,
    category: Option<String>,
    verified_only: Option<bool>
) -> Result<Vec<database::Learning>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let verified_only = verified_only.unwrap_or(false);
    db.get_learnings(project_id, category.as_deref(), verified_only)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_learning(
    state: State<AppState>,
    id: i64,
    insight: Option<String>,
    category: Option<String>,
    context: Option<String>,
    verified: Option<bool>
) -> Result<database::Learning, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_learning(id, insight.as_deref(), category.as_deref(), context.as_deref(), verified)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_learning(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_learning(id).map_err(|e| e.to_string())
}

// ============================================================
// SEARCH COMMAND
// ============================================================

#[tauri::command]
fn search(
    state: State<AppState>,
    query: String,
    project_id: Option<i64>,
    limit: Option<i32>
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(10);
    db.search(&query, project_id, limit).map_err(|e| e.to_string())
}

// ============================================================
// STORY GENERATION COMMANDS
// ============================================================

#[tauri::command]
fn generate_project_story(state: State<AppState>, project_id: i64) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    // Gather all project data
    let project = db.get_project(project_id).map_err(|e| e.to_string())?;
    let components = db.list_components(project_id).map_err(|e| e.to_string())?;
    let all_problems = db.get_all_problems(Some(project_id), None).map_err(|e| e.to_string())?;
    let all_changes = db.get_all_changes(Some(project_id), None).map_err(|e| e.to_string())?;
    let learnings = db.get_learnings(Some(project_id), None, false).map_err(|e| e.to_string())?;
    let todos = db.get_todos(project_id, None, None).map_err(|e| e.to_string())?;
    let stats = db.get_project_stats(project_id).map_err(|e| e.to_string())?;
    
    // Count solved vs open problems
    let solved_count = all_problems.iter().filter(|p| p.status == "solved").count();
    let open_count = all_problems.iter().filter(|p| p.status != "solved").count();
    
    Ok(serde_json::json!({
        "project": project,
        "components": components,
        "problems": all_problems,
        "changes": all_changes,
        "learnings": learnings,
        "todos": todos,
        "stats": stats,
        "summary": {
            "total_problems": all_problems.len(),
            "solved_problems": solved_count,
            "open_problems": open_count,
            "total_changes": all_changes.len(),
            "total_learnings": learnings.len(),
            "total_components": components.len(),
        }
    }))
}

#[tauri::command]
fn generate_problem_journey(state: State<AppState>, problem_id: i64) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    let problem = db.get_problem(problem_id).map_err(|e| e.to_string())?;
    let attempts = db.get_attempts_for_problem(problem_id).map_err(|e| e.to_string())?;
    let solution = db.get_solution_for_problem(problem_id).map_err(|e| e.to_string())?;
    
    // Build the journey with timeline
    let mut journey_steps = Vec::new();
    
    // Add problem creation as first step
    journey_steps.push(serde_json::json!({
        "type": "problem_identified",
        "title": problem.title.clone(),
        "description": problem.description.clone(),
        "timestamp": problem.created_at.clone(),
        "severity": problem.severity.clone(),
    }));
    
    // Add each attempt
    for attempt in &attempts {
        journey_steps.push(serde_json::json!({
            "type": "attempt",
            "id": attempt.id,
            "description": attempt.description.clone(),
            "outcome": attempt.outcome.clone(),
            "notes": attempt.notes.clone(),
            "timestamp": attempt.created_at.clone(),
            "parent_attempt_id": attempt.parent_attempt_id,
        }));
    }
    
    // Add solution if exists
    if let Some(sol) = &solution {
        journey_steps.push(serde_json::json!({
            "type": "solved",
            "summary": sol.summary.clone(),
            "key_insight": sol.key_insight.clone(),
            "code_snippet": sol.code_snippet.clone(),
            "timestamp": sol.created_at.clone(),
            "winning_attempt_id": sol.winning_attempt_id,
        }));
    }
    
    Ok(serde_json::json!({
        "problem": problem,
        "attempts": attempts,
        "solution": solution,
        "journey": journey_steps,
        "stats": {
            "total_attempts": attempts.len(),
            "failed_attempts": attempts.iter().filter(|a| a.outcome.as_deref() == Some("failure")).count(),
            "is_solved": solution.is_some(),
        }
    }))
}

// ============================================================
// APP ENTRY POINT
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_path = get_default_db_path();
    println!("FlowState: Using database at {:?}", db_path);
    
    let db = Database::new(db_path).expect("Failed to initialize database");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            // Project commands
            list_projects,
            create_project,
            get_project,
            update_project,
            delete_project,
            get_project_context,
            get_project_stats,
            // Component commands
            list_components,
            create_component,
            get_component,
            update_component,
            delete_component,
            // Change commands
            log_change,
            get_recent_changes,
            get_all_changes,
            // Problem commands
            log_problem,
            get_problem,
            get_open_problems,
            get_all_problems,
            update_problem,
            delete_problem,
            get_problem_tree,
            // Attempt commands
            log_attempt,
            mark_attempt_outcome,
            get_attempts_for_problem,
            // Solution commands
            mark_problem_solved,
            get_solution_for_problem,
            // Todo commands
            add_todo,
            get_todo,
            get_todos,
            update_todo,
            delete_todo,
            // Learning commands
            log_learning,
            get_learning,
            get_learnings,
            update_learning,
            delete_learning,
            // Search
            search,
            // Story generation
            generate_project_story,
            generate_problem_journey,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
