use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApstraApiError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Authentication failed: {message}")]
    Authentication { message: String },
    #[error("Blueprint not found: {blueprint_id}")]
    BlueprintNotFound { blueprint_id: String },
    #[error("Invalid request data: {message}")]
    InvalidRequest { message: String },
    #[error("JSON serialization/deserialization error: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryRequest {
    pub query: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResponse {
    pub items: Vec<HashMap<String, serde_json::Value>>,
    pub count: i32,
}

#[derive(Debug, Clone)]
pub struct ApstraApiClient {
    client: Client,
    base_url: String,
    auth_token: Option<String>,
}

impl ApstraApiClient {
    /// Create a new Apstra API client
    pub fn new(base_url: String) -> Self {
        let client = Client::builder()
            .danger_accept_invalid_certs(true) // Accept self-signed certificates common in network infrastructure
            .build()
            .unwrap_or_default();

        Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
            auth_token: None,
        }
    }

    /// Authenticate with Apstra and store the session token
    pub async fn login(&mut self, username: String, password: String) -> Result<LoginResponse, ApstraApiError> {
        let login_request = LoginRequest { username, password };
        
        let response = self
            .client
            .post(format!("{}/api/aaa/login", self.base_url))
            .json(&login_request)
            .send()
            .await?;

        match response.status() {
            reqwest::StatusCode::CREATED => {
                let login_response: LoginResponse = response.json().await?;
                self.auth_token = Some(login_response.token.clone());
                Ok(login_response)
            }
            reqwest::StatusCode::UNAUTHORIZED => {
                Err(ApstraApiError::Authentication {
                    message: "Invalid username or password".to_string(),
                })
            }
            reqwest::StatusCode::REQUEST_TIMEOUT => {
                Err(ApstraApiError::Authentication {
                    message: "Connection timeout".to_string(),
                })
            }
            status => {
                let error_text = response.text().await.unwrap_or_default();
                Err(ApstraApiError::Authentication {
                    message: format!("Login failed with status {}: {}", status, error_text),
                })
            }
        }
    }

    /// Execute a query against a specific blueprint
    pub async fn execute_query(&self, blueprint_id: &str, query: &str) -> Result<QueryResponse, ApstraApiError> {
        let auth_token = self.auth_token.as_ref().ok_or_else(|| {
            ApstraApiError::Authentication {
                message: "Not authenticated. Please login first.".to_string(),
            }
        })?;

        let query_request = QueryRequest {
            query: query.to_string(),
        };

        let response = self
            .client
            .post(format!("{}/api/blueprints/{}/qe", self.base_url, blueprint_id))
            .header("AuthToken", auth_token)
            .json(&query_request)
            .send()
            .await?;

        match response.status() {
            reqwest::StatusCode::OK => {
                let query_response: QueryResponse = response.json().await?;
                Ok(query_response)
            }
            reqwest::StatusCode::NOT_FOUND => {
                Err(ApstraApiError::BlueprintNotFound {
                    blueprint_id: blueprint_id.to_string(),
                })
            }
            reqwest::StatusCode::UNPROCESSABLE_ENTITY => {
                let error_text = response.text().await.unwrap_or_default();
                Err(ApstraApiError::InvalidRequest {
                    message: format!("Invalid query: {}", error_text),
                })
            }
            _status => {
                let error_text = response.text().await.unwrap_or_default();
                Err(ApstraApiError::InvalidRequest {
                    message: format!("Request failed: {}", error_text),
                })
            }
        }
    }

    /// Search for systems by server name using the provided query format
    pub async fn search_systems(&self, blueprint_id: &str, server_name: &str) -> Result<QueryResponse, ApstraApiError> {
        let query = format!("match(node('system', label='{}', name='system'))", server_name);
        self.execute_query(blueprint_id, &query).await
    }

    /// Check if the client is authenticated
    pub fn is_authenticated(&self) -> bool {
        self.auth_token.is_some()
    }

    /// Get the current auth token (for debugging purposes)
    pub fn get_auth_token(&self) -> Option<&String> {
        self.auth_token.as_ref()
    }

    /// Clear the authentication token (logout)
    pub fn logout(&mut self) {
        self.auth_token = None;
    }

    /// Dump complete blueprint configuration
    pub async fn dump_blueprint(&self, blueprint_id: &str) -> Result<serde_json::Value, ApstraApiError> {
        let auth_token = self.auth_token.as_ref().ok_or_else(|| {
            ApstraApiError::Authentication {
                message: "Not authenticated. Please login first.".to_string(),
            }
        })?;

        let response = self
            .client
            .get(format!("{}/api/blueprints/{}", self.base_url, blueprint_id))
            .header("AuthToken", auth_token)
            .send()
            .await?;

        match response.status() {
            reqwest::StatusCode::OK => {
                let blueprint_data: serde_json::Value = response.json().await?;
                Ok(blueprint_data)
            }
            reqwest::StatusCode::NOT_FOUND => {
                Err(ApstraApiError::BlueprintNotFound {
                    blueprint_id: blueprint_id.to_string(),
                })
            }
            reqwest::StatusCode::UNAUTHORIZED => {
                Err(ApstraApiError::Authentication {
                    message: "Authentication expired or invalid".to_string(),
                })
            }
            _status => {
                let error_text = response.text().await.unwrap_or_default();
                Err(ApstraApiError::InvalidRequest {
                    message: format!("Blueprint dump failed: {}", error_text),
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_client() {
        let client = ApstraApiClient::new("https://example.com".to_string());
        assert_eq!(client.base_url, "https://example.com");
        assert!(!client.is_authenticated());
    }

    #[test]
    fn test_query_format() {
        let server_name = "test-server";
        let expected_query = "match(node('system', label='test-server', name='system'))";
        let query = format!("match(node('system', label='{}', name='system'))", server_name);
        assert_eq!(query, expected_query);
    }
}