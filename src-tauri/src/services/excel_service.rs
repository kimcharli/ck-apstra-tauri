use crate::models::network_config::NetworkConfigRow;

pub struct ExcelService;

impl Default for ExcelService {
    fn default() -> Self {
        Self::new()
    }
}

impl ExcelService {
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