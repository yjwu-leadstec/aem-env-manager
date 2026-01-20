// AEM License Management Commands
// Handles AEM license file management and validation

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::command;

use crate::platform::PlatformOps;

// ============================================
// Data Types
// ============================================

/// AEM License information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AemLicense {
    pub id: String,
    pub name: String,
    pub license_key: Option<String>,
    pub license_file_path: Option<String>,
    pub product_name: String,
    pub product_version: Option<String>,
    pub customer_name: Option<String>,
    pub expiry_date: Option<String>,
    pub status: LicenseStatus,
    pub associated_instance_id: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LicenseStatus {
    Valid,
    Expired,
    Expiring,  // Within 30 days of expiry
    Invalid,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseValidationResult {
    pub is_valid: bool,
    pub status: LicenseStatus,
    pub days_until_expiry: Option<i64>,
    pub message: Option<String>,
}

// ============================================
// Storage Helpers
// ============================================

fn get_licenses_file() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_data_dir().join("aem_licenses.json")
}

fn load_licenses() -> Result<Vec<AemLicense>, String> {
    let file_path = get_licenses_file();
    if !file_path.exists() {
        return Ok(vec![]);
    }

    let content =
        std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to read licenses: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse licenses: {}", e))
}

fn save_licenses(licenses: &[AemLicense]) -> Result<(), String> {
    let file_path = get_licenses_file();

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create data directory: {}", e))?;
        }
    }

    let content =
        serde_json::to_string_pretty(licenses).map_err(|e| format!("Failed to serialize licenses: {}", e))?;

    std::fs::write(&file_path, content).map_err(|e| format!("Failed to write licenses: {}", e))
}

// ============================================
// License CRUD Operations
// ============================================

/// List all AEM licenses
#[command]
pub async fn list_aem_licenses() -> Result<Vec<AemLicense>, String> {
    let mut licenses = load_licenses()?;

    // Update status for each license based on expiry date
    for license in &mut licenses {
        update_license_status(license);
    }

    Ok(licenses)
}

/// Get a specific license by ID
#[command]
pub async fn get_aem_license(id: String) -> Result<Option<AemLicense>, String> {
    let licenses = load_licenses()?;
    let mut license = licenses.into_iter().find(|l| l.id == id);

    if let Some(ref mut l) = license {
        update_license_status(l);
    }

    Ok(license)
}

/// Add a new AEM license
#[command]
pub async fn add_aem_license(mut license: AemLicense) -> Result<AemLicense, String> {
    let mut licenses = load_licenses()?;

    // Generate ID if not provided
    if license.id.is_empty() {
        license.id = uuid::Uuid::new_v4().to_string();
    }

    // Check for duplicate ID
    if licenses.iter().any(|l| l.id == license.id) {
        return Err(format!("License with ID {} already exists", license.id));
    }

    // Set timestamps
    let now = chrono::Utc::now().to_rfc3339();
    license.created_at = now.clone();
    license.updated_at = now;

    // Update status
    update_license_status(&mut license);

    licenses.push(license.clone());
    save_licenses(&licenses)?;

    Ok(license)
}

/// Update an existing license
#[command]
pub async fn update_aem_license(id: String, mut license: AemLicense) -> Result<AemLicense, String> {
    let mut licenses = load_licenses()?;

    let index = licenses
        .iter()
        .position(|l| l.id == id)
        .ok_or_else(|| format!("License {} not found", id))?;

    // Preserve original ID and created_at
    license.id = id;
    license.created_at = licenses[index].created_at.clone();
    license.updated_at = chrono::Utc::now().to_rfc3339();

    // Update status
    update_license_status(&mut license);

    licenses[index] = license.clone();
    save_licenses(&licenses)?;

    Ok(license)
}

/// Delete a license
#[command]
pub async fn delete_aem_license(id: String) -> Result<bool, String> {
    let mut licenses = load_licenses()?;
    let initial_len = licenses.len();

    licenses.retain(|l| l.id != id);

    if licenses.len() == initial_len {
        return Err(format!("License {} not found", id));
    }

    save_licenses(&licenses)?;
    Ok(true)
}

// ============================================
// License Validation
// ============================================

/// Validate a license
#[command]
pub async fn validate_aem_license(id: String) -> Result<LicenseValidationResult, String> {
    let licenses = load_licenses()?;
    let license = licenses
        .iter()
        .find(|l| l.id == id)
        .ok_or_else(|| format!("License {} not found", id))?;

    let (status, days_until_expiry) = calculate_license_status(license);

    let message = match status {
        LicenseStatus::Valid => Some("License is valid".to_string()),
        LicenseStatus::Expired => Some("License has expired".to_string()),
        LicenseStatus::Expiring => Some(format!("License will expire in {} days", days_until_expiry.unwrap_or(0))),
        LicenseStatus::Invalid => Some("License is invalid".to_string()),
        LicenseStatus::Unknown => Some("License status unknown".to_string()),
    };

    Ok(LicenseValidationResult {
        is_valid: status == LicenseStatus::Valid || status == LicenseStatus::Expiring,
        status,
        days_until_expiry,
        message,
    })
}

