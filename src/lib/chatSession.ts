const SESSION_KEY_PREFIX = 'dfcx_session_';

/**
 * Retrieves the persisted Dialogflow CX session_id for a given asset.
 * Returns null if no session has been stored yet.
 */
export function getSessionId(assetId: string): string | null {
  try {
    return localStorage.getItem(`${SESSION_KEY_PREFIX}${assetId}`);
  } catch {
    return null;
  }
}

/**
 * Persists the Dialogflow CX session_id for a given asset so it survives
 * page reloads and can be reused in subsequent requests.
 */
export function setSessionId(assetId: string, sessionId: string): void {
  try {
    localStorage.setItem(`${SESSION_KEY_PREFIX}${assetId}`, sessionId);
  } catch {
    // Silently ignore storage failures (e.g. private-browsing quota exceeded)
  }
}
