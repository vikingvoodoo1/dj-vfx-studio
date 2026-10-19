// =========================================================================
// IndexedDB Media Storage Manager (Persistent Storage for Uploaded Media)
// =========================================================================
export const MediaDB = {
    dbName: 'DJ_VFX_MEDIA_DB_V2',
    dbVersion: 2,
    _db: null,

    async open() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.dbVersion);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('dj_logos')) {
                    db.createObjectStore('dj_logos', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('station_logos')) {
                    db.createObjectStore('station_logos', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('flyers')) {
                    db.createObjectStore('flyers', { keyPath: 'id' });
                }
            };
            req.onsuccess = () => {
                this._db = req.result;
                resolve(this._db);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async save(storeName, item) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async getAll(storeName) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    },

    async delete(storeName, id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }
};
