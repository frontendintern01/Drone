import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { GoogleMapsOverlay } from '@deck.gl/google-maps'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { AreaOfOperationLegend } from './AreaOfOperationLegend'
import { createOperationLayers } from './operationLayers'
import { getZoneAlerts, type OperationArea } from './operationArea'
import type { DroneSummary } from '../dashboard/types'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { DroneMapTooltip } from './DroneMapTooltip'

type MapStatus = 'loading' | 'ready' | 'error'

/**
 * Projects a lat/lng coordinate to the container's screen pixel coordinates.
 */
function getPixelFromLatLng(
  map: google.maps.Map,
  container: HTMLElement,
  lng: number,
  lat: number
): { x: number; y: number } | null {
  const projection = map.getProjection()
  if (!projection) return null

  const zoom = map.getZoom()
  if (zoom == null) return null

  const center = map.getCenter()
  if (!center) return null

  const worldCenter = projection.fromLatLngToPoint(center)
  const worldPoint = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng))
  if (!worldCenter || !worldPoint) return null

  const scale = Math.pow(2, zoom)
  let dx = worldPoint.x - worldCenter.x
  if (dx > 128) dx -= 256
  else if (dx < -128) dx += 256

  const dy = worldPoint.y - worldCenter.y

  const x = container.clientWidth / 2 + dx * scale
  const y = container.clientHeight / 2 + dy * scale

  return { x, y }
}

