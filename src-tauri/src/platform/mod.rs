// Platform-specific implementations
// Conditional compilation for macOS and Windows

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

// Re-export common traits and types
pub mod common;

pub use common::*;

// Platform-specific re-exports (for external API use)
#[cfg(target_os = "macos")]
#[allow(unused_imports)]
pub use macos::{get_platform, MacOSPlatform};

#[cfg(target_os = "windows")]
pub use windows::{get_platform, WindowsPlatform};

/// Get the current platform implementation
#[cfg(target_os = "macos")]
pub fn current_platform() -> impl PlatformOps {
    macos::MacOSPlatform::new()
}

#[cfg(target_os = "windows")]
pub fn current_platform() -> impl PlatformOps {
    windows::WindowsPlatform::new()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn current_platform() -> impl PlatformOps {
    compile_error!("Unsupported platform")
}
