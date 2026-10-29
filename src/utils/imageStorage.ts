
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