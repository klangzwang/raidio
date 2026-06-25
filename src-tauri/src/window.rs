use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::sync::{Arc, Mutex};
use tauri::{Builder, Emitter, Manager, Wry};
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
use windows::Win32::UI::WindowsAndMessaging::{
    AdjustWindowRectEx, EnumWindows, GetForegroundWindow, GetSystemMetrics, GetWindow,
    GetWindowLongPtrW, GetWindowPlacement, GetWindowRect, GetWindowTextW, IsIconic,
    IsWindowVisible, GWL_EXSTYLE, GWL_STYLE, GW_OWNER, SM_CXSCREEN, SM_CYSCREEN, SW_SHOWMAXIMIZED,
    WINDOWPLACEMENT, WINDOW_EX_STYLE, WINDOW_STYLE, WS_CAPTION, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
    WS_THICKFRAME,
};

/// Wrapper um HWND, damit er über thread-Grenzen (Send) transportiert werden kann.
/// HWND ist intern ein *mut c_void, was Rust als nicht-Send einstuft.
struct SendableHwnd(usize);
unsafe impl Send for SendableHwnd {}

impl SendableHwnd {
    fn hwnd(&self) -> HWND {
        HWND(self.0 as *mut core::ffi::c_void)
    }
}

#[derive(Clone, serde::Serialize, PartialEq)]
pub struct GameWindowMetrics {
    pub is_fullscreen: bool,
    pub is_borderless_fullscreen: bool,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_visible: bool,
    pub is_focused: bool,
    pub is_minimized: bool,
}

pub type SharedWindowMetrics = Arc<Mutex<Option<GameWindowMetrics>>>;

fn get_window_metrics(hwnd: HWND) -> Option<GameWindowMetrics> {
    unsafe {
        let mut rect = RECT::default();
        let _ = GetWindowRect(hwnd, &mut rect)
            .map_err(|e| format!("GetWindowRect fehlgeschlagen: {}", e));

        // Fensterstile abfragen, um die exakten Rahmenbedingungen zu bestimmen
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;

        // Der "Inception-Trick": Wir füttern AdjustWindowRectEx ein leeres Rect (0,0,0,0).
        // Windows rechnet uns dann die negativen Offsets für die Ränder und die Titlebar aus.
        let mut border_rect = RECT::default();
        let _ = AdjustWindowRectEx(
            &mut border_rect,
            WINDOW_STYLE(style),
            false, // Spiele haben in 99.9% der Fälle kein klassisches Win32-Menü
            WINDOW_EX_STYLE(ex_style),
        );

        // Jetzt ziehen wir die berechneten Rahmen-Deltas vom originalen WindowRect ab.
        // Da border_rect.left/top negativ sind (z.B. -8, -31), verschiebt sich der Punkt nach innen.
        let client_left = rect.left - border_rect.left;
        let client_top = rect.top - border_rect.top;
        let client_right = rect.right - border_rect.right;
        let client_bottom = rect.bottom - border_rect.bottom;

        let width = (client_right - client_left).max(0) as u32;
        let height = (client_bottom - client_top).max(0) as u32;

        let is_visible = IsWindowVisible(hwnd).as_bool();
        let is_minimized = IsIconic(hwnd).as_bool();

        let foreground = GetForegroundWindow();
        let is_focused = foreground == hwnd;

        let mut placement = WINDOWPLACEMENT {
            length: std::mem::size_of::<WINDOWPLACEMENT>() as u32,
            ..Default::default()
        };
        let is_maximized = if GetWindowPlacement(hwnd, &mut placement).is_ok() {
            placement.showCmd == SW_SHOWMAXIMIZED.0 as u32
        } else {
            false
        };

        // Bildschirmauflösung ermitteln, um "echtes" Vollbild
        // (Fenstergröße == Bildschirmgröße) zu erkennen.
        let (screen_w, screen_h) = primary_screen_size();
        let covers_screen = width >= screen_w && height >= screen_h;

        // Fensterstil prüfen: kein Rahmen/Titelleiste => randlos.
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let has_caption = (style & WS_CAPTION.0) != 0;
        let has_thickframe = (style & WS_THICKFRAME.0) != 0;
        let is_borderless = !has_caption && !has_thickframe;

        let is_borderless_fullscreen = is_borderless && covers_screen;
        let is_fullscreen = is_maximized || covers_screen;

        return Some(GameWindowMetrics {
            is_fullscreen,
            is_borderless_fullscreen,
            x: client_left,
            y: client_top,
            width,
            height,
            is_visible,
            is_focused,
            is_minimized,
        });
    }
}

