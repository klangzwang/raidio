use std::{thread, time::Duration};
use tauri::{Emitter, WebviewWindow};

#[tauri::command]
pub fn close_raidio_app() {
    std::process::exit(0);
}

#[tauri::command]
pub fn open_window_process(window: WebviewWindow) {
    thread::spawn(move || {
        let mut last_state = false;
        let search_term = "xnview";

        loop {
            let output = std::process::Command::new("tasklist")
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).contains(search_term))
                .unwrap_or(false);

            if output != last_state {
                last_state = output;
                let _ = window.emit("process-changed", output);
            }
            thread::sleep(Duration::from_secs(2));
        }
    });
}
