# Track Spec: User Profile Persistence (Firebase)

## Goal
Transition the application from ephemeral `localStorage` to persistent Firestore storage, allowing users to maintain their Palate Matrix across sessions and devices.

## Requirements

### 1. Identity Management
- **Anonymous Auth:** Use Firebase Anonymous Authentication to uniquely identify seekers without a mandatory sign-up wall.
- **Session Persistence:** Authenticate the user on app initialization if a session doesn't already exist.

### 2. Data Persistence
- **Firestore Collection:** Use a `profiles` collection in Firestore.
- **Document Structure:** The document ID should match the Firebase UID. Store `x`, `y`, `vibeTags`, and filter flags.
- **Syncing:** 
    - **Write:** Save the full profile immediately upon quiz completion.
    - **Read:** On app load, check for an existing anonymous session and pull the profile from Firestore.

### 3. Fallback Logic
- **Hybrid Storage:** Continue to use `localStorage` as a secondary cache for offline/instant access, but treat Firestore as the source of truth.
