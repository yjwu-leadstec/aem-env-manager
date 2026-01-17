use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::time::{Duration, Instant};
use tauri::command;

use crate::platform::PlatformOps;

// ============================================
// Data Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AemInstance {
    pub id: String,
    pub name: String,
    pub instance_type: AemInstanceType,
    pub host: String,
    pub port: u16,
    pub run_mode: AemRunMode,
    pub status: AemInstanceStatus,
    pub java_version: Option<String>,
    pub aem_version: Option<String>,
    pub path: Option<String>,
    pub username: Option<String>,
    pub password_key: Option<String>,
    pub last_health_check: Option<String>,
    pub startup_time: Option<u64>,
    pub jvm_args: Option<Vec<String>>,
    pub jar_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AemInstanceType {
    Author,
    Publish,
    Dispatcher,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AemRunMode {
    Local,
    Dev,
    Stage,
    Prod,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AemInstanceStatus {
    Running,
    Stopped,
    Starting,
    Stopping,
    Error,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResult {
    pub instance_id: String,
    pub timestamp: String,
    pub status: AemInstanceStatus,
    pub response_time: Option<u64>,
    pub bundle_status: Option<BundleStatus>,
    pub memory_status: Option<MemoryStatus>,
    pub aem_version: Option<String>,
    pub oak_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleStatus {
    pub total: u32,
    pub active: u32,
    pub resolved: u32,
    pub installed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStatus {
    pub heap_used: u64,
    pub heap_max: u64,
    pub heap_percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AemVersionInfo {
    pub product_name: String,
    pub product_version: String,
    pub oak_version: Option<String>,
    pub java_version: Option<String>,
}

// ============================================
// Storage Helpers
// ============================================

fn get_instances_file() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_data_dir().join("instances.json")
}

fn load_instances() -> Result<Vec<AemInstance>, String> {
    let file_path = get_instances_file();
    if !file_path.exists() {
        return Ok(vec![]);
    }

    let content =
        std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to read instances: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse instances: {}", e))
}

fn save_instances(instances: &[AemInstance]) -> Result<(), String> {
    let file_path = get_instances_file();

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create data directory: {}", e))?;
        }
    }

    let content =
        serde_json::to_string_pretty(instances).map_err(|e| format!("Failed to serialize instances: {}", e))?;

    std::fs::write(&file_path, content).map_err(|e| format!("Failed to write instances: {}", e))
}

// ============================================
// Instance CRUD Operations
// ============================================

/// List all AEM instances
#[command]
pub async fn list_instances() -> Result<Vec<AemInstance>, String> {
    load_instances()
}

/// Get a specific instance by ID
#[command]
pub async fn get_instance(id: String) -> Result<Option<AemInstance>, String> {
    let instances = load_instances()?;
    Ok(instances.into_iter().find(|i| i.id == id))
}

/// Add a new AEM instance
#[command]
pub async fn add_instance(mut instance: AemInstance) -> Result<AemInstance, String> {
    let mut instances = load_instances()?;

    // Generate ID if not provided
    if instance.id.is_empty() {
        instance.id = uuid::Uuid::new_v4().to_string();
    }

    // Check for duplicate ID
    if instances.iter().any(|i| i.id == instance.id) {
        return Err(format!("Instance with ID {} already exists", instance.id));
    }

    // Set initial status
    instance.status = AemInstanceStatus::Unknown;

    instances.push(instance.clone());
    save_instances(&instances)?;

    Ok(instance)
}

/// Update an existing instance
#[command]
pub async fn update_instance(id: String, mut instance: AemInstance) -> Result<AemInstance, String> {
    let mut instances = load_instances()?;

    let index = instances
        .iter()
        .position(|i| i.id == id)
        .ok_or_else(|| format!("Instance {} not found", id))?;

    // Preserve the original ID
    instance.id = id;
    instances[index] = instance.clone();
    save_instances(&instances)?;

    Ok(instance)
}

/// Delete an instance
#[command]
pub async fn delete_instance(id: String) -> Result<bool, String> {
    let mut instances = load_instances()?;
    let initial_len = instances.len();

    instances.retain(|i| i.id != id);

    if instances.len() == initial_len {
        return Err(format!("Instance {} not found", id));
    }

    save_instances(&instances)?;

    // Also clean up stored credentials
    let _ = delete_credentials(&id);

    Ok(true)
}

// ============================================
// Instance Lifecycle Management
// ============================================

/// Start an AEM instance
#[command]
pub async fn start_instance(id: String) -> Result<bool, String> {
    let mut instances = load_instances()?;

    let instance = instances
        .iter_mut()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Instance {} not found", id))?;

    // Check if already running
    if instance.status == AemInstanceStatus::Running {
        return Err("Instance is already running".to_string());
    }

    // Get jar path
    let jar_path = instance
        .jar_path
        .as_ref()
        .or(instance.path.as_ref())
        .ok_or("Instance path not configured")?;

    let jar_file = PathBuf::from(jar_path);

    // Try to find quickstart jar
    let quickstart_jar = if jar_file.is_dir() {
        find_quickstart_jar(&jar_file)?
    } else {
        jar_file.clone()
    };

    if !quickstart_jar.exists() {
        return Err(format!("Quickstart JAR not found: {}", quickstart_jar.display()));
    }

    // Build JVM arguments
    let mut jvm_args: Vec<String> = instance
        .jvm_args
        .clone()
        .unwrap_or_else(|| vec!["-Xmx1024m".to_string()]);

    // Add run mode
    let run_mode = match instance.run_mode {
        AemRunMode::Local => "local",
        AemRunMode::Dev => "dev",
        AemRunMode::Stage => "stage",
        AemRunMode::Prod => "prod",
    };

    let instance_type = match instance.instance_type {
        AemInstanceType::Author => "author",
        AemInstanceType::Publish => "publish",
        AemInstanceType::Dispatcher => "dispatcher",
    };

    jvm_args.push(format!("-Dsling.run.modes={},{}", instance_type, run_mode));
    jvm_args.push(format!("-Dhttp.port={}", instance.port));

    // Start the process
    let working_dir = quickstart_jar
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));

    let mut cmd = Command::new("java");
    cmd.args(&jvm_args)
        .arg("-jar")
        .arg(&quickstart_jar)
        .current_dir(&working_dir);

    // Set JAVA_HOME if specified
    if let Some(ref java_version) = instance.java_version {
        // Try to find the Java installation
        let versions = crate::commands::version::scan_java_versions().await?;
        if let Some(java) = versions.iter().find(|v| v.version == *java_version) {
            cmd.env("JAVA_HOME", &java.path);
        }
    }

    // Spawn the process
    cmd.spawn()
        .map_err(|e| format!("Failed to start AEM instance: {}", e))?;

    // Update status
    instance.status = AemInstanceStatus::Starting;
    save_instances(&instances)?;

    Ok(true)
}

/// Find the quickstart JAR in a directory
fn find_quickstart_jar(dir: &PathBuf) -> Result<PathBuf, String> {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap_or_default().to_string_lossy();

            if name.starts_with("aem-") && name.ends_with(".jar") {
                return Ok(path);
            }
            if name.starts_with("cq-") && name.ends_with(".jar") {
                return Ok(path);
            }
            if name.contains("quickstart") && name.ends_with(".jar") {
                return Ok(path);
            }
        }
    }

    Err("Quickstart JAR not found in directory".to_string())
}

