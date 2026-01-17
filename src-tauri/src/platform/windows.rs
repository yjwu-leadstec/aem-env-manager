// Windows-specific implementations

use super::common::{
    get_app_cache_dir, get_app_config_dir, get_app_data_dir, PlatformOps, ShellExecutor,
    VersionManagerOps,
};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Windows platform operations implementation
pub struct WindowsPlatform {
    executor: WindowsShellExecutor,
}

impl Default for WindowsPlatform {
    fn default() -> Self {
        Self::new()
    }
}

impl WindowsPlatform {
    pub fn new() -> Self {
        Self {
            executor: WindowsShellExecutor::default(),
        }
    }
}

impl PlatformOps for WindowsPlatform {
    fn get_env_var(&self, name: &str) -> Result<String, String> {
        std::env::var(name).map_err(|e| format!("Environment variable {} not found: {}", name, e))
    }

    fn set_env_var(&self, name: &str, value: &str) -> Result<(), String> {
        // For current process
        std::env::set_var(name, value);

        // For persistence, use setx command (user-level)
        let command = format!("setx {} \"{}\"", name, value);
        self.executor.execute(&command)?;
        Ok(())
    }

    fn get_java_home(&self) -> Result<PathBuf, String> {
        // First try JAVA_HOME env var
        if let Ok(java_home) = std::env::var("JAVA_HOME") {
            return Ok(PathBuf::from(java_home));
        }

        // Try to find Java in common Windows locations
        let common_paths = [
            "C:\\Program Files\\Java",
            "C:\\Program Files (x86)\\Java",
            "C:\\Program Files\\Eclipse Adoptium",
            "C:\\Program Files\\Amazon Corretto",
        ];

        for base_path in &common_paths {
            let path = PathBuf::from(base_path);
            if path.exists() {
                if let Ok(entries) = std::fs::read_dir(&path) {
                    for entry in entries.flatten() {
                        let entry_path = entry.path();
                        if entry_path.is_dir() && entry_path.join("bin/java.exe").exists() {
                            return Ok(entry_path);
                        }
                    }
                }
            }
        }

        Err("JAVA_HOME not set and no Java installation found".to_string())
    }

    fn set_java_home(&self, path: &Path) -> Result<(), String> {
        // Set JAVA_HOME
        self.set_env_var("JAVA_HOME", path.to_str().unwrap_or(""))?;

        // Update PATH (append JAVA_HOME\bin)
        // Note: This requires updating the registry for persistence
        let java_bin = path.join("bin");
        if let Ok(current_path) = std::env::var("PATH") {
            if !current_path.contains(java_bin.to_str().unwrap_or("")) {
                let new_path = format!("{};{}", java_bin.display(), current_path);
                self.set_env_var("PATH", &new_path)?;
            }
        }
        Ok(())
    }

    fn get_java_scan_paths(&self) -> Vec<PathBuf> {
        let mut paths = vec![
            PathBuf::from("C:\\Program Files\\Java"),
            PathBuf::from("C:\\Program Files (x86)\\Java"),
            PathBuf::from("C:\\Program Files\\Eclipse Adoptium"),
            PathBuf::from("C:\\Program Files\\Amazon Corretto"),
            PathBuf::from("C:\\Program Files\\Microsoft"),
            PathBuf::from("C:\\Program Files\\Zulu"),
        ];

        // Add user-specific paths
        if let Some(home) = dirs::home_dir() {
            paths.push(home.join(".jabba\\jdk"));
            paths.push(home.join("scoop\\apps\\openjdk"));
            paths.push(home.join("scoop\\apps\\temurin"));
        }

        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            paths.push(PathBuf::from(local_app_data).join("Programs\\Eclipse Adoptium"));
        }

