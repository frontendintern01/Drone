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

This branch uses only the Drone Journey API. No mock feed or simulated drone movement is bundled in the application.

```dotenv
VITE_DRONE_API_BASE_URL=http://172.105.33.237:8000
VITE_DRONE_JOURNEY_ID=AERPAW-FLIGHT2-20250609
```

Restart Vite after changing environment variables. Development requests use the same-origin `/api/v1/drone-journey/{journey_id}` route, forwarded by Vite to the configured backend. Production requests use `VITE_DRONE_API_BASE_URL` directly. An empty production base URL requires a same-origin reverse proxy. Separate origins must allow CORS; an HTTPS frontend needs an HTTPS backend or HTTPS same-origin proxy. Authentication is not added because the provided contract does not specify it. Do not store backend secrets in Vite variables.

There is no fixed 3-second update interval. Each successful GET immediately starts the next request, with one request in flight at a time. Updates therefore follow received backend responses, subject to server and network latency. This endpoint is not a push stream: GET cannot guarantee observing every backend change. Full recorded history renders as a path with the marker at the newest point, not as a simulated playback.

Requests time out after 15 seconds. Failed requests back off from 500 ms to 10 seconds and respect a longer server `Retry-After` value. The last successful journey remains visible with an error label while retrying. Before the first successful response, the aircraft list is empty; there is no fallback flight. The existing operation area remains displayed.

The data flow is separated into:

- `src/config/droneJourney.ts`: environment configuration and default flight ID.
- `src/lib/droneJourneyApi.ts`: injectable HTTP client, timeout, cancellation and HTTP errors.
- `src/lib/droneJourney.ts`: runtime payload validation and exact timestamp history merge.
- `src/lib/droneJourneyFeed.ts`: sequential requests and failure recovery.
- `src/hooks/useDroneJourney.ts`: React state and request cleanup; accepts a journey ID and isolates flights when it changes.

Tests use an isolated fixture under `tests/fixtures`, never served by the dashboard. Transport tests exercise a local HTTP server; they do not establish that the external backend is reachable.

The earliest received journey point anchors home; the newest timestamp sets the aircraft position and telemetry. Coordinates are used directly, in `[longitude, latitude]` order for deck.gl. Home is a first GPS fix, not a backend-declared launch point. A single point shows home and aircraft at the same coordinate; a path needs at least two points. History filters use the latest flight timestamp, so recorded journeys can be inspected. Filtered trails never insert a fabricated straight shortcut from home to a later point. Selecting All history shows the complete received trail. History is in memory and resets on page reload.

Sky Status displays `device_info.make_model`. Tactical Gauges displays the latest coordinates, flight timestamp and status, both speeds, heading, altitude, ground height, altitude change, RF distance, classification and serial number. Flight elapsed is computed between the first and latest samples. Missing numeric values show an em dash; zero stays zero. RemoteID Payload shows journey metadata and the latest sample; this endpoint does not provide a separate Remote ID message.

Blue and red quadcopter SVGs and the home pin are in `src/components/map/mapIcons.ts`. Red indicates entry into either the yellow alert area or red no-fly zone; outside both zones the icon is blue. Alerts identify the model and current zone. The API contract does not contain an intruder flag. The sample operation layout, including RF assets and landing pads, is relocated near the first GPS fix with its center 1.8 km east of home. The yellow boundary starts about 1.1 km east of home, and its height is reduced by 45%. Zones stay anchored to the journey origin as the aircraft moves; they are illustrative GIS data, not official airspace boundaries. The Area button fits the zones and journey together.
