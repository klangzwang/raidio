import os
from pathlib import Path

def combine_project_files(source_dir, output_filename="Combined_Codebase.txt"):
    """
    Sammelt alle relevanten Code-Dateien in einem Verzeichnis rekursiv ein, 
    ignoriert definierte Blacklist-Ordner und speichert das Ergebnis auf dem Desktop.
    """
    valid_extensions = {".py", ".cpp", ".h", ".ts", ".tsx", ".js", ".json", ".bat", ".rs", ".toml"}
    
    blacklist = [
        "node_modules",
        "src-tauri/target",
        ".git"
    ]
    
    source_path = Path(source_dir)
    
    # Der elegante Weg: Path.home() entspricht %USERPROFILE%
    # So landet die Datei direkt auf deinem Desktop.
    desktop_path = Path.home() / "Desktop"
    output_path = desktop_path / output_filename
    
    if not source_path.exists() or not source_path.is_dir():
        print(f"❌ Fehler: Das Verzeichnis '{source_dir}' wurde nicht gefunden.")
        return

    print(f"🚀 Starte Extraktion aus: {source_path.resolve()}")
    print(f"💾 Zieldatei: {output_path}")
    
    try:
        with output_path.open('w', encoding='utf-8') as outfile:
            for file_path in source_path.rglob("*"):
                if not file_path.is_file():
                    continue

                rel_path = file_path.relative_to(source_path).as_posix()
                
                if any(bad_path in rel_path for bad_path in blacklist):
                    continue

                if file_path.suffix in valid_extensions:
                    print(f"Kopiere Text von: {rel_path}")
                    
                    outfile.write(f"\n{'='*60}\n")
                    outfile.write(f"--- DATEI: {rel_path} ---\n")
                    outfile.write(f"{'='*60}\n\n")
                    
                    try:
                        with file_path.open('r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                            outfile.write("\n")
                    except Exception as e:
                        print(f"⚠️ Warnung: Fehler beim Lesen von {file_path.name}: {e}")
                        
    except Exception as e:
        print(f"💥 Kritischer Fehler beim Erstellen der Output-Datei: {e}")
        return

    print(f"\n✅ Combine Files Operation abgeschlossen! Die Codebase liegt bereit unter:\n{output_path}")

if __name__ == "__main__":
    # ---------------------------------------------------------
    # HIER ANPASSEN: Welcher Ordner soll durchsucht werden?
    # "." steht für das aktuelle Verzeichnis
    # ---------------------------------------------------------
    ordner_pfad = "." 
    
    combine_project_files(ordner_pfad)