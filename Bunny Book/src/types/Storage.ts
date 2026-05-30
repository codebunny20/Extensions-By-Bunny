import type { Note } from "./Note";

interface StorageShape {
  notes?: unknown;
}

export function withStorageGet(keys: string[]): Promise<StorageShape> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (data) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve((data as StorageShape) || {});
    });
  });
}

export function withStorageSet(value: Partial<{ notes: Note[] }>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
}

export function parseNotes(input: unknown): Note[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((raw) => {
      if (!raw || typeof raw !== "object") {
        return null;
      }

      const record = raw as Partial<Record<keyof Note, unknown>>;
      const id = Number(record.id);
      const createdAt = Number(record.createdAt);
      const updatedAt = Number(record.updatedAt);

      if (!Number.isFinite(id)) {
        return null;
      }

      return {
        id,
        title: String(record.title || ""),
        body: String(record.body || ""),
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now()
      };
    })
    .filter((n): n is Note => Boolean(n));
}

export async function getNotes(): Promise<Note[]> {
  const data = await withStorageGet(["notes"]);
  return parseNotes(data.notes);
}
