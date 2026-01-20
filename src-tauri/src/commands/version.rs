use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

#[cfg(target_os = "macos")]
use crate::platform::macos::{JenvManager, NvmManager, SdkmanManager};

#[cfg(target_os = "windows")]
use crate::platform::windows::{FnmManager, JabbaManager, NvmWindowsManager, VoltaManager};

use crate::platform::common::VersionManagerOps;
use crate::platform::PlatformOps;

// ============================================
// Data Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionManager {
    pub id: String,
    pub name: String,
    pub manager_type: VersionManagerType,
    pub is_installed: bool,
    pub is_active: bool,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VersionManagerType {
    Sdkman,
    Jenv,
    Jabba,
    Nvm,
    Fnm,
    Volta,
    NvmWindows,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaVersion {
    pub version: String,
    pub vendor: String,
    pub path: String,
    pub is_default: bool,
    pub is_current: bool,
    pub full_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeVersion {
    pub version: String,
    pub path: String,
    pub is_default: bool,
    pub is_current: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledVersion {
    pub version: String,
    pub path: String,
    pub is_default: bool,
    pub vendor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionSwitchResult {
    pub success: bool,
    pub previous_version: Option<String>,
    pub current_version: String,
    pub message: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MavenConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_active: bool,
    pub description: Option<String>,
    pub local_repository: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MavenSettingsFile {
    pub name: String,
    pub path: String,
    pub local_repository: Option<String>,
}

// ============================================
// Java Version Management
// ============================================

/// Get the current Java symlink target path
fn get_current_java_symlink_target() -> Option<PathBuf> {
    if let Some(home) = dirs::home_dir() {
        let symlink_path = home.join(".aem-env-manager").join("java").join("current");
        if symlink_path.is_symlink() {
            // Read the symlink target
            if let Ok(target) = std::fs::read_link(&symlink_path) {
                // Resolve to absolute path if relative
                if target.is_absolute() {
                    return Some(target);
                } else if let Some(parent) = symlink_path.parent() {
                    return Some(parent.join(target));
                }
            }
        }
    }
    None
}

/// Scan system for installed Java versions
#[command]
pub async fn scan_java_versions() -> Result<Vec<JavaVersion>, String> {
    let platform = crate::platform::current_platform();
    let scan_paths = platform.get_java_scan_paths();
    let current_symlink_target = get_current_java_symlink_target();
    let mut versions = Vec::new();

    for base_path in scan_paths {
        if let Ok(entries) = std::fs::read_dir(&base_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Check for java binary
                    let java_bin = if cfg!(target_os = "windows") {
                        path.join("bin").join("java.exe")
                    } else {
                        path.join("bin").join("java")
                    };

                    // Also check Contents/Home on macOS
                    let java_bin_macos = path.join("Contents/Home/bin/java");

                    if java_bin.exists() || java_bin_macos.exists() {
                        let actual_path = if java_bin_macos.exists() {
                            path.join("Contents/Home")
                        } else {
                            path.clone()
                        };

                        if let Some(version_info) = parse_java_version(&actual_path) {
                            // Check if this path matches our symlink target
                            let is_current = current_symlink_target
                                .as_ref()
                                .map(|target| target == &actual_path)
                                .unwrap_or(false);

                            versions.push(JavaVersion {
                                version: version_info.0,
                                vendor: version_info.1,
                                path: actual_path.to_string_lossy().to_string(),
                                is_default: false,
                                is_current,
                                full_version: version_info.2,
                            });
                        }
                    }
                }
            }
        }
    }

    // Deduplicate by path
    versions.sort_by(|a, b| a.path.cmp(&b.path));
    versions.dedup_by(|a, b| a.path == b.path);

    // Sort by version
    versions.sort_by(|a, b| b.version.cmp(&a.version));

    Ok(versions)
}

/// Parse Java version from installation directory
fn parse_java_version(java_home: &PathBuf) -> Option<(String, String, Option<String>)> {
    // Try to get version from release file first
    let release_file = java_home.join("release");
    if release_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&release_file) {
            let mut version = String::new();
            let mut vendor = String::from("Unknown");

            for line in content.lines() {
                if line.starts_with("JAVA_VERSION=") {
                    version = line
                        .trim_start_matches("JAVA_VERSION=")
                        .trim_matches('"')
                        .to_string();
                } else if line.starts_with("IMPLEMENTOR=") {
                    vendor = line
                        .trim_start_matches("IMPLEMENTOR=")
                        .trim_matches('"')
                        .to_string();
                }
            }

            if !version.is_empty() {
                // Extract major version
                let major = extract_java_major_version(&version);
                return Some((major, vendor, Some(version)));
            }
        }
    }

    // Fall back to parsing directory name
    let dir_name = java_home.file_name()?.to_string_lossy().to_string();

    // Common patterns: jdk-17.0.1, temurin-17.0.1, zulu17.30.15
    let vendor = if dir_name.contains("temurin") || dir_name.contains("adoptium") {
        "Eclipse Adoptium".to_string()
    } else if dir_name.contains("zulu") {
        "Azul Zulu".to_string()
    } else if dir_name.contains("corretto") {
        "Amazon Corretto".to_string()
    } else if dir_name.contains("graalvm") {
        "GraalVM".to_string()
    } else if dir_name.contains("openjdk") {
        "OpenJDK".to_string()
    } else if dir_name.contains("oracle") || dir_name.starts_with("jdk") {
        "Oracle".to_string()
    } else {
        "Unknown".to_string()
    };

    // Extract version number
    let version = extract_version_from_path(&dir_name)?;

    Some((version, vendor, None))
}

/// Extract major version from Java version string
fn extract_java_major_version(version: &str) -> String {
    // Handle formats: "17.0.1", "1.8.0_301", "11"
    if version.starts_with("1.") {
        // Old format: 1.8.0 -> 8
        version
            .split('.')
            .nth(1)
            .unwrap_or(version)
            .split('_')
            .next()
            .unwrap_or(version)
            .to_string()
    } else {
        // New format: 17.0.1 -> 17
        version.split('.').next().unwrap_or(version).to_string()
    }
}

/// Extract version number from directory name
fn extract_version_from_path(name: &str) -> Option<String> {
    // Look for patterns like: 17, 17.0.1, 1.8.0_301
    let re_parts: Vec<&str> = name
        .split(|c: char| !c.is_ascii_digit() && c != '.' && c != '_')
        .filter(|s| !s.is_empty() && s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
        .collect();

    re_parts.first().map(|s| s.to_string())
}

/// Get current Java version from JAVA_HOME or java -version
#[command]
pub async fn get_current_java_version() -> Result<Option<String>, String> {
    // First try JAVA_HOME
    let platform = crate::platform::current_platform();
    if let Ok(java_home) = platform.get_java_home() {
        if let Some((version, _, _)) = parse_java_version(&java_home) {
            return Ok(Some(version));
        }
    }

    // Fall back to java -version command
    let output = Command::new("java")
        .args(["-version"])
        .output()
        .map_err(|e| format!("Failed to execute java -version: {}", e))?;

    // java -version outputs to stderr
    let output_str = String::from_utf8_lossy(&output.stderr);

    // Parse output: 'openjdk version "17.0.1"' or 'java version "1.8.0_301"'
    for line in output_str.lines() {
        if line.contains("version") {
            if let Some(start) = line.find('"') {
                if let Some(end) = line[start + 1..].find('"') {
                    let version = &line[start + 1..start + 1 + end];
                    return Ok(Some(extract_java_major_version(version)));
                }
            }
        }
    }

    Ok(None)
}

/// Switch Java version by setting JAVA_HOME
#[command]
pub async fn switch_java_version(
    version: String,
    manager_id: Option<String>,
) -> Result<VersionSwitchResult, String> {
    let previous = get_current_java_version().await.ok().flatten();

    // If manager is specified, use it
    if let Some(manager) = manager_id {
        return switch_java_with_manager(&version, &manager).await;
    }

    // Otherwise, find the Java installation and set JAVA_HOME directly
    let versions = scan_java_versions().await?;
    let target = versions
        .iter()
        .find(|v| v.version == version || v.path.contains(&version))
        .ok_or_else(|| format!("Java version {} not found", version))?;

    let platform = crate::platform::current_platform();
    platform
        .set_java_home(std::path::Path::new(&target.path))
        .map_err(|e| format!("Failed to set JAVA_HOME: {}", e))?;

    Ok(VersionSwitchResult {
        success: true,
        previous_version: previous,
        current_version: version,
        message: Some(format!("JAVA_HOME set to {}", target.path)),
        error: None,
    })
}

/// Switch Java version using a specific version manager
async fn switch_java_with_manager(
    version: &str,
    manager: &str,
) -> Result<VersionSwitchResult, String> {
    let previous = get_current_java_version().await.ok().flatten();

    #[cfg(target_os = "macos")]
    {
        match manager {
            "sdkman" => {
                let sdkman = SdkmanManager::new();
                sdkman.switch_version(version)?;
            }
            "jenv" => {
                let jenv = JenvManager::new();
                jenv.switch_version(version)?;
            }
            _ => return Err(format!("Unknown Java version manager: {}", manager)),
        }
    }

    #[cfg(target_os = "windows")]
    {
        match manager {
            "jabba" => {
                let jabba = JabbaManager::new();
                jabba.switch_version(version)?;
            }
            _ => return Err(format!("Unknown Java version manager: {}", manager)),
        }
    }

    Ok(VersionSwitchResult {
        success: true,
        previous_version: previous,
        current_version: version.to_string(),
        message: Some(format!("Switched to Java {} via {}", version, manager)),
        error: None,
    })
}

// ============================================
// Node Version Management
// ============================================

/// Get the current Node symlink target path
fn get_current_node_symlink_target() -> Option<PathBuf> {
    if let Some(home) = dirs::home_dir() {
        let symlink_path = home.join(".aem-env-manager").join("node").join("current");
        if symlink_path.is_symlink() {
            // Read the symlink target
            if let Ok(target) = std::fs::read_link(&symlink_path) {
                // Resolve to absolute path if relative
                if target.is_absolute() {
                    return Some(target);
                } else if let Some(parent) = symlink_path.parent() {
                    return Some(parent.join(target));
                }
            }
        }
    }
    None
}

/// Scan system for installed Node versions
#[command]
pub async fn scan_node_versions() -> Result<Vec<NodeVersion>, String> {
    let platform = crate::platform::current_platform();
    let scan_paths = platform.get_node_scan_paths();
    let current_symlink_target = get_current_node_symlink_target();
    let mut versions = Vec::new();

    for base_path in scan_paths {
        if let Ok(entries) = std::fs::read_dir(&base_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Check for node binary
                    let node_bin = if cfg!(target_os = "windows") {
                        path.join("node.exe")
                    } else {
                        path.join("bin").join("node")
                    };

                    // Also check directly in the directory (some version managers)
                    let node_bin_direct = if cfg!(target_os = "windows") {
                        path.join("node.exe")
                    } else {
                        path.join("node")
                    };

                    if node_bin.exists() || node_bin_direct.exists() {
                        if let Some(version) = extract_node_version_from_path(&path) {
                            // Check if this path matches our symlink target
                            let is_current = current_symlink_target
                                .as_ref()
                                .map(|target| target == &path)
                                .unwrap_or(false);

                            versions.push(NodeVersion {
                                version: version.clone(),
                                path: path.to_string_lossy().to_string(),
                                is_default: false,
                                is_current,
                            });
                        }
                    }
                }
            }
        }
    }

    // Deduplicate
    versions.sort_by(|a, b| a.path.cmp(&b.path));
    versions.dedup_by(|a, b| a.path == b.path);

    // Sort by version (newest first)
    versions.sort_by(|a, b| compare_versions(&b.version, &a.version));

    Ok(versions)
}

