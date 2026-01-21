// Environment Management Commands
// Handles symlink-based version switching and shell configuration

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;

#[cfg(unix)]
use std::os::unix::fs::symlink;

use crate::platform::common::ensure_dir_exists;

// ============================================
// Data Types
// ============================================

/// Environment initialization status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentStatus {
    pub is_initialized: bool,
    pub java_symlink_exists: bool,
    pub node_symlink_exists: bool,
    pub shell_configured: bool,
    pub env_dir: String,
    pub current_java_path: Option<String>,
    pub current_node_path: Option<String>,
}

/// Environment initialization result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitResult {
    pub success: bool,
    pub message: String,
    pub env_dir: String,
    pub shell_config_updated: bool,
}

/// Symlink update result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymlinkResult {
    pub success: bool,
    pub previous_target: Option<String>,
    pub current_target: String,
    pub message: Option<String>,
}

// ============================================
// Directory Management
// ============================================

/// Get the environment management directory
fn get_env_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|h| h.join(".aem-env-manager"))
        .ok_or_else(|| "Could not determine home directory".to_string())
}

/// Get the Java symlink path
fn get_java_symlink_path() -> Result<PathBuf, String> {
    Ok(get_env_dir()?.join("java").join("current"))
}

/// Get the Node symlink path
fn get_node_symlink_path() -> Result<PathBuf, String> {
    Ok(get_env_dir()?.join("node").join("current"))
}

/// Read current symlink target
fn read_symlink_target(path: &PathBuf) -> Option<String> {
    fs::read_link(path)
        .ok()
        .map(|p| p.to_string_lossy().to_string())
}

// ============================================
// Environment Status Commands
// ============================================

/// Check if environment is initialized
#[command]
pub async fn check_environment_status() -> Result<EnvironmentStatus, String> {
    let env_dir = get_env_dir()?;
    let java_symlink = get_java_symlink_path()?;
    let node_symlink = get_node_symlink_path()?;

    let java_symlink_exists = java_symlink.exists() || java_symlink.is_symlink();
    let node_symlink_exists = node_symlink.exists() || node_symlink.is_symlink();

    // Check if shell is configured
    let shell_configured = check_shell_configured()?;

    let is_initialized = env_dir.exists() && shell_configured;

    Ok(EnvironmentStatus {
        is_initialized,
        java_symlink_exists,
        node_symlink_exists,
        shell_configured,
        env_dir: env_dir.to_string_lossy().to_string(),
        current_java_path: read_symlink_target(&java_symlink),
        current_node_path: read_symlink_target(&node_symlink),
    })
}

/// Check if shell configuration contains our setup
fn check_shell_configured() -> Result<bool, String> {
    let shell_config = get_shell_config_path()?;

    if !shell_config.exists() {
        return Ok(false);
    }

    let content = fs::read_to_string(&shell_config)
        .map_err(|e| format!("Failed to read shell config: {}", e))?;

    Ok(content.contains("# AEM Environment Manager - Managed Block"))
}

/// Get the shell configuration file path
fn get_shell_config_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    if shell.contains("zsh") {
        Ok(home.join(".zshrc"))
    } else if shell.contains("bash") {
        Ok(home.join(".bash_profile"))
    } else {
        Ok(home.join(".profile"))
    }
}

// ============================================
// Initialization Commands
// ============================================

/// Initialize the environment management system
/// This is an atomic operation - if any step fails, all changes are rolled back
#[command]
pub async fn initialize_environment() -> Result<InitResult, String> {
    let env_dir = get_env_dir()?;

    // Track if we created the directory (for rollback)
    let dir_existed = env_dir.exists();

    // Create directory structure
    let java_dir = env_dir.join("java");
    let node_dir = env_dir.join("node");

    if let Err(e) = ensure_dir_exists(&env_dir) {
        return Err(format!("Failed to create environment directory: {}", e));
    }

    if let Err(e) = ensure_dir_exists(&java_dir) {
        // Rollback: remove env_dir if we created it
        if !dir_existed {
            let _ = fs::remove_dir_all(&env_dir);
        }
        return Err(format!("Failed to create Java directory: {}", e));
    }

    if let Err(e) = ensure_dir_exists(&node_dir) {
        // Rollback: remove env_dir if we created it
        if !dir_existed {
            let _ = fs::remove_dir_all(&env_dir);
        }
        return Err(format!("Failed to create Node directory: {}", e));
    }

    // Configure shell - if this fails, rollback directory creation
    match configure_shell().await {
        Ok(shell_updated) => {
            Ok(InitResult {
                success: true,
                message: "Environment initialized successfully".to_string(),
                env_dir: env_dir.to_string_lossy().to_string(),
                shell_config_updated: shell_updated,
            })
        }
        Err(e) => {
            // Rollback: remove created directories if we created them
            if !dir_existed {
                let _ = fs::remove_dir_all(&env_dir);
            }
            Err(format!("Failed to configure shell: {}", e))
        }
    }
}

