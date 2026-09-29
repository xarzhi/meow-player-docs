import { Store } from '@tauri-apps/plugin-store';

const useStorage = () => {
    class Storage {
        loaded = false;
        middleware = new Map();
        constructor() {
            this.load();
            this.store = null
            this.loaded = false
        }

        async load() {
            this.store = await Store.load(`setting.json`);
            const entries = await this.store.entries();
            for (const [key, value] of entries) {
                this.middleware.set(key, value);
            }
            this.loaded = true;
        }

        async getItem(key) {
            if (!this.loaded) {
                await this.load();
            }
            return this.middleware.get(key) || null;
        }

        async setItem(key, value) {
            this.middleware.set(key, value);
            await this.store.set(key, value);
        }

        async removeItem(key) {
            this.middleware.delete(key);
            await this.store.delete(key);
        }

        async clear() {
            this.middleware.clear();
            await this.store.clear();
        }


    }
    const storage = new Storage();
    return {
        storage
    }
}



export default useStorage