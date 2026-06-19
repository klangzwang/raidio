use crate::handler;
use crate::keys;
use crate::tesseract;
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

pub fn start_up(builder: Builder<Wry>) -> Builder<Wry> {
    builder
        .invoke_handler(tauri::generate_handler![
            handler::open_window_process,
            handler::close_radial_app,
            window::get_tracked_window_metrics,
            keys::convert_sav_to_json,
            keys::get_key_for_action,
            tesseract::extract_text_from_coordinates,
            tesseract::extract_text_from_coordinates_extent,
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // 1. Fenster und Tray instanziieren
            open_tray_icon(&app_handle);
            open_raidio_window(&app_handle);
            open_radial_window(&app_handle);

            // 2. Jetzt existieren die Fenster! Zeit die Hooks anzufeuern:
            window::start_tracking(&app_handle);
            keys::start_hooks(&app_handle);

            Ok(())
        })
}
