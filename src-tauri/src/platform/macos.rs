// macOS-specific implementations

use super::common::{
    get_app_cache_dir, get_app_config_dir, get_app_data_dir, PlatformOps, ShellExecutor,
    VersionManagerOps,
};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

/// macOS platform operations implementation
pub struct MacOSPlatform {
    #[allow(dead_code)]
    executor: MacOSShellExecutor,
}

impl Default for MacOSPlatform {
    fn default() -> Self {
        Self::new()
    }
}

impl MacOSPlatform {
    pub fn new() -> Self {
        Self {
            executor: MacOSShellExecutor::default(),
        }
    }
}

impl PlatformOps for MacOSPlatform {
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

        // Try /usr/libexec/java_home (macOS specific)
        let output = Command::new("/usr/libexec/java_home")
            .output()
            .map_err(|e| format!("Failed to execute java_home: {}", e))?;

        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
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
            PathBuf::from("/Library/Java/JavaVirtualMachines"),
            PathBuf::from("/System/Library/Java/JavaVirtualMachines"),
            PathBuf::from("/usr/local/opt/openjdk"),
        ];

        // Add SDKMAN managed versions
        if let Some(home) = dirs::home_dir() {
            paths.push(home.join(".sdkman/candidates/java"));
            paths.push(home.join(".jenv/versions"));
            paths.push(home.join(".jabba/jdk"));
            // Homebrew locations
            paths.push(PathBuf::from("/opt/homebrew/opt/openjdk"));
            paths.push(home.join("homebrew/opt/openjdk"));
        }

        paths.into_iter().filter(|p| p.exists()).collect()
    }

    fn get_node_scan_paths(&self) -> Vec<PathBuf> {
        let mut paths = vec![PathBuf::from("/usr/local/bin/node")];

        if let Some(home) = dirs::home_dir() {
            // nvm
            paths.push(home.join(".nvm/versions/node"));
            // fnm
            paths.push(home.join(".fnm/node-versions"));
            paths.push(home.join("Library/Application Support/fnm/node-versions"));
            // volta
            paths.push(home.join(".volta/tools/image/node"));
            // Homebrew
            paths.push(PathBuf::from("/opt/homebrew/opt/node"));
        }

        paths.into_iter().filter(|p| p.exists()).collect()
    }

    fn get_shell_config_file(&self) -> PathBuf {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("~"));
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

        if shell.contains("zsh") {
            home.join(".zshrc")
        } else if shell.contains("bash") {
            home.join(".bash_profile")
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
        Command::new("open")
            .args(["-a", "Terminal", cwd.to_str().unwrap_or(".")])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
        Ok(())
    }

    fn open_file_manager(&self, path: &Path) -> Result<(), String> {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open Finder: {}", e))?;
        Ok(())
    }

    fn open_browser(&self, url: &str) -> Result<(), String> {
        Command::new("open")
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
        let output = Command::new("lsof")
            .args(["-ti", &format!(":{}", port)])
            .output()
            .ok()?;

        if output.status.success() {
            let pid_str = String::from_utf8_lossy(&output.stdout);
            pid_str.trim().lines().next()?.parse().ok()
        } else {
            None
        }
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

/// macOS shell executor using zsh/bash
pub struct MacOSShellExecutor {
    shell: String,
}

impl Default for MacOSShellExecutor {
    fn default() -> Self {
        // Detect user's default shell
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        Self { shell }
    }
}

impl ShellExecutor for MacOSShellExecutor {
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
            Some(home.join(".bash_profile"))
        } else {
            None
        }
    }
}

/// SDKMAN version manager for macOS
pub struct SdkmanManager {
    executor: MacOSShellExecutor,
    sdkman_dir: PathBuf,
}

impl SdkmanManager {
    pub fn new() -> Self {
        let sdkman_dir = dirs::home_dir()
            .map(|h| h.join(".sdkman"))
            .unwrap_or_else(|| PathBuf::from("~/.sdkman"));

        Self {
            executor: MacOSShellExecutor::default(),
            sdkman_dir,
        }
    }
}

impl Default for SdkmanManager {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionManagerOps for SdkmanManager {
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

/// NVM version manager for macOS
pub struct NvmManager {
    executor: MacOSShellExecutor,
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
            executor: MacOSShellExecutor::default(),
            nvm_dir,
        }
    }
}

impl Default for NvmManager {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionManagerOps for NvmManager {
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

/// jEnv version manager for macOS
pub struct JenvManager {
    executor: MacOSShellExecutor,
    jenv_dir: PathBuf,
}

impl JenvManager {
    pub fn new() -> Self {
        let jenv_dir = dirs::home_dir()
            .map(|h| h.join(".jenv"))
            .unwrap_or_else(|| PathBuf::from("~/.jenv"));

        Self {
            executor: MacOSShellExecutor::default(),
            jenv_dir,
        }
    }
}

impl Default for JenvManager {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionManagerOps for JenvManager {
    fn is_installed(&self) -> bool {
        self.jenv_dir.exists() && self.jenv_dir.join("bin/jenv").exists()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("jEnv is not installed".to_string());
        }

        let output = self.executor.execute("jenv versions --bare")?;
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

        self.executor.execute(&format!("jenv global {}", version))?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("jEnv is not installed".to_string());
        }

        match self.executor.execute("jenv version-name") {
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

/// Get the platform-specific implementation
#[allow(dead_code)]
pub fn get_platform() -> MacOSPlatform {
    MacOSPlatform::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shell_executor() {
        let executor = MacOSShellExecutor::default();
        let result = executor.execute("echo hello");
        assert!(result.is_ok());
        assert!(result.unwrap().contains("hello"));
    }

    #[test]
    fn test_platform_ops() {
        let platform = MacOSPlatform::new();

        // Test config dir
        let config_dir = platform.get_config_dir();
        assert!(config_dir.to_string_lossy().contains("aem-env-manager"));

        // Test shell config file
        let shell_config = platform.get_shell_config_file();
        assert!(
            shell_config.to_string_lossy().contains(".zshrc")
                || shell_config.to_string_lossy().contains(".bash_profile")
        );
    }
}
