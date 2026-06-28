

mod project;

pub use project::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .manage(project::ServerState::default())
        .invoke_handler(tauri::generate_handler![
            project::create_project,
            project::save_project,
            project::load_project,
            project::list_projects,
            project::delete_project,
            project::start_asset_server,
            project::stop_asset_server,
            project::copy_asset,
            project::save_base64_asset,
            project::read_asset_as_base64,
            project::write_export_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