/// Check if license file exists
#[command]
pub async fn check_license_file(path: String) -> Result<bool, String> {
    let file_path = PathBuf::from(&path);
    Ok(file_path.exists() && file_path.is_file())
}

/// Read license file content
#[command]
pub async fn read_license_file(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err("License file not found".to_string());
    }

    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read license file: {}", e))
}

/// Parsed license properties from a license.properties file
#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedLicenseProperties {
    pub license_key: Option<String>,
    pub product_name: Option<String>,
    pub product_version: Option<String>,
    pub customer_name: Option<String>,
    pub expiry_date: Option<String>,
    pub download_id: Option<String>,
    /// All raw properties from the file
    pub raw_properties: std::collections::HashMap<String, String>,
}

/// Parse a license.properties file and extract license information
/// Common properties in AEM license.properties:
/// - license.downloadID
/// - license.product.name
/// - license.product.version.major
/// - license.customer.name
/// - license.key (or license entries like license.1, license.2, etc.)
#[command]
pub async fn parse_license_file(path: String) -> Result<ParsedLicenseProperties, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err("License file not found".to_string());
    }

    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read license file: {}", e))?;

    // Parse properties file
    let mut raw_properties = std::collections::HashMap::new();
    let mut license_parts = Vec::new();

    for line in content.lines() {
        let line = line.trim();

        // Skip comments and empty lines
        if line.is_empty() || line.starts_with('#') || line.starts_with('!') {
            continue;
        }

        // Parse key=value or key:value
        if let Some(eq_pos) = line.find('=').or_else(|| line.find(':')) {
            let key = line[..eq_pos].trim().to_string();
            let value = line[eq_pos + 1..].trim().to_string();

            // Collect license key parts (license.1, license.2, etc.)
            if key.starts_with("license.") && key[8..].chars().all(|c| c.is_ascii_digit()) {
                license_parts.push((key.clone(), value.clone()));
            }

            raw_properties.insert(key, value);
        }
    }

    // Extract standard fields
    let product_name = raw_properties.get("license.product.name")
        .or_else(|| raw_properties.get("product.name"))
        .cloned();

    let product_version = raw_properties.get("license.product.version.major")
        .or_else(|| raw_properties.get("license.product.version"))
        .or_else(|| raw_properties.get("product.version"))
        .cloned();

    let customer_name = raw_properties.get("license.customer.name")
        .or_else(|| raw_properties.get("customer.name"))
        .cloned();

    let download_id = raw_properties.get("license.downloadID")
        .or_else(|| raw_properties.get("downloadID"))
        .cloned();

    // Construct license key from parts or get directly
    let license_key = if !license_parts.is_empty() {
        // Sort by key name (license.1, license.2, etc.)
        let mut sorted_parts = license_parts;
        sorted_parts.sort_by(|a, b| {
            let num_a: i32 = a.0[8..].parse().unwrap_or(0);
            let num_b: i32 = b.0[8..].parse().unwrap_or(0);
            num_a.cmp(&num_b)
        });
        Some(sorted_parts.into_iter().map(|(_, v)| v).collect::<Vec<_>>().join("-"))
    } else {
        raw_properties.get("license.key")
            .or_else(|| raw_properties.get("license"))
            .cloned()
    };

    // Try to extract expiry date (not always present in license files)
    let expiry_date = raw_properties.get("license.expiry")
        .or_else(|| raw_properties.get("expiry.date"))
        .or_else(|| raw_properties.get("expiryDate"))
        .cloned();

    Ok(ParsedLicenseProperties {
        license_key,
        product_name,
        product_version,
        customer_name,
        expiry_date,
        download_id,
        raw_properties,
    })
}

// ============================================
// License File Scanning
// ============================================

/// Scanned license file information
#[derive(Debug, Serialize, Deserialize)]
pub struct ScannedLicenseFile {
    pub path: String,
    pub name: String,
    pub product_name: Option<String>,
    pub customer_name: Option<String>,
    pub download_id: Option<String>,
    pub parent_directory: String,
}

