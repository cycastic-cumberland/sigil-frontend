export const AllStores = {
    DebugKeys: "__debug_keys"
}

export interface IndexedDatabase {
    addObject: <T>(store: string, obj: T) => Promise<void>;
    getObject: (store: string, key: IDBValidKey | IDBKeyRange) => Promise<unknown>;
    clearStore: (store: string) => Promise<void>;
}

class IndexedDatabaseInstanceImpl implements IndexedDatabase {
    readonly db: IDBDatabase

    constructor(db: IDBDatabase) {
        this.db = db
    }

    addObject<T>(store: string, obj: T): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.db.transaction(store, 'readwrite');
            const dataStore = transaction.objectStore(store);
            const request = dataStore.add(obj);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        })
    }

    clearStore(store: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.db.transaction(store, 'readwrite');
            const dataStore = transaction.objectStore(store);
            const request = dataStore.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        })
    }

    getObject(store: string, key: IDBValidKey | IDBKeyRange): Promise<unknown> {
        return new Promise<string>((resolve, reject) => {
            const transaction = this.db.transaction(store, 'readonly');
            const dataStore = transaction.objectStore(store);
            const request = dataStore.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        })
    }

}

const runAllMigrations = (db: IDBDatabase) => {
    if (!db.objectStoreNames.contains(AllStores.DebugKeys)) {
        db.createObjectStore(AllStores.DebugKeys, { keyPath: 'id', autoIncrement: false });
    }
}

export const openDb = (name?: string, version?: number) => {
    return new Promise<IndexedDatabase>((resolve, reject) => {
        const request = indexedDB.open(name ?? "main", version)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            runAllMigrations(db)
        }
        request.onsuccess = () => resolve(new IndexedDatabaseInstanceImpl(request.result))
        request.onerror = () => reject(request.error)
    })
}