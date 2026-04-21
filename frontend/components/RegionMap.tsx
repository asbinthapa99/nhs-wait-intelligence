import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
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
  if (score >= 75) return '#ef4444'
  if (score >= 55) return '#f59e0b'
  if (score >= 40) return '#eab308'
  return '#22c55e'
}

interface RegionMapProps {
  regions?: RegionDetail[]
  selectedRegionId?: number | null
  onSelectRegion?: (region: RegionDetail) => void
}

export default function RegionMap({ regions = [], selectedRegionId = null, onSelectRegion }: RegionMapProps) {
  return (
    <MapContainer
      center={[52.8, -1.8]}
      zoom={6}
      minZoom={5}
      maxZoom={10}
      maxBounds={[[49.5, -8.7], [56.5, 2.3]]}
      maxBoundsViscosity={0.9}
      style={{ height: '100%', width: '100%', borderRadius: '12px', background: '#0f172a' }}
      scrollWheelZoom
      touchZoom
      doubleClickZoom
      dragging
      zoomControl
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {regions.map((r) => {
        const coords: [number, number] | undefined =
          r.region_center_lat !== undefined && r.region_center_lng !== undefined
            ? [r.region_center_lat, r.region_center_lng]
            : REGION_COORDS[r.name]

        if (!coords) return null

        const color = scoreColor(r.inequality_score)
        const isSelected = selectedRegionId === r.id
        const radius = isSelected ? 28 : Math.max(18, Math.min(26, r.inequality_score / 4))

        return (
          <CircleMarker
            key={`marker-${r.id}`}
            center={coords}
            radius={radius}
            pathOptions={{
              color: isSelected ? '#ffffff' : color,
              fillColor: color,
              fillOpacity: isSelected ? 0.95 : 0.75,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelectRegion?.(r) }}
          >
            <Tooltip
              permanent={false}
              direction="top"
              offset={[0, -radius - 4]}
              className="leaflet-tooltip-dark"
            >
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{r.name}</div>
                <div>Score: <strong style={{ color }}>{r.inequality_score}</strong></div>
                <div>{r.pct_over_18_weeks}% over 18w</div>
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
