// Common platform abstractions

use std::path::PathBuf;

/// Trait for platform-specific shell execution
pub trait ShellExecutor {
    /// Execute a shell command and return output
    fn execute(&self, command: &str) -> Result<String, String>;

    /// Execute a command that modifies environment
    fn execute_env_command(&self, command: &str, env_vars: &[(&str, &str)]) -> Result<String, String>;

    /// Get the shell configuration file path
    fn get_shell_config_path(&self) -> Option<PathBuf>;
}

/// Trait for version manager operations
pub trait VersionManagerOps {
    /// Check if version manager is installed
    fn is_installed(&self) -> bool;

    /// Get installed versions
    fn list_versions(&self) -> Result<Vec<String>, String>;

    /// Switch to a specific version
    fn switch_version(&self, version: &str) -> Result<(), String>;

    /// Get current active version
    fn current_version(&self) -> Result<Option<String>, String>;
}

/// Get the application data directory
pub fn get_app_data_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|p| p.join("aem-env-manager"))
}

/// Get the application config directory
pub fn get_app_config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("aem-env-manager"))
}

/// Get the application cache directory
pub fn get_app_cache_dir() -> Option<PathBuf> {
    dirs::cache_dir().map(|p| p.join("aem-env-manager"))
}

/// Ensure directory exists, creating if necessary
pub fn ensure_dir_exists(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        std::fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    Ok(())
}
