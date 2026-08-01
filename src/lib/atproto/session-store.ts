import type { NodeSavedSession, NodeSavedSessionStore } from '@atproto/oauth-client-node';

// In-memory session store suitable for server runtime / edge workers
const sessionMap = new Map<string, NodeSavedSession>();

export function createSessionStore(): NodeSavedSessionStore {
  return {
    async get(key: string) {
      return sessionMap.get(key);
    },
    async set(key: string, value: NodeSavedSession) {
      sessionMap.set(key, JSON.parse(JSON.stringify(value)));
    },
    async del(key: string) {
      sessionMap.delete(key);
    },
  };
}
