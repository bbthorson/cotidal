import { test, expect } from '@playwright/test';
import * as service from '../src/lib/profile-service';

test('Profile Service: Interface should be correctly defined', async () => {
  expect(service.saveUserProfile).toBeDefined();
  expect(service.getUserProfile).toBeDefined();
});
