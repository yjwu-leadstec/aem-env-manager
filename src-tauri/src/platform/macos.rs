// macOS-specific implementations

use super::common::{ShellExecutor, VersionManagerOps};
use std::path::PathBuf;
use std::process::Command;

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

    fn execute_env_command(&self, command: &str, env_vars: &[(&str, &str)]) -> Result<String, String> {
        let mut cmd = Command::new(&self.shell);
        cmd.args(["-c", command]);

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
        Ok(output.lines().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect())
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
        let nvm_dir = std::env::var("NVM_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
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
        Ok(output.lines().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect())
    }

    fn switch_version(&self, version: &str) -> Result<(), String> {
        if !self.is_installed() {
            return Err("NVM is not installed".to_string());
        }

        let command = format!(
            "source {}/nvm.sh && nvm use {}",
            self.nvm_dir.display(),
            version
        );

        self.executor.execute(&command)?;
        Ok(())
    }

    fn current_version(&self) -> Result<Option<String>, String> {
        if !self.is_installed() {
            return Err("NVM is not installed".to_string());
        }

        let command = format!(
            "source {}/nvm.sh && nvm current",
            self.nvm_dir.display()
        );

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
