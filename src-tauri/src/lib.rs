// AEM Environment Manager - Tauri Backend Library

mod commands;
mod platform;

use commands::{
    // Profile commands
    create_profile, delete_profile, get_active_profile, get_profile, list_profiles, switch_profile,
    update_profile,
    // Version commands
    detect_version_managers, get_current_java_version, get_current_maven_config,
    get_current_node_version, get_managed_versions, import_maven_config, install_java_version,
    install_node_version, list_maven_configs, scan_java_versions, scan_node_versions,
    switch_java_version, switch_maven_config, switch_node_version,
    // Instance commands
    add_instance, check_instance_health, delete_instance, get_credentials, get_instance,
    list_instances, open_in_browser, start_instance, stop_instance, store_credentials,
    update_instance,
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
            // Version commands - Java
            scan_java_versions,
            get_current_java_version,
            switch_java_version,
            install_java_version,
            // Version commands - Node
            scan_node_versions,
            get_current_node_version,
            switch_node_version,
            install_node_version,
            // Version commands - Version Managers
            detect_version_managers,
            get_managed_versions,
            // Version commands - Maven
            list_maven_configs,
            get_current_maven_config,
            switch_maven_config,
            import_maven_config,
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
