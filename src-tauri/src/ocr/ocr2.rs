use image::{GrayImage, ImageBuffer, Luma, Rgba, imageops::FilterType};
use imageproc::filter::median_filter;
use imageproc::contrast::{otsu_level, threshold, ThresholdType};
use imageproc::morphology::open;

fn preprocess_and_scale_image(img: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> ImageBuffer<Rgba<u8>, Vec<u8>> {
    // 1. Graustufen
    let gray = image::imageops::grayscale(img);

    // 2. Rauschunterdrückung (3x3 Median)
    let denoised = median_filter(&gray, 3, 3);

    // 3. Skalierung um Faktor 3 (CatmullRom)
    let scale_factor = 3;
    let target_width = denoised.width() * scale_factor;
    let target_height = denoised.height() * scale_factor;
    let scaled = image::imageops::resize(&denoised, target_width, target_height, FilterType::CatmullRom);

    // 4. Otsu-Thresholding (binär)
    let level = otsu_level(&scaled);
    let binary = threshold(&scaled, level, ThresholdType::Binary);

    // 5. Morphologische Öffnung (entfernt kleine Störungen)
    let kernel = imageproc::morphology::Rectangle::new(3, 3);
    let opened = open(&binary, &kernel);

    // 6. In RGBA umwandeln (weiss = 255, schwarz = 0, Alpha = 255)
    let mut rgba = ImageBuffer::new(opened.width(), opened.height());
    for (x, y, pixel) in opened.enumerate_pixels() {
        let val = pixel[0]; // ist bereits 0 oder 255
        rgba.put_pixel(x, y, Rgba([val, val, val, 255]));
    }
    rgba
}