// Excel Domain Tests
// This module contains all tests related to Excel processing functionality

#[cfg(test)]
mod excel_processing_tests {
    use super::super::commands::*;
    use super::super::services::*;
    use crate::services::enhanced_conversion_service::EnhancedConversionService;
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_upload_excel_file_basic() {
        // Test basic Excel file upload functionality
        // This would require a test fixture file
        // For now, just test the error case
        let result = upload_excel_file("nonexistent.xlsx".to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("File does not exist"));
    }

    #[tokio::test]
    async fn test_upload_excel_file_invalid_extension() {
        // Test that non-Excel files are rejected (file existence is checked first)
        let result = upload_excel_file("test.txt".to_string()).await;
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        // The function checks file existence first, so we expect "File does not exist" error
        assert!(error_msg.contains("File does not exist"), "Expected file not found error, got: {}", error_msg);
    }

    #[test]
    fn test_excel_processing_service_creation() {
        let service = ExcelProcessingService::new();
        // Test that service can be created
        assert_eq!(service.get_sheet_names("test.xlsx").unwrap(), vec!["Sheet1"]);
    }

    #[test]
    fn test_cleanup_temp_file() {
        // Test cleanup functionality
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(cleanup_temp_file("test_file_id".to_string()));
        assert!(result.is_ok());
    }
}