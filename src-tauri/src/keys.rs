use std::fs::File;
use std::path::PathBuf;
use std::thread;
use std::time::Duration;
use tauri::{command, Emitter};
use uesave::Save;
use windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;

#[command]
pub fn get_key_for_action(action_name: String) -> Result<String, String> {
    let file_path = get_keyboard_sav_path()?;
    if !file_path.exists() {
        return Err("SAV Datei nicht gefunden.".into());
    }
    let mut file = File::open(&file_path).map_err(|e| format!("{}", e))?;
    let save = Save::read(&mut file).map_err(|e| format!("{}", e))?;
    let json_value = serde_json::to_value(&save).map_err(|e| format!("{}", e))?;
    let ue_key = find_ue_key(&json_value, &action_name)
        .ok_or_else(|| "Aktion nicht gefunden".to_string())?;
    let raidio_key = map_ue_key_to_raidio(&ue_key).ok_or_else(|| "Mapping-Fehler".to_string())?;
    Ok(raidio_key.to_string())
}

fn find_ue_key(value: &serde_json::Value, action_name: &str) -> Option<String> {
    match value {
        serde_json::Value::Object(map) => {
            let map_str = serde_json::to_string(map).unwrap_or_default();
            if map_str.contains(action_name) {
                if let Some(key_node) = map.get("Key").or_else(|| map.get("KeyName")) {
                    if let Some(key_str) = extract_string_property(key_node) {
                        return Some(key_str);
                    }
                }
            }
            for (_, v) in map {
                if let Some(res) = find_ue_key(v, action_name) {
                    return Some(res);
                }
            }
        }
        serde_json::Value::Array(arr) => {
            for v in arr {
                if let Some(res) = find_ue_key(v, action_name) {
                    return Some(res);
                }
            }
        }
        _ => {}
    }
    None
}

fn extract_string_property(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Object(map) => {
            if let Some(serde_json::Value::String(s)) = map.get("NameProperty") {
                return Some(s.clone());
            }
            if let Some(serde_json::Value::String(s)) = map.get("KeyName") {
                return Some(s.clone());
            }
            for (_, v) in map {
                if let Some(s) = extract_string_property(v) {
                    return Some(s);
                }
            }
            None
        }
        _ => None,
    }
}

fn map_ue_key_to_raidio(ue_key: &str) -> Option<&'static str> {
    let clean_key = ue_key.replace("\"", "");
    match clean_key.as_str() {
        "A" => Some("KeyA"),
        "B" => Some("KeyB"),
        "C" => Some("KeyC"),
        "D" => Some("KeyD"),
        "E" => Some("KeyE"),
        "F" => Some("KeyF"),
        "G" => Some("KeyG"),
        "H" => Some("KeyH"),
        "I" => Some("KeyI"),
        "J" => Some("KeyJ"),
        "K" => Some("KeyK"),
        "L" => Some("KeyL"),
        "M" => Some("KeyM"),
        "N" => Some("KeyN"),
        "O" => Some("KeyO"),
        "P" => Some("KeyP"),
        "Q" => Some("KeyQ"),
        "R" => Some("KeyR"),
        "S" => Some("KeyS"),
        "T" => Some("KeyT"),
        "U" => Some("KeyU"),
        "V" => Some("KeyV"),
        "W" => Some("KeyW"),
        "X" => Some("KeyX"),
        "Y" => Some("KeyY"),
        "Z" => Some("KeyZ"),
        "Zero" | "0" => Some("Digit0"),
        "One" | "1" => Some("Digit1"),
        "Two" | "2" => Some("Digit2"),
        "Three" | "3" => Some("Digit3"),
        "Four" | "4" => Some("Digit4"),
        "Five" | "5" => Some("Digit5"),
        "Six" | "6" => Some("Digit6"),
        "Seven" | "7" => Some("Digit7"),
        "Eight" | "8" => Some("Digit8"),
        "Nine" | "9" => Some("Digit9"),
        "SpaceBar" => Some("Space"),
        "LeftShift" => Some("ShiftLeft"),
        "RightShift" => Some("ShiftRight"),
        "LeftControl" => Some("ControlLeft"),
        "RightControl" => Some("ControlRight"),
        "LeftAlt" => Some("AltLeft"),
        "RightAlt" => Some("AltRight"),
        "Enter" => Some("Enter"),
        "Escape" => Some("Escape"),
        "Tab" => Some("Tab"),
        "BackSpace" | "Backspace" => Some("Backspace"),
        _ => None,
    }
}

