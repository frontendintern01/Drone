import { IconLayer, PathLayer, PolygonLayer, TextLayer } from '@deck.gl/layers'
import { operationArea as defaultArea, getZoneState, isValidCoordinate, type OperationArea } from './operationArea'
import type { DroneSummary } from '../dashboard/types'
import { DRONE_ICON_SVG, GREEN_HOME_PIN_SVG, INTRUDER_DRONE_ICON_SVG } from './mapIcons'
import { getEffectsLayers } from '@/map/layers/effects'

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
export const RF_SENSOR_ICON_SVG = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#10b981" stroke="#047857" stroke-width="2.5"/><rect x="22.5" y="14" width="3" height="18" rx="1" fill="#0f172a"/><circle cx="24" cy="13" r="3" fill="#0f172a"/><path d="M19 32 L24 23 L29 32" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 10 C15 13 15 17 18 20 M30 10 C33 13 33 17 30 20 M14 6 C9 11 9 20 14 25 M34 6 C39 11 39 20 34 25" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/></svg>`)
export const LANDING_PAD_ICON_SVG = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#ffffff" stroke="#334155" stroke-width="2.5"/><path d="M16 13 V35 M32 13 V35 M18 24 H30" stroke="#0f172a" stroke-width="4"/></svg>`)

export function createOperationLayers(
  drones: readonly DroneSummary[],
  zoom = 12,
  operationArea: OperationArea = defaultArea,
  selectedDrone?: DroneSummary | null,
  time = 0,
  onDroneClick?: (drone: DroneSummary) => void
) {
  const showDetails = zoom >= 7.2
  const showAssetLabels = zoom >= 13
  const zones = [
    { polygon: operationArea.alert, color: [251, 191, 36, 255], fill: [251, 191, 36, 20] },
    { polygon: operationArea.noFly, color: [244, 63, 94, 255], fill: [244, 63, 94, 55] },
  ]
  const aircraft = drones.filter(drone => drone.position && isValidCoordinate(drone.position))
  const targetDrone = selectedDrone ?? aircraft[0] ?? null
  const effectsLayers = getEffectsLayers({
    selectedDrone: targetDrone,
    time,
  })
  return [
    new PolygonLayer({
      id: 'operation-zones', data: zones, getPolygon: d => d.polygon,
      getFillColor: d => d.fill as [number, number, number, number],
      getLineColor: d => d.color as [number, number, number, number],
      getLineWidth: 3, lineWidthUnits: 'pixels', stroked: true, filled: true,
    }),
    new TextLayer({
      id: 'zone-labels', visible: showDetails, data: [
        {
          text: 'ALERT AREA',
          position: [
            (operationArea.alert[0][0] + operationArea.alert[1][0]) / 2,
            (operationArea.alert[0][1] + operationArea.alert[1][1]) / 2,
          ],
          color: [253, 230, 138, 255],
        },
        {
          text: 'NO-FLY ZONE',
          position: [
            (operationArea.noFly[0][0] + operationArea.noFly[1][0]) / 2,
            (operationArea.noFly[0][1] + operationArea.noFly[1][1]) / 2,
          ],
          color: [254, 205, 211, 255],
        },
      ],
      getPosition: d => d.position as [number, number], getText: d => d.text,
      getColor: d => d.color as [number, number, number, number], getSize: 12,
      fontFamily: 'Arial, sans-serif', fontWeight: 700, background: true,
      getBackgroundColor: [2, 6, 23, 225], backgroundPadding: [10, 6],
    }),
    new IconLayer({
      id: 'operation-assets',
      visible: showDetails,
      data: operationArea.assets,
      pickable: true,
      getPosition: d => d.position,
      getSize: zoom >= 14 ? 30 : zoom >= 11 ? 24 : 18,
      sizeUnits: 'pixels',
      getIcon: d => ({
        url: d.kind === 'pad' ? LANDING_PAD_ICON_SVG : RF_SENSOR_ICON_SVG,
        width: 48,
        height: 48,
        anchorX: 24,
        anchorY: 24,
      }),
    }),
    new IconLayer({
      id: 'home-locations',
      data: aircraft
        .filter(d => d.homePosition && isValidCoordinate(d.homePosition))
        .map(d => ({ ...d, name: `Home · ${d.name}` })),
      pickable: true,
      getPosition: d => d.homePosition!,
      getSize: 48,
      sizeUnits: 'pixels',
      getIcon: () => ({ url: GREEN_HOME_PIN_SVG, width: 48, height: 58, anchorX: 24, anchorY: 56 }),
    }),
    new TextLayer({
      id: 'asset-labels',
      visible: showAssetLabels,
      data: operationArea.assets,
      getPosition: d => d.position,
      getText: d => d.id,
      getSize: 9.5,
      getColor: [241, 245, 249, 255],
      getPixelOffset: [0, 18],
      fontFamily: 'Arial, sans-serif',
      fontWeight: 700,
      background: true,
      getBackgroundColor: [2, 6, 23, 210],
      backgroundPadding: [5, 2],
    }),
    new PathLayer<DroneSummary>({
      id: 'journey-trails', data: aircraft.filter(d => (d.path?.length ?? 0) > 1),
      getPath: d => d.path!, getColor: [56, 189, 248, 230],
      getWidth: 3, widthUnits: 'pixels', jointRounded: true, capRounded: true,
    }),
    ...effectsLayers,
    new IconLayer<DroneSummary>({
      id: 'live-aircraft',
      data: aircraft,
      pickable: true,
      autoHighlight: true,
      highlightColor: [6, 182, 212, 100],
      getPosition: d => d.position!,
      getSize: 48,
      sizeUnits: 'pixels',
      getAngle: d => -(d.telemetry?.heading_deg ?? 0),
      getIcon: d => ({
        url:
          getZoneState(d.position!, operationArea) !== 'outside'
            ? INTRUDER_DRONE_ICON_SVG
            : DRONE_ICON_SVG,
        width: 64,
        height: 64,
        anchorX: 32,
        anchorY: 32,
      }),
      onClick: info => {
        if (info.object && onDroneClick) {
          onDroneClick(info.object)
          return true
        }
      },
      updateTriggers: {
        getAngle: [aircraft.map(d => d.telemetry?.heading_deg)],
        getIcon: [aircraft.map(d => (d.position ? getZoneState(d.position, operationArea) : ''))],
      },
    }),
  ]
}