unsafe fn primary_screen_size() -> (u32, u32) {
    let w = GetSystemMetrics(SM_CXSCREEN).max(0) as u32;
    let h = GetSystemMetrics(SM_CYSCREEN).max(0) as u32;
    (w, h)
}

// fn get_window_metrics(game_hwnd: HWND) -> Option<GameWindowMetrics> {
//     unsafe {
//         // 1. Check: Existiert das Fenster überhaupt noch?
//         // Wenn nicht, geben wir None zurück, damit der Tracker den Reset ausführt!
//         if !IsWindow(game_hwnd).as_bool() {
//             return None;
//         }

//         // 2. Check: Ist das Fenster unsichtbar? (Existiert, aber versteckt)
//         if !IsWindowVisible(game_hwnd).as_bool() {
//             return Some(GameWindowMetrics {
//                 x: 0,
//                 y: 0,
//                 width: 0,
//                 height: 0,
//                 is_visible: false,
//                 is_focused: false,
//                 is_minimized: false,
//             });
//         }

//         // 3. Check: Ist das Fenster minimiert?
//         if IsIconic(game_hwnd).as_bool() {
//             return Some(GameWindowMetrics {
//                 x: 0,
//                 y: 0,
//                 width: 0,
//                 height: 0,
//                 is_visible: false,
//                 is_focused: false,
//                 is_minimized: true,
//             });
//         }

//         // 4. Metriken abrufen, wenn das Fenster sichtbar und nicht minimiert ist
//         let mut client_rect: RECT = std::mem::zeroed();

//         // Holt uns den reinen Inhaltsbereich
//         if GetClientRect(game_hwnd, &mut client_rect).is_ok() {
//             let width = client_rect.right - client_rect.left;
//             let height = client_rect.bottom - client_rect.top;

//             // Lokalen Nullpunkt definieren
//             let mut top_left = POINT { x: 0, y: 0 };

//             // Jetzt mit dem korrekten Import in globale Monitor-Koordinaten umrechnen
//             if ClientToScreen(game_hwnd, &mut top_left).as_bool() {
//                 let is_focused = GetForegroundWindow() == game_hwnd;

//                 return Some(GameWindowMetrics {
//                     x: top_left.x,
//                     y: top_left.y,
//                     width,
//                     height,
//                     is_visible: true,
//                     is_focused,
//                     is_minimized: false,
//                 });
//             }
//         }

//         None

//         // let mut rect: RECT = std::mem::zeroed();
//         // if GetWindowRect(game_hwnd, &mut rect).as_bool() {
//         //     let width = rect.right - rect.left;
//         //     let height = rect.bottom - rect.top;

//         //     let is_focused = GetForegroundWindow() == game_hwnd;

//         //     Some(GameWindowMetrics {
//         //         running: true,
//         //         x: rect.left,
//         //         y: rect.top,
//         //         width,
//         //         height,
//         //         is_visible: true,
//         //         is_focused,
//         //         is_minimized: false,
//         //     })
//         // } else {
//         //     None
//         // }
//     }
// }