/// Extract Node version from installation path
fn extract_node_version_from_path(path: &PathBuf) -> Option<String> {
    let name = path.file_name()?.to_string_lossy().to_string();

    // Common patterns: v18.17.0, node-v18.17.0, 18.17.0
    let version = name
        .trim_start_matches("node-")
        .trim_start_matches("node")
        .trim_start_matches('v')
        .trim_start_matches('-');

    // Verify it looks like a version
    if version
        .chars()
        .next()
        .map(|c| c.is_ascii_digit())
        .unwrap_or(false)
    {
        Some(format!("v{}", version))
    } else {
        None
    }
}

/// Compare semantic version strings
fn compare_versions(a: &str, b: &str) -> std::cmp::Ordering {
    let parse = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect()
    };

    let va = parse(a);
    let vb = parse(b);

    for (a, b) in va.iter().zip(vb.iter()) {
        match a.cmp(b) {
            std::cmp::Ordering::Equal => continue,
            other => return other,
        }
    }

    va.len().cmp(&vb.len())
}

/// Get current Node version
/// First checks our managed symlink, then falls back to system node
#[command]
pub async fn get_current_node_version() -> Result<Option<String>, String> {
    // First, check our managed symlink
    if let Some(home) = dirs::home_dir() {
        let symlink_path = home.join(".aem-env-manager").join("node").join("current");
        if symlink_path.is_symlink() || symlink_path.exists() {
            // Try to get version from the symlink target
            let node_bin = symlink_path.join("bin").join("node");
            let node_bin_direct = symlink_path.join("node");

            let final_bin = if node_bin.exists() {
                node_bin
            } else if node_bin_direct.exists() {
                node_bin_direct
            } else {
                // Symlink exists but no node binary found, continue to fallback
                symlink_path.join("bin").join("node")
            };

            if final_bin.exists() {
                if let Ok(output) = Command::new(&final_bin).args(["-v"]).output() {
                    if output.status.success() {
                        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if !version.is_empty() {
                            return Ok(Some(version));
                        }
                    }
                }
            }
        }
    }

    // Fallback to system node command
    let output = Command::new("node")
        .args(["-v"])
        .output()
        .map_err(|e| format!("Failed to execute node -v: {}", e))?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !version.is_empty() {
            return Ok(Some(version));
        }
    }

    Ok(None)
}

