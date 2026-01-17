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
}

// ============================================
// Java Version Management
// ============================================

/// Scan system for installed Java versions
#[command]
pub async fn scan_java_versions() -> Result<Vec<JavaVersion>, String> {
    let platform = crate::platform::current_platform();
    let scan_paths = platform.get_java_scan_paths();
    let current_java_home = platform.get_java_home().ok();
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
                            let is_current = current_java_home
                                .as_ref()
                                .map(|h| h == &actual_path)
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

/// Scan system for installed Node versions
#[command]
pub async fn scan_node_versions() -> Result<Vec<NodeVersion>, String> {
    let platform = crate::platform::current_platform();
    let scan_paths = platform.get_node_scan_paths();
    let current = get_current_node_version().await.ok().flatten();
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
                            let is_current = current
                                .as_ref()
                                .map(|c| c == &version || c.trim_start_matches('v') == version)
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
#[command]
pub async fn get_current_node_version() -> Result<Option<String>, String> {
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
    let previous = get_current_node_version().await.ok().flatten();

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

                configs.push(MavenConfig {
                    id: name.clone(),
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_active,
                    description: None,
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

/// Get current Maven settings
#[command]
pub async fn get_current_maven_config() -> Result<Option<MavenConfig>, String> {
    let m2_settings = dirs::home_dir()
        .map(|h| h.join(".m2").join("settings.xml"))
        .ok_or("Could not determine home directory")?;

    if m2_settings.exists() {
        Ok(Some(MavenConfig {
            id: "current".to_string(),
            name: "Current settings.xml".to_string(),
            path: m2_settings.to_string_lossy().to_string(),
            is_active: true,
            description: None,
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

    Ok(MavenConfig {
        id: name.clone(),
        name,
        path: target.to_string_lossy().to_string(),
        is_active: false,
        description: None,
    })
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
