// Platform-specific implementations
// Conditional compilation for macOS, Windows, and Linux

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub mod linux;

// Re-export common traits and types
pub mod common;

pub use common::*;

// Platform-specific re-exports (for external API use)
#[cfg(target_os = "macos")]
#[allow(unused_imports)]
pub use macos::{get_platform, MacOSPlatform};

#[cfg(target_os = "windows")]
pub use windows::{get_platform, WindowsPlatform};

#[cfg(target_os = "linux")]
#[allow(unused_imports)]
pub use linux::{get_platform, LinuxPlatform};

/// Get the current platform implementation
#[cfg(target_os = "macos")]
pub fn current_platform() -> impl PlatformOps {
    macos::MacOSPlatform::new()
}

#[cfg(target_os = "windows")]
pub fn current_platform() -> impl PlatformOps {
    windows::WindowsPlatform::new()
}

#[cfg(target_os = "linux")]
pub fn current_platform() -> impl PlatformOps {
    linux::LinuxPlatform::new()
}