        paths.into_iter().filter(|p| p.exists()).collect()
    }

    fn get_node_scan_paths(&self) -> Vec<PathBuf> {
        let mut paths = vec![PathBuf::from("C:\\Program Files\\nodejs")];

        if let Some(home) = dirs::home_dir() {
            // nvm-windows
            paths.push(home.join("AppData\\Roaming\\nvm"));
            // fnm
            paths.push(home.join("AppData\\Roaming\\fnm\\node-versions"));
            paths.push(home.join("AppData\\Local\\fnm_multishells"));
            // volta
            paths.push(home.join(".volta\\tools\\image\\node"));
            // scoop
            paths.push(home.join("scoop\\apps\\nodejs"));
        }

        paths.into_iter().filter(|p| p.exists()).collect()
    }

    fn get_shell_config_file(&self) -> PathBuf {
        // PowerShell profile
        dirs::home_dir()
            .map(|h| {
                h.join("Documents")
                    .join("PowerShell")
                    .join("Microsoft.PowerShell_profile.ps1")
            })
            .unwrap_or_else(|| PathBuf::from("~\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1"))
    }

    fn append_to_shell_config(&self, content: &str) -> Result<(), String> {
        let config_file = self.get_shell_config_file();

        // Ensure parent directory exists
        if let Some(parent) = config_file.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create PowerShell directory: {}", e))?;
            }
        }

        // Check if content already exists
        if config_file.exists() {
            let existing = std::fs::read_to_string(&config_file).map_err(|e| e.to_string())?;
            if existing.contains(content) {
                return Ok(()); // Already configured
            }
        }

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&config_file)
            .map_err(|e| format!("Failed to open PowerShell profile: {}", e))?;

        writeln!(file, "\n# Added by AEM Environment Manager")
            .map_err(|e| format!("Failed to write to PowerShell profile: {}", e))?;
        writeln!(file, "{}", content)
            .map_err(|e| format!("Failed to write to PowerShell profile: {}", e))?;

        Ok(())
    }

    fn open_terminal(&self, cwd: &Path) -> Result<(), String> {
        // Try Windows Terminal first, fall back to cmd
        let result = Command::new("wt")
            .args(["-d", cwd.to_str().unwrap_or(".")])
            .spawn();

        if result.is_err() {
            // Fall back to cmd
            Command::new("cmd")
                .args(["/c", "start", "cmd", "/k", "cd", cwd.to_str().unwrap_or(".")])
                .spawn()
                .map_err(|e| format!("Failed to open terminal: {}", e))?;
        }
        Ok(())
    }

    fn open_file_manager(&self, path: &Path) -> Result<(), String> {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
        Ok(())
    }

    fn open_browser(&self, url: &str) -> Result<(), String> {
        Command::new("cmd")
            .args(["/c", "start", "", url])
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
        Ok(())
    }

    fn kill_process(&self, pid: u32) -> Result<(), String> {
        // Try graceful termination first
        let status = Command::new("taskkill")
            .args(["/PID", &pid.to_string()])
            .status()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        if !status.success() {
            // Force kill
            Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .status()
                .map_err(|e| format!("Failed to force kill process: {}", e))?;
        }
        Ok(())
    }

    fn get_process_by_port(&self, port: u16) -> Option<u32> {
        let output = Command::new("netstat")
            .args(["-ano"])
            .output()
            .ok()?;

        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            for line in output_str.lines() {
                if line.contains(&format!(":{}", port)) && line.contains("LISTENING") {
                    // Parse PID from the last column
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if let Some(pid_str) = parts.last() {
                        return pid_str.parse().ok();
                    }
                }
            }
        }
        None
    }

    fn get_config_dir(&self) -> PathBuf {
        get_app_config_dir().unwrap_or_else(|| {
            std::env::var("APPDATA")
                .map(|p| PathBuf::from(p).join("aem-env-manager"))
                .unwrap_or_else(|_| PathBuf::from("C:\\Users\\Public\\aem-env-manager\\config"))
        })
    }

    fn get_data_dir(&self) -> PathBuf {
        get_app_data_dir().unwrap_or_else(|| {
            std::env::var("LOCALAPPDATA")
                .map(|p| PathBuf::from(p).join("aem-env-manager"))
                .unwrap_or_else(|_| PathBuf::from("C:\\Users\\Public\\aem-env-manager\\data"))
        })
    }

    fn get_cache_dir(&self) -> PathBuf {
        get_app_cache_dir().unwrap_or_else(|| {
            std::env::var("LOCALAPPDATA")
                .map(|p| PathBuf::from(p).join("aem-env-manager\\cache"))
                .unwrap_or_else(|_| PathBuf::from("C:\\Users\\Public\\aem-env-manager\\cache"))
        })
    }
}

