export const IDBVersion = 2;

export const AllStores = {
    DebugKeys: "__debug_keys",
    EphemeralKeys: "__ephemeral_keys"
}

export type StorableObject = {
    id: string | number
}

export interface IndexedDatabase {
    addObject: <T extends StorableObject>(store: string, obj: T) => Promise<void>;
    getObject: (store: string, key: IDBValidKey | IDBKeyRange) => Promise<unknown>;
    clearStore: (store: string) => Promise<void>;
    iterateDelete: <T extends StorableObject>(store: string, predicate: ((obj: T) => boolean) | ((obj: T) => Promise<boolean>)) => Promise<number>,

    handle: IDBDatabase
}

class IndexedDatabaseInstanceImpl implements IndexedDatabase {
    readonly db: IDBDatabase

    constructor(db: IDBDatabase) {
        this.db = db
    }

    get handle(): IDBDatabase {
        return this.db
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

    iterateDelete<T>(store: string, predicate: ((obj: T) => boolean) | ((obj: T) => Promise<boolean>)): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const objStore = tx.objectStore(store);
            const request = objStore.openCursor();

            const removed = {
                count: 0
            }
            request.onerror = () => reject(request.error);

            request.onsuccess = async (event) => {
                const cursor: IDBCursorWithValue | null = (event.target as IDBRequest).result;
                if (!cursor) return;

                try {
                    const shouldDelete = await predicate(cursor.value as T);
                    if (shouldDelete) {
                        removed.count++;
                        cursor.delete();
                    }
                    cursor.continue();
                } catch (err) {
                    reject(err);
                }
            };

            tx.oncomplete = () => resolve(removed.count);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
}

const runAllMigrations = (db: IDBDatabase) => {
    for (const name of Object.keys(AllStores)){
        if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore((AllStores as Record<string, string>)[name], { keyPath: 'id', autoIncrement: false });
        }
    }
}

export const openDb = (name?: string, version?: number) => {
    return new Promise<IndexedDatabase>((resolve, reject) => {
        const request = indexedDB.open(name ?? "main", version ?? IDBVersion)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            runAllMigrations(db)
        }
        request.onsuccess = () => resolve(new IndexedDatabaseInstanceImpl(request.result))
        request.onerror = () => reject(request.error)
    })
}
