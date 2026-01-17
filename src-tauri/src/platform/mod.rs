// Platform-specific implementations
// Conditional compilation for macOS and Windows

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

// Re-export common traits and types
pub mod common;

pub use common::*;
