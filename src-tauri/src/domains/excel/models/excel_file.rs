use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelFile {
    pub path: String,
    pub sheets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelSheet {
    pub name: String,
    pub data: Vec<ExcelRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelRow {
    pub cells: Vec<ExcelCell>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelCell {
    pub value: String,
    pub column_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelProcessingOptions {
    pub skip_empty_rows: Option<bool>,
    pub trim_whitespace: Option<bool>,
    pub header_row: Option<usize>,
}