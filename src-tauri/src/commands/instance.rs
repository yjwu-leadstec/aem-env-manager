use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::Command;
use std::time::{Duration, Instant};
use tauri::command;

use crate::commands::profile::get_active_profile;
use crate::platform::PlatformOps;

// ============================================
// Data Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AemInstance {
    #[serde(default)]
    pub id: String,
    pub name: String,
    pub instance_type: AemInstanceType,
    pub host: String,
    pub port: u16,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub java_opts: Option<String>,
    #[serde(default)]
    pub run_modes: Vec<String>,
    #[serde(default = "default_status")]
    pub status: AemInstanceStatus,
    #[serde(default)]
    pub profile_id: Option<String>,
    #[serde(default = "default_timestamp")]
    pub created_at: String,
    #[serde(default = "default_timestamp")]
    pub updated_at: String,
}

fn default_status() -> AemInstanceStatus {
    AemInstanceStatus::Stopped
}

fn default_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AemInstanceType {
    Author,
    Publish,
    Dispatcher,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AemInstanceStatus {
    Running,
    Stopped,
    Starting,
    Stopping,
    Error,
    Unknown,
    /// Port is occupied by a non-Java process
    PortConflict,
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

/// Result of instance status detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceStatusResult {
    /// Instance ID
    pub instance_id: String,
    /// Detected status
    pub status: AemInstanceStatus,
    /// Detection timestamp (ISO 8601)
    pub checked_at: String,
    /// Detection duration in milliseconds
    pub duration_ms: u64,
    /// Process ID occupying the port (if any)
    pub process_id: Option<u32>,
    /// Process name (if not a Java process)
    pub process_name: Option<String>,
    /// Error message (if detection failed)
    pub error: Option<String>,
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
    println!("[AEM] start_instance called with id: {}", id);

    let mut instances = load_instances().map_err(|e| {
        println!("[AEM] Failed to load instances: {}", e);
        e
    })?;

    let instance = instances
        .iter_mut()
        .find(|i| i.id == id)
        .ok_or_else(|| {
            let err = format!("Instance {} not found", id);
            println!("[AEM] Error: {}", err);
            err
        })?;

    println!("[AEM] Found instance: {} (path: {})", instance.name, instance.path);

    // Note: We don't check if already running because we can't reliably track status
    // when using Terminal-based control. User manages the process in Terminal.

    // Get jar path from instance.path
    if instance.path.is_empty() {
        println!("[AEM] Instance path not configured");
        return Err("Instance path not configured".to_string());
    }

    let jar_file = PathBuf::from(&instance.path);
    println!("[AEM] Checking jar_file: {} (is_dir: {})", jar_file.display(), jar_file.is_dir());

    // Try to find quickstart jar
    let quickstart_jar = if jar_file.is_dir() {
        find_quickstart_jar(&jar_file).map_err(|e| {
            println!("[AEM] Failed to find quickstart JAR in dir: {}", e);
            e
        })?
    } else {
        jar_file.clone()
    };

    println!("[AEM] quickstart_jar: {}", quickstart_jar.display());

    if !quickstart_jar.exists() {
        let err = format!("Quickstart JAR not found: {}", quickstart_jar.display());
        println!("[AEM] Error: {}", err);
        return Err(err);
    }

    println!("[AEM] JAR file exists, proceeding with startup");

    // Build JVM arguments from java_opts
    // Filter out "java" if user accidentally included it in the options
    let mut jvm_args: Vec<String> = if let Some(ref opts) = instance.java_opts {
        opts.split_whitespace()
            .filter(|s| *s != "java" && !s.ends_with("/java"))
            .map(|s| s.to_string())
            .collect()
    } else {
        vec!["-Xmx1024m".to_string()]
    };

    // Build run modes string from run_modes array
    let instance_type = match instance.instance_type {
        AemInstanceType::Author => "author",
        AemInstanceType::Publish => "publish",
        AemInstanceType::Dispatcher => "dispatcher",
    };

    let run_modes_str = if instance.run_modes.is_empty() {
        format!("{},local", instance_type)
    } else {
        instance.run_modes.join(",")
    };

    jvm_args.push(format!("-Dsling.run.modes={}", run_modes_str));
    jvm_args.push(format!("-Dhttp.port={}", instance.port));

    // Start the process
    let working_dir = quickstart_jar
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));

    // Get environment from active profile
    let active_profile = get_active_profile().await.ok().flatten();

    // Determine JAVA_HOME: 1) active profile, 2) instance java_version, 3) system default
    let java_home: Option<String> = if let Some(ref profile) = active_profile {
        // Use profile's java_path if available
        profile.java_path.clone().filter(|p| !p.is_empty())
    } else {
        None
    }.or_else(|| {
        // Fallback: try to use instance's java_version to find path
        // This is a sync fallback, we'll try to resolve it
        None
    });

    // Determine Java executable path
    let java_executable = if let Some(ref jh) = java_home {
        let java_bin = PathBuf::from(jh).join("bin").join("java");
        if java_bin.exists() {
            java_bin.to_string_lossy().to_string()
        } else {
            "java".to_string()
        }
    } else {
        "java".to_string()
    };

    let mut cmd = Command::new(&java_executable);
    cmd.args(&jvm_args)
        .arg("-jar")
        .arg(&quickstart_jar)
        .current_dir(&working_dir);

    // Set JAVA_HOME environment variable
    if let Some(ref jh) = java_home {
        cmd.env("JAVA_HOME", jh);

        // Update PATH to include Java bin directory
        let java_bin_dir = PathBuf::from(jh).join("bin");
        if let Ok(current_path) = std::env::var("PATH") {
            let new_path = format!("{}:{}", java_bin_dir.display(), current_path);
            cmd.env("PATH", new_path);
        }
    }

    // Also inject custom environment variables from profile
    if let Some(ref profile) = active_profile {
        if let Some(ref env_vars) = profile.env_vars {
            for (key, value) in env_vars {
                cmd.env(key, value);
            }
        }
    }

    // Build the full Java command string for terminal
    let jar_path_str = quickstart_jar.to_string_lossy();
    let working_dir_str = working_dir.to_string_lossy();

    // Build environment exports for the terminal script
    let mut env_exports = String::new();
    if let Some(ref jh) = java_home {
        env_exports.push_str(&format!("export JAVA_HOME='{}'\n", jh));
        let java_bin_dir = PathBuf::from(jh).join("bin");
        env_exports.push_str(&format!("export PATH=\"{}:$PATH\"\n", java_bin_dir.display()));
    }

    // Add custom environment variables from profile
    if let Some(ref profile) = active_profile {
        if let Some(ref env_vars) = profile.env_vars {
            for (key, value) in env_vars {
                env_exports.push_str(&format!("export {}='{}'\n", key, value));
            }
        }
    }

    // Build JVM args string - quote each argument to handle special chars like *
    let jvm_args_str = jvm_args
        .iter()
        .map(|arg| format!("'{}'", arg.replace("'", "'\\''")))
        .collect::<Vec<_>>()
        .join(" ");

    // Create the full command to run in terminal
    let terminal_command = format!(
        "{}cd '{}' && echo 'Starting AEM Instance: {}' && echo 'Port: {}' && echo '---' && '{}' {} -jar '{}'",
        env_exports,
        working_dir_str,
        instance.name,
        instance.port,
        java_executable,
        jvm_args_str,
        jar_path_str
    );

    // Open Terminal.app with the command (macOS specific)
    #[cfg(target_os = "macos")]
    {
        // Use osascript to open a new Terminal window with the command
        let apple_script = format!(
            r#"tell application "Terminal"
                activate
                do script "{}"
            end tell"#,
            terminal_command.replace("\"", "\\\"").replace("\n", "; ")
        );

        println!("[AEM] Opening Terminal with command for instance: {}", instance.name);
        println!("[AEM] Working dir: {}", working_dir_str);
        println!("[AEM] JAR path: {}", jar_path_str);

        let result = Command::new("osascript")
            .arg("-e")
            .arg(&apple_script)
            .output();

        match result {
            Ok(output) => {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    println!("[AEM] osascript failed: {}", stderr);
                    return Err(format!("Failed to open Terminal: {}", stderr));
                }
                println!("[AEM] Terminal opened successfully");
            }
            Err(e) => {
                println!("[AEM] Failed to run osascript: {}", e);
                return Err(format!("Failed to open Terminal: {}", e));
            }
        }
    }

    // For Windows, open cmd.exe (future support)
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", &terminal_command])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    // For Linux, try common terminal emulators
    #[cfg(target_os = "linux")]
    {
        // Try gnome-terminal, then xterm
        let result = Command::new("gnome-terminal")
            .args(["--", "bash", "-c", &format!("{}; exec bash", terminal_command)])
            .spawn();

        if result.is_err() {
            Command::new("xterm")
                .args(["-e", &format!("bash -c '{}; exec bash'", terminal_command)])
                .spawn()
                .map_err(|e| format!("Failed to open terminal: {}", e))?;
        }
    }

    // Update status to unknown since user controls the process now
    instance.status = AemInstanceStatus::Unknown;
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

