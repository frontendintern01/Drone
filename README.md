# Drone mission dashboard

React + TypeScript + Vite, Google Maps and deck.gl.

## Run and verify

```sh
npm install
npm run dev
npm run build
npm test
npm run lint
```

## Journey feed

Copy the settings in `.env.example` into `.env.local` and retain your Google Maps key.

Default `VITE_DRONE_DATA_MODE=mock` polls `public/mocks/drone-journey.json` every 3 seconds. This fixture is the supplied API response, with its original coordinates and timestamp. There is no invented movement: append timestamped points to the fixture to preview movement and telemetry updates. Reload to reset accumulated history.

When the backend is available, configure:

```dotenv
VITE_DRONE_DATA_MODE=api
VITE_DRONE_API_BASE_URL=https://your-backend.example
VITE_DRONE_JOURNEY_ID=AERPAW-FLIGHT2-20250609
VITE_DRONE_POLL_INTERVAL_MS=3000
```

Restart Vite after changing environment variables. An empty base URL uses the application's origin. Separate backend origins must allow this frontend through CORS. Authentication is not added because the supplied API contract does not specify it. Never put backend secrets in Vite environment variables.

The adapter sends `GET /api/v1/drone-journey/{journey_id}`. It validates the response, merges full history or incremental batches by timestamp, and retains the last successful data while retrying a failed request. A request times out after 15 seconds; the next poll starts after the previous request finishes.

The earliest received journey point anchors home; the newest timestamp sets the aircraft position and telemetry. Coordinates are used directly, in `[longitude, latitude]` order for deck.gl. Home is a first GPS fix, not a backend-declared launch point. A single point shows home and aircraft at the same coordinate; a path needs at least two points. History filters use the latest flight timestamp, so recorded journeys can be inspected. Selecting All history shows the complete received trail. History is in memory and resets on page reload.

Sky Status displays `device_info.make_model`. Tactical Gauges displays the latest coordinates, flight timestamp and status, both speeds, heading, altitude, ground height, altitude change, RF distance, classification and serial number. Flight elapsed is computed between the first and latest samples. Missing numeric values show an em dash; zero stays zero. RemoteID Payload shows journey metadata and the latest sample; this endpoint does not provide a separate Remote ID message.

Blue and red quadcopter SVGs and the home pin are in `src/components/map/mapIcons.ts`. Red indicates entry into either the yellow alert area or red no-fly zone; outside both zones the icon is blue. Alerts identify the model and current zone. The API contract does not contain an intruder flag. The sample operation layout, including RF assets and landing pads, is relocated near the first GPS fix with its center 1.8 km east of home. The yellow boundary starts about 1.1 km east of home, and its height is reduced by 45%. Zones stay anchored to the journey origin as the aircraft moves; they are illustrative GIS data, not official airspace boundaries. The Area button fits the zones and journey together.
