// Common platform abstractions

use std::path::PathBuf;

/// Trait for platform-specific shell execution
pub trait ShellExecutor {
    /// Execute a shell command and return output
    fn execute(&self, command: &str) -> Result<String, String>;

    /// Execute a command that modifies environment
    #[allow(dead_code)]
    fn execute_env_command(
        &self,
        command: &str,
        env_vars: &[(&str, &str)],
    ) -> Result<String, String>;

    /// Get the shell configuration file path
    #[allow(dead_code)]
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
    #[allow(dead_code)]
    fn current_version(&self) -> Result<Option<String>, String>;
}

/// Trait for platform-specific operations
/// Unified interface for macOS and Windows differences
pub trait PlatformOps: Send + Sync {
    // Environment variable operations
    #[allow(dead_code)]
    fn get_env_var(&self, name: &str) -> Result<String, String>;
    fn set_env_var(&self, name: &str, value: &str) -> Result<(), String>;

    // Java related
    fn get_java_home(&self) -> Result<PathBuf, String>;
    fn set_java_home(&self, path: &std::path::Path) -> Result<(), String>;
    fn get_java_scan_paths(&self) -> Vec<PathBuf>;

    // Node related
    fn get_node_scan_paths(&self) -> Vec<PathBuf>;

    // Shell configuration
    fn get_shell_config_file(&self) -> PathBuf;
    fn append_to_shell_config(&self, content: &str) -> Result<(), String>;

    // System operations
    #[allow(dead_code)]
    fn open_terminal(&self, cwd: &std::path::Path) -> Result<(), String>;
    #[allow(dead_code)]
    fn open_file_manager(&self, path: &std::path::Path) -> Result<(), String>;
    fn open_browser(&self, url: &str) -> Result<(), String>;

    // Process management
    fn kill_process(&self, pid: u32) -> Result<(), String>;
    fn get_process_by_port(&self, port: u16) -> Option<u32>;

    // Configuration paths
    fn get_config_dir(&self) -> PathBuf;
    fn get_data_dir(&self) -> PathBuf;
    #[allow(dead_code)]
    fn get_cache_dir(&self) -> PathBuf;
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
#[allow(dead_code)]
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

/// Initialize all application directories
#[allow(dead_code)]
pub fn init_app_directories() -> Result<AppDirectories, String> {
    let config_dir = get_app_config_dir().ok_or("Failed to get config directory")?;
    let data_dir = get_app_data_dir().ok_or("Failed to get data directory")?;
    let cache_dir = get_app_cache_dir().ok_or("Failed to get cache directory")?;

    // Create main directories
    ensure_dir_exists(&config_dir)?;
    ensure_dir_exists(&data_dir)?;
    ensure_dir_exists(&cache_dir)?;

    // Create subdirectories
    let profiles_dir = data_dir.join("profiles");
    let backups_dir = data_dir.join("backups");
    let logs_dir = data_dir.join("logs");
    let licenses_dir = data_dir.join("licenses");

    ensure_dir_exists(&profiles_dir)?;
    ensure_dir_exists(&backups_dir)?;
    ensure_dir_exists(&logs_dir)?;
    ensure_dir_exists(&licenses_dir)?;

    Ok(AppDirectories {
        config: config_dir,
        data: data_dir,
        cache: cache_dir,
        profiles: profiles_dir,
        backups: backups_dir,
        logs: logs_dir,
        licenses: licenses_dir,
    })
}

/// Application directory structure
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct AppDirectories {
    pub config: PathBuf,
    pub data: PathBuf,
    pub cache: PathBuf,
    pub profiles: PathBuf,
    pub backups: PathBuf,
    pub logs: PathBuf,
    pub licenses: PathBuf,
}

impl AppDirectories {
    /// Get path to main config file
    #[allow(dead_code)]
    pub fn config_file(&self) -> PathBuf {
        self.config.join("config.yaml")
    }

    /// Get path to a specific profile file
    #[allow(dead_code)]
    pub fn profile_file(&self, profile_id: &str) -> PathBuf {
        self.profiles.join(format!("{}.yaml", profile_id))
    }

    /// Check if this is first run (config doesn't exist)
    #[allow(dead_code)]
    pub fn is_first_run(&self) -> bool {
        !self.config_file().exists()
    }
}
