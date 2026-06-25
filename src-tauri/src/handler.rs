
#[tauri::command]
pub fn close_raidio_app() {
    std::process::exit(0);
}

#[tauri::command]
pub fn install_voicemeeter() -> Result<(), String> {
    // TODO: Voicemeeter-Installationslogik hier implementieren
    Err("install_voicemeeter ist noch nicht implementiert.".to_string())
}
