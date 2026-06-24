use crate::keys;
use crate::window;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Builder, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

pub fn open_tray_icon(app: &tauri::AppHandle) {
    let show_raidio =
        MenuItem::with_id(app, "show_raidio", "Show Raidio", true, None::<&str>).unwrap();
    let quit = MenuItem::with_id(app, "quit", "Beenden", true, None::<&str>).unwrap();
    let menu = Menu::with_items(app, &[&show_raidio, &quit]).unwrap();

    TrayIconBuilder::with_id("raidio-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Raidio")
        .icon(app.default_window_icon().unwrap().clone())
        .on_menu_event(|app, event| {
            if event.id == "show_raidio" {
                if let Some(window) = app.get_webview_window("raidio") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            } else if event.id == "quit" {
                app.exit(0);
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("raidio") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)
        .expect("Failed to build tray icon");
}

pub fn open_raidio_window(app: &tauri::AppHandle) {
    let raidio_builder =
        WebviewWindowBuilder::new(app, "raidio", WebviewUrl::App("raidio.html".into()))
            .title("Raidio")
            .inner_size(400.0, 720.0)
            .visible(true)
            .skip_taskbar(false)
            .decorations(false)
            .transparent(true)
            .resizable(false)
            .always_on_top(false)
            .shadow(false);

    raidio_builder
        .build()
        .expect("Failed to build raidio window");
}

pub fn open_radial_window(app: &tauri::AppHandle) {
    let radial_builder =
        WebviewWindowBuilder::new(app, "radial", WebviewUrl::App("radial.html".into()))
            .title("Radial")
            .visible(false)
            .skip_taskbar(true)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .focusable(false)
            .shadow(false);

    radial_builder
        .build()
        .expect("Failed to build radial window");
}

// pub fn open_panel_window(app: &tauri::AppHandle) {
//     let panel_builder =
//         WebviewWindowBuilder::new(app, "panel", WebviewUrl::App("panel.html".into()))
//             .title("Panel")
//             .visible(false)
//             .skip_taskbar(true)
//             .decorations(false)
//             .transparent(true)
//             .always_on_top(true)
//             .focusable(false)
//             .shadow(false);

//     panel_builder.build().expect("Failed to build panel window");
// }

#[tauri::command]
pub fn close_raidio_app() {
    std::process::exit(0);
}

pub fn start_up(builder: Builder<Wry>) -> Builder<Wry> {
    builder
        .invoke_handler(tauri::generate_handler![
            close_raidio_app,
            keys::convert_keyboard_sav,
            keys::convert_sav_to_json,
            keys::get_key_for_action,
            window::get_tracked_window_metrics
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            open_tray_icon(&app_handle);
            open_raidio_window(&app_handle);
            open_radial_window(&app_handle);
            // open_panel_window(&app_handle);

            let tracked_windows = ["radial"];
            window::start_tracking(&app_handle, &tracked_windows);
            keys::start_hooks(&app_handle);

            Ok(())
        })
}