/// Windows shell executor using PowerShell
pub struct WindowsShellExecutor;

impl Default for WindowsShellExecutor {
    fn default() -> Self {
        Self
    }
}

impl ShellExecutor for WindowsShellExecutor {
    fn execute(&self, command: &str) -> Result<String, String> {
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", command])
            .output()
            .map_err(|e| format!("Failed to execute command: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    fn execute_env_command(
        &self,
        command: &str,
        env_vars: &[(&str, &str)],
    ) -> Result<String, String> {
        let mut cmd = Command::new("powershell");
        cmd.args(["-NoProfile", "-Command", command]);

        for (key, value) in env_vars {
            cmd.env(key, value);
        }

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to execute command: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    fn get_shell_config_path(&self) -> Option<PathBuf> {
        // PowerShell profile path
        dirs::home_dir().map(|h| {
            h.join("Documents")
                .join("PowerShell")
                .join("Microsoft.PowerShell_profile.ps1")
        })
    }
}

/// Jabba version manager for Windows
pub struct JabbaManager {
    executor: WindowsShellExecutor,
    jabba_dir: PathBuf,
}

impl JabbaManager {
    pub fn new() -> Self {
        let jabba_dir = std::env::var("JABBA_HOME").map(PathBuf::from).unwrap_or_else(|_| {
            dirs::home_dir()
                .map(|h| h.join(".jabba"))
                .unwrap_or_else(|| PathBuf::from("~/.jabba"))
        });

        Self {
            executor: WindowsShellExecutor::default(),
            jabba_dir,
        }
    }
}

impl Default for JabbaManager {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionManagerOps for JabbaManager {
    fn is_installed(&self) -> bool {
        self.jabba_dir.exists() && self.jabba_dir.join("bin/jabba.exe").exists()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("Jabba is not installed".to_string());
        }

        let jabba_bin = self.jabba_dir.join("bin/jabba.exe");
        let output = self
            .executor
            .execute(&format!("& '{}' ls", jabba_bin.display()))?;

        Ok(output
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("Jabba is not installed".to_string());
        }

        let jabba_bin = self.jabba_dir.join("bin/jabba.exe");
        self.executor
            .execute(&format!("& '{}' use {}", jabba_bin.display(), version))?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("Jabba is not installed".to_string());
        }

        let jabba_bin = self.jabba_dir.join("bin/jabba.exe");
        match self
            .executor
            .execute(&format!("& '{}' current", jabba_bin.display()))
        {
            Ok(output) => {
                let version = output.trim().to_string();
                if version.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(version))
                }
            }
            Err(_) => Ok(None),
        }
    }
}

/// fnm (Fast Node Manager) for Windows
pub struct FnmManager {
    executor: WindowsShellExecutor,
}

impl FnmManager {
    pub fn new() -> Self {
        Self {
            executor: WindowsShellExecutor::default(),
        }
    }
}

impl Default for FnmManager {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionManagerOps for FnmManager {
    fn is_installed(&self) -> bool {
        // Check if fnm is in PATH
        self.executor.execute("fnm --version").is_ok()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("fnm is not installed".to_string());
        }

        let output = self.executor.execute("fnm ls")?;
        Ok(output
            .lines()
            .filter_map(|line| {
                let trimmed = line.trim();
                if trimmed.starts_with('v') || trimmed.starts_with("* v") {
                    Some(trimmed.trim_start_matches("* ").to_string())
                } else {
                    None
                }
            })
            .collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("fnm is not installed".to_string());
        }

        self.executor.execute(&format!("fnm use {}", version))?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("fnm is not installed".to_string());
        }

