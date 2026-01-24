// FlowState - Tauri Application Entry Point
// v1.1: Complete implementation with file handling, Git sync, and settings commands

mod database;

use database::{Database, get_default_db_path};
use std::sync::Mutex;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder, PredefinedMenuItem},
    State, Manager, Emitter,
};

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
fn get_project_context(state: State<AppState>, project_name: String, hours: Option<i32>, include_files: Option<bool>) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let hours = hours.unwrap_or(48);
    let include_files = include_files.unwrap_or(true);
    
    let project = db.get_project_by_name(&project_name).map_err(|e| e.to_string())?;
    let components = db.list_components(project.id).map_err(|e| e.to_string())?;
    let open_problems = db.get_open_problems(Some(project.id), None).map_err(|e| e.to_string())?;
    let recent_changes = db.get_recent_changes(Some(project.id), None, hours).map_err(|e| e.to_string())?;
    let high_priority_todos = db.get_todos(project.id, None, None).map_err(|e| e.to_string())?;
    let recent_learnings = db.get_learnings(Some(project.id), None, false).map_err(|e| e.to_string())?;
    
    // v1.1: Include attachments if requested
    let attachments = if include_files {
        db.get_attachments(project.id, None, None).map_err(|e| e.to_string())?
    } else {
        Vec::new()
    };
    
    Ok(serde_json::json!({
        "project": project,
        "components": components,
        "open_problems": open_problems,
        "recent_changes": recent_changes,
        "high_priority_todos": high_priority_todos,
        "recent_learnings": recent_learnings,
        "attachments": attachments,
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
    limit: Option<i32>,
    include_file_content: Option<bool>
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(10);
    // include_file_content is for future semantic search in files
    let _ = include_file_content;
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
    let attachments = db.get_attachments(project_id, None, None).map_err(|e| e.to_string())?;
    
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
        "attachments": attachments,
        "stats": stats,
        "summary": {
            "total_problems": all_problems.len(),
            "solved_problems": solved_count,
            "open_problems": open_count,
            "total_changes": all_changes.len(),
            "total_learnings": learnings.len(),
            "total_components": components.len(),
            "total_attachments": attachments.len(),
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
// v1.1: FILE ATTACHMENT COMMANDS
// ============================================================

#[tauri::command]
fn attach_file(
    state: State<AppState>,
    project_id: i64,
    file_path: String,
    component_id: Option<i64>,
    problem_id: Option<i64>,
    user_description: Option<String>,
    copy_to_bundle: Option<bool>
) -> Result<database::Attachment, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    let path = Path::new(&file_path);
    let file_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    let file_type = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    // Get file size
    let file_size = std::fs::metadata(&file_path)
        .map(|m| m.len() as i64)
        .ok();
    
    // Calculate file hash (SHA256)
    let file_hash = calculate_file_hash(&file_path).ok();
    
    let copy_to_bundle = copy_to_bundle.unwrap_or(true);
    let is_external = !copy_to_bundle;
    
    // If copying to bundle, copy the file
    let final_path = if copy_to_bundle {
        copy_file_to_project_bundle(&file_path, project_id)?
    } else {
        file_path.clone()
    };
    
    db.create_attachment(
        project_id,
        &file_name,
        &final_path,
        &file_type,
        file_size,
        file_hash.as_deref(),
        is_external,
        component_id,
        problem_id,
        user_description.as_deref(),
        None, // tags
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_attachments(
    state: State<AppState>,
    project_id: i64,
    component_id: Option<i64>,
    problem_id: Option<i64>
) -> Result<Vec<database::Attachment>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_attachments(project_id, component_id, problem_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_attachment(state: State<AppState>, id: i64) -> Result<database::Attachment, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_attachment(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_attachment(
    state: State<AppState>,
    id: i64,
    user_description: Option<String>,
    tags: Option<String>,
    ai_description: Option<String>,
    ai_summary: Option<String>,
    content_extracted: Option<bool>
) -> Result<database::Attachment, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_attachment(
        id,
        user_description.as_deref(),
        tags.as_deref(),
        ai_description.as_deref(),
        ai_summary.as_deref(),
        content_extracted,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_attachment(state: State<AppState>, id: i64, delete_file: Option<bool>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    // Get attachment first to check if we need to delete the file
    if delete_file.unwrap_or(false) {
        if let Ok(attachment) = db.get_attachment(id) {
            if !attachment.is_external {
                // Delete the file from bundle
                let _ = std::fs::remove_file(&attachment.file_path);
            }
        }
    }
    
    db.delete_attachment(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file_content(file_path: String, file_type: String) -> Result<serde_json::Value, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err("File not found".to_string());
    }
    
    match file_type.as_str() {
        "txt" | "md" | "json" | "swift" | "rs" | "py" | "js" | "ts" | "html" | "css" | "sql" | "yaml" | "yml" | "toml" | "xml" => {
            // Text files
            let content = std::fs::read_to_string(&file_path)
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({
                "type": "text",
                "content": content,
                "size": content.len(),
            }))
        },
        "png" | "jpg" | "jpeg" | "gif" | "webp" => {
            // Image files - return base64
            let content = std::fs::read(&file_path)
                .map_err(|e| e.to_string())?;
            let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &content);
            Ok(serde_json::json!({
                "type": "image",
                "content": base64,
                "size": content.len(),
                "mime_type": format!("image/{}", file_type),
            }))
        },
        "pdf" => {
            // PDF files - return base64 for now
            let content = std::fs::read(&file_path)
                .map_err(|e| e.to_string())?;
            let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &content);
            Ok(serde_json::json!({
                "type": "pdf",
                "content": base64,
                "size": content.len(),
            }))
        },
        _ => {
            // Binary files - return info only
            let metadata = std::fs::metadata(&file_path)
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({
                "type": "binary",
                "size": metadata.len(),
                "message": "Binary file content not readable as text",
            }))
        }
    }
}

// ============================================================
// v1.1: CONTENT LOCATION COMMANDS
// ============================================================

#[tauri::command]
fn get_content_locations(state: State<AppState>, attachment_id: i64) -> Result<Vec<database::ContentLocation>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_content_locations_for_attachment(attachment_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_content_location(
    state: State<AppState>,
    attachment_id: i64,
    description: String,
    category: Option<String>,
    location_type: String,
    start_location: String,
    end_location: Option<String>,
    snippet: Option<String>,
    related_problem_id: Option<i64>,
    related_solution_id: Option<i64>,
    related_learning_id: Option<i64>,
    related_component_id: Option<i64>
) -> Result<database::ContentLocation, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_content_location(
        attachment_id,
        &description,
        category.as_deref(),
        &location_type,
        &start_location,
        end_location.as_deref(),
        snippet.as_deref(),
        related_problem_id,
        related_solution_id,
        related_learning_id,
        related_component_id,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_content_location(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_content_location(id).map_err(|e| e.to_string())
}

// ============================================================
// v1.1: EXTRACTION COMMANDS
// ============================================================

#[tauri::command]
fn get_extractions(state: State<AppState>, attachment_id: i64) -> Result<Vec<database::Extraction>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_extractions_for_attachment(attachment_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_extraction(
    state: State<AppState>,
    attachment_id: i64,
    record_type: String,
    record_id: i64,
    source_location: Option<String>,
    source_snippet: Option<String>,
    confidence: Option<f64>
) -> Result<database::Extraction, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_extraction(
        attachment_id,
        &record_type,
        record_id,
        source_location.as_deref(),
        source_snippet.as_deref(),
        confidence,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_extraction_review(
    state: State<AppState>,
    id: i64,
    user_reviewed: bool,
    user_approved: Option<bool>
) -> Result<database::Extraction, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_extraction_review(id, user_reviewed, user_approved).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_extraction(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_extraction(id).map_err(|e| e.to_string())
}

// ============================================================
// v1.1: GIT SYNC COMMANDS
// ============================================================

#[tauri::command]
fn git_init(data_path: Option<String>) -> Result<serde_json::Value, String> {
    let path = data_path.unwrap_or_else(get_flowstate_data_path);
    
    // Check if already initialized
    let git_dir = Path::new(&path).join(".git");
    if git_dir.exists() {
        return Ok(serde_json::json!({
            "status": "already_initialized",
            "path": path,
        }));
    }
    
    // Run git init
    let output = Command::new("git")
        .args(["init"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    // Create .gitignore
    let gitignore_path = Path::new(&path).join(".gitignore");
    let gitignore_content = r#"# OS files
.DS_Store
Thumbs.db

# Temporary files
*.sqlite-journal
*.sqlite-wal
*.sqlite-shm
*.tmp
*.bak

# Local backups
*.local-backup-*
"#;
    std::fs::write(gitignore_path, gitignore_content)
        .map_err(|e| format!("Failed to create .gitignore: {}", e))?;
    
    // Initial commit
    let _ = Command::new("git")
        .args(["add", "."])
        .current_dir(&path)
        .output();
    
    let _ = Command::new("git")
        .args(["commit", "-m", "FlowState initialized"])
        .current_dir(&path)
        .output();
    
    Ok(serde_json::json!({
        "status": "initialized",
        "path": path,
    }))
}

#[tauri::command]
fn git_status(data_path: Option<String>) -> Result<serde_json::Value, String> {
    let path = data_path.unwrap_or_else(get_flowstate_data_path);
    
    // Check if git is initialized
    let git_dir = Path::new(&path).join(".git");
    if !git_dir.exists() {
        return Ok(serde_json::json!({
            "initialized": false,
            "status": "not_initialized",
        }));
    }
    
    // Get status
    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git status: {}", e))?;
    
    let changes = String::from_utf8_lossy(&output.stdout);
    let pending_changes = changes.lines().count();
    
    // Check for remote
    let remote_output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(&path)
        .output()
        .ok();
    
    let remote_url = remote_output
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());
    
    // Get last commit
    let log_output = Command::new("git")
        .args(["log", "-1", "--format=%H|%s|%ai"])
        .current_dir(&path)
        .output()
        .ok();
    
    let last_commit = log_output
        .filter(|o| o.status.success())
        .map(|o| {
            let s = String::from_utf8_lossy(&o.stdout);
            let parts: Vec<&str> = s.trim().split('|').collect();
            if parts.len() >= 3 {
                serde_json::json!({
                    "hash": parts[0],
                    "message": parts[1],
                    "date": parts[2],
                })
            } else {
                serde_json::json!(null)
            }
        });
    
    Ok(serde_json::json!({
        "initialized": true,
        "pending_changes": pending_changes,
        "has_changes": pending_changes > 0,
        "remote_url": remote_url,
        "has_remote": remote_url.is_some(),
        "last_commit": last_commit,
    }))
}

#[tauri::command]
fn git_sync(data_path: Option<String>, commit_message: Option<String>) -> Result<serde_json::Value, String> {
    let path = data_path.unwrap_or_else(get_flowstate_data_path);
    
    // Check if git is initialized
    let git_dir = Path::new(&path).join(".git");
    if !git_dir.exists() {
        return Err("Git not initialized. Run git_init first.".to_string());
    }
    
    // Add all changes
    let add_output = Command::new("git")
        .args(["add", "."])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to git add: {}", e))?;
    
    if !add_output.status.success() {
        return Err(format!("git add failed: {}", String::from_utf8_lossy(&add_output.stderr)));
    }
    
    // Check if there are changes to commit
    let status_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to check status: {}", e))?;
    
    let has_changes = !String::from_utf8_lossy(&status_output.stdout).is_empty();
    
    if has_changes {
        // Commit
        let message = commit_message.unwrap_or_else(|| {
            format!("FlowState sync - {}", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"))
        });
        
        let commit_output = Command::new("git")
            .args(["commit", "-m", &message])
            .current_dir(&path)
            .output()
            .map_err(|e| format!("Failed to git commit: {}", e))?;
        
        if !commit_output.status.success() {
            return Err(format!("git commit failed: {}", String::from_utf8_lossy(&commit_output.stderr)));
        }
    }
    
    // Check if remote exists
    let remote_output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(&path)
        .output();
    
    let has_remote = remote_output
        .map(|o| o.status.success())
        .unwrap_or(false);
    
    if has_remote {
        // Pull with rebase
        let pull_output = Command::new("git")
            .args(["pull", "--rebase", "origin", "main"])
            .current_dir(&path)
            .output();
        
        if let Ok(output) = pull_output {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.contains("conflict") {
                    return Ok(serde_json::json!({
                        "status": "conflict",
                        "message": "Sync conflict detected. Your local changes have been preserved.",
                        "committed": has_changes,
                    }));
                }
                // Ignore other pull errors (e.g., no remote tracking)
            }
        }
        
        // Push
        let push_output = Command::new("git")
            .args(["push", "origin", "main"])
            .current_dir(&path)
            .output();
        
        let pushed = push_output
            .map(|o| o.status.success())
            .unwrap_or(false);
        
        return Ok(serde_json::json!({
            "status": "synced",
            "committed": has_changes,
            "pushed": pushed,
        }));
    }
    
    Ok(serde_json::json!({
        "status": "committed_local",
        "committed": has_changes,
        "message": "Changes committed locally. No remote configured.",
    }))
}

#[tauri::command]
fn git_set_remote(data_path: Option<String>, remote_url: String) -> Result<serde_json::Value, String> {
    let path = data_path.unwrap_or_else(get_flowstate_data_path);
    
    // Check if remote exists
    let check_output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(&path)
        .output();
    
    let has_existing_remote = check_output
        .map(|o| o.status.success())
        .unwrap_or(false);
    
    // Set or update remote
    let args = if has_existing_remote {
        vec!["remote", "set-url", "origin", &remote_url]
    } else {
        vec!["remote", "add", "origin", &remote_url]
    };
    
    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to set remote: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(serde_json::json!({
        "status": "success",
        "remote_url": remote_url,
        "action": if has_existing_remote { "updated" } else { "added" },
    }))
}

#[tauri::command]
fn git_clone(remote_url: String, local_path: Option<String>) -> Result<serde_json::Value, String> {
    let path = local_path.unwrap_or_else(get_flowstate_data_path);
    
    // Check if path already exists and has content
    let path_obj = Path::new(&path);
    if path_obj.exists() && path_obj.read_dir().map(|mut d| d.next().is_some()).unwrap_or(false) {
        return Err("Target directory is not empty".to_string());
    }
    
    // Create parent directory if needed
    if let Some(parent) = path_obj.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Clone
    let output = Command::new("git")
        .args(["clone", &remote_url, &path])
        .output()
        .map_err(|e| format!("Failed to git clone: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(serde_json::json!({
        "status": "cloned",
        "path": path,
        "remote_url": remote_url,
    }))
}

#[tauri::command]
fn git_history(data_path: Option<String>, limit: Option<i32>) -> Result<Vec<serde_json::Value>, String> {
    let path = data_path.unwrap_or_else(get_flowstate_data_path);
    let limit = limit.unwrap_or(20);
    
    let output = Command::new("git")
        .args(["log", &format!("-{}", limit), "--format=%H|%s|%ai|%an"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to get git history: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    let history: Vec<serde_json::Value> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                serde_json::json!({
                    "hash": parts[0],
                    "message": parts[1],
                    "date": parts[2],
                    "author": parts[3],
                })
            } else {
                serde_json::json!({
                    "raw": line,
                })
            }
        })
        .collect();
    
    Ok(history)
}

// ============================================================
// v1.1: SETTINGS COMMANDS
// ============================================================

#[tauri::command]
fn get_settings(state: State<AppState>) -> Result<Vec<database::Setting>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_settings().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_setting(state: State<AppState>, key: String, value: String, category: Option<String>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_setting(&key, &value, category.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_setting(state: State<AppState>, key: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings_by_category(state: State<AppState>, category: String) -> Result<Vec<database::Setting>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_settings_by_category(&category).map_err(|e| e.to_string())
}

// ============================================================
// v1.1: SYNC STATUS COMMANDS (Database-tracked sync state)
// ============================================================

#[tauri::command]
fn get_sync_status(state: State<AppState>) -> Result<Option<database::SyncStatus>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_sync_status().map_err(|e| e.to_string())
}

#[tauri::command]
fn init_sync_status(state: State<AppState>, device_name: String) -> Result<database::SyncStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = uuid::Uuid::new_v4().to_string();
    db.create_sync_status(&device_name, &device_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_sync_status(
    state: State<AppState>,
    remote_url: Option<String>,
    last_sync_at: Option<String>,
    last_sync_commit: Option<String>,
    pending_changes: Option<i64>,
    has_conflicts: Option<bool>
) -> Result<database::SyncStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_sync_status(
        remote_url.as_deref(),
        last_sync_at.as_deref(),
        last_sync_commit.as_deref(),
        pending_changes,
        has_conflicts,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sync_history(state: State<AppState>, limit: Option<i32>) -> Result<Vec<database::SyncHistory>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(20);
    db.get_sync_history(limit).map_err(|e| e.to_string())
}

#[tauri::command]
fn log_sync_operation(
    state: State<AppState>,
    device_id: String,
    operation: String,
    commit_hash: Option<String>,
    files_changed: Option<i64>,
    status: String,
    error_message: Option<String>
) -> Result<database::SyncHistory, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.log_sync_operation(
        &device_id,
        &operation,
        commit_hash.as_deref(),
        files_changed,
        &status,
        error_message.as_deref(),
    ).map_err(|e| e.to_string())
}

// ============================================================
// FILE EXPORT
// ============================================================

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

fn get_flowstate_data_path() -> String {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("flowstate");
    data_dir.to_string_lossy().to_string()
}

fn calculate_file_hash(file_path: &str) -> Result<String, String> {
    use sha2::{Sha256, Digest};
    
    let mut file = std::fs::File::open(file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let hash = hasher.finalize();
    Ok(format!("{:x}", hash))
}

fn copy_file_to_project_bundle(source_path: &str, project_id: i64) -> Result<String, String> {
    let data_path = get_flowstate_data_path();
    let bundle_path = Path::new(&data_path)
        .join("projects")
        .join(format!("project_{}", project_id))
        .join("attachments");
    
    // Create directory if needed
    std::fs::create_dir_all(&bundle_path)
        .map_err(|e| format!("Failed to create attachments directory: {}", e))?;
    
    let source = Path::new(source_path);
    let file_name = source.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    
    // Generate unique filename if exists
    let mut dest_path = bundle_path.join(file_name);
    let mut counter = 1;
    while dest_path.exists() {
        let stem = source.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("");
        let new_name = if ext.is_empty() {
            format!("{}_{}", stem, counter)
        } else {
            format!("{}_{}.{}", stem, counter, ext)
        };
        dest_path = bundle_path.join(new_name);
        counter += 1;
    }
    
    std::fs::copy(source_path, &dest_path)
        .map_err(|e| format!("Failed to copy file: {}", e))?;
    
    Ok(dest_path.to_string_lossy().to_string())
}

// ============================================================
// NATIVE MENU SETUP (v1.1 Updated)
// ============================================================

fn create_menu(app: &tauri::App) -> Result<Menu<tauri::Wry>, tauri::Error> {
    use tauri::menu::AboutMetadataBuilder;
    
    // Build File menu (v1.1 updated)
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&MenuItemBuilder::with_id("new_project", "New Project").accelerator("CmdOrCtrl+N").build(app)?)
        .item(&MenuItemBuilder::with_id("open_project", "Open Project…").accelerator("CmdOrCtrl+O").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("import_file", "Import File…").accelerator("CmdOrCtrl+I").build(app)?)
        .item(&MenuItemBuilder::with_id("import_extract", "Import & Extract…").accelerator("CmdOrCtrl+Shift+I").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("export_project", "Export Project…").accelerator("CmdOrCtrl+E").build(app)?)
        .item(&MenuItemBuilder::with_id("export_markdown", "Export as Markdown…").accelerator("CmdOrCtrl+Shift+E").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("sync_now", "Sync Now").accelerator("CmdOrCtrl+S").build(app)?)
        .item(&MenuItemBuilder::with_id("sync_settings", "Sync Settings…").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some("Close Window"))?)
        .build()?;
    
    // Build Edit menu (v1.1 updated)
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, Some("Undo"))?)
        .item(&PredefinedMenuItem::redo(app, Some("Redo"))?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some("Cut"))?)
        .item(&PredefinedMenuItem::copy(app, Some("Copy"))?)
        .item(&PredefinedMenuItem::paste(app, Some("Paste"))?)
        .item(&PredefinedMenuItem::select_all(app, Some("Select All"))?)
        .separator()
        .item(&MenuItemBuilder::with_id("find", "Find…").accelerator("CmdOrCtrl+F").build(app)?)
        .item(&MenuItemBuilder::with_id("find_in_files", "Find in Files…").accelerator("CmdOrCtrl+Shift+F").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("quick_capture", "Quick Capture").accelerator("CmdOrCtrl+Shift+M").build(app)?)
        .build()?;
    
    // Build View menu (v1.1 updated)
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&MenuItemBuilder::with_id("view_dashboard", "Dashboard").accelerator("CmdOrCtrl+1").build(app)?)
        .item(&MenuItemBuilder::with_id("view_timeline", "Timeline").accelerator("CmdOrCtrl+2").build(app)?)
        .item(&MenuItemBuilder::with_id("view_kanban", "Kanban Board").accelerator("CmdOrCtrl+3").build(app)?)
        .item(&MenuItemBuilder::with_id("view_decision", "Decision Trees").accelerator("CmdOrCtrl+4").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("view_files", "Files & Attachments").accelerator("CmdOrCtrl+5").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar").accelerator("CmdOrCtrl+\\").build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_ai_panel", "Toggle AI Panel").accelerator("CmdOrCtrl+Shift+A").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, Some("Enter Full Screen"))?)
        .build()?;
    
    // Build Tools menu (v1.1 new)
    let tools_menu = SubmenuBuilder::new(app, "Tools")
        .item(&MenuItemBuilder::with_id("ai_describe_file", "AI Describe File…").build(app)?)
        .item(&MenuItemBuilder::with_id("ai_extract_file", "AI Extract from File…").build(app)?)
        .item(&MenuItemBuilder::with_id("ai_summarize", "AI Summarize Project…").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("reindex_files", "Reindex All Files").build(app)?)
        .item(&MenuItemBuilder::with_id("verify_integrity", "Verify File Integrity").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("git_history", "Git History…").build(app)?)
        .item(&MenuItemBuilder::with_id("resolve_conflicts", "Resolve Sync Conflicts…").build(app)?)
        .build()?;
    
    // Build Window menu
    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, Some("Minimize"))?)
        .item(&PredefinedMenuItem::maximize(app, Some("Zoom"))?)
        .separator()
        .item(&MenuItemBuilder::with_id("show_all_projects", "Show All Projects").accelerator("CmdOrCtrl+0").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("bring_to_front", "FlowState").build(app)?)
        .build()?;
    
    // Build Help menu (v1.1 updated)
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("help_guide", "FlowState Help").accelerator("CmdOrCtrl+?").build(app)?)
        .item(&MenuItemBuilder::with_id("help_shortcuts", "Keyboard Shortcuts").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("help_getting_started", "Getting Started Guide").build(app)?)
        .item(&MenuItemBuilder::with_id("help_working_files", "Working with Files").build(app)?)
        .item(&MenuItemBuilder::with_id("help_sync", "Setting Up Sync").build(app)?)
        .item(&MenuItemBuilder::with_id("help_ai", "AI Features Guide").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("help_mcp", "MCP Setup Guide").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("check_updates", "Check for Updates…").build(app)?)
        .item(&MenuItemBuilder::with_id("release_notes", "Release Notes").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("report_bug", "Report a Bug…").build(app)?)
        .item(&MenuItemBuilder::with_id("send_feedback", "Send Feedback…").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("help_about", "About FlowState").build(app)?)
        .build()?;
    
    // Build the complete menu bar
    let menu = MenuBuilder::new(app)
        .item(&SubmenuBuilder::new(app, "FlowState")
            .item(&PredefinedMenuItem::about(app, Some("About FlowState"), Some(
                AboutMetadataBuilder::new()
                    .name(Some("FlowState"))
                    .version(Some("1.1.0"))
                    .copyright(Some("© 2026 John Martin & Claude"))
                    .comments(Some("Context that flows between sessions"))
                    .build()
            ))?)
            .separator()
            .item(&MenuItemBuilder::with_id("settings", "Settings…").accelerator("CmdOrCtrl+,").build(app)?)
            .separator()
            .item(&PredefinedMenuItem::services(app, Some("Services"))?)
            .separator()
            .item(&PredefinedMenuItem::hide(app, Some("Hide FlowState"))?)
            .item(&PredefinedMenuItem::hide_others(app, Some("Hide Others"))?)
            .item(&PredefinedMenuItem::show_all(app, Some("Show All"))?)
            .separator()
            .item(&PredefinedMenuItem::quit(app, Some("Quit FlowState"))?)
            .build()?)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&tools_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()?;
    
    Ok(menu)
}