const KEY_MAP: &[(i32, &str)] = &[
    (0x08, "Backspace"),
    (0x09, "Tab"),
    (0x0D, "Enter"),
    (0x1B, "Escape"),
    (0x20, "Space"),
    (0x21, "PageUp"),
    (0x22, "PageDown"),
    (0x23, "End"),
    (0x24, "Home"),
    (0x25, "ArrowLeft"),
    (0x26, "ArrowUp"),
    (0x27, "ArrowRight"),
    (0x28, "ArrowDown"),
    (0x2D, "Insert"),
    (0x2E, "Delete"),
    (0x30, "Digit0"),
    (0x31, "Digit1"),
    (0x32, "Digit2"),
    (0x33, "Digit3"),
    (0x34, "Digit4"),
    (0x35, "Digit5"),
    (0x36, "Digit6"),
    (0x37, "Digit7"),
    (0x38, "Digit8"),
    (0x39, "Digit9"),
    (0x41, "KeyA"),
    (0x42, "KeyB"),
    (0x43, "KeyC"),
    (0x44, "KeyD"),
    (0x45, "KeyE"),
    (0x46, "KeyF"),
    (0x47, "KeyG"),
    (0x48, "KeyH"),
    (0x49, "KeyI"),
    (0x4A, "KeyJ"),
    (0x4B, "KeyK"),
    (0x4C, "KeyL"),
    (0x4D, "KeyM"),
    (0x4E, "KeyN"),
    (0x4F, "KeyO"),
    (0x50, "KeyP"),
    (0x51, "KeyQ"),
    (0x52, "KeyR"),
    (0x53, "KeyS"),
    (0x54, "KeyT"),
    (0x55, "KeyU"),
    (0x56, "KeyV"),
    (0x57, "KeyW"),
    (0x58, "KeyX"),
    (0x59, "KeyY"),
    (0x5A, "KeyZ"),
    (0x60, "Numpad0"),
    (0x61, "Numpad1"),
    (0x62, "Numpad2"),
    (0x63, "Numpad3"),
    (0x64, "Numpad4"),
    (0x65, "Numpad5"),
    (0x66, "Numpad6"),
    (0x67, "Numpad7"),
    (0x68, "Numpad8"),
    (0x69, "Numpad9"),
    (0x6A, "NumpadMultiply"),
    (0x6B, "NumpadAdd"),
    (0x6D, "NumpadSubtract"),
    (0x6E, "NumpadDecimal"),
    (0x6F, "NumpadDivide"),
    (0x70, "F1"),
    (0x71, "F2"),
    (0x72, "F3"),
    (0x73, "F4"),
    (0x74, "F5"),
    (0x75, "F6"),
    (0x76, "F7"),
    (0x77, "F8"),
    (0x78, "F9"),
    (0x79, "F10"),
    (0x7A, "F11"),
    (0x7B, "F12"),
    (0x7C, "F13"),
    (0x7D, "F14"),
    (0x7E, "F15"),
    (0x7F, "F16"),
    (0x80, "F17"),
    (0x81, "F18"),
    (0x82, "F19"),
    (0x83, "F20"),
    (0x84, "F21"),
    (0x85, "F22"),
    (0x86, "F23"),
    (0x87, "F24"),
    (0xA0, "ShiftLeft"),
    (0xA1, "ShiftRight"),
    (0xA2, "ControlLeft"),
    (0xA3, "ControlRight"),
    (0xA4, "AltLeft"),
    (0xA5, "AltRight"),
    (0xBA, "Semicolon"),
    (0xBB, "Equal"),
    (0xBC, "Comma"),
    (0xBD, "Minus"),
    (0xBE, "Period"),
    (0xBF, "Slash"),
    (0xC0, "Backquote"),
    (0xDB, "BracketLeft"),
    (0xDC, "Backslash"),
    (0xDD, "BracketRight"),
    (0xDE, "Quote"),
];

fn start_keyboard_hook(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let mut pressed_states = vec![false; KEY_MAP.len()];

        loop {
            thread::sleep(Duration::from_millis(25));

            unsafe {
                for (idx, &(vk, key_name)) in KEY_MAP.iter().enumerate() {
                    let key_state = GetAsyncKeyState(vk);
                    let is_pressed = (key_state as u16 & 0x8000) != 0;
                    let was_pressed = pressed_states[idx];
                    if is_pressed && !was_pressed {
                        pressed_states[idx] = true;
                        let _ = app_handle.emit("global-key-press", key_name);
                    } else if !is_pressed && was_pressed {
                        pressed_states[idx] = false;
                        let _ = app_handle.emit("global-key-release", key_name);
                    }
                }
            }
        }
    });
}

pub fn start_hooks(app_handle: &tauri::AppHandle) {
    start_keyboard_hook(app_handle.clone());
}

fn get_keyboard_sav_path() -> Result<PathBuf, String> {
    let local_app_data = std::env::var("LOCALAPPDATA")
        .map_err(|_| "LOCALAPPDATA-Umgebungsvariable konnte nicht gelesen werden.".to_string())?;

    Ok(PathBuf::from(local_app_data)
        .join("PioneerGame")
        .join("Saved")
        .join("SaveGames")
        .join("EmbarkSaveGameClientKeyBindings.sav"))
}

#[command]
pub fn convert_keyboard_sav() -> Result<String, String> {
    let file_path = get_keyboard_sav_path()?;
    if !file_path.exists() {
        return Err(format!("Datei nicht gefunden: {:?}", file_path));
    }
    let mut file = File::open(&file_path).map_err(|e| format!("Fehler beim Öffnen: {}", e))?;
    let save = Save::read(&mut file).map_err(|e| format!("Fehler beim Parsen: {}", e))?;
    serde_json::to_string_pretty(&save).map_err(|e| format!("Fehler bei JSON-Generierung: {}", e))
}

#[command]
pub fn convert_sav_to_json(file_path: String) -> Result<String, String> {
    let path = std::path::PathBuf::from(&file_path);

    if !path.exists() {
        return Err(format!("Datei nicht gefunden: {}", file_path));
    }

    if !path.extension().map_or(false, |ext| ext == "sav") {
        return Err("Nur .sav-Dateien werden unterstützt.".to_string());
    }

    let mut file = File::open(&path).map_err(|e| format!("Fehler beim Öffnen der Datei: {}", e))?;

    let save = Save::read(&mut file)
        .map_err(|e| format!("Fehler beim Parsen der SAV-Datei (uesave): {}", e))?;

    serde_json::to_string_pretty(&save).map_err(|e| format!("Fehler bei JSON-Generierung: {}", e))
}
