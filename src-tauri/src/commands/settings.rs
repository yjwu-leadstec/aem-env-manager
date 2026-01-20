// Settings Management Commands
// Provides configuration, export/import, and reset functionality

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::command;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

use crate::platform::PlatformOps;

// ============================================
// Data Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanPaths {
    pub java_paths: Vec<String>,
    pub node_paths: Vec<String>,
    pub maven_home: String,
    pub maven_repository: String,
    pub aem_base_dir: String,
    pub logs_dir: String,
}

impl Default for ScanPaths {
    fn default() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/"));

        Self {
            java_paths: vec![
                "/usr/lib/jvm".to_string(),
                "/opt/java".to_string(),
                home.join(".sdkman/candidates/java").to_string_lossy().to_string(),
            ],
            node_paths: vec![
                home.join(".nvm/versions/node").to_string_lossy().to_string(),
                home.join(".fnm/node-versions").to_string_lossy().to_string(),
            ],
            maven_home: home.join(".m2").to_string_lossy().to_string(),
            maven_repository: home.join(".m2/repository").to_string_lossy().to_string(),
            aem_base_dir: String::new(),
            logs_dir: String::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub profiles_count: usize,
    pub instances_count: usize,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub success: bool,
    pub profiles_imported: usize,
    pub instances_imported: usize,
    pub configs_imported: bool,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetResult {
    pub success: bool,
    pub profiles_deleted: usize,
    pub instances_deleted: usize,
    pub configs_reset: bool,
    pub error: Option<String>,
}

// ============================================
// Storage Helpers
// ============================================

fn get_scan_paths_file() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_config_dir().join("scan_paths.json")
}

fn get_data_dir() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_data_dir()
}

fn get_config_dir() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_config_dir()
}

// ============================================
// Scan Paths Management
// ============================================

/// Load scan paths configuration
#[command]
pub async fn load_scan_paths() -> Result<ScanPaths, String> {
    let file_path = get_scan_paths_file();

    if !file_path.exists() {
        return Ok(ScanPaths::default());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read scan paths: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse scan paths: {}", e))
}

/// Save scan paths configuration
#[command]
pub async fn save_scan_paths(paths: ScanPaths) -> Result<(), String> {
    let file_path = get_scan_paths_file();

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
    }

    let content = serde_json::to_string_pretty(&paths)
        .map_err(|e| format!("Failed to serialize scan paths: {}", e))?;

    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write scan paths: {}", e))
}

// ============================================
// Export/Import Configuration
// ============================================

