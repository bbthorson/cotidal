/** Test helper for the OAuth provider's storage. */

/** KV in memory, with the parts of the interface the provider uses. */
export function memoryKv() {
  const data = new Map<string, { value: string; metadata?: unknown; expires?: number }>();
  const live = (key: string) => {
    const entry = data.get(key);
    if (entry?.expires && entry.expires < Date.now()) data.delete(key);
    return data.get(key);
  };
  return {
    async get(key: string, type?: string | { type?: string }) {
      const entry = live(key);
      if (!entry) return null;
      const t = typeof type === 'string' ? type : type?.type;
      return t === 'json' ? JSON.parse(entry.value) : entry.value;
    },
    async getWithMetadata(key: string, type?: string | { type?: string }) {
      const entry = live(key);
      return { value: entry ? await this.get(key, type) : null, metadata: entry?.metadata ?? null };
    },
    async put(key: string, value: string, options: { expirationTtl?: number; metadata?: unknown } = {}) {
      data.set(key, {
        value,
        metadata: options.metadata,
        expires: options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined,
      });
    },
    async delete(key: string) {
      data.delete(key);
    },
    async list({ prefix = '' }: { prefix?: string } = {}) {
      const keys = [...data.keys()]
        .filter((name) => name.startsWith(prefix) && live(name))
        .map((name) => ({ name, metadata: data.get(name)?.metadata }));
      return { keys, list_complete: true, cursor: '' };
    },
  };
}