/// Switch Node version
#[command]
pub async fn switch_node_version(
    version: String,
    manager_id: Option<String>,
) -> Result<VersionSwitchResult, String> {
    // Use version manager if specified
    if let Some(manager) = manager_id {
        return switch_node_with_manager(&version, &manager).await;
    }

    // Try to detect available version manager
    let managers = detect_version_managers().await?;
    let node_manager = managers
        .iter()
        .find(|m| {
            matches!(
                m.manager_type,
                VersionManagerType::Nvm
                    | VersionManagerType::Fnm
                    | VersionManagerType::Volta
                    | VersionManagerType::NvmWindows
            ) && m.is_installed
        });

    if let Some(manager) = node_manager {
        return switch_node_with_manager(&version, &manager.id).await;
    }

    Err(
        "No Node version manager found. Please install nvm, fnm, or volta to switch Node versions."
            .to_string(),
    )
}

/// Switch Node version using a specific version manager
async fn switch_node_with_manager(
    version: &str,
    manager: &str,
) -> Result<VersionSwitchResult, String> {
    let previous = get_current_node_version().await.ok().flatten();

    #[cfg(target_os = "macos")]
    {
        match manager {
            "nvm" => {
                let nvm = NvmManager::new();
                nvm.switch_version(version)?;
            }
            _ => return Err(format!("Unknown Node version manager: {}", manager)),
        }
    }

    #[cfg(target_os = "windows")]
    {
        match manager {
            "fnm" => {
                let fnm = FnmManager::new();
                fnm.switch_version(version)?;
            }
            "volta" => {
                let volta = VoltaManager::new();
                volta.switch_version(version)?;
            }
            "nvm-windows" => {
                let nvm = NvmWindowsManager::new();
                nvm.switch_version(version)?;
            }
            _ => return Err(format!("Unknown Node version manager: {}", manager)),
        }
    }

    Ok(VersionSwitchResult {
        success: true,
        previous_version: previous,
        current_version: version.to_string(),
        message: Some(format!("Switched to Node {} via {}", version, manager)),
        error: None,
    })
}

// ============================================
// Version Manager Detection
// ============================================

