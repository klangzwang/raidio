import { listen } from '@tauri-apps/api/event';

const isGameRunning = async (): Promise<boolean> => {
    await listen<boolean>('window-opened', (event) => {
        return new Promise((resolve) => {
            resolve(event.payload);
        });
    });
    return false;
}

export { isGameRunning }