export function DeckGoogleMap({
  drones,
  alerts,
  area,
  focusOperationRef,
  selectedDroneId,
  onSelectDrone,
}: {
  drones: readonly DroneSummary[]
  area: OperationArea
  alerts: ReturnType<typeof getZoneAlerts>
  focusOperationRef?: React.RefObject<(() => void) | null>
  selectedDroneId?: string | null
  onSelectDrone?: (droneId: string) => void
}) {
  const mapElementRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<GoogleMapsOverlay | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const dronesRef = useRef(drones)
  const areaRef = useRef(area)
  const selectedDroneIdRef = useRef(selectedDroneId)
  const focusedJourneyRef = useRef<string | null>(null)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  const [tooltipDroneId, setTooltipDroneId] = useState<string | null>(null)
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom'>('top')
  const [mapPortalNode, setMapPortalNode] = useState<HTMLDivElement | null>(null)
  const tooltipContainerRef = useRef<HTMLDivElement>(null)
  const tooltipDroneIdRef = useRef<string | null>(tooltipDroneId)

  useEffect(() => {
    tooltipDroneIdRef.current = tooltipDroneId
  }, [tooltipDroneId])

  // Dismiss tooltip when clicking anywhere outside of it
  useEffect(() => {
    if (!tooltipDroneId) return

    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      if (tooltipContainerRef.current?.contains(event.target as Node)) {
        return
      }
      setTooltipDroneId(null)
    }

    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown, true)
    }, 40)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [tooltipDroneId])

  const handleDroneClick = useCallback(
    (drone: DroneSummary) => {
      setTooltipDroneId(prev => (prev === drone.id ? null : drone.id))
      onSelectDrone?.(drone.id)
    },
    [onSelectDrone]
  )
  const handleDroneClickRef = useRef(handleDroneClick)
  useEffect(() => {
    handleDroneClickRef.current = handleDroneClick
  }, [handleDroneClick])

  const updateTooltipPosition = useCallback(() => {
    if (
      !tooltipContainerRef.current ||
      !tooltipDroneIdRef.current ||
      !mapRef.current ||
      !mapElementRef.current
    ) {
      if (tooltipContainerRef.current) {
        tooltipContainerRef.current.style.display = 'none'
      }
      return
    }

    const currentDrone = dronesRef.current.find(d => d.id === tooltipDroneIdRef.current)
    if (!currentDrone?.position) {
      tooltipContainerRef.current.style.display = 'none'
      return
    }

    const activeContainer =
      ((document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement) as HTMLElement | null) ||
      mapElementRef.current
    if (!activeContainer) return

    const pixel = getPixelFromLatLng(
      mapRef.current,
      activeContainer,
      currentDrone.position[0],
      currentDrone.position[1]
    )
    if (!pixel) {
      tooltipContainerRef.current.style.display = 'none'
      return
    }

    const { x, y } = pixel
    const containerW = activeContainer.clientWidth
    const containerH = activeContainer.clientHeight

    if (x < -120 || x > containerW + 120 || y < -120 || y > containerH + 120) {
      tooltipContainerRef.current.style.display = 'none'
      return
    }

    const isNearTop = y < 290
    const placement = isNearTop ? 'bottom' : 'top'

    tooltipContainerRef.current.style.display = 'block'
    tooltipContainerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
    setTooltipPlacement(prev => (prev !== placement ? placement : prev))
  }, [])

  useEffect(() => {
    selectedDroneIdRef.current = selectedDroneId
  }, [selectedDroneId])

  const focusOperation = () => {
    const map = mapRef.current
    if (!map) return
    const bounds = new google.maps.LatLngBounds()
    const points = dronesRef.current.flatMap(drone =>
      drone.path ?? (drone.position ? [drone.position] : [])
    )
    points.forEach(([lng, lat]) => bounds.extend({ lat, lng }))
    areaRef.current.alert.forEach(([lng, lat]) => bounds.extend({ lat, lng }))
    areaRef.current.noFly.forEach(([lng, lat]) => bounds.extend({ lat, lng }))
    map.fitBounds(bounds, { top: 110, right: 70, bottom: 100, left: 90 })
    if (points.length) focusedJourneyRef.current = dronesRef.current[0].id
  }

  const handleFocusDrone = (drone: DroneSummary) => {
    if (!mapRef.current || !drone.position) return
    mapRef.current.panTo({ lat: drone.position[1], lng: drone.position[0] })
  }

  useEffect(() => {
    if (focusOperationRef) {
      focusOperationRef.current = focusOperation
    }
    return () => {
      if (focusOperationRef) {
        focusOperationRef.current = null
      }
    }
  })

  useEffect(() => {
    dronesRef.current = drones
    areaRef.current = area
    const activeDrone =
      drones.find(d => d.id === selectedDroneIdRef.current) ?? drones[0] ?? null
    overlayRef.current?.setProps({
      layers: createOperationLayers(
        drones,
        mapRef.current?.getZoom() ?? 12,
        area,
        activeDrone,
        performance.now(),
        drone => handleDroneClickRef.current(drone)
      ),
    })
    updateTooltipPosition()
    if (drones.length && focusedJourneyRef.current !== drones[0].id) focusOperation()
  }, [drones, area, updateTooltipPosition])

  useEffect(() => {
    let animId: number
    let lastRender = 0
    const animate = (time: number) => {
      if (time - lastRender >= 24) {
        lastRender = time
        if (overlayRef.current && mapRef.current) {
          const activeDrone =
            dronesRef.current.find(d => d.id === selectedDroneIdRef.current) ??
            dronesRef.current[0] ??
            null
          overlayRef.current.setProps({
            layers: createOperationLayers(
              dronesRef.current,
              mapRef.current.getZoom() ?? 12,
              areaRef.current,
              activeDrone,
              time,
              drone => handleDroneClickRef.current(drone)
            ),
          })
        }
        updateTooltipPosition()
      }
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [updateTooltipPosition])

  useEffect(() => {
    const mapElement = mapElementRef.current
    let disposed = false
    let overlay: GoogleMapsOverlay | undefined
    let map: google.maps.Map | undefined
    let resizeObserver: ResizeObserver | undefined
    let removeInteractions: (() => void) | undefined
    let tilesListener: google.maps.MapsEventListener | undefined
    let zoomListener: google.maps.MapsEventListener | undefined
    let boundsListener: google.maps.MapsEventListener | undefined
    let centerListener: google.maps.MapsEventListener | undefined
    let clickListener: google.maps.MapsEventListener | undefined
    let host: HTMLDivElement | undefined
    let handleFullscreenChange: (() => void) | undefined

    if (!apiKey) {
      return
    }

    if (!mapElement) {
      return
    }

    void loadGoogleMaps(apiKey)
      .then(({ Map }) => {
        if (disposed) {
          return
        }

        map = new Map(mapElement, {
          center: { lat: 26.825, lng: 72.395 },
          zoom: 12,
          minZoom: 3,
          maxZoom: 21,
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'administrative.province',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#FF0000' }, { weight: 1 }],
            },
          ],
          tilt: 0,
          heading: 0,
          isFractionalZoomEnabled: true,
          gestureHandling: 'greedy',
          scrollwheel: true,
          keyboardShortcuts: true,
          headingInteractionEnabled: false,
          tiltInteractionEnabled: false,
          restriction: {
            latLngBounds: { north: 85, south: -85, east: 180, west: -180 },
            strictBounds: true,
          },
          clickableIcons: false,
          fullscreenControl: true,
          cameraControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
          scaleControl: true,
          backgroundColor: '#020617',
        })

        // Google owns the camera and gestures; deck only renders data layers.
        mapRef.current = map
        focusOperation()
        const activeDrone =
          dronesRef.current.find(d => d.id === selectedDroneIdRef.current) ??
          dronesRef.current[0] ??
          null
        overlay = new GoogleMapsOverlay({
          layers: createOperationLayers(
            dronesRef.current,
            map.getZoom() ?? 12,
            areaRef.current,
            activeDrone,
            performance.now(),
            drone => handleDroneClickRef.current(drone)
          ),
          interleaved: false,
          onClick: info => {
            if (
              info.object &&
              ('telemetry' in info.object ||
                'journey' in info.object ||
                info.layer?.id === 'live-aircraft')
            ) {
              handleDroneClickRef.current(info.object as DroneSummary)
            } else {
              setTooltipDroneId(null)
            }
          },
          getTooltip: ({ object, layer }) => {
            if (layer?.id === 'live-aircraft' && object) {
              const drone = object as DroneSummary
              return {
                html: `<div style="font-family: ui-sans-serif, system-ui, sans-serif; padding: 6px 10px; background: rgba(2, 6, 23, 0.95); border: 1px solid rgba(6, 182, 212, 0.6); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.6); color: #f8fafc; font-size: 11px;">
                  <div style="font-weight: 700; color: #22d3ee; display: flex; align-items: center; gap: 6px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#22d3ee;"></span>
                    ${drone.name} (${drone.model || 'UAV'})
                  </div>
                  <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">Click to view live telemetry</div>
                </div>`,
                style: { backgroundColor: 'transparent', boxShadow: 'none', padding: 0 },
              }
            }
            if (layer?.id === 'operation-assets' && object) {
              const isPad = (object as { kind?: string }).kind === 'pad'
              const asset = object as { name: string; id: string }
              return {
                html: `<div style="font-family: ui-sans-serif, system-ui, sans-serif; padding: 4px 8px; background: rgba(2, 6, 23, 0.95); border: 1px solid ${isPad ? 'rgba(148, 163, 184, 0.6)' : 'rgba(16, 185, 129, 0.6)'}; border-radius: 6px; color: #f8fafc; font-size: 11px;">
                  <span style="font-weight: 700; color: ${isPad ? '#f8fafc' : '#34d399'};">${asset.name}</span>
                  <span style="color: #94a3b8; margin-left: 6px; font-size: 10px;">(${asset.id})</span>
                </div>`,
                style: { backgroundColor: 'transparent', boxShadow: 'none', padding: 0 },
              }
            }
            if (object?.name) {
              return object.name
            }
            return null
          },
        })
        overlayRef.current = overlay
        overlay.setMap(map)
        removeInteractions = attachRightMouseControls(mapElement, map)
        tilesListener = map.addListener('tilesloaded', () => {
          setStatus('ready')
          updateTooltipPosition()
        })
        const activeMap = map
        boundsListener = map.addListener('bounds_changed', updateTooltipPosition)
        centerListener = map.addListener('center_changed', updateTooltipPosition)
        clickListener = map.addListener('click', () => {
          setTooltipDroneId(null)
        })
        zoomListener = map.addListener('zoom_changed', () => {
          const currentDrone =
            dronesRef.current.find(d => d.id === selectedDroneIdRef.current) ??
            dronesRef.current[0] ??
            null
          overlay?.setProps({
            layers: createOperationLayers(
              dronesRef.current,
              activeMap.getZoom() ?? 12,
              areaRef.current,
              currentDrone,
              performance.now(),
              drone => handleDroneClickRef.current(drone)
            ),
          })
          updateTooltipPosition()
        })
        resizeObserver = new ResizeObserver(() => {
          const center = activeMap.getCenter()
          google.maps.event.trigger(activeMap, 'resize')
          if (center) activeMap.setCenter(center)
          updateTooltipPosition()
        })
        resizeObserver.observe(mapElement)

        host = document.createElement('div')
        host.className =
          'google-maps-overlay-container absolute inset-0 pointer-events-none z-[9999999] overflow-hidden'

        const getActiveFsElement = () =>
          ((document.fullscreenElement ||
            (document as unknown as { webkitFullscreenElement?: Element })
              .webkitFullscreenElement) as HTMLElement | null)

        const updateOverlayHostLocation = () => {
          const fsElem = getActiveFsElement()
          if (host) {
            if (fsElem) {
              if (!fsElem.contains(host)) {
                fsElem.appendChild(host)
              }
            } else if (mapElement && !mapElement.contains(host)) {
              mapElement.appendChild(host)
            }
          }
          setTimeout(() => {
            const mapInstance = mapRef.current
            if (mapInstance) {
              google.maps.event.trigger(mapInstance, 'resize')
            }
            updateTooltipPosition()
          }, 80)
        }

        const initialFsElem = getActiveFsElement()
        const initialTarget = initialFsElem || mapElement
        initialTarget.appendChild(host)
        setMapPortalNode(host)

        handleFullscreenChange = updateOverlayHostLocation
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        console.error('Unable to initialize the Google Maps deck.gl view.', error)
        setErrorMessage(
          'Google Maps could not be loaded. Check the API key, billing, and Maps JavaScript API access.',
        )
        setStatus('error')
      })

    return () => {
      disposed = true
      if (handleFullscreenChange) {
        document.removeEventListener('fullscreenchange', handleFullscreenChange)
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      }
      host?.remove()
      setMapPortalNode(null)
      resizeObserver?.disconnect()
      removeInteractions?.()
      tilesListener?.remove()
      zoomListener?.remove()
      boundsListener?.remove()
      centerListener?.remove()
      clickListener?.remove()
      overlay?.setMap(null)
      overlay?.finalize()
      overlayRef.current = null
      mapRef.current = null
      if (map) google.maps.event.clearInstanceListeners(map)
      mapElement.replaceChildren()
    }
  }, [apiKey])

  const missingKeyMessage =
    'Add VITE_GOOGLE_MAPS_API_KEY to your local environment.'

  const activeTooltipDrone = drones.find(d => d.id === tooltipDroneId) ?? null

  const mapOverlayContent = (
    <>
      {/* Pinned Drone Telemetry Tooltip Container */}
      <div
        ref={tooltipContainerRef}
        className="pointer-events-none absolute left-0 top-0 z-45 will-change-transform"
        style={{ display: 'none' }}
      >
        {activeTooltipDrone && (
          <div
            className={`pointer-events-auto -translate-x-1/2 transition-transform duration-75 ${
              tooltipPlacement === 'top'
                ? '-translate-y-[calc(100%+24px)]'
                : 'translate-y-[28px]'
            }`}
          >
            <DroneMapTooltip
              drone={activeTooltipDrone}
              area={area}
              placement={tooltipPlacement}
              onClose={() => setTooltipDroneId(null)}
              onFocus={() => handleFocusDrone(activeTooltipDrone)}
            />
          </div>
        )}
      </div>

      {/* Top Center Alerts Container (shows in both normal and fullscreen modes!) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none absolute left-1/2 top-4 z-50 flex max-h-[40%] w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-3"
      >
        {alerts.map(alert => (
          <div
            key={alert.id}
            role={alert.zone === 'no-fly' ? 'alert' : 'status'}
            className={`pointer-events-auto w-full rounded-xl border p-3 shadow-2xl backdrop-blur-md transition-all ${
              alert.zone === 'no-fly'
                ? 'border-rose-500/70 bg-rose-950/95 text-rose-100 shadow-rose-950/40'
                : 'border-amber-400/60 bg-slate-950/95 text-amber-100 shadow-amber-950/30'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              {alert.zone === 'no-fly' ? (
                <ShieldAlert className="size-4 shrink-0 text-rose-400" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-amber-400" />
              )}
              <span>{alert.zone === 'no-fly' ? 'No-fly zone breach' : 'Alert area entry'}</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-white">{alert.name}</div>
            <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{alert.message}</p>
          </div>
        ))}
      </div>

      <AreaOfOperationLegend />
    </>
  )

  return (
    <section
      aria-label="Map workspace"
      className="relative hidden min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-950 md:block"
    >
      <div
        ref={mapElementRef}
        aria-label="Road map"
        className="google-map-canvas absolute inset-0"
        role="application"
      />

      {mapPortalNode ? createPortal(mapOverlayContent, mapPortalNode) : mapOverlayContent}

      {apiKey && status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-slate-400">
          Loading map…
        </div>
      )}
      {(!apiKey || status === 'error') && (
        <div
          role="alert"
          className="absolute inset-0 grid place-items-center bg-slate-950/90 p-6 text-center text-sm text-rose-300"
        >
          {apiKey ? errorMessage : missingKeyMessage}
        </div>
      )}
    </section>
  )
}

/** Keep native drag / wheel gestures and also allow right-drag pan. */
function attachRightMouseControls(element: HTMLElement, map: google.maps.Map) {
  let drag: { pointerId: number; x: number; y: number } | undefined
  let frame = 0
  let targetZoom: number | undefined

  const stopDrag = () => {
    if (drag && element.hasPointerCapture(drag.pointerId)) {
      element.releasePointerCapture(drag.pointerId)
    }
    drag = undefined
    element.style.cursor = ''
  }
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 2) return
    event.preventDefault()
    event.stopPropagation()
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    element.setPointerCapture(event.pointerId)
    element.style.cursor = 'grabbing'
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    map.panBy(drag.x - event.clientX, drag.y - event.clientY)
    drag.x = event.clientX
    drag.y = event.clientY
  }
  const onPointerUp = (event: PointerEvent) => {
    if (drag?.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    stopDrag()
  }
  const animateZoom = () => {
    const current = map.getZoom() ?? 15
    const remaining = (targetZoom ?? current) - current
    if (Math.abs(remaining) < 0.01) {
      map.setZoom(targetZoom ?? current)
      frame = 0
      targetZoom = undefined
      return
    }
    map.setZoom(current + remaining * 0.25)
    frame = requestAnimationFrame(animateZoom)
  }
  const onWheel = (event: WheelEvent) => {
    if (!drag) return // Google handles normal wheel, Ctrl-wheel and pinch natively.
    event.preventDefault()
    event.stopPropagation()
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1)
    targetZoom = Math.max(3, Math.min(21, (targetZoom ?? map.getZoom() ?? 15) - Math.max(-240, Math.min(240, pixels)) / 300))
    if (!frame) frame = requestAnimationFrame(animateZoom)
  }
  const onContextMenu = (event: MouseEvent) => event.preventDefault()

  element.addEventListener('pointerdown', onPointerDown, true)
  element.addEventListener('pointermove', onPointerMove, true)
  element.addEventListener('pointerup', onPointerUp, true)
  element.addEventListener('pointercancel', onPointerUp, true)
  element.addEventListener('lostpointercapture', stopDrag)
  element.addEventListener('contextmenu', onContextMenu)
  element.addEventListener('wheel', onWheel, { capture: true, passive: false })
  window.addEventListener('blur', stopDrag)

  return () => {
    cancelAnimationFrame(frame)
    stopDrag()
    element.removeEventListener('pointerdown', onPointerDown, true)
    element.removeEventListener('pointermove', onPointerMove, true)
    element.removeEventListener('pointerup', onPointerUp, true)
    element.removeEventListener('pointercancel', onPointerUp, true)
    element.removeEventListener('lostpointercapture', stopDrag)
    element.removeEventListener('contextmenu', onContextMenu)
    element.removeEventListener('wheel', onWheel, true)
    window.removeEventListener('blur', stopDrag)
  }
}
