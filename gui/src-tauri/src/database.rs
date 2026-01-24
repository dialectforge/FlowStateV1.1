// FlowState Database Module - SQLite operations for Tauri
// Complete implementation with all CRUD operations

use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ============================================================
// DATA TYPES
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Component {
    pub id: i64,
    pub project_id: i64,
    pub parent_component_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Problem {
    pub id: i64,
    pub component_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub severity: String,
    pub root_cause: Option<String>,
    pub created_at: String,
    pub solved_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SolutionAttempt {
    pub id: i64,
    pub problem_id: i64,
    pub parent_attempt_id: Option<i64>,
    pub description: String,
    pub outcome: Option<String>,
    pub confidence: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Solution {
    pub id: i64,
    pub problem_id: i64,
    pub winning_attempt_id: Option<i64>,
    pub summary: String,
    pub code_snippet: Option<String>,
    pub key_insight: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo {
    pub id: i64,
    pub project_id: i64,
    pub component_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub due_date: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Learning {
    pub id: i64,
    pub project_id: i64,
    pub component_id: Option<i64>,
    pub category: Option<String>,
    pub insight: String,
    pub context: Option<String>,
    pub source: String,
    pub verified: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Change {
    pub id: i64,
    pub component_id: i64,
    pub field_name: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub change_type: String,
    pub reason: Option<String>,
    pub created_at: String,
}

// ============================================================
// DATABASE
// ============================================================

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: PathBuf) -> Result<Self> {
        let conn = Connection::open(&path)?;
        let db = Database { conn };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> Result<()> {
        // Create tables if they don't exist
        self.conn.execute_batch(include_str!("../../../database/schema.sql"))?;
        Ok(())
    }

    // ============================================================
    // PROJECT OPERATIONS
    // ============================================================

    pub fn list_projects(&self, status: Option<&str>) -> Result<Vec<Project>> {
        let sql = match status {
            Some(_) => "SELECT id, name, description, status, created_at, updated_at 
                        FROM projects WHERE status = ? ORDER BY updated_at DESC",
            None => "SELECT id, name, description, status, created_at, updated_at 
                     FROM projects ORDER BY updated_at DESC",
        };
        
        let mut stmt = self.conn.prepare(sql)?;
        
        let projects = match status {
            Some(s) => stmt.query_map(params![s], Self::row_to_project)?,
            None => stmt.query_map([], Self::row_to_project)?,
        }.collect::<Result<Vec<_>>>()?;

        Ok(projects)
    }

    fn row_to_project(row: &rusqlite::Row) -> rusqlite::Result<Project> {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }

    pub fn create_project(&self, name: &str, description: Option<&str>) -> Result<Project> {
        self.conn.execute(
            "INSERT INTO projects (name, description) VALUES (?, ?)",
            params![name, description],
        )?;
        self.get_project(self.conn.last_insert_rowid())
    }

    pub fn get_project(&self, id: i64) -> Result<Project> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, status, created_at, updated_at FROM projects WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_project)
    }

    pub fn get_project_by_name(&self, name: &str) -> Result<Project> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, status, created_at, updated_at FROM projects WHERE name = ?"
        )?;
        stmt.query_row(params![name], Self::row_to_project)
    }

    pub fn update_project(&self, id: i64, name: Option<&str>, description: Option<&str>, status: Option<&str>) -> Result<Project> {
        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(n) = name {
            updates.push("name = ?");
            values.push(Box::new(n.to_string()));
        }
        if let Some(d) = description {
            updates.push("description = ?");
            values.push(Box::new(d.to_string()));
        }
        if let Some(s) = status {
            updates.push("status = ?");
            values.push(Box::new(s.to_string()));
        }
        
        if updates.is_empty() {
            return self.get_project(id);
        }
        
        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(Box::new(id));
        
        let sql = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));
        
        let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        self.conn.execute(&sql, params.as_slice())?;
        
        self.get_project(id)
    }

    pub fn delete_project(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM projects WHERE id = ?", params![id])?;
        Ok(())
    }

    // ============================================================
    // COMPONENT OPERATIONS
    // ============================================================

    pub fn list_components(&self, project_id: i64) -> Result<Vec<Component>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, parent_component_id, name, description, status, created_at, updated_at 
             FROM components WHERE project_id = ? ORDER BY name"
        )?;

        let components = stmt.query_map(params![project_id], Self::row_to_component)?
            .collect::<Result<Vec<_>>>()?;

        Ok(components)
    }

    fn row_to_component(row: &rusqlite::Row) -> rusqlite::Result<Component> {
        Ok(Component {
            id: row.get(0)?,
            project_id: row.get(1)?,
            parent_component_id: row.get(2)?,
            name: row.get(3)?,
            description: row.get(4)?,
            status: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }

    pub fn create_component(&self, project_id: i64, name: &str, description: Option<&str>, parent_id: Option<i64>) -> Result<Component> {
        self.conn.execute(
            "INSERT INTO components (project_id, name, description, parent_component_id) VALUES (?, ?, ?, ?)",
            params![project_id, name, description, parent_id],
        )?;
        self.get_component(self.conn.last_insert_rowid())
    }

    pub fn get_component(&self, id: i64) -> Result<Component> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, parent_component_id, name, description, status, created_at, updated_at 
             FROM components WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_component)
    }

    pub fn update_component(&self, id: i64, name: Option<&str>, description: Option<&str>, status: Option<&str>) -> Result<Component> {
        let mut updates = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(n) = name {
            updates.push("name = ?");
            values.push(Box::new(n.to_string()));
        }
        if let Some(d) = description {
            updates.push("description = ?");
            values.push(Box::new(d.to_string()));
        }
        if let Some(s) = status {
            updates.push("status = ?");
            values.push(Box::new(s.to_string()));
        }
        
        if updates.is_empty() {
            return self.get_component(id);
        }
        
        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(Box::new(id));
        
        let sql = format!("UPDATE components SET {} WHERE id = ?", updates.join(", "));
        let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        self.conn.execute(&sql, params.as_slice())?;
        
        self.get_component(id)
    }

    pub fn delete_component(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM components WHERE id = ?", params![id])?;
        Ok(())
    }

    // ============================================================
    // PROBLEM OPERATIONS
    // ============================================================

    fn row_to_problem(row: &rusqlite::Row) -> rusqlite::Result<Problem> {
        Ok(Problem {
            id: row.get(0)?,
            component_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            severity: row.get(5)?,
            root_cause: row.get(6)?,
            created_at: row.get(7)?,
            solved_at: row.get(8)?,
        })
    }

    pub fn get_problem(&self, id: i64) -> Result<Problem> {
        let mut stmt = self.conn.prepare(
            "SELECT id, component_id, title, description, status, severity, root_cause, created_at, solved_at 
             FROM problems WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_problem)
    }

    pub fn get_open_problems(&self, project_id: Option<i64>, component_id: Option<i64>) -> Result<Vec<Problem>> {
        self.get_problems_by_status(project_id, component_id, Some(&["open", "investigating"]))
    }

    pub fn get_all_problems(&self, project_id: Option<i64>, component_id: Option<i64>) -> Result<Vec<Problem>> {
        self.get_problems_by_status(project_id, component_id, None)
    }

    fn get_problems_by_status(&self, project_id: Option<i64>, component_id: Option<i64>, statuses: Option<&[&str]>) -> Result<Vec<Problem>> {
        let status_filter = match statuses {
            Some(s) => format!("AND p.status IN ({})", s.iter().map(|_| "?").collect::<Vec<_>>().join(",")),
            None => String::new(),
        };
        
        let sql = match (project_id, component_id) {
            (Some(_), Some(_)) => format!(
                "SELECT p.id, p.component_id, p.title, p.description, p.status, p.severity, p.root_cause, p.created_at, p.solved_at 
                 FROM problems p 
                 JOIN components c ON p.component_id = c.id 
                 WHERE c.project_id = ? AND p.component_id = ? {}
                 ORDER BY p.created_at DESC", status_filter
            ),
            (Some(_), None) => format!(
                "SELECT p.id, p.component_id, p.title, p.description, p.status, p.severity, p.root_cause, p.created_at, p.solved_at 
                 FROM problems p 
                 JOIN components c ON p.component_id = c.id 
                 WHERE c.project_id = ? {}
                 ORDER BY p.created_at DESC", status_filter
            ),
            (None, Some(_)) => format!(
                "SELECT id, component_id, title, description, status, severity, root_cause, created_at, solved_at 
                 FROM problems p
                 WHERE component_id = ? {}
                 ORDER BY created_at DESC", status_filter
            ),
            (None, None) => format!(
                "SELECT id, component_id, title, description, status, severity, root_cause, created_at, solved_at 
                 FROM problems p
                 WHERE 1=1 {}
                 ORDER BY created_at DESC", status_filter
            ),
        };

        let mut stmt = self.conn.prepare(&sql)?;
        
        // Build params based on what we have
        let mut param_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(pid) = project_id {
            param_values.push(Box::new(pid));
        }
        if let Some(cid) = component_id {
            param_values.push(Box::new(cid));
        }
        if let Some(s) = statuses {
            for status in s {
                param_values.push(Box::new(status.to_string()));
            }
        }
        
        let params: Vec<&dyn rusqlite::ToSql> = param_values.iter().map(|v| v.as_ref()).collect();
        let problems = stmt.query_map(params.as_slice(), Self::row_to_problem)?
            .collect::<Result<Vec<_>>>()?;

        Ok(problems)
    }

    pub fn log_problem(&self, component_id: i64, title: &str, description: Option<&str>, severity: &str) -> Result<Problem> {
        self.conn.execute(
            "INSERT INTO problems (component_id, title, description, severity) VALUES (?, ?, ?, ?)",
            params![component_id, title, description, severity],
        )?;
        self.get_problem(self.conn.last_insert_rowid())
    }

    pub fn update_problem(&self, id: i64, title: Option<&str>, description: Option<&str>, status: Option<&str>, severity: Option<&str>, root_cause: Option<&str>) -> Result<Problem> {
        let mut updates = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(t) = title {
            updates.push("title = ?");
            values.push(Box::new(t.to_string()));
        }
        if let Some(d) = description {
            updates.push("description = ?");
            values.push(Box::new(d.to_string()));
        }
        if let Some(s) = status {
            updates.push("status = ?");
            values.push(Box::new(s.to_string()));
            // If status is 'solved', set solved_at
            if s == "solved" {
                updates.push("solved_at = CURRENT_TIMESTAMP");
            }
        }
        if let Some(sev) = severity {
            updates.push("severity = ?");
            values.push(Box::new(sev.to_string()));
        }
        if let Some(rc) = root_cause {
            updates.push("root_cause = ?");
            values.push(Box::new(rc.to_string()));
        }
        
        if updates.is_empty() {
            return self.get_problem(id);
        }
        
        values.push(Box::new(id));
        
        let sql = format!("UPDATE problems SET {} WHERE id = ?", updates.join(", "));
        let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        self.conn.execute(&sql, params.as_slice())?;
        
        self.get_problem(id)
    }

    pub fn delete_problem(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM problems WHERE id = ?", params![id])?;
        Ok(())
    }

    // ============================================================
    // SOLUTION ATTEMPT OPERATIONS
    // ============================================================

    fn row_to_attempt(row: &rusqlite::Row) -> rusqlite::Result<SolutionAttempt> {
        Ok(SolutionAttempt {
            id: row.get(0)?,
            problem_id: row.get(1)?,
            parent_attempt_id: row.get(2)?,
            description: row.get(3)?,
            outcome: row.get(4)?,
            confidence: row.get(5)?,
            notes: row.get(6)?,
            created_at: row.get(7)?,
        })
    }

    pub fn get_attempt(&self, id: i64) -> Result<SolutionAttempt> {
        let mut stmt = self.conn.prepare(
            "SELECT id, problem_id, parent_attempt_id, description, outcome, confidence, notes, created_at 
             FROM solution_attempts WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_attempt)
    }

    pub fn log_attempt(&self, problem_id: i64, description: &str, parent_attempt_id: Option<i64>) -> Result<SolutionAttempt> {
        self.conn.execute(
            "INSERT INTO solution_attempts (problem_id, description, parent_attempt_id) VALUES (?, ?, ?)",
            params![problem_id, description, parent_attempt_id],
        )?;
        self.get_attempt(self.conn.last_insert_rowid())
    }

    pub fn mark_attempt_outcome(&self, id: i64, outcome: &str, notes: Option<&str>, confidence: Option<&str>) -> Result<SolutionAttempt> {
        let confidence = confidence.unwrap_or("attempted");
        self.conn.execute(
            "UPDATE solution_attempts SET outcome = ?, notes = ?, confidence = ? WHERE id = ?",
            params![outcome, notes, confidence, id],
        )?;
        self.get_attempt(id)
    }

    pub fn get_attempts_for_problem(&self, problem_id: i64) -> Result<Vec<SolutionAttempt>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, problem_id, parent_attempt_id, description, outcome, confidence, notes, created_at 
             FROM solution_attempts WHERE problem_id = ? ORDER BY created_at ASC"
        )?;
        let attempts = stmt.query_map(params![problem_id], Self::row_to_attempt)?
            .collect::<Result<Vec<_>>>()?;
        Ok(attempts)
    }

    // ============================================================
    // SOLUTION OPERATIONS
    // ============================================================

    fn row_to_solution(row: &rusqlite::Row) -> rusqlite::Result<Solution> {
        Ok(Solution {
            id: row.get(0)?,
            problem_id: row.get(1)?,
            winning_attempt_id: row.get(2)?,
            summary: row.get(3)?,
            code_snippet: row.get(4)?,
            key_insight: row.get(5)?,
            created_at: row.get(6)?,
        })
    }

    pub fn get_solution(&self, id: i64) -> Result<Solution> {
        let mut stmt = self.conn.prepare(
            "SELECT id, problem_id, winning_attempt_id, summary, code_snippet, key_insight, created_at 
             FROM solutions WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_solution)
    }

    pub fn get_solution_for_problem(&self, problem_id: i64) -> Result<Option<Solution>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, problem_id, winning_attempt_id, summary, code_snippet, key_insight, created_at 
             FROM solutions WHERE problem_id = ?"
        )?;
        match stmt.query_row(params![problem_id], Self::row_to_solution) {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn mark_problem_solved(&self, problem_id: i64, winning_attempt_id: Option<i64>, summary: &str, code_snippet: Option<&str>, key_insight: Option<&str>) -> Result<Solution> {
        // Update problem status to solved
        self.conn.execute(
            "UPDATE problems SET status = 'solved', solved_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![problem_id],
        )?;
        
        // If winning attempt exists, mark it as success
        if let Some(attempt_id) = winning_attempt_id {
            self.conn.execute(
                "UPDATE solution_attempts SET outcome = 'success', confidence = 'verified' WHERE id = ?",
                params![attempt_id],
            )?;
        }
        
        // Create solution record
        self.conn.execute(
            "INSERT INTO solutions (problem_id, winning_attempt_id, summary, code_snippet, key_insight) VALUES (?, ?, ?, ?, ?)",
            params![problem_id, winning_attempt_id, summary, code_snippet, key_insight],
        )?;
        
        self.get_solution(self.conn.last_insert_rowid())
    }

    // ============================================================
    // TODO OPERATIONS
    // ============================================================

    fn row_to_todo(row: &rusqlite::Row) -> rusqlite::Result<Todo> {
        Ok(Todo {
            id: row.get(0)?,
            project_id: row.get(1)?,
            component_id: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            priority: row.get(5)?,
            status: row.get(6)?,
            due_date: row.get(7)?,
            created_at: row.get(8)?,
            completed_at: row.get(9)?,
        })
    }

    pub fn get_todo(&self, id: i64) -> Result<Todo> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, component_id, title, description, priority, status, due_date, created_at, completed_at 
             FROM todos WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_todo)
    }

    pub fn get_todos(&self, project_id: i64, status: Option<&str>, priority: Option<&str>) -> Result<Vec<Todo>> {
        let mut sql = String::from(
            "SELECT id, project_id, component_id, title, description, priority, status, due_date, created_at, completed_at 
             FROM todos WHERE project_id = ?"
        );
        
        let mut param_values: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(project_id)];
        
        if let Some(s) = status {
            sql.push_str(" AND status = ?");
            param_values.push(Box::new(s.to_string()));
        }
        if let Some(p) = priority {
            sql.push_str(" AND priority = ?");
            param_values.push(Box::new(p.to_string()));
        }
        sql.push_str(" ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END, created_at DESC");

        let mut stmt = self.conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = param_values.iter().map(|v| v.as_ref()).collect();
        let todos = stmt.query_map(params.as_slice(), Self::row_to_todo)?
            .collect::<Result<Vec<_>>>()?;

        Ok(todos)
    }

    pub fn add_todo(&self, project_id: i64, title: &str, description: Option<&str>, priority: &str, component_id: Option<i64>, due_date: Option<&str>) -> Result<Todo> {
        self.conn.execute(
            "INSERT INTO todos (project_id, title, description, priority, component_id, due_date) VALUES (?, ?, ?, ?, ?, ?)",
            params![project_id, title, description, priority, component_id, due_date],
        )?;
        self.get_todo(self.conn.last_insert_rowid())
    }

    pub fn update_todo(&self, id: i64, title: Option<&str>, description: Option<&str>, status: Option<&str>, priority: Option<&str>, due_date: Option<&str>) -> Result<Todo> {
        let mut updates = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(t) = title {
            updates.push("title = ?");
            values.push(Box::new(t.to_string()));
        }
        if let Some(d) = description {
            updates.push("description = ?");
            values.push(Box::new(d.to_string()));
        }
        if let Some(s) = status {
            updates.push("status = ?");
            values.push(Box::new(s.to_string()));
            // If status is 'done', set completed_at
            if s == "done" {
                updates.push("completed_at = CURRENT_TIMESTAMP");
            }
        }
        if let Some(p) = priority {
            updates.push("priority = ?");
            values.push(Box::new(p.to_string()));
        }
        if let Some(dd) = due_date {
            updates.push("due_date = ?");
            values.push(Box::new(dd.to_string()));
        }
        
        if updates.is_empty() {
            return self.get_todo(id);
        }
        
        values.push(Box::new(id));
        
        let sql = format!("UPDATE todos SET {} WHERE id = ?", updates.join(", "));
        let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        self.conn.execute(&sql, params.as_slice())?;
        
        self.get_todo(id)
    }

    pub fn delete_todo(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM todos WHERE id = ?", params![id])?;
        Ok(())
    }

    // ============================================================
    // LEARNING OPERATIONS  
    // ============================================================

    fn row_to_learning(row: &rusqlite::Row) -> rusqlite::Result<Learning> {
        Ok(Learning {
            id: row.get(0)?,
            project_id: row.get(1)?,
            component_id: row.get(2)?,
            category: row.get(3)?,
            insight: row.get(4)?,
            context: row.get(5)?,
            source: row.get(6)?,
            verified: row.get(7)?,
            created_at: row.get(8)?,
        })
    }

    pub fn get_learning(&self, id: i64) -> Result<Learning> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, component_id, category, insight, context, source, verified, created_at 
             FROM learnings WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_learning)
    }

    pub fn get_learnings(&self, project_id: Option<i64>, category: Option<&str>, verified_only: bool) -> Result<Vec<Learning>> {
        let mut sql = String::from(
            "SELECT id, project_id, component_id, category, insight, context, source, verified, created_at FROM learnings WHERE 1=1"
        );
        
        let mut param_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(p) = project_id {
            sql.push_str(" AND project_id = ?");
            param_values.push(Box::new(p));
        }
        if let Some(c) = category {
            sql.push_str(" AND category = ?");
            param_values.push(Box::new(c.to_string()));
        }
        if verified_only {
            sql.push_str(" AND verified = 1");
        }
        sql.push_str(" ORDER BY created_at DESC");

        let mut stmt = self.conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = param_values.iter().map(|v| v.as_ref()).collect();
        let learnings = stmt.query_map(params.as_slice(), Self::row_to_learning)?
            .collect::<Result<Vec<_>>>()?;

        Ok(learnings)
    }

    pub fn log_learning(&self, project_id: i64, insight: &str, category: Option<&str>, context: Option<&str>, component_id: Option<i64>, source: &str) -> Result<Learning> {
        self.conn.execute(
            "INSERT INTO learnings (project_id, insight, category, context, component_id, source) VALUES (?, ?, ?, ?, ?, ?)",
            params![project_id, insight, category, context, component_id, source],
        )?;
        self.get_learning(self.conn.last_insert_rowid())
    }

    pub fn update_learning(&self, id: i64, insight: Option<&str>, category: Option<&str>, context: Option<&str>, verified: Option<bool>) -> Result<Learning> {
        let mut updates = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(i) = insight {
            updates.push("insight = ?");
            values.push(Box::new(i.to_string()));
        }
        if let Some(c) = category {
            updates.push("category = ?");
            values.push(Box::new(c.to_string()));
        }
        if let Some(ctx) = context {
            updates.push("context = ?");
            values.push(Box::new(ctx.to_string()));
        }
        if let Some(v) = verified {
            updates.push("verified = ?");
            values.push(Box::new(v));
        }
        
        if updates.is_empty() {
            return self.get_learning(id);
        }
        
        values.push(Box::new(id));
        
        let sql = format!("UPDATE learnings SET {} WHERE id = ?", updates.join(", "));
        let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        self.conn.execute(&sql, params.as_slice())?;
        
        self.get_learning(id)
    }

    pub fn delete_learning(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM learnings WHERE id = ?", params![id])?;
        Ok(())
    }

    // ============================================================
    // CHANGE OPERATIONS
    // ============================================================

    fn row_to_change(row: &rusqlite::Row) -> rusqlite::Result<Change> {
        Ok(Change {
            id: row.get(0)?,
            component_id: row.get(1)?,
            field_name: row.get(2)?,
            old_value: row.get(3)?,
            new_value: row.get(4)?,
            change_type: row.get(5)?,
            reason: row.get(6)?,
            created_at: row.get(7)?,
        })
    }

    pub fn get_recent_changes(&self, project_id: Option<i64>, component_id: Option<i64>, hours: i32) -> Result<Vec<Change>> {
        // Build the time condition with the hours value embedded directly
        let time_filter = format!("ch.created_at >= datetime('now', '-{} hours')", hours);
        
        let mut sql = String::from(
            "SELECT ch.id, ch.component_id, ch.field_name, ch.old_value, ch.new_value, ch.change_type, ch.reason, ch.created_at 
             FROM changes ch"
        );
        
        let mut conditions: Vec<String> = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if project_id.is_some() || component_id.is_some() {
            sql.push_str(" JOIN components c ON ch.component_id = c.id");
        }
        
        if let Some(pid) = project_id {
            conditions.push("c.project_id = ?".to_string());
            param_values.push(Box::new(pid));
        }
        if let Some(cid) = component_id {
            conditions.push("ch.component_id = ?".to_string());
            param_values.push(Box::new(cid));
        }
        
        // Add time filter
        conditions.push(time_filter);
        
        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }
        
        sql.push_str(" ORDER BY ch.created_at DESC");

        let mut stmt = self.conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = param_values.iter().map(|v| v.as_ref()).collect();
        let changes = stmt.query_map(params.as_slice(), Self::row_to_change)?
            .collect::<Result<Vec<_>>>()?;

        Ok(changes)
    }

    pub fn get_all_changes(&self, project_id: Option<i64>, component_id: Option<i64>) -> Result<Vec<Change>> {
        let mut sql = String::from(
            "SELECT ch.id, ch.component_id, ch.field_name, ch.old_value, ch.new_value, ch.change_type, ch.reason, ch.created_at 
             FROM changes ch"
        );
        
        let mut conditions = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if project_id.is_some() || component_id.is_some() {
            sql.push_str(" JOIN components c ON ch.component_id = c.id");
        }
        
        if let Some(pid) = project_id {
            conditions.push("c.project_id = ?".to_string());
            param_values.push(Box::new(pid));
        }
        if let Some(cid) = component_id {
            conditions.push("ch.component_id = ?".to_string());
            param_values.push(Box::new(cid));
        }
        
        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }
        
        sql.push_str(" ORDER BY ch.created_at DESC");

        let mut stmt = self.conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = param_values.iter().map(|v| v.as_ref()).collect();
        let changes = stmt.query_map(params.as_slice(), Self::row_to_change)?
            .collect::<Result<Vec<_>>>()?;

        Ok(changes)
    }

    pub fn log_change(&self, component_id: i64, field_name: &str, old_value: Option<&str>, new_value: Option<&str>, change_type: &str, reason: Option<&str>) -> Result<Change> {
        self.conn.execute(
            "INSERT INTO changes (component_id, field_name, old_value, new_value, change_type, reason) VALUES (?, ?, ?, ?, ?, ?)",
            params![component_id, field_name, old_value, new_value, change_type, reason],
        )?;
        
        let id = self.conn.last_insert_rowid();
        let mut stmt = self.conn.prepare(
            "SELECT id, component_id, field_name, old_value, new_value, change_type, reason, created_at 
             FROM changes WHERE id = ?"
        )?;
        stmt.query_row(params![id], Self::row_to_change)
    }

    // ============================================================
    // SEARCH OPERATIONS
    // ============================================================

    pub fn search(&self, query: &str, project_id: Option<i64>, limit: i32) -> Result<Vec<serde_json::Value>> {
        let search_term = format!("%{}%", query.to_lowercase());
        let mut results = Vec::new();

        // Search problems
        let sql = match project_id {
            Some(pid) => format!(
                "SELECT 'problem' as type, p.id, p.title, p.description, p.status, c.project_id
                 FROM problems p
                 JOIN components c ON p.component_id = c.id
                 WHERE c.project_id = {} AND (LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ?)
                 LIMIT {}", pid, limit
            ),
            None => format!(
                "SELECT 'problem' as type, p.id, p.title, p.description, p.status, c.project_id
                 FROM problems p
                 JOIN components c ON p.component_id = c.id
                 WHERE LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ?
                 LIMIT {}", limit
            ),
        };

        let mut stmt = self.conn.prepare(&sql)?;
        let problem_results = stmt.query_map(params![&search_term, &search_term], |row| {
            Ok(serde_json::json!({
                "type": row.get::<_, String>(0)?,
                "id": row.get::<_, i64>(1)?,
                "title": row.get::<_, String>(2)?,
                "snippet": row.get::<_, Option<String>>(3)?,
                "status": row.get::<_, String>(4)?,
                "project_id": row.get::<_, i64>(5)?,
            }))
        })?;

        for result in problem_results {
            results.push(result?);
        }

        // Search learnings
        let sql = match project_id {
            Some(pid) => format!(
                "SELECT 'learning' as type, id, insight, context, category, project_id
                 FROM learnings
                 WHERE project_id = {} AND (LOWER(insight) LIKE ? OR LOWER(context) LIKE ?)
                 LIMIT {}", pid, limit
            ),
            None => format!(
                "SELECT 'learning' as type, id, insight, context, category, project_id
                 FROM learnings
                 WHERE LOWER(insight) LIKE ? OR LOWER(context) LIKE ?
                 LIMIT {}", limit
            ),
        };

        let mut stmt = self.conn.prepare(&sql)?;
        let learning_results = stmt.query_map(params![&search_term, &search_term], |row| {
            Ok(serde_json::json!({
                "type": row.get::<_, String>(0)?,
                "id": row.get::<_, i64>(1)?,
                "title": row.get::<_, String>(2)?,
                "snippet": row.get::<_, Option<String>>(3)?,
                "category": row.get::<_, Option<String>>(4)?,
                "project_id": row.get::<_, i64>(5)?,
            }))
        })?;

        for result in learning_results {
            results.push(result?);
        }

        // Search solutions
        let sql = match project_id {
            Some(pid) => format!(
                "SELECT 'solution' as type, s.id, s.summary, s.key_insight, p.title as problem_title, c.project_id
                 FROM solutions s
                 JOIN problems p ON s.problem_id = p.id
                 JOIN components c ON p.component_id = c.id
                 WHERE c.project_id = {} AND (LOWER(s.summary) LIKE ? OR LOWER(s.key_insight) LIKE ?)
                 LIMIT {}", pid, limit
            ),
            None => format!(
                "SELECT 'solution' as type, s.id, s.summary, s.key_insight, p.title as problem_title, c.project_id
                 FROM solutions s
                 JOIN problems p ON s.problem_id = p.id
                 JOIN components c ON p.component_id = c.id
                 WHERE LOWER(s.summary) LIKE ? OR LOWER(s.key_insight) LIKE ?
                 LIMIT {}", limit
            ),
        };

        let mut stmt = self.conn.prepare(&sql)?;
        let solution_results = stmt.query_map(params![&search_term, &search_term], |row| {
            Ok(serde_json::json!({
                "type": row.get::<_, String>(0)?,
                "id": row.get::<_, i64>(1)?,
                "title": row.get::<_, String>(2)?,
                "snippet": row.get::<_, Option<String>>(3)?,
                "problem_title": row.get::<_, String>(4)?,
                "project_id": row.get::<_, i64>(5)?,
            }))
        })?;

        for result in solution_results {
            results.push(result?);
        }

        Ok(results)
    }

    // ============================================================
    // PROBLEM TREE (for Decision Tree visualization)
    // ============================================================

    pub fn get_problem_tree(&self, problem_id: i64) -> Result<serde_json::Value> {
        let problem = self.get_problem(problem_id)?;
        let attempts = self.get_attempts_for_problem(problem_id)?;
        let solution = self.get_solution_for_problem(problem_id)?;
        
        // Get learnings related to this problem's component
        let learnings = self.get_learnings(None, None, false)?
            .into_iter()
            .filter(|l| l.component_id == Some(problem.component_id))
            .collect::<Vec<_>>();
        
        Ok(serde_json::json!({
            "problem": problem,
            "attempts": attempts,
            "solution": solution,
            "learnings": learnings,
        }))
    }

    // ============================================================
    // PROJECT STATS (for Dashboard)
    // ============================================================

    pub fn get_project_stats(&self, project_id: i64) -> Result<serde_json::Value> {
        // Count components
        let component_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM components WHERE project_id = ?",
            params![project_id],
            |row| row.get(0)
        )?;

        // Count open problems
        let open_problems: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM problems p JOIN components c ON p.component_id = c.id 
             WHERE c.project_id = ? AND p.status IN ('open', 'investigating')",
            params![project_id],
            |row| row.get(0)
        )?;

        // Count solved problems
        let solved_problems: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM problems p JOIN components c ON p.component_id = c.id 
             WHERE c.project_id = ? AND p.status = 'solved'",
            params![project_id],
            |row| row.get(0)
        )?;

        // Count todos
        let pending_todos: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM todos WHERE project_id = ? AND status = 'pending'",
            params![project_id],
            |row| row.get(0)
        )?;

        // Count learnings
        let learning_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM learnings WHERE project_id = ?",
            params![project_id],
            |row| row.get(0)
        )?;

        // Count changes in last 24 hours
        let recent_changes: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM changes ch JOIN components c ON ch.component_id = c.id 
             WHERE c.project_id = ? AND ch.created_at >= datetime('now', '-24 hours')",
            params![project_id],
            |row| row.get(0)
        )?;

        Ok(serde_json::json!({
            "component_count": component_count,
            "open_problems": open_problems,
            "solved_problems": solved_problems,
            "pending_todos": pending_todos,
            "learning_count": learning_count,
            "recent_changes": recent_changes,
        }))
    }
}

// ============================================================
// DATABASE PATH HELPER
// ============================================================

pub fn get_default_db_path() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("flowstate");
    
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("flowstate.db")
}
