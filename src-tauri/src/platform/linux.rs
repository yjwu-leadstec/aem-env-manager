// Linux-specific implementations

use super::common::{
    get_app_cache_dir, get_app_config_dir, get_app_data_dir, PlatformOps, ShellExecutor,
};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Linux platform operations implementation
pub struct LinuxPlatform {
    #[allow(dead_code)]
    executor: LinuxShellExecutor,
}

impl Default for LinuxPlatform {
    fn default() -> Self {
        Self::new()
    }
}

impl LinuxPlatform {
    pub fn new() -> Self {
        Self {
            executor: LinuxShellExecutor::default(),
        }
    }
}

impl PlatformOps for LinuxPlatform {
    fn get_env_var(&self, name: &str) -> Result<String, String> {
        std::env::var(name).map_err(|e| format!("Environment variable {} not found: {}", name, e))
    }

    fn set_env_var(&self, name: &str, value: &str) -> Result<(), String> {
        // For current process
        std::env::set_var(name, value);

        // For persistence, append to shell config
        let export_line = format!("export {}=\"{}\"", name, value);
        self.append_to_shell_config(&export_line)
    }

    fn get_java_home(&self) -> Result<PathBuf, String> {
        // First try JAVA_HOME env var
        if let Ok(java_home) = std::env::var("JAVA_HOME") {
            return Ok(PathBuf::from(java_home));
        }

        // Try to find java and resolve JAVA_HOME
        let output = Command::new("which")
            .arg("java")
            .output()
            .map_err(|e| format!("Failed to find java: {}", e))?;

        if output.status.success() {
            let java_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !java_path.is_empty() {
                // Resolve symlinks and get parent
                if let Ok(resolved) = std::fs::canonicalize(&java_path) {
                    if let Some(bin_dir) = resolved.parent() {
                        if let Some(java_home) = bin_dir.parent() {
                            return Ok(java_home.to_path_buf());
                        }
                    }
                }
            }
        }

        Err("JAVA_HOME not set and no Java installation found".to_string())
    }

    fn set_java_home(&self, path: &Path) -> Result<(), String> {
        let export_line = format!("export JAVA_HOME=\"{}\"", path.display());
        self.append_to_shell_config(&export_line)?;

        // Also update PATH to include JAVA_HOME/bin
        let path_line = "export PATH=\"$JAVA_HOME/bin:$PATH\"";
        self.append_to_shell_config(path_line)
    }

    fn get_java_scan_paths(&self) -> Vec<PathBuf> {
        let mut paths = vec![
            PathBuf::from("/usr/lib/jvm"),
            PathBuf::from("/usr/java"),
            PathBuf::from("/opt/java"),
        ];

        // Add SDKMAN managed versions
        if let Some(home) = dirs::home_dir() {
            paths.push(home.join(".sdkman/candidates/java"));
            paths.push(home.join(".jenv/versions"));
            paths.push(home.join(".jabba/jdk"));
        }

        paths.into_iter().filter(|p| p.exists()).collect()
    }

    fn get_node_scan_paths(&self) -> Vec<PathBuf> {
        let mut paths = vec![
            PathBuf::from("/usr/bin/node"),
            PathBuf::from("/usr/local/bin/node"),
        ];

        if let Some(home) = dirs::home_dir() {
            // nvm
            paths.push(home.join(".nvm/versions/node"));
            // fnm
            paths.push(home.join(".fnm/node-versions"));
            paths.push(home.join(".local/share/fnm/node-versions"));
            // volta
            paths.push(home.join(".volta/tools/image/node"));
        }

        paths.into_iter().filter(|p| p.exists()).collect()
    }

