import { Fragment } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polygon, Popup } from 'react-leaflet'
import { RegionDetail } from '../lib/api'

const REGION_COORDS: Record<string, [number, number]> = {
  'North East & Yorkshire': [54.0, -1.5],
  'Midlands': [52.5, -1.8],
  'North West': [53.7, -2.5],
  'East of England': [52.2, 0.5],
  'London': [51.5, -0.1],
  'South East': [51.1, -0.5],
  'South West': [50.9, -3.5],
}

function scoreColor(score: number) {
  if (score >= 75) return '#e05252'
  if (score >= 55) return '#d97706'
  if (score >= 40) return '#eab308'
  return '#16a34a'
}

interface RegionMapProps {
  regions?: RegionDetail[]
  selectedRegionId?: number | null
  onSelectRegion?: (region: RegionDetail) => void
}

function toLeafletPolygon(boundary: RegionDetail['boundary_geojson']) {
  if (!boundary) return null

  if (boundary.type === 'Polygon') {
    const coordinates = boundary.coordinates as number[][][]
    return coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]))
  }

  const coordinates = boundary.coordinates as number[][][][]
  return coordinates.map((polygon) =>
    polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]))
  )
}

export default function RegionMap({ regions = [], selectedRegionId = null, onSelectRegion }: RegionMapProps) {
  return (
    <MapContainer
      center={[52.5, -1.5]}
      zoom={6}
      minZoom={5}
      maxZoom={10}
      maxBounds={[[49.5, -8.7], [56.5, 2.3]]}
      maxBoundsViscosity={0.9}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom
      touchZoom
      doubleClickZoom
      dragging
      zoomControl
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {regions.map((r) => {
        const coords: [number, number] | undefined =
          r.region_center_lat !== undefined && r.region_center_lng !== undefined
            ? [r.region_center_lat, r.region_center_lng]
            : REGION_COORDS[r.name]

        if (!coords) return null

        const polygonPositions = toLeafletPolygon(r.boundary_geojson)
        const color = scoreColor(r.inequality_score)
        const isSelected = selectedRegionId === r.id

        return (
          <Fragment key={`layer-${r.id}`}>
            {polygonPositions ? (
              <Polygon
                positions={polygonPositions}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.36 : 0.24,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{ click: () => onSelectRegion?.(r) }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-800 mb-1">{r.name}</p>
                    <p className="text-slate-600">Inequality score: <strong>{r.inequality_score}</strong></p>
                    <p className="text-slate-600">Over 18 weeks: <strong>{r.pct_over_18_weeks}%</strong></p>
                    <p className="text-slate-600">Waiting: <strong>{(r.total_waiting / 1e6).toFixed(2)}M</strong></p>
                  </div>
                </Popup>
              </Polygon>
            ) : null}

            <CircleMarker
              center={coords}
              radius={Math.max(10, r.inequality_score / 5)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={{ click: () => onSelectRegion?.(r) }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-slate-800 mb-1">{r.name}</p>
                  <p className="text-slate-600">Inequality score: <strong>{r.inequality_score}</strong></p>
                  <p className="text-slate-600">Over 18 weeks: <strong>{r.pct_over_18_weeks}%</strong></p>
                  <p className="text-slate-600">Waiting: <strong>{(r.total_waiting / 1e6).toFixed(2)}M</strong></p>
                  <p className={`mt-1 font-medium ${
                    r.trend === 'deteriorating' ? 'text-red-600' :
                    r.trend === 'improving' ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {r.trend === 'deteriorating' ? 'Deteriorating' :
                     r.trend === 'improving' ? 'Improving' : 'Stable'}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        )
      })}
    </MapContainer>
  )
}