/// Export all configuration to a ZIP file
#[command]
pub async fn export_all_config(export_path: String) -> Result<ExportResult, String> {
    let export_path = PathBuf::from(export_path);
    let data_dir = get_data_dir();
    let config_dir = get_config_dir();

    // Create the ZIP file
    let file = fs::File::create(&export_path)
        .map_err(|e| format!("Failed to create export file: {}", e))?;

    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let mut profiles_count = 0;
    let mut instances_count = 0;

    // Export profiles
    let profiles_dir = data_dir.join("profiles");
    if profiles_dir.exists() {
        for entry in WalkDir::new(&profiles_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map(|ext| ext == "json").unwrap_or(false))
        {
            let path = entry.path();
            let name = format!("profiles/{}", path.file_name().unwrap().to_string_lossy());

            zip.start_file(&name, options)
                .map_err(|e| format!("Failed to add profile to zip: {}", e))?;

            let content = fs::read(path)
                .map_err(|e| format!("Failed to read profile: {}", e))?;

            zip.write_all(&content)
                .map_err(|e| format!("Failed to write profile to zip: {}", e))?;

            profiles_count += 1;
        }
    }

    // Export instances
    let instances_dir = data_dir.join("instances");
    if instances_dir.exists() {
        for entry in WalkDir::new(&instances_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map(|ext| ext == "json").unwrap_or(false))
        {
            let path = entry.path();
            let name = format!("instances/{}", path.file_name().unwrap().to_string_lossy());

            zip.start_file(&name, options)
                .map_err(|e| format!("Failed to add instance to zip: {}", e))?;

            let content = fs::read(path)
                .map_err(|e| format!("Failed to read instance: {}", e))?;

            zip.write_all(&content)
                .map_err(|e| format!("Failed to write instance to zip: {}", e))?;

            instances_count += 1;
        }
    }

    // Export config files
    for config_name in ["config.json", "scan_paths.json"] {
        let config_path = config_dir.join(config_name);
        if config_path.exists() {
            zip.start_file(format!("config/{}", config_name), options)
                .map_err(|e| format!("Failed to add config to zip: {}", e))?;

            let content = fs::read(&config_path)
                .map_err(|e| format!("Failed to read config: {}", e))?;

            zip.write_all(&content)
                .map_err(|e| format!("Failed to write config to zip: {}", e))?;
        }
    }

    // Export maven configs
    let maven_dir = data_dir.join("maven");
    if maven_dir.exists() {
        for entry in WalkDir::new(&maven_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            let path = entry.path();
            let rel_path = path.strip_prefix(&maven_dir).unwrap();
            let name = format!("maven/{}", rel_path.to_string_lossy());

            zip.start_file(&name, options)
                .map_err(|e| format!("Failed to add maven config to zip: {}", e))?;

            let content = fs::read(path)
                .map_err(|e| format!("Failed to read maven config: {}", e))?;

            zip.write_all(&content)
                .map_err(|e| format!("Failed to write maven config to zip: {}", e))?;
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;

    Ok(ExportResult {
        success: true,
        file_path: Some(export_path.to_string_lossy().to_string()),
        profiles_count,
        instances_count,
        error: None,
    })
}

/// Import configuration from a ZIP file
#[command]
pub async fn import_all_config(import_path: String) -> Result<ImportResult, String> {
    let import_path = PathBuf::from(import_path);
    let data_dir = get_data_dir();
    let config_dir = get_config_dir();

    let file = fs::File::open(&import_path)
        .map_err(|e| format!("Failed to open import file: {}", e))?;

    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    let mut profiles_imported = 0;
    let mut instances_imported = 0;
    let mut configs_imported = false;
    let mut errors = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {}", e))?;

        let name = file.name().to_string();

        // Determine destination
        let dest_path = if name.starts_with("profiles/") {
            profiles_imported += 1;
            data_dir.join(&name)
        } else if name.starts_with("instances/") {
            instances_imported += 1;
            data_dir.join(&name)
        } else if name.starts_with("config/") {
            configs_imported = true;
            config_dir.join(name.trim_start_matches("config/"))
        } else if name.starts_with("maven/") {
            data_dir.join(&name)
        } else {
            continue;
        };

        // Ensure parent directory exists
        if let Some(parent) = dest_path.parent() {
            if !parent.exists() {
                if let Err(e) = fs::create_dir_all(parent) {
                    errors.push(format!("Failed to create directory for {}: {}", name, e));
                    continue;
                }
            }
        }

        // Extract file
        let mut content = Vec::new();
        if let Err(e) = file.read_to_end(&mut content) {
            errors.push(format!("Failed to read {}: {}", name, e));
            continue;
        }

        if let Err(e) = fs::write(&dest_path, content) {
            errors.push(format!("Failed to write {}: {}", name, e));
        }
    }

    Ok(ImportResult {
        success: errors.is_empty(),
        profiles_imported,
        instances_imported,
        configs_imported,
        errors,
    })
}

// ============================================
// Reset Configuration
// ============================================

/// Reset all configuration to defaults
#[command]
pub async fn reset_all_config() -> Result<ResetResult, String> {
    let data_dir = get_data_dir();
    let config_dir = get_config_dir();

    let mut profiles_deleted = 0;
    let mut instances_deleted = 0;

    // Delete profiles
    let profiles_dir = data_dir.join("profiles");
    if profiles_dir.exists() {
        for entry in fs::read_dir(&profiles_dir)
            .map_err(|e| format!("Failed to read profiles directory: {}", e))?
        {
            if let Ok(entry) = entry {
                if entry.path().extension().map(|e| e == "json").unwrap_or(false) {
                    if fs::remove_file(entry.path()).is_ok() {
                        profiles_deleted += 1;
                    }
                }
            }
        }
    }

    // Delete instances
    let instances_dir = data_dir.join("instances");
    if instances_dir.exists() {
        for entry in fs::read_dir(&instances_dir)
            .map_err(|e| format!("Failed to read instances directory: {}", e))?
        {
            if let Ok(entry) = entry {
                if entry.path().extension().map(|e| e == "json").unwrap_or(false) {
                    if fs::remove_file(entry.path()).is_ok() {
                        instances_deleted += 1;
                    }
                }
            }
        }
    }

    // Reset config files
    let config_path = config_dir.join("config.json");
    if config_path.exists() {
        fs::remove_file(&config_path)
            .map_err(|e| format!("Failed to delete config file: {}", e))?;
    }

    let scan_paths_path = config_dir.join("scan_paths.json");
    if scan_paths_path.exists() {
        fs::remove_file(&scan_paths_path)
            .map_err(|e| format!("Failed to delete scan paths file: {}", e))?;
    }

    Ok(ResetResult {
        success: true,
        profiles_deleted,
        instances_deleted,
        configs_reset: true,
        error: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_scan_paths() {
        let paths = ScanPaths::default();
        assert!(!paths.java_paths.is_empty());
        assert!(!paths.node_paths.is_empty());
    }
}
