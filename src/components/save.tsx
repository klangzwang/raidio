import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function Save() {

    const [jsonData, setJsonData] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Die Kernfunktion für den parameterlosen IPC-Call an den Rust-Core
    const loadAndConvertSav = async () => {
        try {
            setError('');
            setJsonData('');
            setIsLoading(true);

            // Rust übernimmt die Pfad-Inferenz autonom
            const jsonResult = await invoke<string>('convert_sav_to_json');
            setJsonData(jsonResult);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    // Automatischer Daten-Fetch beim Mounting der Komponente
    useEffect(() => {
        loadAndConvertSav();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Unreal Engine Keybindings Inspector</h2>

            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                    onClick={loadAndConvertSav}
                    disabled={isLoading}
                    style={{
                        padding: '10px 25px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: isLoading ? '#555' : '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s'
                    }}
                >
                    {isLoading ? 'Lese SAV-Struktur...' : 'Daten aktualisieren'}
                </button>

                <span style={{ fontSize: '13px', color: '#888' }}>
                    Statisch gebunden an: <code>AppData\Local\PioneerGame\Saved\SaveGames\...</code>
                </span>
            </div>

            {error && (
                <div style={{
                    color: '#ff4d4d',
                    backgroundColor: '#2a1a1a',
                    padding: '12px',
                    border: '1px solid #ff4d4d',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    <strong>Fehler beim Datei-I/O:</strong> {error}
                </div>
            )}

            <div>
                <pre style={{
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: '20px',
                    borderRadius: '6px',
                    maxHeight: '700px',
                    overflow: 'auto',
                    border: '1px solid #333',
                    fontSize: '13px',
                    lineHeight: '1.5'
                }}>
                    {jsonData ? jsonData : 'Warte auf Daten-Injektion...'}
                </pre>
            </div>
        </div>
    );
}