/// Scan a directory for license.properties files
/// Searches recursively up to max_depth levels
#[command]
pub async fn scan_license_files(search_path: String) -> Result<Vec<ScannedLicenseFile>, String> {
    let base_path = PathBuf::from(&search_path);

    if !base_path.exists() {
        return Err(format!("Path does not exist: {}", search_path));
    }

    let mut found_files = Vec::new();
    let mut checked_paths = std::collections::HashSet::new();

    // Helper function to check if a file is a license file
    fn is_license_file(filename: &str) -> bool {
        let lower = filename.to_lowercase();
        lower == "license.properties" ||
        lower.starts_with("license") && lower.ends_with(".properties")
    }

    // Helper function to scan a directory recursively
    fn scan_directory(
        dir: &PathBuf,
        found_files: &mut Vec<ScannedLicenseFile>,
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

                if path.is_file() && is_license_file(&filename) {
                    let path_str = path.to_string_lossy().to_string();
                    if checked_paths.insert(path_str.clone()) {
                        // Try to parse the license file to get more info
                        let (product_name, customer_name, download_id) =
                            if let Ok(content) = std::fs::read_to_string(&path) {
                                parse_license_content(&content)
                            } else {
                                (None, None, None)
                            };

                        let parent_directory = path.parent()
                            .map(|p| p.file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_else(|| p.to_string_lossy().to_string()))
                            .unwrap_or_default();

                        found_files.push(ScannedLicenseFile {
                            path: path_str,
                            name: filename,
                            product_name,
                            customer_name,
                            download_id,
                            parent_directory,
                        });
                    }
                } else if path.is_dir() {
                    let dir_name = filename.to_lowercase();
                    // Skip common non-relevant directories
                    if !dir_name.starts_with('.') &&
                       dir_name != "node_modules" &&
                       dir_name != "target" &&
                       dir_name != "build" {
                        scan_directory(&path, found_files, checked_paths, depth + 1, max_depth);
                    }
                }
            }
        }
    }

    // Parse license content to extract key fields
    fn parse_license_content(content: &str) -> (Option<String>, Option<String>, Option<String>) {
        let mut product_name = None;
        let mut customer_name = None;
        let mut download_id = None;

        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') || line.starts_with('!') {
                continue;
            }

            if let Some(eq_pos) = line.find('=').or_else(|| line.find(':')) {
                let key = line[..eq_pos].trim();
                let value = line[eq_pos + 1..].trim();

                match key {
                    "license.product.name" | "product.name" => {
                        product_name = Some(value.to_string());
                    }
                    "license.customer.name" | "customer.name" => {
                        customer_name = Some(value.to_string());
                    }
                    "license.downloadID" | "downloadID" => {
                        download_id = Some(value.to_string());
                    }
                    _ => {}
                }
            }
        }

        (product_name, customer_name, download_id)
    }

    // Start scanning from base path with max depth of 5
    scan_directory(&base_path, &mut found_files, &mut checked_paths, 0, 5);

    Ok(found_files)
}

/// Scan default AEM installation directories for license files
#[command]
pub async fn scan_default_license_locations() -> Result<Vec<ScannedLicenseFile>, String> {
    let mut all_files = Vec::new();

    // Common AEM installation paths
    let mut search_paths = Vec::new();

    if let Some(home) = dirs::home_dir() {
        // Common macOS/Linux locations
        search_paths.push(home.join("aem"));
        search_paths.push(home.join("AEM"));
        search_paths.push(home.join("Adobe"));
        search_paths.push(home.join("cq"));
        search_paths.push(home.join("crx"));
        search_paths.push(home.join("Development/AEM"));
        search_paths.push(home.join("dev/aem"));
    }

    // Check /opt on Unix systems
    #[cfg(target_os = "macos")]
    {
        search_paths.push(PathBuf::from("/opt/aem"));
        search_paths.push(PathBuf::from("/opt/Adobe"));
        search_paths.push(PathBuf::from("/Applications/Adobe"));
    }

    #[cfg(target_os = "linux")]
    {
        search_paths.push(PathBuf::from("/opt/aem"));
        search_paths.push(PathBuf::from("/opt/Adobe"));
    }

    #[cfg(target_os = "windows")]
    {
        search_paths.push(PathBuf::from("C:\\Adobe"));
        search_paths.push(PathBuf::from("C:\\AEM"));
        search_paths.push(PathBuf::from("C:\\Program Files\\Adobe"));
    }

    for path in search_paths {
        if path.exists() {
            if let Ok(files) = scan_license_files(path.to_string_lossy().to_string()).await {
                all_files.extend(files);
            }
        }
    }

    Ok(all_files)
}

// ============================================
// License Association
// ============================================

/// Associate a license with an AEM instance
#[command]
pub async fn associate_license_with_instance(
    license_id: String,
    instance_id: String,
) -> Result<AemLicense, String> {
    let mut licenses = load_licenses()?;

    let license = licenses
        .iter_mut()
        .find(|l| l.id == license_id)
        .ok_or_else(|| format!("License {} not found", license_id))?;

    // Verify instance exists
    let instance = crate::commands::instance::get_instance(instance_id.clone()).await?;
    if instance.is_none() {
        return Err(format!("Instance {} not found", instance_id));
    }

    license.associated_instance_id = Some(instance_id);
    license.updated_at = chrono::Utc::now().to_rfc3339();

    let result = license.clone();
    save_licenses(&licenses)?;

    Ok(result)
}

