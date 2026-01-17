// AEM Environment Manager - Tauri Backend Library

mod commands;
mod platform;

use commands::{
    // Profile commands
    list_profiles, get_profile, create_profile, update_profile, delete_profile,
    switch_profile, get_active_profile,
    // Version commands
    detect_version_managers, get_managed_versions, get_current_java_version,
    get_current_node_version, switch_java_version, switch_node_version,
    install_java_version, install_node_version,
    // Instance commands
    list_instances, get_instance, add_instance, update_instance, delete_instance,
    start_instance, stop_instance, check_instance_health, store_credentials,
    get_credentials, open_in_browser,
};

/// Initialize and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Profile commands
            list_profiles,
            get_profile,
            create_profile,
            update_profile,
            delete_profile,
            switch_profile,
            get_active_profile,
            // Version commands
            detect_version_managers,
            get_managed_versions,
            get_current_java_version,
            get_current_node_version,
            switch_java_version,
            switch_node_version,
            install_java_version,
            install_node_version,
            // Instance commands
            list_instances,
            get_instance,
            add_instance,
            update_instance,
            delete_instance,
            start_instance,
            stop_instance,
            check_instance_health,
            store_credentials,
            get_credentials,
            open_in_browser,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
