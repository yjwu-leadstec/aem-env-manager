use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::command;

use crate::platform::PlatformOps;

// ============================================
// Data Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentProfile {
    #[serde(default)]
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    // Java configuration
    pub java_version: Option<String>,
    pub java_manager_id: Option<String>,
    pub java_path: Option<String>, // Full path to Java installation (JAVA_HOME)
    // Node configuration
    pub node_version: Option<String>,
    pub node_manager_id: Option<String>,
    pub node_path: Option<String>, // Full path to Node installation directory
    // Maven configuration
    pub maven_config_id: Option<String>,
    // AEM instance references
    pub author_instance_id: Option<String>,
    pub publish_instance_id: Option<String>,
    // Custom environment variables
    pub env_vars: Option<HashMap<String, String>>,
    // Timestamps
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    pub last_used_at: Option<String>,
    #[serde(default)]
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileSwitchResult {
    pub success: bool,
    pub profile_id: String,
    pub message: Option<String>,
    pub error: Option<String>,
    pub java_switched: bool,
    pub node_switched: bool,
    pub maven_switched: bool,
    pub env_vars_set: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileValidationResult {
    pub is_valid: bool,
    pub java_available: bool,
    pub node_available: bool,
    pub maven_available: bool,
    pub aem_instance_exists: bool,
    pub missing_components: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub active_profile_id: Option<String>,
    pub theme: String,
    pub auto_switch_profile: bool,
    pub health_check_interval: u32,
    pub start_minimized: bool,
    pub show_notifications: bool,
    pub log_level: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            active_profile_id: None,
            theme: "system".to_string(),
            auto_switch_profile: false,
            health_check_interval: 30,
            start_minimized: false,
            show_notifications: true,
            log_level: "info".to_string(),
        }
    }
}

// ============================================
// Storage Helpers
// ============================================

fn get_profiles_dir() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_data_dir().join("profiles")
}

fn get_config_file() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_config_dir().join("config.json")
}

fn ensure_profiles_dir() -> Result<(), String> {
    let dir = get_profiles_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create profiles directory: {}", e))?;
    }
    Ok(())
}

fn get_profile_file(id: &str) -> PathBuf {
    get_profiles_dir().join(format!("{}.json", id))
}

fn load_profile_from_file(id: &str) -> Result<Option<EnvironmentProfile>, String> {
    let file_path = get_profile_file(id);
    if !file_path.exists() {
        return Ok(None);
    }

    let content =
        std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to read profile: {}", e))?;

    let profile: EnvironmentProfile =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse profile: {}", e))?;

    Ok(Some(profile))
}

fn save_profile_to_file(profile: &EnvironmentProfile) -> Result<(), String> {
    ensure_profiles_dir()?;

    let file_path = get_profile_file(&profile.id);

    let content = serde_json::to_string_pretty(profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?;

    std::fs::write(&file_path, content).map_err(|e| format!("Failed to write profile: {}", e))
}

fn delete_profile_file(id: &str) -> Result<(), String> {
    let file_path = get_profile_file(id);
    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| format!("Failed to delete profile: {}", e))?;
    }
    Ok(())
}

fn load_config() -> Result<AppConfig, String> {
    let file_path = get_config_file();
    if !file_path.exists() {
        return Ok(AppConfig::default());
    }

    let content =
        std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to read config: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

fn save_config(config: &AppConfig) -> Result<(), String> {
    let file_path = get_config_file();

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
    }

    let content =
        serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    std::fs::write(&file_path, content).map_err(|e| format!("Failed to write config: {}", e))
}

// ============================================
// Profile CRUD Operations
// ============================================

/// List all environment profiles
#[command]
pub async fn list_profiles() -> Result<Vec<EnvironmentProfile>, String> {
    ensure_profiles_dir()?;

    let profiles_dir = get_profiles_dir();
    let config = load_config()?;

    let mut profiles = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&profiles_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(mut profile) = serde_json::from_str::<EnvironmentProfile>(&content) {
                        // Update is_active based on config
                        profile.is_active = config
                            .active_profile_id
                            .as_ref()
                            .map(|id| id == &profile.id)
                            .unwrap_or(false);

                        profiles.push(profile);
                    }
                }
            }
        }
    }

    // Sort by last used, then by name
    profiles.sort_by(|a, b| {
        match (&b.last_used_at, &a.last_used_at) {
            (Some(b_time), Some(a_time)) => b_time.cmp(a_time),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a.name.cmp(&b.name),
        }
    });

    Ok(profiles)
}

