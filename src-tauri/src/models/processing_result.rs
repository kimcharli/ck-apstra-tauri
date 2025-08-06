use serde::{Deserialize, Serialize};

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

impl Default for ProcessingResult {
    fn default() -> Self {
        Self {
            job_id: String::new(),
            total_rows: 0,
            processed_rows: 0,
            failed_rows: 0,
            success_rate: 0.0,
            errors: vec![],
            status: ProcessingStatus::Pending,
        }
    }
}