//! App FCT (escritorio). La interfaz es la misma que la web; aquí solo se añaden los permisos para
//! leer y escribir el Excel de la carpeta de OneDrive y la actualización automática desde GitHub Releases.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("no se ha podido iniciar App FCT");
}
