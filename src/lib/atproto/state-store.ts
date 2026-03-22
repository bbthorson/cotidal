import type { NodeSavedState, NodeSavedStateStore } from '@atproto/oauth-client-node';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from './admin';

const COLLECTION = 'atproto_states';

export function createStateStore(): NodeSavedStateStore {
  const db = getFirestore(getAdminApp());
  const col = db.collection(COLLECTION);

  return {
    async get(key: string) {
      const doc = await col.doc(key).get();
      if (!doc.exists) return undefined;
      return doc.data() as NodeSavedState;
    },
    async set(key: string, value: NodeSavedState) {
      await col.doc(key).set(JSON.parse(JSON.stringify(value)));
    },
    async del(key: string) {
      await col.doc(key).delete();
    },
  };
}