/// Detect installed version managers
#[command]
pub async fn detect_version_managers() -> Result<Vec<VersionManager>, String> {
    let mut managers = Vec::new();

    // Detect Java version managers
    #[cfg(target_os = "macos")]
    {
        // SDKMAN
        let sdkman = SdkmanManager::new();
        managers.push(VersionManager {
            id: "sdkman".to_string(),
            name: "SDKMAN".to_string(),
            manager_type: VersionManagerType::Sdkman,
            is_installed: sdkman.is_installed(),
            is_active: sdkman.is_installed(),
            path: dirs::home_dir().map(|h| h.join(".sdkman").to_string_lossy().to_string()),
        });

        // jEnv
        let jenv = JenvManager::new();
        managers.push(VersionManager {
            id: "jenv".to_string(),
            name: "jEnv".to_string(),
            manager_type: VersionManagerType::Jenv,
            is_installed: jenv.is_installed(),
            is_active: jenv.is_installed(),
            path: dirs::home_dir().map(|h| h.join(".jenv").to_string_lossy().to_string()),
        });

        // NVM
        let nvm = NvmManager::new();
        managers.push(VersionManager {
            id: "nvm".to_string(),
            name: "NVM".to_string(),
            manager_type: VersionManagerType::Nvm,
            is_installed: nvm.is_installed(),
            is_active: nvm.is_installed(),
            path: dirs::home_dir().map(|h| h.join(".nvm").to_string_lossy().to_string()),
        });
    }

    #[cfg(target_os = "windows")]
    {
        // Jabba
        let jabba = JabbaManager::new();
        managers.push(VersionManager {
            id: "jabba".to_string(),
            name: "Jabba".to_string(),
            manager_type: VersionManagerType::Jabba,
            is_installed: jabba.is_installed(),
            is_active: jabba.is_installed(),
            path: dirs::home_dir().map(|h| h.join(".jabba").to_string_lossy().to_string()),
        });

        // fnm
        let fnm = FnmManager::new();
        managers.push(VersionManager {
            id: "fnm".to_string(),
            name: "fnm".to_string(),
            manager_type: VersionManagerType::Fnm,
            is_installed: fnm.is_installed(),
            is_active: fnm.is_installed(),
            path: None,
        });

        // Volta
        let volta = VoltaManager::new();
        managers.push(VersionManager {
            id: "volta".to_string(),
            name: "Volta".to_string(),
            manager_type: VersionManagerType::Volta,
            is_installed: volta.is_installed(),
            is_active: volta.is_installed(),
            path: dirs::home_dir().map(|h| h.join(".volta").to_string_lossy().to_string()),
        });

        // nvm-windows
        let nvm = NvmWindowsManager::new();
        managers.push(VersionManager {
            id: "nvm-windows".to_string(),
            name: "nvm-windows".to_string(),
            manager_type: VersionManagerType::NvmWindows,
            is_installed: nvm.is_installed(),
            is_active: nvm.is_installed(),
            path: std::env::var("NVM_HOME").ok(),
        });
    }

    Ok(managers)
}

/// Get versions managed by a specific manager
#[command]
pub async fn get_managed_versions(
    manager_id: String,
    tool_type: String,
) -> Result<Vec<InstalledVersion>, String> {
    let versions: Vec<String>;

    #[cfg(target_os = "macos")]
    {
        versions = match (manager_id.as_str(), tool_type.as_str()) {
            ("sdkman", "java") => {
                let sdkman = SdkmanManager::new();
                sdkman.list_versions()?
            }
            ("jenv", "java") => {
                let jenv = JenvManager::new();
                jenv.list_versions()?
            }
            ("nvm", "node") => {
                let nvm = NvmManager::new();
                nvm.list_versions()?
            }
            _ => return Err(format!("Unknown manager or tool type: {} / {}", manager_id, tool_type)),
        };
    }

    #[cfg(target_os = "windows")]
    {
        versions = match (manager_id.as_str(), tool_type.as_str()) {
            ("jabba", "java") => {
                let jabba = JabbaManager::new();
                jabba.list_versions()?
            }
            ("fnm", "node") => {
                let fnm = FnmManager::new();
                fnm.list_versions()?
            }
            ("volta", "node") => {
                let volta = VoltaManager::new();
                volta.list_versions()?
            }
            ("nvm-windows", "node") => {
                let nvm = NvmWindowsManager::new();
                nvm.list_versions()?
            }
            _ => return Err(format!("Unknown manager or tool type: {} / {}", manager_id, tool_type)),
        };
    }

    Ok(versions
        .into_iter()
        .map(|v| InstalledVersion {
            version: v.clone(),
            path: String::new(),
            is_default: false,
            vendor: None,
        })
        .collect())
}

// ============================================
// Maven Configuration Management
// ============================================

/// List saved Maven configurations
#[command]
pub async fn list_maven_configs() -> Result<Vec<MavenConfig>, String> {
    let platform = crate::platform::current_platform();
    let config_dir = platform.get_data_dir().join("maven-configs");

    if !config_dir.exists() {
        return Ok(vec![]);
    }

    let mut configs = Vec::new();
    let current_settings = get_current_maven_settings()?;

    if let Ok(entries) = std::fs::read_dir(&config_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "xml").unwrap_or(false) {
                let name = path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();

                let is_active = current_settings
                    .as_ref()
                    .map(|c| c == &path.to_string_lossy().to_string())
                    .unwrap_or(false);

                let local_repo = parse_maven_local_repository(&path);
                configs.push(MavenConfig {
                    id: name.clone(),
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_active,
                    description: None,
                    local_repository: local_repo,
                });
            }
        }
    }

    Ok(configs)
}

