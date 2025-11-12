import { initializeSyncSchedules } from "../services/sync.server";

let initialized = false;

export function initializeApp() {
  if (initialized) {
    return;
  }
  initialized = true;
  console.log("Initializing application services...");
  initializeSyncSchedules();
}