/// Stop an AEM instance
#[command]
pub async fn stop_instance(id: String) -> Result<bool, String> {
    let mut instances = load_instances()?;

    let instance = instances
        .iter_mut()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Instance {} not found", id))?;

    // Try graceful shutdown via HTTP
    let stop_url = format!("http://{}:{}/system/console/vmstat?shutdown_type=Stop", instance.host, instance.port);

    // Get credentials
    let (username, password) = get_instance_credentials(&instance.id, &instance.username)?;

    // Try HTTP shutdown first
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let http_result = client
        .post(&stop_url)
        .basic_auth(&username, Some(&password))
        .send()
        .await;

    if http_result.is_ok() {
        instance.status = AemInstanceStatus::Stopping;
        save_instances(&instances)?;
        return Ok(true);
    }

    // Fall back to process kill
    let platform = crate::platform::current_platform();
    if let Some(pid) = platform.get_process_by_port(instance.port) {
        platform.kill_process(pid)?;
        instance.status = AemInstanceStatus::Stopped;
        save_instances(&instances)?;
        return Ok(true);
    }

    Err("Could not stop instance: no process found".to_string())
}

// ============================================
// Health Check and Monitoring
// ============================================

/// Perform health check on an instance
#[command]
pub async fn check_instance_health(id: String) -> Result<HealthCheckResult, String> {
    let mut instances = load_instances()?;

    let instance = instances
        .iter_mut()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Instance {} not found", id))?;

    let start_time = Instant::now();

    // Get credentials
    let (username, password) = get_instance_credentials(&instance.id, &instance.username)?;

    // Check if instance is reachable
    let base_url = format!("http://{}:{}", instance.host, instance.port);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    // Try system console bundles endpoint
    let bundles_url = format!("{}/system/console/bundles.json", base_url);
    let bundles_response = client
        .get(&bundles_url)
        .basic_auth(&username, Some(&password))
        .send()
        .await;

    let response_time = start_time.elapsed().as_millis() as u64;

    let (status, bundle_status, memory_status) = match bundles_response {
        Ok(resp) if resp.status().is_success() => {
            let bundles = parse_bundle_response(resp).await;
            let memory = fetch_memory_status(&client, &base_url, &username, &password).await;
            (AemInstanceStatus::Running, bundles, memory)
        }
        Ok(resp) if resp.status().as_u16() == 401 => {
            (AemInstanceStatus::Running, None, None) // Running but auth failed
        }
        _ => (AemInstanceStatus::Stopped, None, None),
    };

    // Get version info
    let version_info = if status == AemInstanceStatus::Running {
        fetch_version_info(&client, &base_url, &username, &password).await
    } else {
        None
    };

    // Update instance status
    instance.status = status.clone();
    instance.last_health_check = Some(chrono::Utc::now().to_rfc3339());
    if let Some(ref info) = version_info {
        instance.aem_version = Some(info.product_version.clone());
    }
    save_instances(&instances)?;

    Ok(HealthCheckResult {
        instance_id: id,
        timestamp: chrono::Utc::now().to_rfc3339(),
        status,
        response_time: Some(response_time),
        bundle_status,
        memory_status,
        aem_version: version_info.as_ref().map(|v| v.product_version.clone()),
        oak_version: version_info.and_then(|v| v.oak_version),
    })
}