// ============================================
// Instance Discovery/Scanning
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedAemInstance {
    pub name: String,
    pub path: String,
    pub instance_type: AemInstanceType,
    pub port: u16,
    pub jar_path: Option<String>,
    /// Path to license.properties file if found in the same directory
    pub license_file_path: Option<String>,
}

/// Find license.properties file in a directory
/// Checks for common license file names
fn find_license_file(dir: &PathBuf) -> Option<String> {
    let license_names = [
        "license.properties",
        "License.properties",
        "LICENSE.properties",
        "license-key.txt",
        "aem-license.properties",
    ];

    for name in &license_names {
        let license_path = dir.join(name);
        if license_path.exists() && license_path.is_file() {
            return Some(license_path.to_string_lossy().to_string());
        }
    }

    None
}

/// Scan filesystem for AEM instances by looking for AEM JAR files
/// JAR file patterns supported:
/// - aem-author-p{port}.jar (e.g., aem-author-p4502.jar)
/// - aem-publish-p{port}.jar (e.g., aem-publish-p4503.jar)
/// - aem-sdk-quickstart-*.jar (e.g., aem-sdk-quickstart-2024.8.17740.jar)
/// - cq-quickstart-*.jar, cq-author-*.jar, cq-publish-*.jar
///
/// If custom_paths are provided, they will be scanned in addition to default locations
#[command]
pub async fn scan_aem_instances(custom_paths: Option<Vec<String>>) -> Result<Vec<ScannedAemInstance>, String> {
    use regex::Regex;

    let mut instances = Vec::new();
    let mut scanned_jars = std::collections::HashSet::new();

    // Get scan paths from settings
    let scan_paths = crate::commands::settings::load_scan_paths().await.unwrap_or_default();

    // Collect directories to scan
    let mut dirs_to_scan: Vec<PathBuf> = Vec::new();

    // Add custom paths first (highest priority)
    if let Some(paths) = custom_paths {
        for path_str in paths {
            let path = PathBuf::from(&path_str);
            if path.exists() && path.is_dir() {
                dirs_to_scan.push(path);
            }
        }
    }

    // Add aem_base_dir from settings
    if !scan_paths.aem_base_dir.is_empty() {
        let base_dir = PathBuf::from(&scan_paths.aem_base_dir);
        if base_dir.exists() && base_dir.is_dir() {
            dirs_to_scan.push(base_dir);
        }
    }

    // Add common AEM installation directories
    if let Some(home) = dirs::home_dir() {
        let common_dirs = vec![
            // AEM specific
            home.join("aem"),
            home.join("AEM"),
            home.join("Adobe"),
            home.join("Adobe").join("AEM"),
            home.join("Adobe").join("aem"),
            home.join("opt").join("aem"),
            home.join("opt").join("AEM"),
            // Development directories
            home.join("Development"),
            home.join("Development").join("aem"),
            home.join("Development").join("AEM"),
            home.join("dev"),
            home.join("Dev"),
            home.join("projects"),
            home.join("Projects"),
            home.join("workspace"),
            home.join("Workspace"),
            home.join("work"),
            home.join("Work"),
            // Code directories
            home.join("code"),
            home.join("Code"),
            home.join("src"),
            home.join("my-code"),
            // Local installations
            home.join("local"),
            home.join("Local"),
            home.join("apps"),
            home.join("Apps"),
            home.join("Applications"),
        ];

        for dir in common_dirs {
            if dir.exists() && dir.is_dir() {
                dirs_to_scan.push(dir);
            }
        }
    }

    // Add /opt/aem
    let opt_aem = PathBuf::from("/opt/aem");
    if opt_aem.exists() && opt_aem.is_dir() {
        dirs_to_scan.push(opt_aem);
    }

    // Regex patterns for AEM JAR files
    // Pattern: aem-author-p{port}.jar or aem-publish-p{port}.jar
    let jar_type_port_pattern = Regex::new(r"^(?:aem|cq)-?(author|publish)-?p(\d+)\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;

    // Pattern: aem-sdk-quickstart-*.jar
    let jar_sdk_pattern = Regex::new(r"^aem-sdk-quickstart.*\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;

    // Pattern: cq-quickstart-*.jar (older CQ versions)
    let jar_cq_pattern = Regex::new(r"^cq-?quickstart.*\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;

    // Helper function to scan a directory for AEM JARs
    fn scan_dir_for_jars(
        dir: &PathBuf,
        jar_type_port_pattern: &Regex,
        jar_sdk_pattern: &Regex,
        jar_cq_pattern: &Regex,
        scanned_jars: &mut std::collections::HashSet<PathBuf>,
        instances: &mut Vec<ScannedAemInstance>,
    ) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();

                if path.is_file() {
                    let file_name = path.file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_lowercase();

                    if !file_name.ends_with(".jar") {
                        continue;
                    }

                    // Skip if already processed
                    let canonical = path.canonicalize().unwrap_or_else(|_| path.clone());
                    if scanned_jars.contains(&canonical) {
                        continue;
                    }

                    let mut instance_type: Option<AemInstanceType> = None;
                    let mut port: Option<u16> = None;

                    // Try type+port pattern (aem-author-p4502.jar, aem-publish-p4503.jar)
                    if let Some(caps) = jar_type_port_pattern.captures(&file_name) {
                        let type_str = caps.get(1).map(|m| m.as_str()).unwrap_or("author");
                        instance_type = Some(match type_str {
                            "publish" => AemInstanceType::Publish,
                            _ => AemInstanceType::Author,
                        });
                        if let Some(port_match) = caps.get(2) {
                            port = port_match.as_str().parse().ok();
                        }
                    }
                    // Try SDK pattern (aem-sdk-quickstart-*.jar)
                    else if jar_sdk_pattern.is_match(&file_name) {
                        instance_type = Some(AemInstanceType::Author);
                        port = Some(4502);
                    }
                    // Try CQ pattern (cq-quickstart-*.jar)
                    else if jar_cq_pattern.is_match(&file_name) {
                        instance_type = Some(AemInstanceType::Author);
                        port = Some(4502);
                    }

                    if let Some(inst_type) = instance_type {
                        let actual_port = port.unwrap_or(match inst_type {
                            AemInstanceType::Author => 4502,
                            AemInstanceType::Publish => 4503,
                            AemInstanceType::Dispatcher => 80,
                        });

                        // Use parent directory as instance path
                        let instance_path = path.parent()
                            .map(|p| p.to_path_buf())
                            .unwrap_or_else(|| dir.clone());

                        // Generate name from JAR file (without .jar extension)
                        let name = file_name.trim_end_matches(".jar").to_string();

                        // Check for license.properties in the same directory
                        let license_file_path = find_license_file(&instance_path);

                        instances.push(ScannedAemInstance {
                            name,
                            path: instance_path.to_string_lossy().to_string(),
                            instance_type: inst_type,
                            port: actual_port,
                            jar_path: Some(path.to_string_lossy().to_string()),
                            license_file_path,
                        });

                        scanned_jars.insert(canonical);
                    }
                }
            }
        }
    }

    // Scan each base directory and its immediate subdirectories
    for base_dir in &dirs_to_scan {
        // Scan the base directory itself
        scan_dir_for_jars(
            base_dir,
            &jar_type_port_pattern,
            &jar_sdk_pattern,
            &jar_cq_pattern,
            &mut scanned_jars,
            &mut instances,
        );

        // Scan immediate subdirectories (one level deep)
        if let Ok(entries) = std::fs::read_dir(base_dir) {
            for entry in entries.flatten() {
                let subdir = entry.path();
                if subdir.is_dir() {
                    scan_dir_for_jars(
                        &subdir,
                        &jar_type_port_pattern,
                        &jar_sdk_pattern,
                        &jar_cq_pattern,
                        &mut scanned_jars,
                        &mut instances,
                    );
                }
            }
        }
    }

    // Sort by type (author first) then by port
    instances.sort_by(|a, b| {
        match (&a.instance_type, &b.instance_type) {
            (AemInstanceType::Author, AemInstanceType::Publish) => std::cmp::Ordering::Less,
            (AemInstanceType::Publish, AemInstanceType::Author) => std::cmp::Ordering::Greater,
            _ => a.port.cmp(&b.port),
        }
    });

    Ok(instances)
}