fn start_window_tracking(windows: Vec<tauri::WebviewWindow>, shared_metrics: SharedWindowMetrics) {
    tauri::async_runtime::spawn(async move {
        // HWND ist nicht Send (roher Pointer), daher als usize speichern
        let mut target_hwnd: Option<SendableHwnd> = None;
        let mut last_metrics: Option<GameWindowMetrics> = None;

        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(160)).await;

            if target_hwnd.is_none() {
                target_hwnd =
                    get_window_from_taskbar("ARC Raiders").map(|h| SendableHwnd(h.0 as usize));

                if target_hwnd.is_none() {
                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = None;
                    }
                    continue;
                }
            }

            if let Some(ref hwnd_wrapper) = target_hwnd {
                let hwnd = hwnd_wrapper.hwnd();
                if let Some(metrics) = get_window_metrics(hwnd) {
                    {
                        let mut lock = shared_metrics.lock().unwrap();
                        *lock = Some(metrics.clone());
                    }

                    if last_metrics.as_ref() != Some(&metrics) {
                        if metrics.width > 0 {
                            println!(
                                "[Raidio-Tracker] Info -> x:{}, y:{}, w:{}, h:{}, is_focused:{}, is_minimized:{}, is_visible:{}",
                                metrics.x, metrics.y, metrics.width, metrics.height, metrics.is_focused, metrics.is_minimized, metrics.is_visible
                            );

                            if metrics.is_visible && metrics.is_focused && !metrics.is_minimized {
                                // println!(
                                //     "[Raidio-Tracker] Update Metriken für alle Overlays -> x:{}, y:{}, w:{}, h:{}",
                                //     metrics.x, metrics.y, metrics.width, metrics.height
                                // );

                                for window in &windows {
                                    let _ = window.set_size(tauri::Size::Physical(
                                        tauri::PhysicalSize {
                                            width: metrics.width as u32,
                                            height: metrics.height as u32,
                                        },
                                    ));

                                    let _ = window.set_position(tauri::Position::Physical(
                                        tauri::PhysicalPosition {
                                            x: metrics.x,
                                            y: metrics.y,
                                        },
                                    ));

                                    if !window.is_visible().expect("REASON") {
                                        let _ = window.show();
                                    }

                                    // let _ = window.emit("game-status-changed", metrics.clone());
                                }
                            } else {
                                println!("[Raidio-Tracker] Fenster minimiert/unsichtbar. Verstecke alle Overlays.");
                                for window in &windows {
                                    let _ = window.hide();
                                }
                            }
                        }

                        last_metrics = Some(metrics);
                    }
                } else {
                    println!(
                        "[Raidio-Tracker] Fenster wurde geschlossen. Suche beginnt von vorn..."
                    );
                    target_hwnd = None; // SendableHwnd wird gedroppt
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
    let cleaned_target = clean_string(win_name);

    for (hwnd, title) in windows {
        let cleaned_title = clean_string(&title);

        // if cleaned_title.contains("ARC") || title.contains("ARC") {
        //     println!(
        //         "[Taskleiste] Match-Versuch: Original='{}' -> Bereinigt='{}'",
        //         title, cleaned_title
        //     );
        // }

        if cleaned_title == cleaned_target {
            // println!(
            //     "[Taskleiste] Fenster erfolgreich gematcht! HWND: '{}'",
            //     hwnd
            // );
            return Some(hwnd);
        }
    }
    None
}

fn clean_string(input: &str) -> String {
    let mut result = String::new();

    for c in input.chars() {
        if c.is_whitespace() {
            result.push(' ');
        } else if c.is_ascii_alphanumeric() || c.is_ascii_punctuation() {
            result.push(c);
        }
    }
    result.split_whitespace().collect::<Vec<&str>>().join(" ")
}

fn collect_taskbar_windows() -> Vec<(HWND, String)> {
    let windows_list: Arc<Mutex<Vec<(HWND, String)>>> = Arc::new(Mutex::new(Vec::new()));
    let windows_ptr = Arc::into_raw(Arc::clone(&windows_list));

    unsafe {
        let _ = EnumWindows(Some(enum_taskbar_callback), LPARAM(windows_ptr as isize));
        let _ = Arc::from_raw(windows_ptr);
    }
    Arc::try_unwrap(windows_list)
        .unwrap_or_else(|_| panic!("Borrow Checker Macarena fehlgeschlagen!"))
        .into_inner()
        .unwrap()
}

unsafe extern "system" fn enum_taskbar_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    if !IsWindowVisible(hwnd).as_bool() {
        return BOOL(1);
    }

    let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
    let has_appwindow = ex_style & WS_EX_APPWINDOW.0 != 0;
    let has_toolwindow = ex_style & WS_EX_TOOLWINDOW.0 != 0;
    let has_owner = GetWindow(hwnd, GW_OWNER)
        .ok()
        .map_or(false, |owner| owner.0 != std::ptr::null_mut());

    let show_in_taskbar = has_appwindow || (!has_owner && !has_toolwindow);
    if !show_in_taskbar {
        return BOOL(1);
    }

    let mut buffer = [0u16; 512];
    let length = GetWindowTextW(hwnd, &mut buffer);
    if length <= 0 {
        return BOOL(1);
    }

    let title = OsString::from_wide(&buffer[..length as usize])
        .to_string_lossy()
        .into_owned();

    let windows = &*(lparam.0 as *const Mutex<Vec<(HWND, String)>>);

    if let Ok(mut lock) = windows.lock() {
        lock.push((hwnd, title));
    }

    BOOL(1)
}
