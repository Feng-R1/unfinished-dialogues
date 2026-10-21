import { restoreSession, type Session } from "./dialogue";

const DB_NAME = "unfinished-garden";
const STORE = "dialogues";
let database: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error("浏览器不支持本机存储。")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
    request.onblocked = () => { database = null; reject(new Error("本机记录被其他窗口占用，请关闭旧窗口后重试。")); };
  });
  return database;
}

export async function readSessions(): Promise<Session[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.map(restoreSession).filter((s): s is Session => !!s).sort((a, b) => b.updatedAt - a.updatedAt));
    request.onerror = () => reject(request.error);
  });
}

async function write(action: (store: IDBObjectStore) => void) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("保存被中断。"));
  });
}
export function saveSession(session: Session) { return write(store => { store.put(session); }); }
export function deleteSession(id: string) { return write(store => { store.delete(id); }); }