/// Get a specific profile by ID
#[command]
pub async fn get_profile(id: String) -> Result<Option<EnvironmentProfile>, String> {
    let mut profile = load_profile_from_file(&id)?;

    // Update is_active based on config
    if let Some(ref mut p) = profile {
        let config = load_config()?;
        p.is_active = config.active_profile_id.as_ref().map(|aid| aid == &id).unwrap_or(false);
    }

    Ok(profile)
}

/// Create a new environment profile
#[command]
pub async fn create_profile(mut profile: EnvironmentProfile) -> Result<EnvironmentProfile, String> {
    // Generate ID if not provided
    if profile.id.is_empty() {
        profile.id = uuid::Uuid::new_v4().to_string();
    }

    // Check for duplicate ID
    if load_profile_from_file(&profile.id)?.is_some() {
        return Err(format!("Profile with ID {} already exists", profile.id));
    }

    // Set timestamps
    let now = chrono::Utc::now().to_rfc3339();
    profile.created_at = now.clone();
    profile.updated_at = now;
    profile.is_active = false;

    save_profile_to_file(&profile)?;

    Ok(profile)
}

/// Update an existing profile
#[command]
pub async fn update_profile(id: String, mut profile: EnvironmentProfile) -> Result<EnvironmentProfile, String> {
    // Verify profile exists
    let existing = load_profile_from_file(&id)?.ok_or_else(|| format!("Profile {} not found", id))?;

    // Preserve original ID and created_at
    profile.id = id;
    profile.created_at = existing.created_at;
    profile.updated_at = chrono::Utc::now().to_rfc3339();

    save_profile_to_file(&profile)?;

    Ok(profile)
}

/// Delete a profile
#[command]
pub async fn delete_profile(id: String) -> Result<bool, String> {
    // Check if this is the active profile
    let config = load_config()?;
    if config.active_profile_id.as_ref() == Some(&id) {
        // Clear active profile
        let mut new_config = config;
        new_config.active_profile_id = None;
        save_config(&new_config)?;
    }

    delete_profile_file(&id)?;
    Ok(true)
}

// ============================================
// Profile Switching
// ============================================

