use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::sync::{Arc, Mutex};
use tauri::{Builder, Emitter, Manager, Wry};
use windows_sys::Win32::Foundation::{HWND, LPARAM, RECT};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetForegroundWindow, GetWindow, GetWindowLongPtrW, GetWindowRect, GetWindowTextW,
    IsIconic, IsWindow, IsWindowVisible, GWL_EXSTYLE, GW_OWNER, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
};

#[derive(Clone, serde::Serialize, PartialEq)]
pub struct GameWindowMetrics {
    pub running: bool,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub is_visible: bool,
    pub is_focused: bool,
}

pub type SharedWindowMetrics = Arc<Mutex<Option<GameWindowMetrics>>>;

fn get_window_metrics(game_hwnd: HWND) -> Option<GameWindowMetrics> {
    unsafe {
        // 1. Check: Existiert das Fenster überhaupt noch?
        // Wenn nicht, geben wir None zurück, damit der Tracker den Reset ausführt!
        if IsWindow(game_hwnd) == 0 {
            return None;
        }

        // 2. Check: Ist das Fenster unsichtbar? (Existiert, aber versteckt)
        if IsWindowVisible(game_hwnd) == 0 {
            return Some(GameWindowMetrics {
                running: true, // Das Spiel läuft noch!
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                is_visible: false,
                is_focused: false,
            });
        }

        // 3. Check: Ist das Fenster minimiert?
        if IsIconic(game_hwnd) != 0 {
            return Some(GameWindowMetrics {
                running: true, // Läuft noch!
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                is_visible: false,
                is_focused: false,
            });
        }

        // 4. Metriken abrufen, wenn das Fenster sichtbar und nicht minimiert ist
        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(game_hwnd, &mut rect) != 0 {
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;

            let is_focused = GetForegroundWindow() == game_hwnd;

            Some(GameWindowMetrics {
                running: true,
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

fn start_window_tracking(windows: Vec<tauri::WebviewWindow>, shared_metrics: SharedWindowMetrics) {
    tauri::async_runtime::spawn(async move {
        let mut target_hwnd: Option<HWND> = None;
        let mut last_metrics: Option<GameWindowMetrics> = None;

        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(160)).await;

            if target_hwnd.is_none() {
                target_hwnd = get_window_from_taskbar("ARC Raiders");

                if target_hwnd.is_none() {
                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = None;
                    }
                    continue;
                }
            }

            if let Some(hwnd) = target_hwnd {
                if let Some(metrics) = get_window_metrics(hwnd) {
                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = Some(metrics.clone());
                    }

                    if last_metrics.as_ref() != Some(&metrics) {
                        if metrics.is_visible && metrics.width > 0 {
                            println!(
                                "[Raidio-Tracker] Update Metriken für alle Overlays -> x:{}, y:{}, w:{}, h:{}",
                                metrics.x, metrics.y, metrics.width, metrics.height
                            );

                            for window in &windows {
                                let _ =
                                    window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
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
                            }
                        } else {
                            println!("[Raidio-Tracker] Fenster minimiert/unsichtbar. Verstecke alle Overlays.");
                            for window in &windows {
                                let _ = window.hide();
                            }
                        }

                        last_metrics = Some(metrics);
                    }
                } else {
                    println!(
                        "[Raidio-Tracker] Fenster wurde geschlossen. Suche beginnt von vorn..."
                    );
                    target_hwnd = None;
                    last_metrics = None;

                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = None;
                    }

                    for window in &windows {
                        let _ = window.emit("window-closed", ());
                        let _ = window.hide();
                    }
                }
            }
        }
    });
}

//
//
//
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

pub fn start_tracking(app_handle: &tauri::AppHandle, window_labels: &[&str]) {
    let mut tracked_windows = Vec::new();

    for label in window_labels {
        if let Some(win) = app_handle.get_webview_window(label) {
            tracked_windows.push(win);
        } else {
            println!(
                "[Raidio-Tracker] WARNUNG: Overlay-Fenster '{}' konnte nicht gefunden werden!",
                label
            );
        }
    }

    if !tracked_windows.is_empty() {
        let shared_metrics = app_handle.state::<SharedWindowMetrics>().inner().clone();
        start_window_tracking(tracked_windows, shared_metrics);
    } else {
        println!(
            "[Raidio-Tracker] FEHLER: Keine gültigen Overlay-Fenster für das Tracking gefunden!"
        );
    }
}

//
//
//
fn get_window_from_taskbar(win_name: &str) -> Option<HWND> {
    let windows = collect_taskbar_windows();
    // println!("[Taskleiste] {} Fenster gefunden:", windows.len());
    for (hwnd, title) in windows {
        let exakter_treffer = title == win_name;
        if exakter_treffer {
            return Some(hwnd);
        }
    }
    None
}

fn collect_taskbar_windows() -> Vec<(HWND, String)> {
    let windows_list: Arc<Mutex<Vec<(HWND, String)>>> = Arc::new(Mutex::new(Vec::new()));
    let windows_ptr = Arc::into_raw(Arc::clone(&windows_list));

    unsafe {
        EnumWindows(Some(enum_taskbar_callback), windows_ptr as LPARAM);
        let _ = Arc::from_raw(windows_ptr);
    }
    Arc::try_unwrap(windows_list)
        .unwrap_or_else(|_| panic!("Borrow Checker Macarena fehlgeschlagen!"))
        .into_inner()
        .unwrap()
}

unsafe extern "system" fn enum_taskbar_callback(hwnd: HWND, lparam: LPARAM) -> i32 {
    // Hier reicht IsWindowVisible, da wir nur aktiv sichtbare Fenster in der Taskleiste suchen wollen.
    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }

    let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
    let has_appwindow = ex_style & WS_EX_APPWINDOW != 0;
    let has_toolwindow = ex_style & WS_EX_TOOLWINDOW != 0;
    let has_owner = GetWindow(hwnd, GW_OWNER) != 0;

    let show_in_taskbar = has_appwindow || (!has_owner && !has_toolwindow);
    if !show_in_taskbar {
        return 1;
    }

    let mut buffer = [0u16; 512];
    let length = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
    if length <= 0 {
        return 1;
    }

    let title = OsString::from_wide(&buffer[..length as usize])
        .to_string_lossy()
        .into_owned();

    let windows = &*(lparam as *const Mutex<Vec<(HWND, String)>>);
    if let Ok(mut lock) = windows.lock() {
        lock.push((hwnd, title));
    }

    1
}
