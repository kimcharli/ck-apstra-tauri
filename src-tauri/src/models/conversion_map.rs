use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionMap {
    pub header_row: Option<u32>,
    pub mappings: HashMap<String, String>,
    pub field_variations: Option<HashMap<String, Vec<String>>>, // target_field -> [variations]
}

impl Default for ConversionMap {
    fn default() -> Self {
        Self {
            header_row: Some(1), // Default to first row (0-indexed)
            mappings: HashMap::new(),
            field_variations: Some(Self::get_default_field_variations()),
        }
    }
}

impl ConversionMap {
    pub fn new(header_row: Option<u32>, mappings: HashMap<String, String>) -> Self {
        Self {
            header_row,
            mappings,
            field_variations: Some(Self::get_default_field_variations()),
        }
    }

    pub fn get_default_field_variations() -> HashMap<String, Vec<String>> {
        let mut variations = HashMap::new();
        
        variations.insert("server_label".to_string(), vec![
            "server_label".to_string(), "server".to_string(), "server_name".to_string(), 
            "hostname".to_string(), "host name".to_string(), "host_name".to_string()
        ]);
        
        variations.insert("switch_label".to_string(), vec![
            "switch_label".to_string(), "switch".to_string(), "switch_name".to_string(), 
            "switch name".to_string(), "device".to_string()
        ]);
        
        variations.insert("switch_ifname".to_string(), vec![
            "switch_ifname".to_string(), "switch_interface".to_string(), "switch_port".to_string(),
            "switch port".to_string(), "port".to_string(), "interface".to_string()
        ]);
        
        variations.insert("server_ifname".to_string(), vec![
            "server_ifname".to_string(), "server_interface".to_string(), "server_port".to_string(),
            "server port".to_string(), "nic".to_string(), "slot".to_string(), "slot/port".to_string(),
            "slot port".to_string()
        ]);
        
        variations.insert("is_external".to_string(), vec![
            "is_external".to_string(), "external".to_string(), "ext".to_string()
        ]);
        
        variations.insert("link_speed".to_string(), vec![
            "link_speed".to_string(), "speed".to_string(), "bandwidth".to_string(),
            "speed (gb)".to_string(), "speed(gb)".to_string()
        ]);
        
        variations.insert("link_group_lag_mode".to_string(), vec![
            "link_group_lag_mode".to_string(), "lag_mode".to_string(), "bond_mode".to_string(),
            "mode".to_string(), "lacpneeded".to_string(), "lacp needed".to_string()
        ]);
        
        variations.insert("link_group_ct_names".to_string(), vec![
            "link_group_ct_names".to_string(), "ct".to_string(), "cts".to_string(),
            "connectivity_template".to_string()
        ]);
        
        variations.insert("server_tags".to_string(), vec![
            "server_tags".to_string(), "tags".to_string()
        ]);
        
        variations.insert("link_tags".to_string(), vec![
            "link_tags".to_string(), "tags".to_string()
        ]);
        
        variations.insert("comment".to_string(), vec![
            "comment".to_string(), "comments".to_string(), "description".to_string(),
            "notes".to_string()
        ]);
        
        variations
    }

    pub fn from_json_map(json_map: HashMap<String, serde_json::Value>) -> Result<Self, String> {
        let mut mappings = HashMap::new();
        let mut header_row = None;

        for (key, value) in json_map {
            if key == "header_row" {
                header_row = value.as_u64().map(|v| v as u32);
            } else if key == "mappings" {
                // Handle nested mappings object
                if let Some(mappings_obj) = value.as_object() {
                    for (excel_header, target_field) in mappings_obj {
                        if let Some(target_str) = target_field.as_str() {
                            mappings.insert(excel_header.clone(), target_str.to_string());
                        }
                    }
                }
            } else {
                // Handle flat structure (backward compatibility)
                if let Some(string_value) = value.as_str() {
                    mappings.insert(key, string_value.to_string());
                }
            }
        }

        Ok(Self {
            header_row,
            mappings,
            field_variations: Some(Self::get_default_field_variations()),
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