/// Switch to a different environment profile
/// This updates symlinks for Java and Node to enable system-wide version switching
#[command]
pub async fn switch_profile(profile_id: String) -> Result<ProfileSwitchResult, String> {
    // Load profile
    let profile = load_profile_from_file(&profile_id)?.ok_or_else(|| format!("Profile {} not found", profile_id))?;

    let mut result = ProfileSwitchResult {
        success: true,
        profile_id: profile_id.clone(),
        message: None,
        error: None,
        java_switched: false,
        node_switched: false,
        maven_switched: false,
        env_vars_set: false,
    };

    let mut errors = Vec::new();

    // Switch Java version using symlink (if path is specified)
    if let Some(ref java_path) = profile.java_path {
        if !java_path.is_empty() {
            match crate::commands::environment::set_java_symlink(java_path.clone()).await {
                Ok(symlink_result) if symlink_result.success => {
                    result.java_switched = true;
                }
                Ok(symlink_result) => {
                    errors.push(format!(
                        "Java symlink failed: {}",
                        symlink_result.message.unwrap_or_default()
                    ));
                }
                Err(e) => {
                    errors.push(format!("Java symlink error: {}", e));
                }
            }
        }
    } else if let Some(ref java_version) = profile.java_version {
        if !java_version.is_empty() {
            // Fallback: try to find Java by version and set symlink
            if let Ok(java_versions) = crate::commands::version::scan_java_versions().await {
                if let Some(java) = java_versions.iter().find(|v| v.version == *java_version) {
                    match crate::commands::environment::set_java_symlink(java.path.clone()).await {
                        Ok(symlink_result) if symlink_result.success => {
                            result.java_switched = true;
                        }
                        Ok(_) | Err(_) => {
                            errors.push(format!("Failed to set Java symlink for version {}", java_version));
                        }
                    }
                }
            }
        }
    }

    // Switch Node version using symlink (if path is specified)
    if let Some(ref node_path) = profile.node_path {
        if !node_path.is_empty() {
            match crate::commands::environment::set_node_symlink(node_path.clone()).await {
                Ok(symlink_result) if symlink_result.success => {
                    result.node_switched = true;
                }
                Ok(symlink_result) => {
                    errors.push(format!(
                        "Node symlink failed: {}",
                        symlink_result.message.unwrap_or_default()
                    ));
                }
                Err(e) => {
                    errors.push(format!("Node symlink error: {}", e));
                }
            }
        }
    } else if let Some(ref node_version) = profile.node_version {
        if !node_version.is_empty() {
            // Fallback: try to find Node by version and set symlink
            if let Ok(node_versions) = crate::commands::version::scan_node_versions().await {
                let target_version = node_version.trim_start_matches('v');
                if let Some(node) = node_versions.iter().find(|v| {
                    v.version.trim_start_matches('v') == target_version
                }) {
                    match crate::commands::environment::set_node_symlink(node.path.clone()).await {
                        Ok(symlink_result) if symlink_result.success => {
                            result.node_switched = true;
                        }
                        Ok(_) | Err(_) => {
                            errors.push(format!("Failed to set Node symlink for version {}", node_version));
                        }
                    }
                }
            }
        }
    }

    // Switch Maven config
    if let Some(ref maven_id) = profile.maven_config_id {
        match crate::commands::version::switch_maven_config(maven_id.clone()).await {
            Ok(_) => {
                result.maven_switched = true;
            }
            Err(e) => {
                errors.push(format!("Maven switch error: {}", e));
            }
        }
    }

    // Set environment variables
    if let Some(ref env_vars) = profile.env_vars {
        let platform = crate::platform::current_platform();
        for (key, value) in env_vars {
            if let Err(e) = platform.set_env_var(key, value) {
                errors.push(format!("Failed to set {}: {}", key, e));
            }
        }
        if errors.is_empty() || errors.iter().all(|e| !e.starts_with("Failed to set")) {
            result.env_vars_set = true;
        }
    }

    // Update profile last_used_at
    let mut updated_profile = profile;
    updated_profile.last_used_at = Some(chrono::Utc::now().to_rfc3339());
    updated_profile.is_active = true;
    save_profile_to_file(&updated_profile)?;

    // Update config to track active profile
    let mut config = load_config()?;
    config.active_profile_id = Some(profile_id);
    save_config(&config)?;

    // Set result status
    if errors.is_empty() {
        result.message = Some("Profile switched successfully".to_string());
    } else {
        result.success = false;
        result.error = Some(errors.join("; "));
        result.message = Some("Profile switch completed with errors".to_string());
    }

    Ok(result)
}

/// Get the currently active profile
#[command]
pub async fn get_active_profile() -> Result<Option<EnvironmentProfile>, String> {
    let config = load_config()?;

    if let Some(ref id) = config.active_profile_id {
        if let Some(mut profile) = load_profile_from_file(id)? {
            profile.is_active = true;
            return Ok(Some(profile));
        }
    }

    Ok(None)
}