// ============================================================
// APP ENTRY POINT
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_path = get_default_db_path();
    println!("FlowState v1.1: Using database at {:?}", db_path);
    
    let db = Database::new(db_path).expect("Failed to initialize database");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Set up the native menu
            let menu = create_menu(app)?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            
            // Get the main window
            if let Some(window) = app.get_webview_window("main") {
                // Emit events to the frontend based on menu selection
                match id {
                    // File menu
                    "new_project" => { let _ = window.emit("menu-event", "new_project"); }
                    "open_project" => { let _ = window.emit("menu-event", "open_project"); }
                    "import_file" => { let _ = window.emit("menu-event", "import_file"); }
                    "import_extract" => { let _ = window.emit("menu-event", "import_extract"); }
                    "export_project" => { let _ = window.emit("menu-event", "export_project"); }
                    "export_markdown" => { let _ = window.emit("menu-event", "export_markdown"); }
                    "sync_now" => { let _ = window.emit("menu-event", "sync_now"); }
                    "sync_settings" => { let _ = window.emit("menu-event", "sync_settings"); }
                    "settings" => { let _ = window.emit("menu-event", "settings"); }
                    
                    // Edit menu
                    "find" => { let _ = window.emit("menu-event", "find"); }
                    "find_in_files" => { let _ = window.emit("menu-event", "find_in_files"); }
                    "quick_capture" => { let _ = window.emit("menu-event", "quick_capture"); }
                    
                    // View menu
                    "view_dashboard" => { let _ = window.emit("menu-event", "view_dashboard"); }
                    "view_timeline" => { let _ = window.emit("menu-event", "view_timeline"); }
                    "view_kanban" => { let _ = window.emit("menu-event", "view_kanban"); }
                    "view_decision" => { let _ = window.emit("menu-event", "view_decision"); }
                    "view_files" => { let _ = window.emit("menu-event", "view_files"); }
                    "toggle_sidebar" => { let _ = window.emit("menu-event", "toggle_sidebar"); }
                    "toggle_ai_panel" => { let _ = window.emit("menu-event", "toggle_ai_panel"); }
                    
                    // Tools menu
                    "ai_describe_file" => { let _ = window.emit("menu-event", "ai_describe_file"); }
                    "ai_extract_file" => { let _ = window.emit("menu-event", "ai_extract_file"); }
                    "ai_summarize" => { let _ = window.emit("menu-event", "ai_summarize"); }
                    "reindex_files" => { let _ = window.emit("menu-event", "reindex_files"); }
                    "verify_integrity" => { let _ = window.emit("menu-event", "verify_integrity"); }
                    "git_history" => { let _ = window.emit("menu-event", "git_history"); }
                    "resolve_conflicts" => { let _ = window.emit("menu-event", "resolve_conflicts"); }
                    
                    // Window menu
                    "show_all_projects" => { let _ = window.emit("menu-event", "show_all_projects"); }
                    "bring_to_front" => { let _ = window.set_focus(); }
                    
                    // Help menu
                    "help_guide" => { let _ = window.emit("menu-event", "help_guide"); }
                    "help_shortcuts" => { let _ = window.emit("menu-event", "help_shortcuts"); }
                    "help_getting_started" => { let _ = window.emit("menu-event", "help_getting_started"); }
                    "help_working_files" => { let _ = window.emit("menu-event", "help_working_files"); }
                    "help_sync" => { let _ = window.emit("menu-event", "help_sync"); }
                    "help_ai" => { let _ = window.emit("menu-event", "help_ai"); }
                    "help_mcp" => { let _ = window.emit("menu-event", "help_mcp"); }
                    "check_updates" => { let _ = window.emit("menu-event", "check_updates"); }
                    "release_notes" => { let _ = window.emit("menu-event", "release_notes"); }
                    "report_bug" => { let _ = window.emit("menu-event", "report_bug"); }
                    "send_feedback" => { let _ = window.emit("menu-event", "send_feedback"); }
                    "help_about" => { let _ = window.emit("menu-event", "help_about"); }
                    
                    _ => {}
                }
            }
        })
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            // v1.0: Project commands
            list_projects,
            create_project,
            get_project,
            update_project,
            delete_project,
            get_project_context,
            get_project_stats,
            // v1.0: Component commands
            list_components,
            create_component,
            get_component,
            update_component,
            delete_component,
            // v1.0: Change commands
            log_change,
            get_recent_changes,
            get_all_changes,
            // v1.0: Problem commands
            log_problem,
            get_problem,
            get_open_problems,
            get_all_problems,
            update_problem,
            delete_problem,
            get_problem_tree,
            // v1.0: Attempt commands
            log_attempt,
            mark_attempt_outcome,
            get_attempts_for_problem,
            // v1.0: Solution commands
            mark_problem_solved,
            get_solution_for_problem,
            // v1.0: Todo commands
            add_todo,
            get_todo,
            get_todos,
            update_todo,
            delete_todo,
            // v1.0: Learning commands
            log_learning,
            get_learning,
            get_learnings,
            update_learning,
            delete_learning,
            // v1.0: Search
            search,
            // v1.0: Story generation
            generate_project_story,
            generate_problem_journey,
            // v1.1: File attachment commands
            attach_file,
            get_attachments,
            get_attachment,
            update_attachment,
            remove_attachment,
            read_file_content,
            // v1.1: Content location commands
            get_content_locations,
            create_content_location,
            delete_content_location,
            // v1.1: Extraction commands
            get_extractions,
            create_extraction,
            update_extraction_review,
            delete_extraction,
            // v1.1: Git sync commands
            git_init,
            git_status,
            git_sync,
            git_set_remote,
            git_clone,
            git_history,
            // v1.1: Settings commands
            get_settings,
            get_setting,
            set_setting,
            delete_setting,
            get_settings_by_category,
            // v1.1: Sync status commands
            get_sync_status,
            init_sync_status,
            update_sync_status,
            get_sync_history,
            log_sync_operation,
            // v1.1: File export
            write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
