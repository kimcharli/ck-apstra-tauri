use crate::services::apstra_api_service::{ApstraApiClient, QueryResponse};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

/// Global state to maintain API clients per session
pub type ApiClientState = Mutex<HashMap<String, ApstraApiClient>>;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResult<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginInfo {
    pub base_url: String,
    pub username: String,
    pub password: String,
    pub session_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResult {
    pub session_id: String,
    pub user_id: String,
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemSearchRequest {
    pub session_id: String,
    pub blueprint_id: String,
    pub server_name: String,
}

/// Authenticate with Apstra API and create a session
#[tauri::command]
pub async fn apstra_login(
    login_info: LoginInfo,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<LoginResult>, String> {
    log::info!("Attempting Apstra login for user: {}", login_info.username);
    
    let mut client = ApstraApiClient::new(login_info.base_url.clone());
    
    match client.login(login_info.username.clone(), login_info.password.clone()).await {
        Ok(login_response) => {
            let result = LoginResult {
                session_id: login_info.session_id.clone(),
                user_id: login_response.id,
                token: login_response.token,
            };
            
            // Store the authenticated client
            if let Ok(mut clients) = state.lock() {
                clients.insert(login_info.session_id, client);
            }
            
            log::info!("Apstra login successful for user: {}", login_info.username);
            Ok(ApiResult::success(result))
        }
        Err(e) => {
            let error_msg = format!("Apstra login failed: {}", e);
            log::error!("{}", error_msg);
            Ok(ApiResult::error(error_msg))
        }
    }
}

/// Search for systems in a blueprint
#[tauri::command]
pub async fn apstra_search_systems(
    search_request: SystemSearchRequest,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<QueryResponse>, String> {
    log::info!(
        "Searching for system '{}' in blueprint '{}'", 
        search_request.server_name, 
        search_request.blueprint_id
    );
    
    let client = {
        let clients = state.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        
        let client = clients
            .get(&search_request.session_id)
            .ok_or_else(|| "Session not found. Please login first.".to_string())?;
        
        if !client.is_authenticated() {
            return Ok(ApiResult::error("Not authenticated. Please login first.".to_string()));
        }
        
        client.clone()
    }; // Release lock here
    
    match client.search_systems(&search_request.blueprint_id, &search_request.server_name).await {
        Ok(response) => {
            log::info!(
                "System search completed. Found {} results for '{}'", 
                response.count, 
                search_request.server_name
            );
            Ok(ApiResult::success(response))
        }
        Err(e) => {
            let error_msg = format!("System search failed: {}", e);
            log::error!("{}", error_msg);
            Ok(ApiResult::error(error_msg))
        }
    }
}

/// Execute a custom query against a blueprint
#[tauri::command]
pub async fn apstra_execute_query(
    session_id: String,
    blueprint_id: String,
    query: String,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<QueryResponse>, String> {
    log::info!("Executing custom query on blueprint '{}'", blueprint_id);
    
    let client = {
        let clients = state.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        
        let client = clients
            .get(&session_id)
            .ok_or_else(|| "Session not found. Please login first.".to_string())?;
        
        if !client.is_authenticated() {
            return Ok(ApiResult::error("Not authenticated. Please login first.".to_string()));
        }
        
        client.clone()
    }; // Release lock here
    
    match client.execute_query(&blueprint_id, &query).await {
        Ok(response) => {
            log::info!("Custom query completed. Found {} results", response.count);
            Ok(ApiResult::success(response))
        }
        Err(e) => {
            let error_msg = format!("Query execution failed: {}", e);
            log::error!("{}", error_msg);
            Ok(ApiResult::error(error_msg))
        }
    }
}

/// Check if a session is authenticated
#[tauri::command]
pub async fn apstra_is_authenticated(
    session_id: String,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<bool>, String> {
    let clients = state.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    
    let is_auth = clients
        .get(&session_id)
        .map(|client| client.is_authenticated())
        .unwrap_or(false);
    
    Ok(ApiResult::success(is_auth))
}

/// Logout and clear session
#[tauri::command]
pub async fn apstra_logout(
    session_id: String,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<()>, String> {
    log::info!("Logging out session: {}", session_id);
    
    if let Ok(mut clients) = state.lock() {
        clients.remove(&session_id);
    }
    
    Ok(ApiResult::success(()))
}

/// Dump complete blueprint configuration
#[tauri::command]
pub async fn apstra_dump_blueprint(
    session_id: String,
    blueprint_id: String,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<serde_json::Value>, String> {
    log::info!("Dumping blueprint configuration: {}", blueprint_id);
    
    let client = {
        let clients = state.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
        
        let client = clients
            .get(&session_id)
            .ok_or_else(|| "Session not found. Please login first.".to_string())?;
        
        if !client.is_authenticated() {
            return Ok(ApiResult::error("Not authenticated. Please login first.".to_string()));
        }
        
        client.clone()
    }; // Release lock here
    
    match client.dump_blueprint(&blueprint_id).await {
        Ok(blueprint_data) => {
            log::info!("Blueprint dump completed for: {}", blueprint_id);
            Ok(ApiResult::success(blueprint_data))
        }
        Err(e) => {
            let error_msg = format!("Blueprint dump failed: {}", e);
            log::error!("{}", error_msg);
            Ok(ApiResult::error(error_msg))
        }
    }
}