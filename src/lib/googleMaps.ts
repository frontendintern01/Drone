import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let mapsLibraryPromise: Promise<google.maps.MapsLibrary> | undefined

export function loadGoogleMaps(
  apiKey: string,
): Promise<google.maps.MapsLibrary> {
  if (!mapsLibraryPromise) {
    setOptions({ key: apiKey, v: 'weekly' })
    mapsLibraryPromise = importLibrary('maps')
  }

  return mapsLibraryPromise
}
