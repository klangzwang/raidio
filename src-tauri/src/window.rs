use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::sync::{Arc, Mutex};
use tauri::{Builder, Wry};
use tauri::{Emitter, Manager};
use windows_sys::Win32::Foundation::{HWND, LPARAM, RECT};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetForegroundWindow, GetWindowRect, GetWindowTextW, IsIconic, IsWindowVisible,
};

const PROCESS_SEARCH_TERM: &str = "xnview";

#[derive(Clone, serde::Serialize, PartialEq)]
pub struct GameWindowMetrics {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub is_visible: bool,
    pub is_focused: bool,
}

pub type SharedWindowMetrics = Arc<Mutex<Option<GameWindowMetrics>>>;

struct SearchContext {
    target_substring: String,
    found_hwnd: Option<HWND>,
}

unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> i32 {
    let context = &mut *(lparam as *mut SearchContext);

    if IsWindowVisible(hwnd) != 0 {
        let mut buffer = [0u16; 512];
        let length = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);

        if length > 0 {
            let window_title = OsString::from_wide(&buffer[..length as usize])
                .to_string_lossy()
                .to_lowercase();

            if window_title.contains(&context.target_substring) {
                context.found_hwnd = Some(hwnd);
                return 0;
            }
        }
    }
    1
}

fn find_game_window_contains(substring: &str) -> Option<HWND> {
    let mut context = SearchContext {
        target_substring: substring.to_lowercase(),
        found_hwnd: None,
    };

    unsafe {
        EnumWindows(
            Some(enum_windows_callback),
            &mut context as *mut SearchContext as LPARAM,
        );
    }

    context.found_hwnd
}

fn get_window_metrics(game_hwnd: HWND) -> Option<GameWindowMetrics> {
    unsafe {
        if IsWindowVisible(game_hwnd) == 0 {
            return Some(GameWindowMetrics {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                is_visible: false,
                is_focused: false,
            });
        }

        if IsIconic(game_hwnd) != 0 {
            return Some(GameWindowMetrics {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                is_visible: false,
                is_focused: false,
            });
        }

        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(game_hwnd, &mut rect) != 0 {
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;
            let is_focused = GetForegroundWindow() == game_hwnd;

            Some(GameWindowMetrics {
                x: rect.left,
                y: rect.top,
                width,
                height,
                is_visible: true,
                is_focused,
            })
        } else {
            None
        }
    }
}

fn start_window_tracking(window: tauri::WebviewWindow, shared_metrics: SharedWindowMetrics) {
    tauri::async_runtime::spawn(async move {
        let mut target_hwnd: Option<HWND> = None;
        let mut last_metrics: Option<GameWindowMetrics> = None;

        // println!(
        //     "[Raidio-Tracker] Starte Suche nach Fenster mit: '{}'",
        //     PROCESS_SEARCH_TERM
        // );

        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(16)).await;

            if target_hwnd.is_none() {
                target_hwnd = find_game_window_contains(PROCESS_SEARCH_TERM);
                if target_hwnd.is_none() {
                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = None;
                    }
                    continue;
                }
                // else {
                //     println!(
                //         "[Raidio-Tracker] HOOK ERFOLGREICH! Fenster '{}' gefunden.",
                //         PROCESS_SEARCH_TERM
                //     );
                // }
            }

            if let Some(hwnd) = target_hwnd {
                if let Some(metrics) = get_window_metrics(hwnd) {
                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = Some(metrics.clone());
                    }

                    if last_metrics.as_ref() != Some(&metrics) {
                        if metrics.is_visible && metrics.width > 0 {
                            // println!(
                            //     "[Raidio-Tracker] Update Metriken -> x:{}, y:{}, w:{}, h:{}",
                            //     metrics.x, metrics.y, metrics.width, metrics.height
                            // );

                            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                                width: metrics.width as u32,
                                height: metrics.height as u32,
                            }));

                            let _ = window.set_position(tauri::Position::Physical(
                                tauri::PhysicalPosition {
                                    x: metrics.x,
                                    y: metrics.y,
                                },
                            ));

                            let _ = window.emit("game-status-changed", metrics.clone());
                        } else {
                            // println!("[Raidio-Tracker] Fenster minimiert oder unsichtbar. Verstecke Overlay.");
                            let _ = window.hide();
                        }

                        last_metrics = Some(metrics);
                    }
                } else {
                    // println!(
                    //     "[Raidio-Tracker] Fenster '{}' VERLOREN! Warte auf Neustart...",
                    //     PROCESS_SEARCH_TERM
                    // );
                    target_hwnd = None;
                    last_metrics = None;
                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = None;
                    }
                }
            }
        }
    });
}

#[tauri::command]
pub fn get_tracked_window_metrics(
    state: tauri::State<'_, SharedWindowMetrics>,
) -> Option<GameWindowMetrics> {
    state.lock().unwrap().clone()
}

pub fn init_state(builder: Builder<Wry>) -> Builder<Wry> {
    let shared_metrics: SharedWindowMetrics = Arc::new(Mutex::new(None));
    builder.manage(shared_metrics)
}

pub fn start_tracking(app_handle: &tauri::AppHandle) {
    // if let Some(panel_win) = app_handle.get_webview_window("panel") {
    //     let shared_metrics = app_handle.state::<SharedWindowMetrics>().inner().clone();
    //     start_window_tracking(panel_win, shared_metrics);
    // } else {
    //     println!("[Raidio-Tracker] FEHLER: Overlay Panel Window konnte beim Tracking-Start nicht gefunden werden!");
    // }
    if let Some(radial_win) = app_handle.get_webview_window("radial") {
        let shared_metrics = app_handle.state::<SharedWindowMetrics>().inner().clone();
        start_window_tracking(radial_win, shared_metrics);
    } else {
        println!("[Raidio-Tracker] FEHLER: Overlay Radial Window konnte beim Tracking-Start nicht gefunden werden!");
    }
}