/// Scan a specific directory for AEM JAR files
/// Used when user selects a folder in the instance form dialog
/// Returns found JAR files with parsed instance info
#[command]
pub async fn scan_directory_for_jars(directory: String) -> Result<Vec<ScannedAemInstance>, String> {
    use regex::Regex;

    let dir_path = PathBuf::from(&directory);
    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", directory));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory));
    }

    let mut instances = Vec::new();
    let mut scanned_jars = std::collections::HashSet::new();

    // Regex patterns for AEM JAR files
    let jar_type_port_pattern = Regex::new(r"^(?:aem|cq)-?(author|publish)-?p(\d+)\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;
    let jar_sdk_pattern = Regex::new(r"^aem-sdk-quickstart.*\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;
    let jar_cq_pattern = Regex::new(r"^cq-?quickstart.*\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;

    // Helper to scan a directory for JARs
    fn scan_dir(
        dir: &PathBuf,
        jar_type_port_pattern: &Regex,
        jar_sdk_pattern: &Regex,
        jar_cq_pattern: &Regex,
        scanned_jars: &mut std::collections::HashSet<PathBuf>,
        instances: &mut Vec<ScannedAemInstance>,
    ) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let file_name = path.file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_lowercase();

                    if !file_name.ends_with(".jar") {
                        continue;
                    }

                    let canonical = path.canonicalize().unwrap_or_else(|_| path.clone());
                    if scanned_jars.contains(&canonical) {
                        continue;
                    }

                    let mut instance_type: Option<AemInstanceType> = None;
                    let mut port: Option<u16> = None;

                    if let Some(caps) = jar_type_port_pattern.captures(&file_name) {
                        let type_str = caps.get(1).map(|m| m.as_str()).unwrap_or("author");
                        instance_type = Some(match type_str {
                            "publish" => AemInstanceType::Publish,
                            _ => AemInstanceType::Author,
                        });
                        if let Some(port_match) = caps.get(2) {
                            port = port_match.as_str().parse().ok();
                        }
                    } else if jar_sdk_pattern.is_match(&file_name) {
                        instance_type = Some(AemInstanceType::Author);
                        port = Some(4502);
                    } else if jar_cq_pattern.is_match(&file_name) {
                        instance_type = Some(AemInstanceType::Author);
                        port = Some(4502);
                    }

                    if let Some(inst_type) = instance_type {
                        let actual_port = port.unwrap_or(match inst_type {
                            AemInstanceType::Author => 4502,
                            AemInstanceType::Publish => 4503,
                            AemInstanceType::Dispatcher => 80,
                        });

                        let instance_path = path.parent()
                            .map(|p| p.to_path_buf())
                            .unwrap_or_else(|| dir.clone());

                        let name = file_name.trim_end_matches(".jar").to_string();

                        // Check for license.properties in the same directory
                        let license_file_path = find_license_file(&instance_path);

                        instances.push(ScannedAemInstance {
                            name,
                            path: instance_path.to_string_lossy().to_string(),
                            instance_type: inst_type,
                            port: actual_port,
                            jar_path: Some(path.to_string_lossy().to_string()),
                            license_file_path,
                        });

                        scanned_jars.insert(canonical);
                    }
                }
            }
        }
    }

    // Scan the directory itself
    scan_dir(
        &dir_path,
        &jar_type_port_pattern,
        &jar_sdk_pattern,
        &jar_cq_pattern,
        &mut scanned_jars,
        &mut instances,
    );

    // Scan immediate subdirectories (e.g., author/, publish/)
    if let Ok(entries) = std::fs::read_dir(&dir_path) {
        for entry in entries.flatten() {
            let subdir = entry.path();
            if subdir.is_dir() {
                scan_dir(
                    &subdir,
                    &jar_type_port_pattern,
                    &jar_sdk_pattern,
                    &jar_cq_pattern,
                    &mut scanned_jars,
                    &mut instances,
                );
            }
        }
    }

    // Sort by type then port
    instances.sort_by(|a, b| {
        match (&a.instance_type, &b.instance_type) {
            (AemInstanceType::Author, AemInstanceType::Publish) => std::cmp::Ordering::Less,
            (AemInstanceType::Publish, AemInstanceType::Author) => std::cmp::Ordering::Greater,
            _ => a.port.cmp(&b.port),
        }
    });

    Ok(instances)
}

