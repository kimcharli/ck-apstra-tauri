// Domain Error Types
// Centralized error handling types for all domains

use serde::{Deserialize, Serialize};
use thiserror::Error;

// ============================================================================
// Base Domain Error
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainError {
    pub domain: String,
    pub error_type: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
    pub timestamp: String,
}

// ============================================================================
// Domain-Specific Error Enums
// ============================================================================

#[derive(Debug, Error, Clone, Serialize, Deserialize)]
pub enum ExcelError {
    #[error("File not found: {path}")]
    FileNotFound { path: String },
    #[error("Invalid sheet name: {name}")]
    InvalidSheet { name: String },
    #[error("Parsing error: {message}")]
    ParseError { message: String },
    #[error("IO error: {message}")]
    IoError { message: String },
}

#[derive(Debug, Error, Clone, Serialize, Deserialize)]
pub enum ApstraError {
    #[error("Authentication failed: {reason}")]
    AuthenticationFailed { reason: String },
    #[error("API request failed with status {status}: {message}")]
    ApiRequestFailed { status: u16, message: String },
    #[error("Invalid configuration: {field}")]
    InvalidConfig { field: String },
    #[error("Connection timeout")]
    ConnectionTimeout,
    #[error("Network error: {message}")]
    NetworkError { message: String },
}

#[derive(Debug, Error, Clone, Serialize, Deserialize)]
pub enum ConversionError {
    #[error("Mapping error: {message}")]
    MappingError { message: String },
    #[error("Validation error: {field} - {message}")]
    ValidationError { field: String, message: String },
    #[error("Transformation error: {rule} - {message}")]
    TransformationError { rule: String, message: String },
    #[error("Invalid conversion map: {reason}")]
    InvalidMap { reason: String },
}

#[derive(Debug, Error, Clone, Serialize, Deserialize)]
pub enum ProvisioningError {
    #[error("Processing error: {message}")]
    ProcessingError { message: String },
    #[error("Network error: {message}")]
    NetworkError { message: String },
    #[error("Data error: {message}")]
    DataError { message: String },
    #[error("Workflow error: {step} - {message}")]
    WorkflowError { step: String, message: String },
}

// ============================================================================
// Unified Domain Error Enum
// ============================================================================

#[derive(Debug, Error, Clone, Serialize, Deserialize)]
pub enum UnifiedDomainError {
    #[error("Excel domain error: {0}")]
    Excel(#[from] ExcelError),
    #[error("Apstra domain error: {0}")]
    Apstra(#[from] ApstraError),
    #[error("Conversion domain error: {0}")]
    Conversion(#[from] ConversionError),
    #[error("Provisioning domain error: {0}")]
    Provisioning(#[from] ProvisioningError),
    #[error("Unknown domain error: {message}")]
    Unknown { message: String },
}

// ============================================================================
// Error Conversion Implementations
// ============================================================================

impl From<ExcelError> for DomainError {
    fn from(error: ExcelError) -> Self {
        DomainError {
            domain: "excel".to_string(),
            error_type: match &error {
                ExcelError::FileNotFound { .. } => "file_not_found",
                ExcelError::InvalidSheet { .. } => "invalid_sheet",
                ExcelError::ParseError { .. } => "parse_error",
                ExcelError::IoError { .. } => "io_error",
            }.to_string(),
            message: error.to_string(),
            details: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

impl From<ApstraError> for DomainError {
    fn from(error: ApstraError) -> Self {
        DomainError {
            domain: "apstra".to_string(),
            error_type: match &error {
                ApstraError::AuthenticationFailed { .. } => "auth_failed",
                ApstraError::ApiRequestFailed { .. } => "api_request_failed",
                ApstraError::InvalidConfig { .. } => "invalid_config",
                ApstraError::ConnectionTimeout => "connection_timeout",
                ApstraError::NetworkError { .. } => "network_error",
            }.to_string(),
            message: error.to_string(),
            details: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

impl From<ConversionError> for DomainError {
    fn from(error: ConversionError) -> Self {
        DomainError {
            domain: "conversion".to_string(),
            error_type: match &error {
                ConversionError::MappingError { .. } => "mapping_error",
                ConversionError::ValidationError { .. } => "validation_error",
                ConversionError::TransformationError { .. } => "transformation_error",
                ConversionError::InvalidMap { .. } => "invalid_map",
            }.to_string(),
            message: error.to_string(),
            details: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

impl From<ProvisioningError> for DomainError {
    fn from(error: ProvisioningError) -> Self {
        DomainError {
            domain: "provisioning".to_string(),
            error_type: match &error {
                ProvisioningError::ProcessingError { .. } => "processing_error",
                ProvisioningError::NetworkError { .. } => "network_error",
                ProvisioningError::DataError { .. } => "data_error",
                ProvisioningError::WorkflowError { .. } => "workflow_error",
            }.to_string(),
            message: error.to_string(),
            details: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

// ============================================================================
// Result Type Aliases
// ============================================================================

pub type ExcelResult<T> = Result<T, ExcelError>;
pub type ApstraResult<T> = Result<T, ApstraError>;
pub type ConversionResult<T> = Result<T, ConversionError>;
pub type ProvisioningResult<T> = Result<T, ProvisioningError>;
pub type DomainResult<T> = Result<T, UnifiedDomainError>;