/// Get current Maven settings.xml path
fn get_current_maven_settings() -> Result<Option<String>, String> {
    let m2_settings = dirs::home_dir()
        .map(|h| h.join(".m2").join("settings.xml"))
        .ok_or("Could not determine home directory")?;

    if m2_settings.exists() {
        Ok(Some(m2_settings.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// Parse Maven settings.xml to extract localRepository path
/// Returns default ~/.m2/repository if not configured or if the value is a placeholder
fn parse_maven_local_repository(settings_path: &std::path::Path) -> Option<String> {
    let content = std::fs::read_to_string(settings_path).ok()?;

    // First, remove all XML comments to avoid matching commented-out examples
    let mut clean_content = String::new();
    let mut remaining = content.as_str();
    while let Some(comment_start) = remaining.find("<!--") {
        clean_content.push_str(&remaining[..comment_start]);
        if let Some(comment_end) = remaining[comment_start..].find("-->") {
            remaining = &remaining[comment_start + comment_end + 3..];
        } else {
            // Unclosed comment, skip rest
            break;
        }
    }
    clean_content.push_str(remaining);

    // Now parse <localRepository>...</localRepository> from clean content
    if let Some(start) = clean_content.find("<localRepository>") {
        let start_idx = start + "<localRepository>".len();
        if let Some(end) = clean_content[start_idx..].find("</localRepository>") {
            let repo_path = clean_content[start_idx..start_idx + end].trim();
            if !repo_path.is_empty() {
                // Skip placeholder/example paths that are clearly not real
                let lower_path = repo_path.to_lowercase();
                if lower_path.contains("/path/to/")
                    || lower_path.contains("\\path\\to\\")
                    || lower_path.contains("/your/")
                    || lower_path.contains("${")
                    || lower_path.starts_with("path/")
                    || lower_path == "path"
                {
                    // This is a placeholder, return default
                    return dirs::home_dir().map(|h| h.join(".m2").join("repository").to_string_lossy().to_string());
                }

                // Expand ~ to home directory
                if repo_path.starts_with("~/") || repo_path.starts_with("~\\") {
                    if let Some(home) = dirs::home_dir() {
                        return Some(home.join(&repo_path[2..]).to_string_lossy().to_string());
                    }
                }
                return Some(repo_path.to_string());
            }
        }
    }

    // Not configured - return default
    dirs::home_dir().map(|h| h.join(".m2").join("repository").to_string_lossy().to_string())
}

/// Scan system for Maven settings files
#[command]
pub async fn scan_maven_settings() -> Result<Vec<MavenSettingsFile>, String> {
    let mut found_files = Vec::new();
    let mut checked_paths = std::collections::HashSet::new();

    // 1. Check ~/.m2/ directory for settings*.xml files
    if let Some(home) = dirs::home_dir() {
        let m2_dir = home.join(".m2");
        if m2_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&m2_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let filename = path.file_name()
                        .map(|n| n.to_string_lossy().to_lowercase())
                        .unwrap_or_default();

                    // Match settings.xml, settings-*.xml, .m2.*.xml patterns
                    if path.extension().map(|e| e == "xml").unwrap_or(false)
                        && (filename.starts_with("settings") || filename.contains(".m2."))
                    {
                        let path_str = path.to_string_lossy().to_string();
                        if checked_paths.insert(path_str.clone()) {
                            let local_repo = parse_maven_local_repository(&path);
                            found_files.push(MavenSettingsFile {
                                name: path.file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_else(|| "settings.xml".to_string()),
                                path: path_str,
                                local_repository: local_repo,
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Check MAVEN_HOME/conf/settings.xml
    if let Ok(maven_home) = std::env::var("MAVEN_HOME") {
        let maven_settings = PathBuf::from(&maven_home).join("conf").join("settings.xml");
        if maven_settings.exists() {
            let path_str = maven_settings.to_string_lossy().to_string();
            if checked_paths.insert(path_str.clone()) {
                let local_repo = parse_maven_local_repository(&maven_settings);
                found_files.push(MavenSettingsFile {
                    name: format!("Maven Home ({})", maven_home),
                    path: path_str,
                    local_repository: local_repo,
                });
            }
        }
    }

    // 3. Check M2_HOME/conf/settings.xml
    if let Ok(m2_home) = std::env::var("M2_HOME") {
        let m2_settings = PathBuf::from(&m2_home).join("conf").join("settings.xml");
        if m2_settings.exists() {
            let path_str = m2_settings.to_string_lossy().to_string();
            if checked_paths.insert(path_str.clone()) {
                let local_repo = parse_maven_local_repository(&m2_settings);
                found_files.push(MavenSettingsFile {
                    name: format!("M2 Home ({})", m2_home),
                    path: path_str,
                    local_repository: local_repo,
                });
            }
        }
    }

    // 4. Check common installation paths
    let common_paths = vec![
        "/usr/local/maven/conf/settings.xml",
        "/usr/share/maven/conf/settings.xml",
        "/opt/maven/conf/settings.xml",
        "/opt/homebrew/opt/maven/libexec/conf/settings.xml",
    ];

    for path_str in common_paths {
        let path = PathBuf::from(path_str);
        if path.exists() && checked_paths.insert(path_str.to_string()) {
            let local_repo = parse_maven_local_repository(&path);
            found_files.push(MavenSettingsFile {
                name: format!("System Maven ({})", path_str),
                path: path_str.to_string(),
                local_repository: local_repo,
            });
        }
    }

    Ok(found_files)
}

/// Scan a specific directory for Maven settings files
/// This allows users to specify a custom path to search for .m2 directories and settings.xml files
#[command]
pub async fn scan_maven_settings_in_path(search_path: String) -> Result<Vec<MavenSettingsFile>, String> {
    let mut found_files = Vec::new();
    let mut checked_paths = std::collections::HashSet::new();
    let base_path = PathBuf::from(&search_path);

    if !base_path.exists() {
        return Err(format!("Path does not exist: {}", search_path));
    }

    // Helper function to check if a file is a Maven settings file
    fn is_maven_settings_file(filename: &str) -> bool {
        let lower = filename.to_lowercase();
        (lower.starts_with("settings") && lower.ends_with(".xml")) ||
        (lower.contains(".m2.") && lower.ends_with(".xml")) ||
        lower == "settings.xml"
    }

    // Helper function to scan a directory for Maven settings files
    fn scan_directory(
        dir: &PathBuf,
        found_files: &mut Vec<MavenSettingsFile>,
        checked_paths: &mut std::collections::HashSet<String>,
        depth: usize,
        max_depth: usize,
    ) {
        if depth > max_depth {
            return;
        }

        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let filename = path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                if path.is_file() && is_maven_settings_file(&filename) {
                    let path_str = path.to_string_lossy().to_string();
                    if checked_paths.insert(path_str.clone()) {
                        let local_repo = parse_maven_local_repository(&path);
                        found_files.push(MavenSettingsFile {
                            name: filename,
                            path: path_str,
                            local_repository: local_repo,
                        });
                    }
                } else if path.is_dir() {
                    let dir_name = filename.to_lowercase();
                    // Prioritize .m2 directories and conf directories
                    if dir_name == ".m2" || dir_name == "conf" || dir_name == "maven" {
                        scan_directory(&path, found_files, checked_paths, depth + 1, max_depth);
                    } else if depth < 2 {
                        // For other directories, only scan first 2 levels
                        scan_directory(&path, found_files, checked_paths, depth + 1, 2);
                    }
                }
            }
        }
    }

    // Start scanning from the specified path
    // If it's a file, check if it's a settings file directly
    if base_path.is_file() {
        let filename = base_path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        if is_maven_settings_file(&filename) {
            let path_str = base_path.to_string_lossy().to_string();
            let local_repo = parse_maven_local_repository(&base_path);
            found_files.push(MavenSettingsFile {
                name: filename,
                path: path_str,
                local_repository: local_repo,
            });
        }
    } else {
        // Scan directory with max depth of 3 for .m2/conf/maven directories
        scan_directory(&base_path, &mut found_files, &mut checked_paths, 0, 3);
    }

    Ok(found_files)
}

/// Get current Maven settings
#[command]
pub async fn get_current_maven_config() -> Result<Option<MavenConfig>, String> {
    let m2_settings = dirs::home_dir()
        .map(|h| h.join(".m2").join("settings.xml"))
        .ok_or("Could not determine home directory")?;

    if m2_settings.exists() {
        let local_repo = parse_maven_local_repository(&m2_settings);
        Ok(Some(MavenConfig {
            id: "current".to_string(),
            name: "Current settings.xml".to_string(),
            path: m2_settings.to_string_lossy().to_string(),
            is_active: true,
            description: None,
            local_repository: local_repo,
        }))
    } else {
        Ok(None)
    }
}

/// Switch Maven configuration
#[command]
pub async fn switch_maven_config(config_id: String) -> Result<(), String> {
    let platform = crate::platform::current_platform();
    let config_dir = platform.get_data_dir().join("maven-configs");
    let source = config_dir.join(format!("{}.xml", config_id));

    if !source.exists() {
        return Err(format!("Maven config '{}' not found", config_id));
    }

    let m2_dir = dirs::home_dir()
        .map(|h| h.join(".m2"))
        .ok_or("Could not determine home directory")?;

    // Create .m2 directory if it doesn't exist
    if !m2_dir.exists() {
        std::fs::create_dir_all(&m2_dir)
            .map_err(|e| format!("Failed to create .m2 directory: {}", e))?;
    }

    let target = m2_dir.join("settings.xml");

    // Backup current settings if exists
    if target.exists() {
        let backup = m2_dir.join("settings.xml.backup");
        std::fs::copy(&target, &backup)
            .map_err(|e| format!("Failed to backup settings.xml: {}", e))?;
    }

    // Copy new settings
    std::fs::copy(&source, &target).map_err(|e| format!("Failed to switch Maven config: {}", e))?;

    Ok(())
}

/// Import a new Maven settings.xml
#[command]
pub async fn import_maven_config(name: String, source_path: String) -> Result<MavenConfig, String> {
    let platform = crate::platform::current_platform();
    let config_dir = platform.get_data_dir().join("maven-configs");

    // Create config directory if it doesn't exist
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create maven-configs directory: {}", e))?;
    }

    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Source file not found: {}", source_path));
    }

    let target = config_dir.join(format!("{}.xml", name));

    std::fs::copy(&source, &target)
        .map_err(|e| format!("Failed to import Maven config: {}", e))?;

    let local_repo = parse_maven_local_repository(&target);
    Ok(MavenConfig {
        id: name.clone(),
        name,
        path: target.to_string_lossy().to_string(),
        is_active: false,
        description: None,
        local_repository: local_repo,
    })
}

/// Delete a Maven configuration
#[command]
pub async fn delete_maven_config(config_id: String) -> Result<bool, String> {
    let platform = crate::platform::current_platform();
    let config_dir = platform.get_data_dir().join("maven-configs");
    let config_path = config_dir.join(format!("{}.xml", config_id));

    if !config_path.exists() {
        return Err(format!("Maven config '{}' not found", config_id));
    }

    // Check if this is the currently active config
    let current_settings = get_current_maven_settings()?;
    if let Some(current) = current_settings {
        if current == config_path.to_string_lossy().to_string() {
            return Err("Cannot delete the currently active Maven configuration".to_string());
        }
    }

    std::fs::remove_file(&config_path)
        .map_err(|e| format!("Failed to delete Maven config: {}", e))?;

    Ok(true)
}

/// Read Maven settings.xml content
#[command]
pub async fn read_maven_config(config_id: String) -> Result<String, String> {
    let platform = crate::platform::current_platform();
    let config_dir = platform.get_data_dir().join("maven-configs");
    let config_path = config_dir.join(format!("{}.xml", config_id));

    if !config_path.exists() {
        return Err(format!("Maven config '{}' not found", config_id));
    }

    std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read Maven config: {}", e))
}

// ============================================
// Installation Commands (Placeholder)
// ============================================

/// Install a new Java version
#[command]
pub async fn install_java_version(
    version: String,
    vendor: String,
    manager_id: String,
) -> Result<bool, String> {
    // This would typically trigger the version manager to download and install
    // For now, we return an error indicating this requires user action
    Err(format!(
        "Please use {} to install Java {} ({}). Run: sdk install java {}",
        manager_id, version, vendor, version
    ))
}

/// Install a new Node version
#[command]
pub async fn install_node_version(version: String, manager_id: String) -> Result<bool, String> {
    // This would typically trigger the version manager to download and install
    Err(format!(
        "Please use {} to install Node {}. Run the appropriate install command.",
        manager_id, version
    ))
}

// ============================================
// Manual Path Validation Commands
// ============================================

/// Validate a Java installation at the given path and return version info if valid
/// This allows users to manually add Java installations not detected by version managers
#[command]
pub async fn validate_java_path(path: String) -> Result<JavaVersion, String> {
    let java_home = PathBuf::from(&path);

    // Check if path exists
    if !java_home.exists() {
        return Err("Path does not exist".to_string());
    }

    if !java_home.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Check for java binary
    let java_bin = if cfg!(target_os = "windows") {
        java_home.join("bin").join("java.exe")
    } else {
        java_home.join("bin").join("java")
    };

    // Also check Contents/Home on macOS
    let java_bin_macos = java_home.join("Contents/Home/bin/java");

    let actual_path = if java_bin_macos.exists() {
        java_home.join("Contents/Home")
    } else if java_bin.exists() {
        java_home.clone()
    } else {
        return Err("Invalid Java installation: no java binary found in bin directory".to_string());
    };

    // Verify the binary again for actual_path
    let final_java_bin = if cfg!(target_os = "windows") {
        actual_path.join("bin").join("java.exe")
    } else {
        actual_path.join("bin").join("java")
    };

    if !final_java_bin.exists() {
        return Err("Invalid Java installation: no java binary found".to_string());
    }

    // Get current JAVA_HOME to check if this is the current version
    let platform = crate::platform::current_platform();
    let current_java_home = platform.get_java_home().ok();
    let is_current = current_java_home
        .as_ref()
        .map(|h| h == &actual_path)
        .unwrap_or(false);

    // Parse version info
    if let Some(version_info) = parse_java_version(&actual_path) {
        Ok(JavaVersion {
            version: version_info.0,
            vendor: version_info.1,
            path: actual_path.to_string_lossy().to_string(),
            is_default: false,
            is_current,
            full_version: version_info.2,
        })
    } else {
        // If we can't parse version, try running java -version
        let output = Command::new(&final_java_bin)
            .args(["-version"])
            .output()
            .map_err(|e| format!("Failed to execute java -version: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stderr);
        let mut version = String::from("Unknown");
        let mut vendor = String::from("Unknown");

        for line in output_str.lines() {
            if line.contains("version") {
                if let Some(start) = line.find('"') {
                    if let Some(end) = line[start + 1..].find('"') {
                        let full_ver = &line[start + 1..start + 1 + end];
                        version = extract_java_major_version(full_ver);
                    }
                }
            }
            if line.contains("OpenJDK") {
                vendor = "OpenJDK".to_string();
            } else if line.contains("HotSpot") || line.contains("Oracle") {
                vendor = "Oracle".to_string();
            } else if line.contains("Temurin") || line.contains("Adoptium") {
                vendor = "Eclipse Adoptium".to_string();
            } else if line.contains("Zulu") {
                vendor = "Azul Zulu".to_string();
            } else if line.contains("Corretto") {
                vendor = "Amazon Corretto".to_string();
            }
        }

        Ok(JavaVersion {
            version,
            vendor,
            path: actual_path.to_string_lossy().to_string(),
            is_default: false,
            is_current,
            full_version: None,
        })
    }
}

/// Validate a Node installation at the given path and return version info if valid
/// This allows users to manually add Node installations not detected by version managers
#[command]
pub async fn validate_node_path(path: String) -> Result<NodeVersion, String> {
    let node_path = PathBuf::from(&path);

    // Check if path exists
    if !node_path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !node_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Check for node binary in various locations
    let node_bin = if cfg!(target_os = "windows") {
        node_path.join("node.exe")
    } else {
        node_path.join("bin").join("node")
    };

    // Also check directly in the directory (some setups)
    let node_bin_direct = if cfg!(target_os = "windows") {
        node_path.join("node.exe")
    } else {
        node_path.join("node")
    };

    let final_node_bin = if node_bin.exists() {
        node_bin
    } else if node_bin_direct.exists() {
        node_bin_direct
    } else {
        return Err("Invalid Node installation: no node binary found".to_string());
    };

    // Get version by running node --version
    let output = Command::new(&final_node_bin)
        .args(["--version"])
        .output()
        .map_err(|e| format!("Failed to execute node --version: {}", e))?;

    if !output.status.success() {
        return Err("Failed to get Node version".to_string());
    }

    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Get current node version to check if this is current
    let current = get_current_node_version().await.ok().flatten();
    let is_current = current
        .as_ref()
        .map(|c| c == &version)
        .unwrap_or(false);

    Ok(NodeVersion {
        version,
        path: node_path.to_string_lossy().to_string(),
        is_default: false,
        is_current,
    })
}

/// Scan a custom directory for Java installations
/// Returns all valid Java installations found in the directory and its subdirectories
#[command]
pub async fn scan_java_in_path(path: String) -> Result<Vec<JavaVersion>, String> {
    let base_path = PathBuf::from(&path);

    if !base_path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !base_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Use our managed symlink target for is_current detection
    let current_symlink_target = get_current_java_symlink_target();
    let mut versions = Vec::new();

    // Recursive scan function
    fn scan_java_dir(
        dir: &PathBuf,
        current_symlink_target: &Option<PathBuf>,
        versions: &mut Vec<JavaVersion>,
        depth: usize,
        max_depth: usize,
    ) {
        if depth > max_depth {
            return;
        }

        // Check if this directory is a valid Java installation
        let java_bin = if cfg!(target_os = "windows") {
            dir.join("bin").join("java.exe")
        } else {
            dir.join("bin").join("java")
        };

        let java_bin_macos = dir.join("Contents/Home/bin/java");

        if java_bin.exists() || java_bin_macos.exists() {
            let actual_path = if java_bin_macos.exists() {
                dir.join("Contents/Home")
            } else {
                dir.clone()
            };

            if let Some(version_info) = parse_java_version(&actual_path) {
                let is_current = current_symlink_target
                    .as_ref()
                    .map(|target| target == &actual_path)
                    .unwrap_or(false);

                versions.push(JavaVersion {
                    version: version_info.0,
                    vendor: version_info.1,
                    path: actual_path.to_string_lossy().to_string(),
                    is_default: false,
                    is_current,
                    full_version: version_info.2,
                });
            }
            // Don't scan subdirectories of a valid Java installation
            return;
        }

        // Scan subdirectories
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    scan_java_dir(&path, current_symlink_target, versions, depth + 1, max_depth);
                }
            }
        }
    }

    scan_java_dir(&base_path, &current_symlink_target, &mut versions, 0, 2);

    // Deduplicate by path
    versions.sort_by(|a, b| a.path.cmp(&b.path));
    versions.dedup_by(|a, b| a.path == b.path);

    // Sort by version
    versions.sort_by(|a, b| b.version.cmp(&a.version));

    Ok(versions)
}

/// Scan a custom directory for Node installations
/// Returns all valid Node installations found in the directory and its subdirectories
#[command]
pub async fn scan_node_in_path(path: String) -> Result<Vec<NodeVersion>, String> {
    let base_path = PathBuf::from(&path);

    if !base_path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !base_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Use our managed symlink target for is_current detection
    let current_symlink_target = get_current_node_symlink_target();
    let mut versions = Vec::new();

    // Helper to check if a directory is a valid Node installation
    fn check_node_installation(path: &PathBuf, current_symlink_target: &Option<PathBuf>) -> Option<NodeVersion> {
        let node_bin = if cfg!(target_os = "windows") {
            path.join("node.exe")
        } else {
            path.join("bin").join("node")
        };

        let node_bin_direct = if cfg!(target_os = "windows") {
            path.join("node.exe")
        } else {
            path.join("node")
        };

        let final_bin = if node_bin.exists() {
            node_bin
        } else if node_bin_direct.exists() {
            node_bin_direct
        } else {
            return None;
        };

        // Get version
        let output = Command::new(&final_bin)
            .args(["--version"])
            .output()
            .ok()?;

        if !output.status.success() {
            return None;
        }

        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let is_current = current_symlink_target
            .as_ref()
            .map(|target| target == path)
            .unwrap_or(false);

        Some(NodeVersion {
            version,
            path: path.to_string_lossy().to_string(),
            is_default: false,
            is_current,
        })
    }

    // Check the base path itself
    if let Some(v) = check_node_installation(&base_path, &current_symlink_target) {
        versions.push(v);
    }

    // Scan subdirectories (max depth 2)
    fn scan_dir(
        dir: &PathBuf,
        current_symlink_target: &Option<PathBuf>,
        versions: &mut Vec<NodeVersion>,
        depth: usize,
        max_depth: usize,
    ) {
        if depth > max_depth {
            return;
        }

        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Check for node binary
                    let node_bin = if cfg!(target_os = "windows") {
                        path.join("node.exe")
                    } else {
                        path.join("bin").join("node")
                    };

                    let node_bin_direct = if cfg!(target_os = "windows") {
                        path.join("node.exe")
                    } else {
                        path.join("node")
                    };

                    if node_bin.exists() || node_bin_direct.exists() {
                        let final_bin = if node_bin.exists() { node_bin } else { node_bin_direct };
                        if let Ok(output) = Command::new(&final_bin).args(["--version"]).output() {
                            if output.status.success() {
                                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                                let is_current = current_symlink_target
                                    .as_ref()
                                    .map(|target| target == &path)
                                    .unwrap_or(false);
                                versions.push(NodeVersion {
                                    version,
                                    path: path.to_string_lossy().to_string(),
                                    is_default: false,
                                    is_current,
                                });
                            }
                        }
                    } else {
                        // Continue scanning subdirectories
                        scan_dir(&path, current_symlink_target, versions, depth + 1, max_depth);
                    }
                }
            }
        }
    }

    scan_dir(&base_path, &current_symlink_target, &mut versions, 0, 2);

    // Deduplicate by path
    versions.sort_by(|a, b| a.path.cmp(&b.path));
    versions.dedup_by(|a, b| a.path == b.path);

    // Sort by version (newest first)
    versions.sort_by(|a, b| compare_versions(&b.version, &a.version));

    Ok(versions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_java_major_version() {
        assert_eq!(extract_java_major_version("17.0.1"), "17");
        assert_eq!(extract_java_major_version("1.8.0_301"), "8");
        assert_eq!(extract_java_major_version("11"), "11");
        assert_eq!(extract_java_major_version("21.0.1"), "21");
    }

    #[test]
    fn test_compare_versions() {
        assert_eq!(
            compare_versions("v18.17.0", "v16.14.0"),
            std::cmp::Ordering::Greater
        );
        assert_eq!(
            compare_versions("v16.14.0", "v18.17.0"),
            std::cmp::Ordering::Less
        );
        assert_eq!(
            compare_versions("v18.17.0", "v18.17.0"),
            std::cmp::Ordering::Equal
        );
    }

    #[test]
    fn test_extract_version_from_path() {
        assert_eq!(
            extract_version_from_path("jdk-17.0.1"),
            Some("17.0.1".to_string())
        );
        assert_eq!(
            extract_version_from_path("temurin-11.0.16"),
            Some("11.0.16".to_string())
        );
        assert_eq!(
            extract_version_from_path("zulu17.30.15"),
            Some("17.30.15".to_string())
        );
    }
}
