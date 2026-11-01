
const DB_NAME = "civiclens-storage";
const STORE_NAME = "report-images";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open image storage."));
  });
}

// Downscale a photo for server upload so feeds stay fast. The full
// original always stays in browser storage. Falls back to the
// original file when resizing is impossible.
export async function preparePhoto(file: File): Promise<Blob> {
  const MAX_EDGE = 1600;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );

    if (scale === 1 && file.size <= 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );

    return blob ?? file;
  } catch {
    return file;
  }
}

export async function saveReportImage(
  id: string,
  file: File,
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).put(file, id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Could not save image."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Image save was cancelled."));
    });
  } finally {
    database.close();
  }
}

export async function getReportImage(
  id: string,
): Promise<Blob | null> {
  const database = await openDatabase();

  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result instanceof Blob ? result : null);
      };

      request.onerror = () =>
        reject(request.error ?? new Error("Could not load image."));
    });
  } finally {
    database.close();
  }
}



export async function deleteReportImage(id: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Could not delete image."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Image deletion was cancelled."));
    });
  } finally {
    database.close();
  }
}