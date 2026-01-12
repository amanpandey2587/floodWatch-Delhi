'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api'

interface HotspotPrediction {
  id: number
  name: string
  lat: number
  lng: number
  risk_level: number
  probability: number
}

interface Route {
  route: Array<[number, number]>
  warnings: string[]
  distance_km: number
  duration_min: number
}

interface Ward {
  id: string
  name: string
  bounds: Array<[number, number]>
  preparedness_score: number
  pumps_available: number
  pumps_total: number
  drains_desilted: boolean
  emergency_contacts: number
}

interface CrowdsourceReport {
  id: string
  lat: number
  lng: number
  message: string
  timestamp: number
  severity: number
}

interface GoogleMapEnhancedProps {
  hotspots: HotspotPrediction[]
  route?: Route | null
  showTraffic: boolean
  showWards: boolean
  showCrowdsource: boolean
  rainfallIntensity: number
  wards: Ward[]
  crowdsourceReports: CrowdsourceReport[]
  mapMode: 'standard' | '3d' | 'streetview'
  onMapModeChange?: (mode: 'standard' | '3d' | 'streetview') => void
}

const containerStyle = {
  width: '100%',
  height: '100%'
}

const center = {
  lat: 28.6139,
  lng: 77.2090
}

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places', 'visualization']

export default function GoogleMapEnhanced({
  hotspots,
  route,
  showTraffic,
  showWards,
  showCrowdsource,
  rainfallIntensity,
  wards,
  crowdsourceReports,
  mapMode,
  onMapModeChange,
}: GoogleMapEnhancedProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [streetView, setStreetView] = useState<google.maps.StreetViewPanorama | null>(null)
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPrediction | null>(null)
  const [selectedReport, setSelectedReport] = useState<CrowdsourceReport | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const streetViewRef = useRef<google.maps.StreetViewPanorama | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
    mapRef.current = null
  }, [])

  // Handle 3D mode
  useEffect(() => {
    if (!map) return

    if (mapMode === '3d') {
      map.setMapTypeId('satellite')
      map.setTilt(45)
      map.setZoom(18)
    } else if (mapMode === 'standard') {
      map.setMapTypeId('roadmap')
      map.setTilt(0)
    }
  }, [mapMode, map])

  // Handle Street View mode
  useEffect(() => {
    if (!map || mapMode !== 'streetview') return

    const panorama = map.getStreetView()
    if (panorama) {
      streetViewRef.current = panorama
      setStreetView(panorama)
      panorama.setPosition(center)
      panorama.setPov({
        heading: 34,
        pitch: 10
      })
      panorama.setVisible(true)
    }

    return () => {
      if (panorama) {
        panorama.setVisible(false)
      }
    }
  }, [mapMode, map])

  // Handle traffic layer
  useEffect(() => {
    if (!map || !showTraffic) return

    const trafficLayer = new google.maps.TrafficLayer()
    trafficLayer.setMap(map)

    return () => {
      trafficLayer.setMap(null)
    }
  }, [showTraffic, map])

  // Handle ward polygons
  useEffect(() => {
    if (!map || !showWards || wards.length === 0) return

    const polygons = wards.map((ward) => {
      const paths = ward.bounds.map((coord) => ({
        lat: coord[0],
        lng: coord[1],
      }))

      const color = getWardColor(ward.preparedness_score)
      
      const polygon = new google.maps.Polygon({
        paths,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        map,
      })

      const infoWindow = new google.maps.InfoWindow()

      polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          infoWindow.setContent(`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${ward.name}</h3>
              <div style="font-size: 14px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #666;">Preparedness:</span>
                  <span style="font-weight: 600;">${ward.preparedness_score}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #666;">Pumps:</span>
                  <span style="font-weight: 600;">${ward.pumps_available}/${ward.pumps_total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #666;">Drains Desilted:</span>
                  <span style="font-weight: 600; color: ${ward.drains_desilted ? '#059669' : '#dc2626'};">
                    ${ward.drains_desilted ? 'Yes' : 'No'}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666;">Emergency Contacts:</span>
                  <span style="font-weight: 600;">${ward.emergency_contacts}</span>
                </div>
              </div>
            </div>
          `)
          infoWindow.setPosition(event.latLng)
          infoWindow.open(map)
        }
      })

      return polygon
    })

    return () => {
      polygons.forEach((polygon) => polygon.setMap(null))
    }
  }, [showWards, wards, map])

  const getWardColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getMarkerIcon = (riskLevel: number) => {
    const colors = ['#10b981', '#f59e0b', '#ef4444']
    const color = colors[riskLevel] || colors[0]
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 10,
    }
  }

  const getCrowdsourceIcon = (severity: number) => {
    const colors = ['#3b82f6', '#f59e0b', '#ef4444']
    const color = colors[severity] || colors[0]
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 6,
    }
  }

  const getRiskLabel = (riskLevel: number) => {
    switch (riskLevel) {
      case 0:
        return 'Safe'
      case 1:
        return 'Warning'
      case 2:
        return 'Critical'
      default:
        return 'Unknown'
    }
  }

  const routePath = route?.route.map(([lat, lng]) => ({ lat, lng })) || []
  const routeColor = route && route.warnings.length > 0 ? '#ef4444' : '#3b82f6'

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error loading Google Maps</p>
          <p className="text-sm">Please check your API key and internet connection</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={11}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: true,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
      }}
    >
      {/* Hotspot Markers */}
      {hotspots.map((hotspot) => (
        <Marker
          key={hotspot.id}
          position={{ lat: hotspot.lat, lng: hotspot.lng }}
          icon={getMarkerIcon(hotspot.risk_level)}
          onClick={() => setSelectedHotspot(hotspot)}
        />
      ))}

      {/* Hotspot Info Windows */}
      {selectedHotspot && (
        <InfoWindow
          position={{ lat: selectedHotspot.lat, lng: selectedHotspot.lng }}
          onCloseClick={() => setSelectedHotspot(null)}
        >
          <div className="p-2 min-w-[200px]">
            <h3 className="font-bold text-lg mb-1">{selectedHotspot.name}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Risk Level:</span>
                <span
                  className={`font-semibold ${
                    selectedHotspot.risk_level === 0
                      ? 'text-green-600'
                      : selectedHotspot.risk_level === 1
                      ? 'text-orange-600'
                      : 'text-red-600'
                  }`}
                >
                  {getRiskLabel(selectedHotspot.risk_level)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Probability:</span>
                <span className="font-semibold">
                  {(selectedHotspot.probability * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Crowdsource Report Markers */}
      {showCrowdsource && crowdsourceReports.map((report) => (
        <Marker
          key={report.id}
          position={{ lat: report.lat, lng: report.lng }}
          icon={getCrowdsourceIcon(report.severity)}
          onClick={() => setSelectedReport(report)}
        />
      ))}

      {/* Crowdsource Report Info Windows */}
      {selectedReport && (
        <InfoWindow
          position={{ lat: selectedReport.lat, lng: selectedReport.lng }}
          onCloseClick={() => setSelectedReport(null)}
        >
          <div className="p-2 min-w-[200px]">
            <div className="text-sm text-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-500">
                  {new Date(selectedReport.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
              <p className="font-medium">{selectedReport.message}</p>
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Route Polyline */}
      {route && routePath.length > 0 && (
        <Polyline
          path={routePath}
          options={{
            strokeColor: routeColor,
            strokeOpacity: 0.8,
            strokeWeight: 4,
          }}
        />
      )}
    </GoogleMap>
  )
}