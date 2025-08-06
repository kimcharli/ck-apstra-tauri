use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApstraConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub blueprint_name: String,
    pub use_ssl: Option<bool>,
    pub verify_ssl: Option<bool>,
    pub timeout: Option<u32>,
}

impl Default for ApstraConfig {
    fn default() -> Self {
        Self {
            host: "10.85.192.59".to_string(),
            port: 443,
            username: "admin".to_string(),
            password: "".to_string(),
            blueprint_name: "terra".to_string(),
            use_ssl: Some(true),
            verify_ssl: Some(false),
            timeout: Some(30),
        }
    }
}

impl ApstraConfig {
    pub fn new(
        host: String,
        port: u16,
        username: String,
        password: String,
        blueprint_name: String,
    ) -> Self {
        Self {
            host,
            port,
            username,
            password,
            blueprint_name,
            use_ssl: Some(true),
            verify_ssl: Some(false),
            timeout: Some(30),
        }
    }

    pub fn from_json_map(json_map: HashMap<String, serde_json::Value>) -> Result<Self, String> {
        let mut config = Self::default();

        for (key, value) in json_map {
            match key.as_str() {
                "host" => {
                    if let Some(host_str) = value.as_str() {
                        config.host = host_str.to_string();
                    }
                }
                "port" => {
                    if let Some(port_num) = value.as_u64() {
                        config.port = port_num as u16;
                    }
                }
                "username" => {
                    if let Some(username_str) = value.as_str() {
                        config.username = username_str.to_string();
                    }
                }
                "password" => {
                    if let Some(password_str) = value.as_str() {
                        config.password = password_str.to_string();
                    }
                }
                "blueprint_name" => {
                    if let Some(blueprint_str) = value.as_str() {
                        config.blueprint_name = blueprint_str.to_string();
                    }
                }
                "use_ssl" => {
                    config.use_ssl = value.as_bool();
                }
                "verify_ssl" => {
                    config.verify_ssl = value.as_bool();
                }
                "timeout" => {
                    if let Some(timeout_num) = value.as_u64() {
                        config.timeout = Some(timeout_num as u32);
                    }
                }
                _ => {
                    log::debug!("Unknown Apstra config field: {}", key);
                }
            }
        }

        Ok(config)
    }

    pub fn to_json_map(&self) -> HashMap<String, serde_json::Value> {
        let mut json_map = HashMap::new();
        
        json_map.insert("host".to_string(), serde_json::Value::String(self.host.clone()));
        json_map.insert("port".to_string(), serde_json::Value::Number(self.port.into()));
        json_map.insert("username".to_string(), serde_json::Value::String(self.username.clone()));
        json_map.insert("password".to_string(), serde_json::Value::String(self.password.clone()));
        json_map.insert("blueprint_name".to_string(), serde_json::Value::String(self.blueprint_name.clone()));
        
        if let Some(use_ssl) = self.use_ssl {
            json_map.insert("use_ssl".to_string(), serde_json::Value::Bool(use_ssl));
        }
        
        if let Some(verify_ssl) = self.verify_ssl {
            json_map.insert("verify_ssl".to_string(), serde_json::Value::Bool(verify_ssl));
        }
        
        if let Some(timeout) = self.timeout {
            json_map.insert("timeout".to_string(), serde_json::Value::Number(timeout.into()));
        }

        json_map
    }

    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        if self.host.trim().is_empty() {
            errors.push("Apstra host cannot be empty".to_string());
        }

        if self.port == 0 {
            errors.push("Apstra port must be greater than 0".to_string());
        }

        if self.username.trim().is_empty() {
            errors.push("Apstra username cannot be empty".to_string());
        }

        if self.blueprint_name.trim().is_empty() {
            errors.push("Blueprint name cannot be empty".to_string());
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    pub fn get_base_url(&self) -> String {
        let protocol = if self.use_ssl.unwrap_or(true) { "https" } else { "http" };
        format!("{}://{}:{}", protocol, self.host, self.port)
    }

    pub fn mask_password(&self) -> Self {
        let mut masked = self.clone();
        if !masked.password.is_empty() {
            masked.password = "•••••".to_string();
        }
        masked
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApstraConfigInfo {
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub config: ApstraConfig,
}