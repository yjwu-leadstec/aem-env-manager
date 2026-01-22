// Window management commands

use tauri::Manager;

/// Hide window and remove from Dock (macOS)
#[tauri::command]
pub async fn hide_to_tray(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }

    // On macOS, set activation policy to Accessory to hide from Dock
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    }

    Ok(())
}

/// Show window and restore to Dock (macOS)
#[tauri::command]
pub async fn show_from_tray(app: tauri::AppHandle) -> Result<(), String> {
    // On macOS, set activation policy back to Regular to show in Dock
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
    }

    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.unminimize().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}
