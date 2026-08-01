import type { NodeSavedState, NodeSavedStateStore } from '@atproto/oauth-client-node';

// In-memory state store suitable for server runtime / edge workers
const stateMap = new Map<string, NodeSavedState>();

export function createStateStore(): NodeSavedStateStore {
  return {
    async get(key: string) {
      return stateMap.get(key);
    },
    async set(key: string, value: NodeSavedState) {
      stateMap.set(key, JSON.parse(JSON.stringify(value)));
    },
    async del(key: string) {
      stateMap.delete(key);
    },
  };
}