/// Get licenses for a specific instance
#[command]
pub async fn get_licenses_for_instance(instance_id: String) -> Result<Vec<AemLicense>, String> {
    let licenses = load_licenses()?;
    Ok(licenses
        .into_iter()
        .filter(|l| l.associated_instance_id.as_ref() == Some(&instance_id))
        .collect())
}

/// Import license from a license.properties file and associate with an instance
/// This automatically parses the license file and creates a license record
#[command]
pub async fn import_license_from_file(
    file_path: String,
    instance_id: String,
    instance_name: String,
) -> Result<AemLicense, String> {
    // Parse the license file
    let parsed = parse_license_file(file_path.clone()).await?;

    // Create a license record
    let license = AemLicense {
        id: uuid::Uuid::new_v4().to_string(),
        name: format!("{} License", instance_name),
        license_key: parsed.license_key,
        license_file_path: Some(file_path),
        product_name: parsed.product_name.unwrap_or_else(|| "AEM".to_string()),
        product_version: parsed.product_version,
        customer_name: parsed.customer_name,
        expiry_date: parsed.expiry_date,
        status: LicenseStatus::Unknown,
        associated_instance_id: Some(instance_id),
        notes: parsed.download_id.map(|id| format!("Download ID: {}", id)),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    // Add the license
    add_aem_license(license).await
}

// ============================================
// Helper Functions
// ============================================

fn update_license_status(license: &mut AemLicense) {
    let (status, _) = calculate_license_status(license);
    license.status = status;
}

fn calculate_license_status(license: &AemLicense) -> (LicenseStatus, Option<i64>) {
    // If no expiry date, check if license file exists
    if license.expiry_date.is_none() {
        if let Some(ref path) = license.license_file_path {
            if PathBuf::from(path).exists() {
                return (LicenseStatus::Valid, None);
            }
        }
        return (LicenseStatus::Unknown, None);
    }

    // Parse expiry date
    let expiry = match &license.expiry_date {
        Some(date_str) => {
            match chrono::DateTime::parse_from_rfc3339(date_str) {
                Ok(dt) => dt.with_timezone(&chrono::Utc),
                Err(_) => {
                    // Try parsing as date only (YYYY-MM-DD)
                    match chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                        Ok(date) => {
                            let datetime = date.and_hms_opt(23, 59, 59).unwrap();
                            chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(datetime, chrono::Utc)
                        }
                        Err(_) => return (LicenseStatus::Invalid, None),
                    }
                }
            }
        }
        None => return (LicenseStatus::Unknown, None),
    };

    let now = chrono::Utc::now();
    let duration = expiry.signed_duration_since(now);
    let days = duration.num_days();

    if days < 0 {
        (LicenseStatus::Expired, Some(days))
    } else if days <= 30 {
        (LicenseStatus::Expiring, Some(days))
    } else {
        (LicenseStatus::Valid, Some(days))
    }
}

// ============================================
// License Statistics
// ============================================

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatistics {
    pub total: usize,
    pub valid: usize,
    pub expiring: usize,
    pub expired: usize,
    pub unknown: usize,
}

/// Get license statistics
#[command]
pub async fn get_license_statistics() -> Result<LicenseStatistics, String> {
    let licenses = load_licenses()?;

    let mut stats = LicenseStatistics {
        total: licenses.len(),
        valid: 0,
        expiring: 0,
        expired: 0,
        unknown: 0,
    };

    for license in &licenses {
        let (status, _) = calculate_license_status(license);
        match status {
            LicenseStatus::Valid => stats.valid += 1,
            LicenseStatus::Expiring => stats.expiring += 1,
            LicenseStatus::Expired => stats.expired += 1,
            LicenseStatus::Invalid | LicenseStatus::Unknown => stats.unknown += 1,
        }
    }

    Ok(stats)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_license_status_calculation() {
        let mut license = AemLicense {
            id: "test".to_string(),
            name: "Test License".to_string(),
            license_key: None,
            license_file_path: None,
            product_name: "AEM".to_string(),
            product_version: None,
            customer_name: None,
            expiry_date: Some("2099-12-31".to_string()),
            status: LicenseStatus::Unknown,
            associated_instance_id: None,
            notes: None,
            created_at: String::new(),
            updated_at: String::new(),
        };

        let (status, days) = calculate_license_status(&license);
        assert_eq!(status, LicenseStatus::Valid);
        assert!(days.unwrap() > 0);

        // Test expired license
        license.expiry_date = Some("2020-01-01".to_string());
        let (status, days) = calculate_license_status(&license);
        assert_eq!(status, LicenseStatus::Expired);
        assert!(days.unwrap() < 0);
    }
}
