mod handler;
mod keys;
mod process;
mod tesseract;
mod window;

use tauri::{Emitter, Manager};

#[derive(Clone, serde::Serialize)]
struct SingleInstancePayload {
    args: Vec<String>,
    cwd: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            let _ = app.emit("single-instance", SingleInstancePayload { args: argv, cwd });
            if let Some(window) = app.get_webview_window("raidio") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_log::Builder::default().build());

    // 1. Wir initialisieren NUR den State für das Window Tracking
    let metrics_builder = window::init_state(builder);

    // 2. Wir starten den zentralen Process Builder
    let process_builder = process::start_up(metrics_builder);

    process_builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
