import { ScatterplotLayer } from '@deck.gl/layers'
import type { DroneTarget } from '../../types/drone'
import { getZoneState, type OperationArea } from '../../components/map/operationArea'

export interface EffectsLayerProps {
  selectedDrone: DroneTarget | null
  time: number
  area: OperationArea
}

export function getEffectsLayers({ selectedDrone, time, area }: EffectsLayerProps) {
  if (!selectedDrone || !selectedDrone.position) return []

  // Expanding radar pulse ring directly underneath the selected drone
  const cycle = (time % 1500) / 1500 // 0 to 1 loop every 1.5s
  // Scaled down smaller so it hugs the drone tightly and cleanly as it moves
  const animatedRadius = 5 + cycle * 15 // expands from 5m to 20m
  const alpha = Math.floor((1 - cycle) * 230) // Fades out from 230 to 0

  const isHighThreat =
    selectedDrone.threatLevel === 'HIGH' ||
    getZoneState(selectedDrone.position, area) !== 'outside'

  const ringColor: [number, number, number, number] = isHighThreat
    ? [244, 63, 94, alpha] // Rose pulse for intruder / no-fly
    : [6, 182, 212, alpha] // Cyan pulse for friendly / tracked

  const baseColor: [number, number, number] = isHighThreat
    ? [244, 63, 94]
    : [6, 182, 212]

  // 1. Expanding Pulse Ring emanating from directly beneath the drone
  const selectedRingLayer = new ScatterplotLayer({
    id: 'layer-selected-pulse-ring',
    data: [{ position: selectedDrone.position }],
    getPosition: (d: { position: [number, number] }) => [d.position[0], d.position[1], 0],
    getRadius: animatedRadius,
    radiusUnits: 'meters',
    radiusMinPixels: 8,
    radiusMaxPixels: 24,
    stroked: true,
    filled: false,
    getLineColor: ringColor,
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
    updateTriggers: {
      getPosition: [selectedDrone.position[0], selectedDrone.position[1]],
      getRadius: [animatedRadius],
      getLineColor: [ringColor[0], ringColor[1], ringColor[2], ringColor[3]],
    },
  })

  // 2. Solid inner ground target anchor circle directly underneath the drone
  const selectedAnchorLayer = new ScatterplotLayer({
    id: 'layer-selected-anchor',
    data: [{ position: selectedDrone.position }],
    getPosition: (d: { position: [number, number] }) => [d.position[0], d.position[1], 0],
    getRadius: 4.5,
    radiusUnits: 'meters',
    radiusMinPixels: 5,
    radiusMaxPixels: 10,
    stroked: true,
    filled: true,
    getFillColor: [baseColor[0], baseColor[1], baseColor[2], 50],
    getLineColor: [baseColor[0], baseColor[1], baseColor[2], 255],
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
    updateTriggers: {
      getPosition: [selectedDrone.position[0], selectedDrone.position[1]],
      getFillColor: [baseColor[0], baseColor[1], baseColor[2]],
      getLineColor: [baseColor[0], baseColor[1], baseColor[2]],
    },
  })

  return [selectedRingLayer, selectedAnchorLayer]
}
