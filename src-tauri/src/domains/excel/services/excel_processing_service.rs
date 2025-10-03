use crate::domains::shared::models::api_contracts::NetworkConfigRow;

pub struct ExcelProcessingService;

impl Default for ExcelProcessingService {
    fn default() -> Self {
        Self::new()
    }
}

impl ExcelProcessingService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_sheet_names(&self, _file_path: &str) -> Result<Vec<String>, String> {
        // TODO: Implement Excel sheet enumeration
        Ok(vec!["Sheet1".to_string()])
    }

    pub fn parse_sheet(&self, _file_path: &str, _sheet_name: &str) -> Result<Vec<NetworkConfigRow>, String> {
        // TODO: Implement Excel sheet parsing
        Ok(vec![])
    }
}