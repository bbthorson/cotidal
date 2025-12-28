import { test, expect } from '@playwright/test';
import * as firebase from '../src/lib/firebase';

test('Firebase: Client should export auth and db', async () => {
  expect(firebase.auth).toBeDefined();
  expect(firebase.db).toBeDefined();
});
