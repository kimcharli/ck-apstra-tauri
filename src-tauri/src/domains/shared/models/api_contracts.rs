// Shared API Contracts
// These types define the contracts between frontend and backend across all domains

use serde::{Deserialize, Serialize};

// ============================================================================
// Core Data Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NetworkConfigRow {
    pub blueprint: Option<String>,
    pub server_label: Option<String>,
    pub is_external: Option<bool>,
    pub server_tags: Option<String>,
    pub switch_tags: Option<String>,
    pub link_group_ifname: Option<String>,
    pub link_group_lag_mode: Option<String>,
    pub link_group_ct_names: Option<String>,
    pub link_group_tags: Option<String>,
    pub link_speed: Option<String>,
    pub server_ifname: Option<String>,
    pub switch_label: Option<String>,
    pub switch_ifname: Option<String>,
    pub link_tags: Option<String>,
    pub comment: Option<String>,
}

// ============================================================================
// Processing and Results
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingResult {
    pub job_id: String,
    pub total_rows: usize,
    pub processed_rows: usize,
    pub failed_rows: usize,
    pub success_rate: f64,
    pub errors: Vec<ProcessingError>,
    pub status: ProcessingStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingError {
    pub row_index: usize,
    pub error_message: String,
    pub error_type: ErrorType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProcessingStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorType {
    ValidationError,
    NetworkError,
    DataError,
    SystemError,
}

// ============================================================================
// Validation Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub row_index: usize,
    pub field: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataValidationResult {
    pub valid_rows: Vec<NetworkConfigRow>,
    pub invalid_rows: Vec<NetworkConfigRow>,
    pub errors: Vec<ValidationError>,
    pub duplicates_removed: usize,
}

// ============================================================================
// Configuration Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApstraConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub blueprint_name: String,
    pub use_ssl: Option<bool>,
    pub verify_ssl: Option<bool>,
    pub timeout: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionMap {
    pub header_row: Option<usize>,
    pub mappings: std::collections::HashMap<String, String>,
}

// ============================================================================
// API Response Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
    pub success: bool,
    pub token: Option<String>,
    pub expires_at: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSearchResult {
    pub id: String,
    pub label: String,
    pub hostname: Option<String>,
    pub system_type: String,
    pub blueprint_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub data: serde_json::Value,
    pub errors: Option<Vec<String>>,
    pub execution_time: Option<u64>,
}

// ============================================================================
// File Processing Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelFileInfo {
    pub file_path: String,
    pub sheet_names: Vec<String>,
    pub total_sheets: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelSheetData {
    pub sheet_name: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: usize,
}

// ============================================================================
// Domain Event Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainEvent {
    pub domain: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingProgressEvent {
    pub domain: String, // Should be "provisioning"
    pub event_type: String, // Should be "processing_progress"
    pub payload: ProcessingProgressPayload,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingProgressPayload {
    pub job_id: String,
    pub progress: f64,
    pub status: ProcessingStatus,
    pub current_row: Option<usize>,
    pub total_rows: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatusEvent {
    pub domain: String, // Should be "apstra"
    pub event_type: String, // Should be "auth_status_changed"
    pub payload: AuthStatusPayload,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatusPayload {
    pub authenticated: bool,
    pub expires_at: Option<String>,
}

// ============================================================================
// Default Implementations
// ============================================================================

impl Default for ProcessingResult {
    fn default() -> Self {
        Self {
            job_id: String::new(),
            total_rows: 0,
            processed_rows: 0,
            failed_rows: 0,
            success_rate: 0.0,
            errors: Vec::new(),
            status: ProcessingStatus::Pending,
        }
    }
}

impl Default for ConversionMap {
    fn default() -> Self {
        Self {
            header_row: Some(1),
            mappings: std::collections::HashMap::new(),
        }
    }
}

impl<T> Default for ApiResponse<T> {
    fn default() -> Self {
        Self {
            success: false,
            data: None,
            error: None,
            message: None,
        }
    }
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            message: None,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
            message: None,
        }
    }

    pub fn with_message(mut self, message: String) -> Self {
        self.message = Some(message);
        self
    }
}