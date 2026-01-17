// Windows-specific implementations

use super::common::{ShellExecutor, VersionManagerOps};
use std::path::PathBuf;
use std::process::Command;

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

    fn execute_env_command(&self, command: &str, env_vars: &[(&str, &str)]) -> Result<String, String> {
        let mut cmd = Command::new("powershell");
        cmd.args(["-NoProfile", "-Command", command]);

        for (key, value) in env_vars {
            cmd.env(key, value);
        }

        let output = cmd.output()
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
        let jabba_dir = std::env::var("JABBA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
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

impl VersionManagerOps for JabbaManager {
    fn is_installed(&self) -> bool {
        self.jabba_dir.exists() && self.jabba_dir.join("bin/jabba.exe").exists()
    }

    fn list_versions(&self) -> Result<Vec<String>, String> {
        if !self.is_installed() {
            return Err("Jabba is not installed".to_string());
        }

        let jabba_bin = self.jabba_dir.join("bin/jabba.exe");
        let output = self.executor.execute(&format!("& '{}' ls", jabba_bin.display()))?;

        Ok(output.lines().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("Jabba is not installed".to_string());
        }

        let jabba_bin = self.jabba_dir.join("bin/jabba.exe");
        self.executor.execute(&format!("& '{}' use {}", jabba_bin.display(), version))?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("Jabba is not installed".to_string());
        }

        let jabba_bin = self.jabba_dir.join("bin/jabba.exe");
        match self.executor.execute(&format!("& '{}' current", jabba_bin.display())) {
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
                    Some(trimmed.split('@').nth(1)?.split_whitespace().next()?.to_string())
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

        self.executor.execute(&format!("volta pin node@{}", version))?;
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
                if let Some(version) = path.split(['/', '\\']).find(|s| s.starts_with("node-v") || s.starts_with('v')) {
                    Ok(Some(version.trim_start_matches("node-").to_string()))
                } else {
                    Ok(None)
                }
            }
            Err(_) => Ok(None),
        }
    }
}