        match self.executor.execute("fnm current") {
            Ok(output) => {
                let version = output.trim().to_string();
                if version.is_empty() || version == "none" || version == "system" {
                    Ok(None)
                } else {
                    Ok(Some(version))
                }
            }
            Err(_) => Ok(None),
        }
    }
}

/// Volta version manager for Windows
pub struct VoltaManager {
    executor: WindowsShellExecutor,
}

impl VoltaManager {
    pub fn new() -> Self {
        Self {
            executor: WindowsShellExecutor::default(),
        }
    }
}

impl Default for VoltaManager {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionManagerOps for VoltaManager {
    fn is_installed(&self) -> bool {
        self.executor.execute("volta --version").is_ok()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("Volta is not installed".to_string());
        }

        let output = self.executor.execute("volta list node")?;
        Ok(output
            .lines()
            .filter_map(|line| {
                let trimmed = line.trim();
                if trimmed.contains("node@") {
                    Some(
                        trimmed
                            .split('@')
                            .nth(1)?
                            .split_whitespace()
                            .next()?
                            .to_string(),
                    )
                } else {
                    None
                }
            })
            .collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("Volta is not installed".to_string());
        }

        self.executor
            .execute(&format!("volta pin node@{}", version))?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("Volta is not installed".to_string());
        }

        match self.executor.execute("volta which node") {
            Ok(output) => {
                // Parse version from path
                let path = output.trim();
                if let Some(version) = path
                    .split(['/', '\\'])
                    .find(|s| s.starts_with("node-v") || s.starts_with('v'))
                {
                    Ok(Some(version.trim_start_matches("node-").to_string()))
                } else {
                    Ok(None)
                }
            }
            Err(_) => Ok(None),
        }
    }
}

/// nvm-windows version manager
pub struct NvmWindowsManager {
    executor: WindowsShellExecutor,
    nvm_dir: PathBuf,
}

impl NvmWindowsManager {
    pub fn new() -> Self {
        let nvm_dir = std::env::var("NVM_HOME").map(PathBuf::from).unwrap_or_else(|_| {
            dirs::home_dir()
                .map(|h| h.join("AppData\\Roaming\\nvm"))
                .unwrap_or_else(|| PathBuf::from("C:\\nvm"))
        });

        Self {
            executor: WindowsShellExecutor::default(),
            nvm_dir,
        }
    }
}

impl Default for NvmWindowsManager {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionManagerOps for NvmWindowsManager {
    fn is_installed(&self) -> bool {
        self.nvm_dir.exists() && self.executor.execute("nvm version").is_ok()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("nvm-windows is not installed".to_string());
        }

        let output = self.executor.execute("nvm list")?;
        Ok(output
            .lines()
            .filter_map(|line| {
                let trimmed = line.trim().trim_start_matches('*').trim();
                if trimmed.starts_with('v') || trimmed.chars().next()?.is_ascii_digit() {
                    Some(trimmed.split_whitespace().next()?.to_string())
                } else {
                    None
                }
            })
            .collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("nvm-windows is not installed".to_string());
        }

        self.executor.execute(&format!("nvm use {}", version))?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("nvm-windows is not installed".to_string());
        }

        match self.executor.execute("nvm current") {
            Ok(output) => {
                let version = output.trim().to_string();
                if version.is_empty() || version.contains("No current") {
                    Ok(None)
                } else {
                    Ok(Some(version))
                }
            }
            Err(_) => Ok(None),
        }
    }
}

/// Get the platform-specific implementation
pub fn get_platform() -> WindowsPlatform {
    WindowsPlatform::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shell_executor() {
        let executor = WindowsShellExecutor::default();
        let result = executor.execute("Write-Output 'hello'");
        assert!(result.is_ok());
        assert!(result.unwrap().contains("hello"));
    }

    #[test]
    fn test_platform_ops() {
        let platform = WindowsPlatform::new();

        // Test config dir
        let config_dir = platform.get_config_dir();
        assert!(config_dir.to_string_lossy().contains("aem-env-manager"));
    }
}
