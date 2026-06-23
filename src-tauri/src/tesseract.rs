use crate::window::SharedWindowMetrics;
use base64::{engine::general_purpose, Engine as _};
use image::{imageops::FilterType, GenericImageView, ImageBuffer, Rgba};
use scrap::{Capturer, Display};
use std::{io::ErrorKind, thread, time::Duration};

/// Optimierte Vorverarbeitung für OCR:
/// - Skaliert den Ausschnitt hoch (3x CatmullRom)
/// - Berechnet präzise ITU-R Luminanz-Graustufen
/// - Wendet dynamisches Otsu-Thresholding an
/// - Invertiert zu schwarzem Text auf weißem Grund (Goldstandard für Tesseract)
/// - Bereinigt isolierte Pixelfehler (Despeckle / Morphological Denoise)
fn preprocess_and_scale_image(
    img: &image::ImageBuffer<Rgba<u8>, Vec<u8>>,
) -> image::ImageBuffer<Rgba<u8>, Vec<u8>> {
    let scale_factor = 3;
    let target_width = img.width() * scale_factor;
    let target_height = img.height() * scale_factor;

    // 1. Hochskalierung
    let scaled_img =
        image::imageops::resize(img, target_width, target_height, FilterType::CatmullRom);

    // Histogramm & Puffer für Graustufen initialisieren
    let mut hist = [0u32; 256];
    let mut total_pixels = 0u32;
    let mut gray_buffer = vec![0u8; (target_width * target_height) as usize];

    // 2. Graustufenkonvertierung via Luminanz-Gewichtung
    for (x, y, pixel) in scaled_img.enumerate_pixels() {
        let r = pixel.0[0] as f32;
        let g = pixel.0[1] as f32;
        let b = pixel.0[2] as f32;

        let gray = (0.2126 * r + 0.7152 * g + 0.0722 * b).round() as usize;
        let gray_clipped = gray.min(255) as u8;

        let idx = (y * target_width + x) as usize;
        gray_buffer[idx] = gray_clipped;

        hist[gray_clipped as usize] += 1;
        total_pixels += 1;
    }

    // 3. Otsu's Methode zur Berechnung des optimalen Schwellenwerts
    let mut sum = 0.0f32;
    for t in 0..256 {
        sum += t as f32 * hist[t] as f32;
    }

    let mut sum_b = 0.0f32;
    let mut w_b = 0u32;
    let mut max_var = 0.0f32;
    let mut otsu_threshold = 128u8;

    for t in 0..256 {
        w_b += hist[t];
        if w_b == 0 {
            continue;
        }

        let w_f = total_pixels - w_b;
        if w_f == 0 {
            break;
        }

        sum_b += t as f32 * hist[t] as f32;

        let m_b = sum_b / w_b as f32;
        let m_f = (sum - sum_b) / w_f as f32;

        let var_between = w_b as f32 * w_f as f32 * (m_b - m_f) * (m_b - m_f);

        if var_between > max_var {
            max_var = var_between;
            otsu_threshold = t as u8;
        }
    }

    // 4. Binarisierung & Invertierung (Text -> Schwarz, Hintergrund -> Weiß)
    let mut processed_img = ImageBuffer::new(target_width, target_height);

    for y in 0..target_height {
        for x in 0..target_width {
            let idx = (y * target_width + x) as usize;
            let gray_val = gray_buffer[idx];

            let final_color = if gray_val >= otsu_threshold { 0 } else { 255 };
            processed_img.put_pixel(x, y, Rgba([final_color, final_color, final_color, 255]));
        }
    }

    // 5. Morphologische Rauschunterdrückung (Despeckle)
    let mut denoised_img = processed_img.clone();
    for y in 1..(target_height - 1) {
        for x in 1..(target_width - 1) {
            if processed_img.get_pixel(x, y).0[0] == 0 {
                // Wenn schwarzer Textpixel
                let mut black_neighbors = 0;
                for ny in (y - 1)..=(y + 1) {
                    for nx in (x - 1)..=(x + 1) {
                        if processed_img.get_pixel(nx, ny).0[0] == 0 {
                            black_neighbors += 1;
                        }
                    }
                }
                // Isoliertes Pixel-Rauschen entfernen (weniger als 3 verbundene Pixel)
                if black_neighbors < 3 {
                    denoised_img.put_pixel(x, y, Rgba([255, 255, 255, 255]));
                }
            }
        }
    }

    denoised_img
}

