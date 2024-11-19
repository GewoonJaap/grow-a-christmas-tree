import { cleanOldFailedAttempts } from "./antiBotHelper";

export function startAntiBotCleanupTimer() {
  cleanOldFailedAttempts();
  setInterval(async () => {
    await cleanOldFailedAttempts();
  }, 1000 * 60 * 60 * 24);
}
