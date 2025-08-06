use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionMap {
    pub header_row: Option<u32>,
    pub mappings: HashMap<String, String>,
}

impl Default for ConversionMap {
    fn default() -> Self {
        Self {
            header_row: Some(1), // Default to first row (0-indexed)
            mappings: HashMap::new(),
        }
    }
}

impl ConversionMap {
    pub fn new(header_row: Option<u32>, mappings: HashMap<String, String>) -> Self {
        Self {
            header_row,
            mappings,
        }
    }

    pub fn from_json_map(json_map: HashMap<String, serde_json::Value>) -> Result<Self, String> {
        let mut mappings = HashMap::new();
        let mut header_row = None;

        for (key, value) in json_map {
            if key == "header_row" {
                header_row = value.as_u64().map(|v| v as u32);
            } else {
                if let Some(string_value) = value.as_str() {
                    mappings.insert(key, string_value.to_string());
                }
            }
        }

        Ok(Self {
            header_row,
            mappings,
        })
    }

    pub fn get_mapped_field(&self, excel_header: &str) -> Option<String> {
        // Direct mapping first
        if let Some(mapped) = self.mappings.get(excel_header) {
            return Some(mapped.clone());
        }

        // Normalized matching (case-insensitive, whitespace-trimmed)
        let normalized_header = excel_header.trim().to_lowercase();
        for (key, value) in &self.mappings {
            if key.trim().to_lowercase() == normalized_header {
                return Some(value.clone());
            }
        }

        None
    }

    pub fn add_mapping(&mut self, excel_header: String, target_field: String) {
        self.mappings.insert(excel_header, target_field);
    }

    pub fn remove_mapping(&mut self, excel_header: &str) {
        self.mappings.remove(excel_header);
    }

    pub fn set_header_row(&mut self, row: u32) {
        self.header_row = Some(row);
    }

    pub fn to_json_map(&self) -> HashMap<String, serde_json::Value> {
        let mut json_map = HashMap::new();
        
        if let Some(header_row) = self.header_row {
            json_map.insert("header_row".to_string(), serde_json::Value::Number(header_row.into()));
        }

        for (key, value) in &self.mappings {
            json_map.insert(key.clone(), serde_json::Value::String(value.clone()));
        }

        json_map
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionMapInfo {
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub map: ConversionMap,
}