/// Parse bundle response from AEM
async fn parse_bundle_response(response: reqwest::Response) -> Option<BundleStatus> {
    let json: serde_json::Value = response.json().await.ok()?;

    let bundles = json.get("data")?.as_array()?;

    let mut active = 0u32;
    let mut resolved = 0u32;
    let mut installed = 0u32;

    for bundle in bundles {
        match bundle.get("state")?.as_str()? {
            "Active" => active += 1,
            "Resolved" => resolved += 1,
            "Installed" => installed += 1,
            _ => {}
        }
    }

    Some(BundleStatus {
        total: bundles.len() as u32,
        active,
        resolved,
        installed,
    })
}

/// Fetch memory status from AEM
async fn fetch_memory_status(
    client: &reqwest::Client,
    base_url: &str,
    username: &str,
    password: &str,
) -> Option<MemoryStatus> {
    let url = format!("{}/system/console/memoryusage", base_url);

    let response = client
        .get(&url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .ok()?;

    let text = response.text().await.ok()?;

    // Parse memory info from HTML response
    // This is a simplified parser - real implementation would need more robust parsing
    let heap_used = extract_memory_value(&text, "Heap Memory used")?;
    let heap_max = extract_memory_value(&text, "Heap Memory maximum")?;
    let heap_percentage = if heap_max > 0 {
        (heap_used as f32 / heap_max as f32) * 100.0
    } else {
        0.0
    };

    Some(MemoryStatus {
        heap_used,
        heap_max,
        heap_percentage,
    })
}

fn extract_memory_value(text: &str, label: &str) -> Option<u64> {
    // Simple extraction - looks for patterns like "Heap Memory used: 512 MB"
    if let Some(pos) = text.find(label) {
        let after = &text[pos..];
        let numbers: String = after
            .chars()
            .skip_while(|c| !c.is_ascii_digit())
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();

        numbers.parse::<f64>().ok().map(|n| (n * 1024.0 * 1024.0) as u64)
    } else {
        None
    }
}

/// Fetch AEM version info
async fn fetch_version_info(
    client: &reqwest::Client,
    base_url: &str,
    username: &str,
    password: &str,
) -> Option<AemVersionInfo> {
    let url = format!("{}/system/console/status-productinfo.txt", base_url);

    let response = client
        .get(&url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .ok()?;

    let text = response.text().await.ok()?;

    // Parse product info
    let mut product_name = String::from("Adobe Experience Manager");
    let mut product_version = String::new();
    let mut oak_version = None;
    let mut java_version = None;

    for line in text.lines() {
        if line.starts_with("Product Name:") {
            product_name = line.trim_start_matches("Product Name:").trim().to_string();
        } else if line.starts_with("Product Version:") {
            product_version = line.trim_start_matches("Product Version:").trim().to_string();
        } else if line.contains("Oak") && line.contains("Version") {
            oak_version = Some(line.split_whitespace().last()?.to_string());
        } else if line.contains("java.version") {
            java_version = line.split('=').nth(1).map(|s| s.trim().to_string());
        }
    }

    if product_version.is_empty() {
        return None;
    }

    Some(AemVersionInfo {
        product_name,
        product_version,
        oak_version,
        java_version,
    })
}

// ============================================
// Credential Management
// ============================================

fn get_credentials_file() -> PathBuf {
    let platform = crate::platform::current_platform();
    platform.get_data_dir().join(".credentials")
}

fn get_instance_credentials(instance_id: &str, default_username: &Option<String>) -> Result<(String, String), String> {
    let username = default_username.clone().unwrap_or_else(|| "admin".to_string());

    // Try to load from stored credentials
    if let Ok(Some((_, stored_password))) = load_stored_credentials(instance_id) {
        return Ok((username, stored_password));
    }

    // Fall back to default
    Ok((username, "admin".to_string()))
}

fn load_stored_credentials(instance_id: &str) -> Result<Option<(String, String)>, String> {
    let file_path = get_credentials_file();
    if !file_path.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let credentials: HashMap<String, (String, String)> =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(credentials.get(instance_id).cloned())
}

fn save_stored_credentials(instance_id: &str, username: &str, password: &str) -> Result<(), String> {
    let file_path = get_credentials_file();

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    let mut credentials: HashMap<String, (String, String)> = if file_path.exists() {
        let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        HashMap::new()
    };

    credentials.insert(instance_id.to_string(), (username.to_string(), password.to_string()));

    let content = serde_json::to_string_pretty(&credentials).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, content).map_err(|e| e.to_string())
}

fn delete_credentials(instance_id: &str) -> Result<(), String> {
    let file_path = get_credentials_file();
    if !file_path.exists() {
        return Ok(());
    }

    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let mut credentials: HashMap<String, (String, String)> =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    credentials.remove(instance_id);

    let content = serde_json::to_string_pretty(&credentials).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, content).map_err(|e| e.to_string())
}

