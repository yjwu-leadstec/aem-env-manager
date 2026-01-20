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