#[tauri::command]
pub async fn extract_text_from_coordinates(
    state: tauri::State<'_, SharedWindowMetrics>,
    min_x_offset: u32,
    max_x_offset: u32,
    min_y_offset: u32,
    max_y_offset: u32,
) -> Result<String, String> {
    let metrics = {
        let lock = state.lock().unwrap();
        lock.clone()
            .ok_or("Spielfenster wird derzeit nicht aktiv getrackt!")?
    };

    if !metrics.is_visible || metrics.width <= 0 || metrics.height <= 0 {
        return Err("Spielfenster ist nicht bereit.".to_string());
    }

    let start_x = (metrics.x + min_x_offset as i32).max(0) as u32;
    let start_y = (metrics.y + min_y_offset as i32).max(0) as u32;
    let end_x = (metrics.x + max_x_offset as i32).max(0) as u32;
    let end_y = (metrics.y + max_y_offset as i32).max(0) as u32;

    let display = Display::primary().map_err(|e| e.to_string())?;
    let mut capturer = Capturer::new(display).map_err(|e| e.to_string())?;
    let (display_width, display_height) = (capturer.width(), capturer.height());

    let buffer;
    loop {
        match capturer.frame() {
            Ok(frame) => {
                buffer = frame.to_vec();
                break;
            }
            Err(error) => {
                if error.kind() == ErrorKind::WouldBlock {
                    thread::sleep(Duration::from_millis(10));
                    continue;
                } else {
                    return Err(format!("Screenshot-Fehler: {}", error));
                }
            }
        }
    }

    let img_buffer: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(display_width as u32, display_height as u32, buffer)
            .ok_or("Fehler beim Erstellen des Bildpuffers")?;

    let final_start_x = start_x.min(display_width as u32);
    let final_start_y = start_y.min(display_height as u32);
    let final_end_x = end_x.min(display_width as u32);
    let final_end_y = end_y.min(display_height as u32);

    let crop_width = final_end_x
        .checked_sub(final_start_x)
        .ok_or("Ungültige X-Berechnung (Min > Max)")?;
    let crop_height = final_end_y
        .checked_sub(final_start_y)
        .ok_or("Ungültige Y-Berechnung (Min > Max)")?;

    if crop_width == 0 || crop_height == 0 {
        return Err("Crop-Bereich hat eine Breite oder Höhe von 0 Pixels!".to_string());
    }

    let cropped_img = img_buffer
        .view(final_start_x, final_start_y, crop_width, crop_height)
        .to_image();

    let preprocessed_img = preprocess_and_scale_image(&cropped_img);

    let mut bytes: Vec<u8> = Vec::new();
    preprocessed_img
        .write_to(
            &mut std::io::Cursor::new(&mut bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| format!("PNG Encode Fehler: {}", e))?;

    let base64_str = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:image/png;base64,{}", base64_str))
}

#[tauri::command]
pub async fn extract_text_from_coordinates_extent(
    state: tauri::State<'_, SharedWindowMetrics>,
    extent_x: u32,
    extent_y: u32,
) -> Result<String, String> {
    let metrics = {
        let lock = state.lock().unwrap();
        lock.clone()
            .ok_or("Spielfenster wird derzeit nicht aktiv getrackt!")?
    };

    if !metrics.is_visible || metrics.width <= 0 || metrics.height <= 0 {
        return Err("Spielfenster ist nicht bereit.".to_string());
    }

    let center_x = metrics.x + (metrics.width / 2);
    let center_y = metrics.y + (metrics.height / 2);

    let min_x = (center_x - extent_x as i32).max(0) as u32;
    let min_y = (center_y - extent_y as i32).max(0) as u32;
    let max_x = (center_x + extent_x as i32).max(0) as u32;
    let max_y = (center_y + extent_y as i32).max(0) as u32;

    let display = Display::primary().map_err(|e| e.to_string())?;
    let mut capturer = Capturer::new(display).map_err(|e| e.to_string())?;
    let (display_width, display_height) = (capturer.width(), capturer.height());

    let buffer;
    loop {
        match capturer.frame() {
            Ok(frame) => {
                buffer = frame.to_vec();
                break;
            }
            Err(error) => {
                if error.kind() == ErrorKind::WouldBlock {
                    thread::sleep(Duration::from_millis(10));
                    continue;
                } else {
                    return Err(format!("Screenshot-Fehler: {}", error));
                }
            }
        }
    }

    let img_buffer: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(display_width as u32, display_height as u32, buffer)
            .ok_or("Fehler beim Erstellen des Bildpuffers")?;

    let crop_width = max_x.checked_sub(min_x).ok_or("Ungültige X-Berechnung")?;
    let crop_height = max_y.checked_sub(min_y).ok_or("Ungültige Y-Berechnung")?;

    if min_x + crop_width > display_width as u32 || min_y + crop_height > display_height as u32 {
        return Err("Fadenkreuz-Box liegt außerhalb des Bildschirms!".to_string());
    }

    let cropped_img = img_buffer
        .view(min_x, min_y, crop_width, crop_height)
        .to_image();

    let preprocessed_img = preprocess_and_scale_image(&cropped_img);

    let mut bytes: Vec<u8> = Vec::new();
    preprocessed_img
        .write_to(
            &mut std::io::Cursor::new(&mut bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| format!("PNG Encode Fehler: {}", e))?;

    let base64_str = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:image/png;base64,{}", base64_str))
}

#[tauri::command]
pub fn scan_screen_text(state: tauri::State<'_, SharedWindowMetrics>) -> Result<String, String> {
    let metrics = {
        let lock = state.lock().unwrap();
        lock.clone()
            .ok_or("Spielfenster wird derzeit nicht aktiv getrackt!")?
    };

    if !metrics.is_visible || metrics.width <= 0 || metrics.height <= 0 {
        return Err("Spielfenster ist nicht bereit.".to_string());
    }

    let start_x = (metrics.x + 48 as i32).max(0) as u32;
    let start_y = (metrics.y + 750 as i32).max(0) as u32;
    let end_x = (metrics.x + 480 as i32).max(0) as u32;
    let end_y = (metrics.y + 766 as i32).max(0) as u32;

    let display = Display::primary().map_err(|e| e.to_string())?;
    let mut capturer = Capturer::new(display).map_err(|e| e.to_string())?;
    let (display_width, display_height) = (capturer.width(), capturer.height());

    let buffer;
    loop {
        match capturer.frame() {
            Ok(frame) => {
                buffer = frame.to_vec();
                break;
            }
            Err(error) => {
                if error.kind() == ErrorKind::WouldBlock {
                    thread::sleep(Duration::from_millis(10));
                    continue;
                } else {
                    return Err(format!("Screenshot-Fehler: {}", error));
                }
            }
        }
    }

    let img_buffer: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(display_width as u32, display_height as u32, buffer)
            .ok_or("Fehler beim Erstellen des Bildpuffers")?;

    let final_start_x = start_x.min(display_width as u32);
    let final_start_y = start_y.min(display_height as u32);
    let final_end_x = end_x.min(display_width as u32);
    let final_end_y = end_y.min(display_height as u32);

    let crop_width = final_end_x
        .checked_sub(final_start_x)
        .ok_or("Ungültige X-Berechnung (Min > Max)")?;
    let crop_height = final_end_y
        .checked_sub(final_start_y)
        .ok_or("Ungültige Y-Berechnung (Min > Max)")?;

    if crop_width == 0 || crop_height == 0 {
        return Err("Crop-Bereich hat eine Breite oder Höhe von 0 Pixels!".to_string());
    }

    let cropped_img = img_buffer
        .view(final_start_x, final_start_y, crop_width, crop_height)
        .to_image();

    let preprocessed_img = preprocess_and_scale_image(&cropped_img);

    let mut bytes: Vec<u8> = Vec::new();
    preprocessed_img
        .write_to(
            &mut std::io::Cursor::new(&mut bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| format!("PNG Encode Fehler: {}", e))?;

    let base64_str = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:image/png;base64,{}", base64_str))
}

// Kernlogik: Erstelle Screenshot, schneide HUD-Elemente aus und wende OCR an.
// pub fn perform_ocr() -> Result<(String, String, String), Box<dyn std::error::Error>> {
//     // 1. Screenshot vom primären Monitor erfassen
//     let monitors = Monitor::all()?;
//     let monitor = monitors
//         .into_iter()
//         .next()
//         .ok_or("Kein primärer Monitor gefunden!")?;
//     let image_buffer = monitor.capture_image()?;
//     let mut img = DynamicImage::ImageRgba8(image_buffer);

//     // 2. HUD-Zonen zuschneiden (fest codiert für 1080p, z.B.)
//     // Hinweis: Die Werte hier hängen von der Auflösung des Benutzers ab
//     let compass_crop = imageops::crop(&mut img, 860, 20, 200, 50).to_image();
//     let ping_crop = imageops::crop(&mut img, 860, 480, 200, 80).to_image();

//     // 3. Vorbereitung der Bildobjekte
//     let compass_img = Image::from_dynamic_image(&DynamicImage::ImageRgba8(compass_crop))?;
//     let ping_img = Image::from_dynamic_image(&DynamicImage::ImageRgba8(ping_crop))?;

//     // 4. OCR Parsing anwenden
//     let compass_args = Args {
//         lang: "eng".to_string(),
//         config_variables: [("tessedit_char_whitelist".into(), "0123456789NESW ".into())].into(),
//         ..Default::default()
//     };
//     let compass_text = rusty_tesseract::image_to_string(&compass_img, &compass_args)?;

//     let ping_args = Args {
//         lang: "eng".to_string(),
//         ..Default::default()
//     };
//     let ocr_text = rusty_tesseract::image_to_string(&ping_img, &ping_args)?;

//     let text = ocr_text.trim().replace("\n", " ");
//     let parts: Vec<&str> = text.split_whitespace().collect();
//     let distance = if parts.len() > 1 {
//         parts.last().unwrap_or(&"").to_string()
//     } else {
//         "0m".to_string()
//     };

//     Ok((text, compass_text.trim().replace("\n", ""), distance))
// }

// /// Ruft die Gemini API direkt aus dem Rust/Tauri Backend auf
// pub async fn analyze_with_gemini(
//     ocr_text: &str,
//     compass_text: &str,
//     api_key: &str,
// ) -> Result<String, Box<dyn std::error::Error>> {
//     if api_key.is_empty() {
//         return Err("GEMINI_API_KEY nicht gesetzt! Bitte im HUD eintragen.".into());
//     }
//     let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key);

//     let prompt = format!(
//          "Du bist die TacticAI KI für den Extraction-Shooter ARC Raiders. \
//         Analysiere den rohen OCR-Text des Bildschirms:\n\
//         Gefundenes Ziel: \"{}\"\n\
//         Kompassrichtung: \"{}\"\n\
//         Generiere einen kurzen, prägnanten taktischen militärischen Callout für das HUD Overlay des Squads. \
//         Unterscheide Feinde von Loot oder Containern usw.\n\
//         Beispiel: \"⚠️ FEIND: Wasp (22m) bei 243° (SW)!\"\n\
//         Antworte AUSSCHLIESSLICH mit dem finalen Callout String!",
//         ocr_text, compass_text
//     );

//     let client = Client::new();
//     let payload = serde_json::json!({
//         "contents": [{ "parts": [{"text": prompt}] }]
//     });

//     let res = client.post(&url).json(&payload).send().await?;
//     let json: serde_json::Value = res.json().await?;

//     if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
//         Ok(text.trim().to_string())
//     } else {
//         Err("Fehler beim Parsen der Gemini-Antwort".into())
//     }
// }
