// A Map to store File objects with numeric IDs as keys
export const fileStore: File[] = [];
let nextId = 0;

export function storeFile(file: File): number {
  const id = nextId++;
  fileStore.push(file);
  return id;
}

export function getFile(id: number): File | undefined {
  return fileStore[id];
}

export function removeFile(id: number): void {
  fileStore.splice(id, 1);
}

export function clearFiles(): void {
  fileStore.length = 0;
}
