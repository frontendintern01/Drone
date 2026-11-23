/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_DRONE_JOURNEY_ID?: string
  readonly VITE_DRONE_API_BASE_URL?: string
  readonly VITE_DRONE_REPLAY_SPEED?: string
}
