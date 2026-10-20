/** Key-value persistence. Browsers can back it with IndexedDB, Node with files (vnstock-js/node). */
export interface Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * In-process storage; contents are lost when the process exits.
 * @example
 * const storage = memoryStorage();
 */
export function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    async get(k) {
      return map.has(k) ? (map.get(k) as string) : null;
    },
    async set(k, v) {
      map.set(k, v);
    },
    async remove(k) {
      map.delete(k);
    },
  };
}
