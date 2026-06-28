import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { ExportManager } from '../lib/ExportManager';

function SetExporter() {
    const [status, setStatus] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setIsBusy(true);
        setStatus(null);
        try {
            const savedPath = await ExportManager.exportBoard();
            if (savedPath) {
                setStatus(`Board exportiert: ${savedPath}`);
            }
            // savedPath === null -> Nutzer hat den Dialog abgebrochen, kein Fehler
        } catch (err) {
            console.error(err);
            setStatus('Export fehlgeschlagen.');
        } finally {
            setIsBusy(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsBusy(true);
        setStatus(null);
        try {
            await ExportManager.importBoard(file);
            setStatus('Board erfolgreich importiert. Bitte Board neu laden.');
        } catch (err) {
            console.error(err);
            setStatus(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
        } finally {
            setIsBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full flex-col rounded-lg overflow-hidden bg-[#F3EBD8] shadow-[0_4px_0_0_rgba(0,0,0,0.5)] mb-4 p-5">
            <div className="font-black text-[1.1rem] tracking-wide text-[#1B1D22] mb-4">
                BOARD IMPORT / EXPORT
            </div>

            <div className="flex gap-3">
                <button
                    onClick={handleExport}
                    disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#F5B925] hover:bg-[#dca620] border-2 border-black rounded-md py-3 font-bold text-[#1B1D22] transition-colors disabled:opacity-50 focus:outline-none"
                >
                    <Download size={18} strokeWidth={2.5} />
                    EXPORT
                </button>

                <button
                    onClick={handleImportClick}
                    disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#F5B925] hover:bg-[#dca620] border-2 border-black rounded-md py-3 font-bold text-[#1B1D22] transition-colors disabled:opacity-50 focus:outline-none"
                >
                    <Upload size={18} strokeWidth={2.5} />
                    IMPORT
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".raidioboard,.zip"
                    className="hidden"
                    onChange={handleFileSelected}
                />
            </div>

            {status && (
                <div className="mt-3 text-sm font-medium text-[#1B1D22]">
                    {status}
                </div>
            )}
        </div>
    );
}

export { SetExporter };