    fn get_shell_config_file(&self) -> PathBuf {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("~"));
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());

        if shell.contains("zsh") {
            home.join(".zshrc")
        } else if shell.contains("bash") {
            home.join(".bashrc")
        } else {
            home.join(".profile")
        }
    }

    fn append_to_shell_config(&self, content: &str) -> Result<(), String> {
        let config_file = self.get_shell_config_file();

        // Check if content already exists
        if config_file.exists() {
            let existing =
                std::fs::read_to_string(&config_file).map_err(|e| e.to_string())?;
            if existing.contains(content) {
                return Ok(()); // Already configured
            }
        }

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&config_file)
            .map_err(|e| format!("Failed to open shell config: {}", e))?;

        writeln!(file, "\n# Added by AEM Environment Manager")
            .map_err(|e| format!("Failed to write to shell config: {}", e))?;
        writeln!(file, "{}", content)
            .map_err(|e| format!("Failed to write to shell config: {}", e))?;

        Ok(())
    }

    fn open_terminal(&self, cwd: &Path) -> Result<(), String> {
        // Try common Linux terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];

        for terminal in &terminals {
            let result = match *terminal {
                "gnome-terminal" => Command::new(terminal)
                    .args(["--working-directory", cwd.to_str().unwrap_or(".")])
                    .spawn(),
                "konsole" => Command::new(terminal)
                    .args(["--workdir", cwd.to_str().unwrap_or(".")])
                    .spawn(),
                _ => Command::new(terminal)
                    .current_dir(cwd)
                    .spawn(),
            };

            if result.is_ok() {
                return Ok(());
            }
        }

        Err("Failed to open terminal: no supported terminal emulator found".to_string())
    }

    fn open_file_manager(&self, path: &Path) -> Result<(), String> {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
        Ok(())
    }

    fn open_browser(&self, url: &str) -> Result<(), String> {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
        Ok(())
    }

    fn kill_process(&self, pid: u32) -> Result<(), String> {
        // Try graceful termination first (SIGTERM)
        let status = Command::new("kill")
            .arg(pid.to_string())
            .status()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        if !status.success() {
            // Force kill if graceful termination failed (SIGKILL)
            Command::new("kill")
                .args(["-9", &pid.to_string()])
                .status()
                .map_err(|e| format!("Failed to force kill process: {}", e))?;
        }
        Ok(())
    }

    fn get_process_by_port(&self, port: u16) -> Option<u32> {
        // Try lsof first
        let output = Command::new("lsof")
            .args(["-ti", &format!(":{}", port)])
            .output()
            .ok();

        if let Some(out) = output {
            if out.status.success() {
                let pid_str = String::from_utf8_lossy(&out.stdout);
                if let Some(pid) = pid_str.trim().lines().next()?.parse().ok() {
                    return Some(pid);
                }
            }
        }

        // Fallback to ss command
        let output = Command::new("ss")
            .args(["-tlnp", &format!("sport = :{}", port)])
            .output()
            .ok()?;

        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            // Parse pid from ss output like "pid=1234"
            for line in output_str.lines() {
                if let Some(pid_start) = line.find("pid=") {
                    let pid_part = &line[pid_start + 4..];
                    if let Some(end) = pid_part.find(|c: char| !c.is_ascii_digit()) {
                        if let Ok(pid) = pid_part[..end].parse() {
                            return Some(pid);
                        }
                    }
                }
            }
        }

        None
    }

    fn get_config_dir(&self) -> PathBuf {
        get_app_config_dir().unwrap_or_else(|| {
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("~"))
                .join(".config/aem-env-manager")
        })
    }

    fn get_data_dir(&self) -> PathBuf {
        get_app_data_dir().unwrap_or_else(|| {
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("~"))
                .join(".local/share/aem-env-manager")
        })
    }

    fn get_cache_dir(&self) -> PathBuf {
        get_app_cache_dir().unwrap_or_else(|| {
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("~"))
                .join(".cache/aem-env-manager")
        })
    }
}

/// Linux shell executor using bash/zsh
pub struct LinuxShellExecutor {
    shell: String,
}

impl Default for LinuxShellExecutor {
    fn default() -> Self {
        // Detect user's default shell
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        Self { shell }
    }
}

impl ShellExecutor for LinuxShellExecutor {
    fn execute(&self, command: &str) -> Result<String, String> {
        let output = Command::new(&self.shell)
            .args(["-c", command])
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
        let mut cmd = Command::new(&self.shell);
        cmd.args(["-c", command]);

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
        let home = dirs::home_dir()?;
        if self.shell.contains("zsh") {
            Some(home.join(".zshrc"))
        } else if self.shell.contains("bash") {
            Some(home.join(".bashrc"))
        } else {
            None
        }
    }
}

/// Get the platform-specific implementation
#[allow(dead_code)]
pub fn get_platform() -> LinuxPlatform {
    LinuxPlatform::new()
}

// ============================================
// Version Manager Implementations for Linux
// ============================================

/// SDKMAN version manager for Linux
pub struct SdkmanManager {
    executor: LinuxShellExecutor,
    sdkman_dir: PathBuf,
}

