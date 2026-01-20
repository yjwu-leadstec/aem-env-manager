// AEM Environment Manager - Tauri Backend Library

mod commands;
mod platform;

use commands::{
    // Profile commands
    create_profile, delete_profile, duplicate_profile, export_profile, get_active_profile,
    get_profile, import_profile, list_profiles, load_app_config, save_app_config, switch_profile,
    update_profile, validate_profile,
    // Version commands
    create_maven_config, delete_maven_config, detect_version_managers, get_current_java_version,
    get_current_maven_config, get_current_node_version, get_managed_versions, get_maven_config_path,
    import_maven_config, install_java_version, install_node_version, list_maven_configs,
    open_maven_config_file, read_maven_config, scan_java_in_path, scan_java_versions,
    scan_maven_settings, scan_maven_settings_in_path, scan_node_in_path, scan_node_versions,
    switch_java_version, switch_maven_config, switch_node_version, validate_java_path, validate_node_path,
    // Instance commands
    add_instance, check_instance_health, delete_instance, detect_all_instances_status,
    detect_instance_status, get_credentials, get_instance, get_instance_urls, list_instances,
    open_in_browser, parse_jar_file, scan_aem_instances, scan_directory_for_jars, start_instance,
    stop_instance, store_credentials, update_instance,
    // License commands
    add_aem_license, associate_license_with_instance, check_license_file, delete_aem_license,
    get_aem_license, get_license_statistics, get_licenses_for_instance, import_license_from_file,
    list_aem_licenses, parse_license_file, read_license_file, scan_default_license_locations,
    scan_license_files, update_aem_license, validate_aem_license,
    // Settings commands
    export_all_config, import_all_config, load_scan_paths, reset_all_config, save_scan_paths,
    // Environment commands
    check_environment_status, get_current_symlinks, get_profile_environment,
    initialize_environment, remove_java_symlink, remove_node_symlink, remove_shell_config,
    set_java_symlink, set_node_symlink,
};

/// Initialize and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Profile commands
            list_profiles,
            get_profile,
            create_profile,
            update_profile,
            delete_profile,
            switch_profile,
            get_active_profile,
            validate_profile,
            load_app_config,
            save_app_config,
            export_profile,
            import_profile,
            duplicate_profile,
            // Version commands - Java
            scan_java_versions,
            get_current_java_version,
            switch_java_version,
            install_java_version,
            validate_java_path,
            scan_java_in_path,
            // Version commands - Node
            scan_node_versions,
            get_current_node_version,
            switch_node_version,
            install_node_version,
            validate_node_path,
            scan_node_in_path,
            // Version commands - Version Managers
            detect_version_managers,
            get_managed_versions,
            // Version commands - Maven
            list_maven_configs,
            scan_maven_settings,
            scan_maven_settings_in_path,
            get_current_maven_config,
            switch_maven_config,
            import_maven_config,
            delete_maven_config,
            read_maven_config,
            create_maven_config,
            open_maven_config_file,
            get_maven_config_path,
            // Instance commands
            list_instances,
            get_instance,
            add_instance,
            update_instance,
            delete_instance,
            start_instance,
            stop_instance,
            check_instance_health,
            detect_instance_status,
            detect_all_instances_status,
            scan_aem_instances,
            scan_directory_for_jars,
            parse_jar_file,
            store_credentials,
            get_credentials,
            open_in_browser,
            get_instance_urls,
            // License commands
            list_aem_licenses,
            get_aem_license,
            add_aem_license,
            update_aem_license,
            delete_aem_license,
            validate_aem_license,
            check_license_file,
            read_license_file,
            parse_license_file,
            associate_license_with_instance,
            get_licenses_for_instance,
            get_license_statistics,
            import_license_from_file,
            scan_license_files,
            scan_default_license_locations,
            // Settings commands
            load_scan_paths,
            save_scan_paths,
            export_all_config,
            import_all_config,
            reset_all_config,
            // Environment commands
            check_environment_status,
            initialize_environment,
            remove_shell_config,
            set_java_symlink,
            set_node_symlink,
            remove_java_symlink,
            remove_node_symlink,
            get_profile_environment,
            get_current_symlinks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