/// Store credentials securely
#[command]
pub async fn store_credentials(
    instance_id: String,
    username: String,
    password: String,
) -> Result<bool, String> {
    save_stored_credentials(&instance_id, &username, &password)?;
    Ok(true)
}

/// Retrieve stored credentials
#[command]
pub async fn get_credentials(instance_id: String) -> Result<Option<(String, String)>, String> {
    load_stored_credentials(&instance_id)
}

// ============================================
// Browser Integration
// ============================================

/// Open AEM instance in browser
#[command]
pub async fn open_in_browser(id: String, path: Option<String>) -> Result<bool, String> {
    let instances = load_instances()?;

    let instance = instances
        .iter()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Instance {} not found", id))?;

    let base_url = format!("http://{}:{}", instance.host, instance.port);
    let url = match path {
        Some(p) => format!("{}{}", base_url, p),
        None => base_url,
    };

    let platform = crate::platform::current_platform();
    platform.open_browser(&url)?;

    Ok(true)
}

/// Get common AEM URLs for an instance
#[command]
pub async fn get_instance_urls(id: String) -> Result<HashMap<String, String>, String> {
    let instances = load_instances()?;

    let instance = instances
        .iter()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Instance {} not found", id))?;

    let base_url = format!("http://{}:{}", instance.host, instance.port);

    let mut urls = HashMap::new();
    urls.insert("home".to_string(), format!("{}/aem/start.html", base_url));
    urls.insert("crxde".to_string(), format!("{}/crx/de/index.jsp", base_url));
    urls.insert("package_manager".to_string(), format!("{}/crx/packmgr/index.jsp", base_url));
    urls.insert("console".to_string(), format!("{}/system/console", base_url));
    urls.insert("sites".to_string(), format!("{}/sites.html/content", base_url));
    urls.insert("assets".to_string(), format!("{}/assets.html/content/dam", base_url));
    urls.insert("users".to_string(), format!("{}/security/users.html", base_url));
    urls.insert("workflow".to_string(), format!("{}/libs/cq/workflow/admin/console/content/instances.html", base_url));

    Ok(urls)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_memory_value() {
        let text = "Heap Memory used: 512 MB\nHeap Memory maximum: 1024 MB";
        assert!(extract_memory_value(text, "Heap Memory used").is_some());
        assert!(extract_memory_value(text, "Heap Memory maximum").is_some());
    }
}
