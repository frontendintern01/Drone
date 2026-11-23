/** Runtime configuration, separate from the testable HTTP client and feed. */
export const droneJourneyConfig = {
  journeyId: import.meta.env.VITE_DRONE_JOURNEY_ID?.trim() || 'AERPAW-FLIGHT2-20250609',
  backendOrigin: (import.meta.env.VITE_DRONE_API_BASE_URL ?? 'http://172.105.33.237:8000').trim().replace(/\/+$/, ''),
  requestTimeoutMs: 15000,
  /** Playback speed for recorded (non-live) journeys; 1 = real time. */
  replaySpeed: Number(import.meta.env.VITE_DRONE_REPLAY_SPEED) > 0 ? Number(import.meta.env.VITE_DRONE_REPLAY_SPEED) : 1,
} as const

export const droneJourneyRequestOrigin = import.meta.env.DEV ? '' : droneJourneyConfig.backendOrigin