impl SdkmanManager {
    pub fn new() -> Self {
        let sdkman_dir = dirs::home_dir()
            .map(|h| h.join(".sdkman"))
            .unwrap_or_else(|| PathBuf::from("~/.sdkman"));

        Self {
            executor: LinuxShellExecutor::default(),
            sdkman_dir,
        }
    }
}

impl Default for SdkmanManager {
    fn default() -> Self {
        Self::new()
    }
}

impl super::common::VersionManagerOps for SdkmanManager {
    fn is_installed(&self) -> bool {
        self.sdkman_dir.exists() && self.sdkman_dir.join("bin/sdkman-init.sh").exists()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("SDKMAN is not installed".to_string());
        }

        let command = format!(
            "source {}/bin/sdkman-init.sh && sdk list java | grep -E '^ \\*|^   ' | awk '{{print $NF}}'",
            self.sdkman_dir.display()
        );

        let output = self.executor.execute(&command)?;
        Ok(output
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("SDKMAN is not installed".to_string());
        }

        let command = format!(
            "source {}/bin/sdkman-init.sh && sdk use java {}",
            self.sdkman_dir.display(),
            version
        );

        self.executor.execute(&command)?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("SDKMAN is not installed".to_string());
        }

        let command = format!(
            "source {}/bin/sdkman-init.sh && sdk current java | grep -oE '[0-9]+\\.[0-9]+\\.[0-9]+'",
            self.sdkman_dir.display()
        );

        match self.executor.execute(&command) {
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

/// NVM version manager for Linux
pub struct NvmManager {
    executor: LinuxShellExecutor,
    nvm_dir: PathBuf,
}

impl NvmManager {
    pub fn new() -> Self {
        let nvm_dir = std::env::var("NVM_DIR").map(PathBuf::from).unwrap_or_else(|_| {
            dirs::home_dir()
                .map(|h| h.join(".nvm"))
                .unwrap_or_else(|| PathBuf::from("~/.nvm"))
        });

        Self {
            executor: LinuxShellExecutor::default(),
            nvm_dir,
        }
    }
}

impl Default for NvmManager {
    fn default() -> Self {
        Self::new()
    }
}

impl super::common::VersionManagerOps for NvmManager {
    fn is_installed(&self) -> bool {
        self.nvm_dir.exists() && self.nvm_dir.join("nvm.sh").exists()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("NVM is not installed".to_string());
        }

        let command = format!(
            "source {}/nvm.sh && nvm ls --no-colors | grep -oE 'v[0-9]+\\.[0-9]+\\.[0-9]+'",
            self.nvm_dir.display()
        );

        let output = self.executor.execute(&command)?;
        Ok(output
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("NVM is not installed".to_string());
        }

        let command = format!("source {}/nvm.sh && nvm use {}", self.nvm_dir.display(), version);

        self.executor.execute(&command)?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("NVM is not installed".to_string());
        }

        let command = format!("source {}/nvm.sh && nvm current", self.nvm_dir.display());

        match self.executor.execute(&command) {
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

/// jEnv version manager for Linux
pub struct JenvManager {
    executor: LinuxShellExecutor,
    jenv_dir: PathBuf,
}

impl JenvManager {
    pub fn new() -> Self {
        let jenv_dir = dirs::home_dir()
            .map(|h| h.join(".jenv"))
            .unwrap_or_else(|| PathBuf::from("~/.jenv"));

        Self {
            executor: LinuxShellExecutor::default(),
            jenv_dir,
        }
    }
}

impl Default for JenvManager {
    fn default() -> Self {
        Self::new()
    }
}

impl super::common::VersionManagerOps for JenvManager {
    fn is_installed(&self) -> bool {
        self.jenv_dir.exists() && self.jenv_dir.join("bin/jenv").exists()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("jEnv is not installed".to_string());
        }

        let command = format!("{}/bin/jenv versions --bare", self.jenv_dir.display());

        let output = self.executor.execute(&command)?;
        Ok(output
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && !s.starts_with('*'))
            .collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("jEnv is not installed".to_string());
        }

        let command = format!("{}/bin/jenv global {}", self.jenv_dir.display(), version);

        self.executor.execute(&command)?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("jEnv is not installed".to_string());
        }

        let command = format!("{}/bin/jenv version-name", self.jenv_dir.display());

        match self.executor.execute(&command) {
            Ok(output) => {
                let version = output.trim().to_string();
                if version.is_empty() || version == "system" {
                    Ok(None)
                } else {
                    Ok(Some(version))
                }
            }
            Err(_) => Ok(None),
        }
    }
}
