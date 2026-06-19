import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { OWAudioUtils } from '@/lib/utils';
import { listen } from '@tauri-apps/api/event';
import Tesseract from 'tesseract.js';

const WORD_SOUND_MAP: Record<string, string> = {
    "wasp": "snd/ping/wasp.mp3",
    "rocketeer": "snd/ping/rocketeer.mp3",
    "dummy": "snd/ui/beep2.mp3"
};

export function Scanner() {

    const [extractedText, setExtractedText] = useState<string>('');
    const [capturedImage, setCapturedImage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // const [bounds] = useState({
    //     minX: 48,
    //     maxX: 480,
    //     minY: 750,
    //     maxY: 766,
    // });

    const handleExtraction = async () => {

        setLoading(true);
        setError(null);

        try {

            const base64ImageUrl = await invoke<string>('extract_text_from_coordinates', {
                minXOffset: Number(48),
                maxXOffset: Number(480),
                minYOffset: Number(750),
                maxYOffset: Number(766),
            });
            setCapturedImage(base64ImageUrl);
            const result = await Tesseract.recognize(
                base64ImageUrl,
                'eng+deu'
            );
            const recognizedText = result.data.text;
            setExtractedText(recognizedText);

            const lowerRecognizedText = recognizedText.toLowerCase();

            for (const [word, soundPath] of Object.entries(WORD_SOUND_MAP)) {
                if (lowerRecognizedText.includes(word.toLowerCase())) {
                    OWAudioUtils.playSound(soundPath, 0.5);
                    break;
                }
            }

        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    };

    const handleExtractionExtent = async () => {

        setLoading(true);
        setError(null);

        try {

            const base64ImageUrlCroshair = await invoke<string>('extract_text_from_coordinates_extent', {
                extentX: Number(100),
                extentY: Number(100),
            });
            setCapturedImage(base64ImageUrlCroshair);
            const resultCrosshair = await Tesseract.recognize(
                base64ImageUrlCroshair,
                'eng+deu'
            );
            const recognizedTextCH = resultCrosshair.data.text;
            setExtractedText(recognizedTextCH);

            const lowerRecognizedTextCH = recognizedTextCH.toLowerCase();

            for (const [word, soundPath] of Object.entries(WORD_SOUND_MAP)) {
                if (lowerRecognizedTextCH.includes(word.toLowerCase())) {
                    OWAudioUtils.playSound(soundPath, 0.5);
                    break;
                }
            }

        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        let unlistenDown: (() => void) | undefined;
        let unlistenUp: (() => void) | undefined;

        (async () => {
            let hotkey = await invoke<string>('get_key_for_action', { actionName: 'SetPing' });
            const uDown = await listen<string>('global-key-press', (event) => {
                if (event.payload === hotkey) {
                    OWAudioUtils.playSound("snd/ui/beep1.mp3", 0.5);
                }
            });
            const uUp = await listen<string>('global-key-release', (event) => {
                if (event.payload === hotkey) {
                    // handleExtractionExtent();
                    handleExtraction();
                }
            });
            if (!active) {
                uDown();
                uUp();
            } else {
                unlistenDown = uDown;
                unlistenUp = uUp;
            }
        })();

        return () => {
            active = false;
            unlistenDown?.();
            unlistenUp?.();
        };
    });

    return (
        <div>

            {/* <div className="mt-4 p-4 bg-[#111318] rounded-lg text-white border border-slate-800">
                <h3 className="text-sm font-bold text-[#F5B925] mb-2">OCR TEST EXTRACTOR EXTENT</h3>
                <button
                    onClick={handleExtractionExtent}
                    disabled={loading}
                    className="w-full bg-[#F5B925] text-black font-bold p-2 rounded hover:bg-[#dca620] transition-colors disabled:opacity-50 mb-3"
                >
                    {loading ? "Analysiere Bild..." : "Manueller OCR Test"}
                </button>


                {capturedImage && (
                    <div className="mb-3 border border-slate-700 rounded bg-black overflow-hidden flex flex-col items-center p-2">
                        <p className="text-[10px] text-slate-400 self-start mb-1 font-mono">Aktueller Kamera-Ausschnitt ({50}x{50}):</p>
                        <img
                            src={capturedImage}
                            alt="Gecropter Bereich"
                            className="max-w-full max-h-40 h-auto object-contain border border-slate-800 rounded"
                        />
                    </div>
                )}

                {error && <p className="text-red-500 text-xs mt-2">Error: {error}</p>}
                {extractedText && (
                    <div className="mt-2 text-xs font-mono bg-black p-2 rounded max-h-24 overflow-y-auto">
                        <p className="text-slate-400">Erkannter Text:</p>
                        <p className="text-white">{extractedText}</p>
                    </div>
                )}
            </div> */}

            <div className="mt-4 p-4 bg-[#111318] rounded-lg text-white border border-slate-800">
                <h3 className="text-sm font-bold text-[#F5B925] mb-2">OCR TEST EXTRACTOR</h3>
                <button
                    onClick={handleExtraction}
                    disabled={loading}
                    className="w-full bg-[#F5B925] text-black font-bold p-2 rounded hover:bg-[#dca620] transition-colors disabled:opacity-50 mb-3"
                >
                    {loading ? "Analysiere Bild..." : "Manueller OCR Test"}
                </button>

                {/* LIVE-BILD VORSCHAU */}
                {capturedImage && (
                    <div className="mb-3 border border-slate-700 rounded bg-black overflow-hidden flex flex-col items-center p-2">
                        <p className="text-[10px] text-slate-400 self-start mb-1 font-mono">Aktueller Kamera-Ausschnitt ({48}x{480} bis {750}x{766}):</p>
                        <img
                            src={capturedImage}
                            alt="Gecropter Bereich"
                            className="max-w-full max-h-40 h-auto object-contain border border-slate-800 rounded"
                        />
                    </div>
                )}

                {error && <p className="text-red-500 text-xs mt-2">Error: {error}</p>}
                {extractedText && (
                    <div className="mt-2 text-xs font-mono bg-black p-2 rounded max-h-24 overflow-y-auto">
                        <p className="text-slate-400">Erkannter Text:</p>
                        <p className="text-white">{extractedText}</p>
                    </div>
                )}
            </div>

        </div>
    );
}
