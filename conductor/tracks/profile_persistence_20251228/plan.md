# Track Plan: User Profile Persistence (Firebase)

## Phase 1: Firebase Infrastructure
- [x] Task: Initialize Firebase Client c851d2a
    - [x] Subtask: Create `src/lib/firebase.ts` to initialize App, Auth, and Firestore.
    - [x] Subtask: Configure environment variables for Firebase credentials.
- [~] Task: Implement Anonymous Authentication
    - [ ] Subtask: Create a hook `useAuth` to handle anonymous sign-in on app load.
    - [ ] Subtask: Verify authentication state in the main application layout.
- [ ] Task: Conductor - User Manual Verification 'Firebase Infrastructure' (Protocol in workflow.md)

## Phase 2: Firestore Integration
- [ ] Task: Profile Service
    - [ ] Subtask: Create a utility service to save and fetch user profiles from Firestore.
- [ ] Task: Integrate Syncing in App
    - [ ] Subtask: Update `DiscoveryQuiz.tsx` to save results to Firestore on completion.
    - [ ] Subtask: Update landing page logic to fetch existing profiles from Firestore if available.
- [ ] Task: Conductor - User Manual Verification 'Firestore Integration' (Protocol in workflow.md)
