import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { MOCK_REGIONS } from '../lib/api'

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
  regions?: typeof MOCK_REGIONS
}

export default function RegionMap({ regions = MOCK_REGIONS }: RegionMapProps) {
  return (
    <MapContainer
      center={[52.5, -1.5]}
      zoom={6}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {regions.map((r) => {
        const coords = REGION_COORDS[r.name]
        if (!coords) return null
        return (
          <CircleMarker
            key={r.id}
            center={coords}
            radius={Math.max(18, r.inequality_score / 3)}
            pathOptions={{
              color: scoreColor(r.inequality_score),
              fillColor: scoreColor(r.inequality_score),
              fillOpacity: 0.7,
              weight: 2,
            }}
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
        )
      })}
    </MapContainer>
  )
}