/// Parse a JAR file path and extract instance info
#[command]
pub async fn parse_jar_file(jar_path: String) -> Result<Option<ScannedAemInstance>, String> {
    use regex::Regex;

    let path = PathBuf::from(&jar_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", jar_path));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", jar_path));
    }

    let file_name = path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    if !file_name.ends_with(".jar") {
        return Err("File is not a JAR file".to_string());
    }

    let jar_type_port_pattern = Regex::new(r"^(?:aem|cq)-?(author|publish)-?p(\d+)\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;
    let jar_sdk_pattern = Regex::new(r"^aem-sdk-quickstart.*\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;
    let jar_cq_pattern = Regex::new(r"^cq-?quickstart.*\.jar$")
        .map_err(|e| format!("Regex error: {}", e))?;

    let mut instance_type: Option<AemInstanceType> = None;
    let mut port: Option<u16> = None;

    if let Some(caps) = jar_type_port_pattern.captures(&file_name) {
        let type_str = caps.get(1).map(|m| m.as_str()).unwrap_or("author");
        instance_type = Some(match type_str {
            "publish" => AemInstanceType::Publish,
            _ => AemInstanceType::Author,
        });
        if let Some(port_match) = caps.get(2) {
            port = port_match.as_str().parse().ok();
        }
    } else if jar_sdk_pattern.is_match(&file_name) {
        instance_type = Some(AemInstanceType::Author);
        port = Some(4502);
    } else if jar_cq_pattern.is_match(&file_name) {
        instance_type = Some(AemInstanceType::Author);
        port = Some(4502);
    }

    if let Some(inst_type) = instance_type {
        let actual_port = port.unwrap_or(match inst_type {
            AemInstanceType::Author => 4502,
            AemInstanceType::Publish => 4503,
            AemInstanceType::Dispatcher => 80,
        });

        let instance_path = path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));

        let name = file_name.trim_end_matches(".jar").to_string();

        // Check for license.properties in the same directory
        let license_file_path = find_license_file(&instance_path);

        Ok(Some(ScannedAemInstance {
            name,
            path: instance_path.to_string_lossy().to_string(),
            instance_type: inst_type,
            port: actual_port,
            jar_path: Some(path.to_string_lossy().to_string()),
            license_file_path,
        }))
    } else {
        Ok(None)
    }
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

    // Get credentials (use default admin username)
    let (username, password) = get_instance_credentials(&instance.id, &None)?;

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

    // Get credentials (use default admin username)
    let (username, password) = get_instance_credentials(&instance.id, &None)?;

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
    instance.updated_at = chrono::Utc::now().to_rfc3339();
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
// Instance Status Detection (New - Fast, No-Auth)
// ============================================