/// Configure shell to use our managed paths
async fn configure_shell() -> Result<bool, String> {
    let shell_config = get_shell_config_path()?;
    let _env_dir = get_env_dir()?;

    // Check if already configured
    if check_shell_configured()? {
        return Ok(false);
    }

    // Prepare the configuration block
    let config_block = format!(r#"
# AEM Environment Manager - Managed Block
# Do not edit this block manually - it is managed by AEM Environment Manager
if [ -L "$HOME/.aem-env-manager/java/current" ]; then
  export JAVA_HOME="$HOME/.aem-env-manager/java/current"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [ -L "$HOME/.aem-env-manager/node/current" ]; then
  export PATH="$HOME/.aem-env-manager/node/current/bin:$PATH"
fi
# End AEM Environment Manager Block
"#);

    // Read existing content
    let existing = if shell_config.exists() {
        fs::read_to_string(&shell_config)
            .map_err(|e| format!("Failed to read shell config: {}", e))?
    } else {
        String::new()
    };

    // Append our block
    let new_content = format!("{}\n{}", existing, config_block);

    fs::write(&shell_config, new_content)
        .map_err(|e| format!("Failed to write shell config: {}", e))?;

    Ok(true)
}

/// Remove shell configuration (for cleanup)
#[command]
pub async fn remove_shell_config() -> Result<bool, String> {
    let shell_config = get_shell_config_path()?;

    if !shell_config.exists() {
        return Ok(false);
    }

    let content = fs::read_to_string(&shell_config)
        .map_err(|e| format!("Failed to read shell config: {}", e))?;

    // Remove our managed block
    let start_marker = "# AEM Environment Manager - Managed Block";
    let end_marker = "# End AEM Environment Manager Block";

    if let Some(start) = content.find(start_marker) {
        if let Some(end) = content.find(end_marker) {
            let end = end + end_marker.len();
            let new_content = format!(
                "{}{}",
                &content[..start].trim_end(),
                &content[end..].trim_start()
            );

            fs::write(&shell_config, new_content.trim())
                .map_err(|e| format!("Failed to write shell config: {}", e))?;

            return Ok(true);
        }
    }

    Ok(false)
}

// ============================================
// Symlink Management Commands
// ============================================

/// Update Java symlink to point to a specific installation
#[command]
pub async fn set_java_symlink(java_home: String) -> Result<SymlinkResult, String> {
    let symlink_path = get_java_symlink_path()?;
    let target = PathBuf::from(&java_home);

    // Validate target exists
    if !target.exists() {
        return Err(format!("Java installation not found: {}", java_home));
    }

    // Validate it's a valid Java installation
    let java_bin = if cfg!(target_os = "windows") {
        target.join("bin").join("java.exe")
    } else {
        target.join("bin").join("java")
    };

    if !java_bin.exists() {
        return Err(format!("Invalid Java installation (no java binary): {}", java_home));
    }

    // Get previous target
    let previous_target = read_symlink_target(&symlink_path);

    // Ensure parent directory exists
    if let Some(parent) = symlink_path.parent() {
        ensure_dir_exists(&parent.to_path_buf())?;
    }

    // Remove existing symlink if present
    if symlink_path.exists() || symlink_path.is_symlink() {
        fs::remove_file(&symlink_path)
            .map_err(|e| format!("Failed to remove existing symlink: {}", e))?;
    }

    // Create new symlink
    #[cfg(unix)]
    symlink(&target, &symlink_path)
        .map_err(|e| format!("Failed to create symlink: {}", e))?;

    #[cfg(windows)]
    std::os::windows::fs::symlink_dir(&target, &symlink_path)
        .map_err(|e| format!("Failed to create symlink: {}", e))?;

    Ok(SymlinkResult {
        success: true,
        previous_target,
        current_target: java_home,
        message: Some("Java symlink updated successfully".to_string()),
    })
}

/// Update Node symlink to point to a specific installation
#[command]
pub async fn set_node_symlink(node_path: String) -> Result<SymlinkResult, String> {
    let symlink_path = get_node_symlink_path()?;
    let target = PathBuf::from(&node_path);

    // Validate target exists
    if !target.exists() {
        return Err(format!("Node installation not found: {}", node_path));
    }

    // Validate it's a valid Node installation
    let node_bin = if cfg!(target_os = "windows") {
        target.join("node.exe")
    } else {
        // Check both bin/node and direct node
        let bin_node = target.join("bin").join("node");
        let direct_node = target.join("node");
        if bin_node.exists() {
            bin_node
        } else if direct_node.exists() {
            direct_node
        } else {
            target.join("bin").join("node") // Default for error message
        }
    };

    if !node_bin.exists() && !target.join("bin").join("node").exists() {
        return Err(format!("Invalid Node installation (no node binary): {}", node_path));
    }

    // Get previous target
    let previous_target = read_symlink_target(&symlink_path);

    // Ensure parent directory exists
    if let Some(parent) = symlink_path.parent() {
        ensure_dir_exists(&parent.to_path_buf())?;
    }

    // Remove existing symlink if present
    if symlink_path.exists() || symlink_path.is_symlink() {
        fs::remove_file(&symlink_path)
            .map_err(|e| format!("Failed to remove existing symlink: {}", e))?;
    }

    // Create new symlink
    #[cfg(unix)]
    symlink(&target, &symlink_path)
        .map_err(|e| format!("Failed to create symlink: {}", e))?;

    #[cfg(windows)]
    std::os::windows::fs::symlink_dir(&target, &symlink_path)
        .map_err(|e| format!("Failed to create symlink: {}", e))?;

    Ok(SymlinkResult {
        success: true,
        previous_target,
        current_target: node_path,
        message: Some("Node symlink updated successfully".to_string()),
    })
}

/// Remove Java symlink
#[command]
pub async fn remove_java_symlink() -> Result<bool, String> {
    let symlink_path = get_java_symlink_path()?;

    if symlink_path.exists() || symlink_path.is_symlink() {
        fs::remove_file(&symlink_path)
            .map_err(|e| format!("Failed to remove Java symlink: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// Remove Node symlink
#[command]
pub async fn remove_node_symlink() -> Result<bool, String> {
    let symlink_path = get_node_symlink_path()?;

    if symlink_path.exists() || symlink_path.is_symlink() {
        fs::remove_file(&symlink_path)
            .map_err(|e| format!("Failed to remove Node symlink: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

// ============================================
// Utility Commands
// ============================================

/// Get environment variables for launching a process with specific versions
#[command]
pub async fn get_profile_environment(
    java_path: Option<String>,
    node_path: Option<String>,
) -> Result<Vec<(String, String)>, String> {
    let mut env_vars = Vec::new();

    // Current PATH
    let current_path = std::env::var("PATH").unwrap_or_default();
    let mut new_path_parts: Vec<String> = Vec::new();

    // Add Java to environment
    if let Some(java_home) = java_path {
        let java_home_path = PathBuf::from(&java_home);
        if java_home_path.exists() {
            env_vars.push(("JAVA_HOME".to_string(), java_home.clone()));
            new_path_parts.push(format!("{}/bin", java_home));
        }
    }

    // Add Node to PATH
    if let Some(node) = node_path {
        let node_path = PathBuf::from(&node);
        if node_path.exists() {
            // Check if bin directory exists
            let bin_dir = node_path.join("bin");
            if bin_dir.exists() {
                new_path_parts.push(bin_dir.to_string_lossy().to_string());
            } else {
                new_path_parts.push(node);
            }
        }
    }

    // Construct new PATH
    if !new_path_parts.is_empty() {
        new_path_parts.push(current_path);
        env_vars.push(("PATH".to_string(), new_path_parts.join(":")));
    }

    Ok(env_vars)
}

/// Get current symlink targets
#[command]
pub async fn get_current_symlinks() -> Result<(Option<String>, Option<String>), String> {
    let java_symlink = get_java_symlink_path()?;
    let node_symlink = get_node_symlink_path()?;

    Ok((
        read_symlink_target(&java_symlink),
        read_symlink_target(&node_symlink),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_env_dir() {
        let result = get_env_dir();
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains(".aem-env-manager"));
    }

    #[test]
    fn test_get_shell_config_path() {
        let result = get_shell_config_path();
        assert!(result.is_ok());
    }
}