/// Validate a profile before switching
#[command]
pub async fn validate_profile(profile_id: String) -> Result<ProfileValidationResult, String> {
    let profile = load_profile_from_file(&profile_id)?.ok_or_else(|| format!("Profile {} not found", profile_id))?;

    let mut result = ProfileValidationResult {
        is_valid: true,
        java_available: false,
        node_available: false,
        maven_available: true, // Default to true if no maven config specified
        aem_instance_exists: true, // Default to true if no instance specified
        missing_components: Vec::new(),
        warnings: Vec::new(),
    };

    // Check Java version
    if let Some(ref java_version) = profile.java_version {
        if !java_version.is_empty() {
            let java_versions = crate::commands::version::scan_java_versions().await?;
            result.java_available = java_versions.iter().any(|v| v.version == *java_version);

            if !result.java_available {
                result.missing_components.push(format!("Java {}", java_version));
                result.is_valid = false;
            }
        } else {
            result.warnings.push("No Java version specified".to_string());
        }
    } else {
        result.warnings.push("No Java version specified".to_string());
    }

    // Check Node version
    if let Some(ref node_version) = profile.node_version {
        if !node_version.is_empty() {
            let node_versions = crate::commands::version::scan_node_versions().await?;
            result.node_available = node_versions
                .iter()
                .any(|v| v.version == *node_version || v.version.trim_start_matches('v') == node_version.trim_start_matches('v'));

            if !result.node_available {
                result.missing_components.push(format!("Node {}", node_version));
                result.is_valid = false;
            }
        } else {
            result.warnings.push("No Node version specified".to_string());
        }
    } else {
        result.warnings.push("No Node version specified".to_string());
    }

    // Check Maven config
    if let Some(ref maven_id) = profile.maven_config_id {
        let maven_configs = crate::commands::version::list_maven_configs().await?;
        result.maven_available = maven_configs.iter().any(|c| c.id == *maven_id);

        if !result.maven_available {
            result.missing_components.push(format!("Maven config '{}'", maven_id));
            result.is_valid = false;
        }
    }

    // Check AEM instances
    let mut aem_instances_valid = true;

    if let Some(ref author_id) = profile.author_instance_id {
        let instance = crate::commands::instance::get_instance(author_id.clone()).await?;
        if instance.is_none() {
            result.missing_components.push(format!("AEM Author instance '{}'", author_id));
            result.warnings.push("AEM Author instance not found, but profile can still be activated".to_string());
            aem_instances_valid = false;
        }
    }

    if let Some(ref publish_id) = profile.publish_instance_id {
        let instance = crate::commands::instance::get_instance(publish_id.clone()).await?;
        if instance.is_none() {
            result.missing_components.push(format!("AEM Publish instance '{}'", publish_id));
            result.warnings.push("AEM Publish instance not found, but profile can still be activated".to_string());
            aem_instances_valid = false;
        }
    }

    result.aem_instance_exists = aem_instances_valid;

    Ok(result)
}

// ============================================
// App Configuration
// ============================================

/// Load application configuration
#[command]
pub async fn load_app_config() -> Result<AppConfig, String> {
    load_config()
}

/// Save application configuration
#[command]
pub async fn save_app_config(config: AppConfig) -> Result<(), String> {
    save_config(&config)
}

/// Get startup configuration (sync version for app initialization)
/// This is used by the Tauri setup hook to check start_minimized setting
pub fn get_startup_config() -> AppConfig {
    load_config().unwrap_or_default()
}

/// Export profile to JSON
#[command]
pub async fn export_profile(profile_id: String) -> Result<String, String> {
    let profile = load_profile_from_file(&profile_id)?.ok_or_else(|| format!("Profile {} not found", profile_id))?;

    serde_json::to_string_pretty(&profile).map_err(|e| format!("Failed to export profile: {}", e))
}

/// Import profile from JSON
#[command]
pub async fn import_profile(json_content: String) -> Result<EnvironmentProfile, String> {
    let mut profile: EnvironmentProfile =
        serde_json::from_str(&json_content).map_err(|e| format!("Failed to parse profile JSON: {}", e))?;

    // Generate new ID to avoid conflicts
    let original_name = profile.name.clone();
    profile.id = uuid::Uuid::new_v4().to_string();
    profile.name = format!("{} (imported)", original_name);
    profile.is_active = false;

    // Set timestamps
    let now = chrono::Utc::now().to_rfc3339();
    profile.created_at = now.clone();
    profile.updated_at = now;
    profile.last_used_at = None;

    save_profile_to_file(&profile)?;

    Ok(profile)
}

/// Duplicate a profile
#[command]
pub async fn duplicate_profile(profile_id: String) -> Result<EnvironmentProfile, String> {
    let source = load_profile_from_file(&profile_id)?.ok_or_else(|| format!("Profile {} not found", profile_id))?;

    let mut new_profile = source.clone();
    new_profile.id = uuid::Uuid::new_v4().to_string();
    new_profile.name = format!("{} (copy)", source.name);
    new_profile.is_active = false;

    // Set timestamps
    let now = chrono::Utc::now().to_rfc3339();
    new_profile.created_at = now.clone();
    new_profile.updated_at = now;
    new_profile.last_used_at = None;

    save_profile_to_file(&new_profile)?;

    Ok(new_profile)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.theme, "system");
        assert_eq!(config.health_check_interval, 30);
        assert!(!config.auto_switch_profile);
    }
}