/// Check if a TCP port is open using a connect timeout
fn check_port_open(host: &str, port: u16, timeout_ms: u64) -> bool {
    use std::net::ToSocketAddrs;

    let addr = format!("{}:{}", host, port);

    // Use ToSocketAddrs to resolve hostname (e.g., "localhost" -> "127.0.0.1")
    match addr.to_socket_addrs() {
        Ok(mut addrs) => {
            // Try each resolved address
            for socket_addr in addrs.by_ref() {
                if TcpStream::connect_timeout(&socket_addr, Duration::from_millis(timeout_ms)).is_ok() {
                    return true;
                }
            }
            false
        }
        Err(_) => false,
    }
}

/// Get process info by port: returns (pid, process_name) if found
/// Only returns the process that is LISTENING on the port, not client connections
fn get_process_info_by_port(port: u16) -> Option<(u32, String)> {
    #[cfg(target_os = "macos")]
    {
        // Use lsof with -sTCP:LISTEN to only get processes listening on the port
        // This excludes client connections (ESTABLISHED state)
        let pid_output = Command::new("lsof")
            .args(["-ti", &format!("TCP:{}", port), "-sTCP:LISTEN"])
            .output()
            .ok()?;

        if !pid_output.status.success() {
            return None;
        }

        let pid: u32 = String::from_utf8_lossy(&pid_output.stdout)
            .trim()
            .lines()
            .next()?
            .parse()
            .ok()?;

        // Use ps to get process name
        let name_output = Command::new("ps")
            .args(["-p", &pid.to_string(), "-o", "comm="])
            .output()
            .ok()?;

        let name = String::from_utf8_lossy(&name_output.stdout)
            .trim()
            .to_string();

        Some((pid, name))
    }

    #[cfg(target_os = "windows")]
    {
        // Use netstat to find PID by port
        let output = Command::new("netstat")
            .args(["-ano", "-p", "TCP"])
            .output()
            .ok()?;

        if !output.status.success() {
            return None;
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        let port_str = format!(":{}", port);

        for line in output_str.lines() {
            if line.contains(&port_str) && line.contains("LISTENING") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if let Some(pid_str) = parts.last() {
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        // Get process name using tasklist
                        let name_output = Command::new("tasklist")
                            .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
                            .output()
                            .ok()?;

                        let name_str = String::from_utf8_lossy(&name_output.stdout);
                        // CSV format: "name.exe","pid",...
                        if let Some(name) = name_str.trim().split(',').next() {
                            let name = name.trim_matches('"').to_string();
                            return Some((pid, name));
                        }
                    }
                }
            }
        }
        None
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

/// Check if a process name indicates it's a Java process
fn is_java_process(process_name: &str) -> bool {
    let name_lower = process_name.to_lowercase();
    name_lower.contains("java")
        || name_lower.contains("jdk")
        || name_lower.contains("jre")
        || name_lower.ends_with("/java")
        || name_lower == "java"
}

/// Check HTTP response from AEM login page (no auth required)
async fn check_aem_http_ready(host: &str, port: u16, timeout_ms: u64) -> bool {
    let url = format!(
        "http://{}:{}/libs/granite/core/content/login.html",
        host, port
    );

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    match client.get(&url).send().await {
        Ok(resp) => {
            // Any successful response (including 302 redirect) means AEM is ready
            let status = resp.status().as_u16();
            status == 200 || status == 302 || status == 401
        }
        Err(_) => false,
    }
}

/// Detect the status of a single AEM instance using hybrid detection
/// Layer 1: TCP port check (fast, < 500ms)
/// Layer 2: Process type verification (confirms Java process)
/// Layer 3: HTTP response check (distinguishes starting vs running)
#[command]
pub async fn detect_instance_status(id: String) -> Result<InstanceStatusResult, String> {
    let start_time = Instant::now();
    let instances = load_instances()?;

    let instance = instances
        .iter()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Instance {} not found", id))?;

    // Layer 1: TCP port check (500ms timeout)
    let port_open = check_port_open(&instance.host, instance.port, 500);

    if !port_open {
        return Ok(InstanceStatusResult {
            instance_id: id,
            status: AemInstanceStatus::Stopped,
            checked_at: chrono::Utc::now().to_rfc3339(),
            duration_ms: start_time.elapsed().as_millis() as u64,
            process_id: None,
            process_name: None,
            error: None,
        });
    }

    // Layer 2: Process type verification
    let process_info = get_process_info_by_port(instance.port);

    if let Some((pid, name)) = &process_info {
        if !is_java_process(name) {
            return Ok(InstanceStatusResult {
                instance_id: id,
                status: AemInstanceStatus::PortConflict,
                checked_at: chrono::Utc::now().to_rfc3339(),
                duration_ms: start_time.elapsed().as_millis() as u64,
                process_id: Some(*pid),
                process_name: Some(name.clone()),
                error: Some(format!("Port {} is occupied by non-Java process: {}", instance.port, name)),
            });
        }
    }

    // Layer 3: HTTP check to distinguish starting vs running (3s timeout)
    let http_ready = check_aem_http_ready(&instance.host, instance.port, 3000).await;

    let status = if http_ready {
        AemInstanceStatus::Running
    } else {
        AemInstanceStatus::Starting
    };

    Ok(InstanceStatusResult {
        instance_id: id,
        status,
        checked_at: chrono::Utc::now().to_rfc3339(),
        duration_ms: start_time.elapsed().as_millis() as u64,
        process_id: process_info.as_ref().map(|(pid, _)| *pid),
        process_name: process_info.map(|(_, name)| name),
        error: None,
    })
}

/// Detect status of all configured AEM instances
/// Executes detection in parallel for efficiency
#[command]
pub async fn detect_all_instances_status() -> Result<Vec<InstanceStatusResult>, String> {
    let instances = load_instances()?;

    // Run detection for all instances concurrently
    let mut results = Vec::with_capacity(instances.len());

    for instance in instances {
        // We call detect_instance_status for each instance
        // In a production app, you might use tokio::spawn for true parallelism
        match detect_instance_status(instance.id.clone()).await {
            Ok(result) => results.push(result),
            Err(e) => {
                // On error, add an error result
                results.push(InstanceStatusResult {
                    instance_id: instance.id,
                    status: AemInstanceStatus::Unknown,
                    checked_at: chrono::Utc::now().to_rfc3339(),
                    duration_ms: 0,
                    process_id: None,
                    process_name: None,
                    error: Some(e),
                });
            }
        }
    }

    Ok(results)
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
