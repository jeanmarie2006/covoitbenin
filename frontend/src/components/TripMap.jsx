import { useEffect, useRef } from 'react'
import L from 'leaflet'

/** Carte Leaflet : points nommés et, si demandé, une ligne entre le premier et le dernier (trajet). */
export default function TripMap({ points = [], line = false, height = 320, zoom = 11, className = '' }) {
  const ref = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)

  useEffect(() => {
    map.current = L.map(ref.current, { scrollWheelZoom: false, zoomControl: true }).setView([6.42, 2.4], zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => { const m = map.current; map.current = null; m.stop(); m.remove() }
  }, [])

  useEffect(() => {
    if (!map.current) return
    layer.current.clearLayers()
    const pts = points.filter((p) => p.lat && p.lng)
    pts.forEach((p, i) => {
      const color = p.color || (line ? (i === 0 ? '#16a34a' : '#dc2626') : '#a16207')
      L.circleMarker([p.lat, p.lng], { radius: p.big ? 10 : 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
        .bindTooltip(p.label || '', { permanent: line, direction: 'top', offset: [0, -8] }).addTo(layer.current)
    })
    if (line && pts.length >= 2) L.polyline([[pts[0].lat, pts[0].lng], [pts[pts.length - 1].lat, pts[pts.length - 1].lng]], { color: '#a16207', weight: 4, dashArray: '8 8' }).addTo(layer.current)
    if (pts.length) map.current.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 13, animate: false })
    const m = map.current; setTimeout(() => { if (map.current === m) m.invalidateSize({ animate: false }) }, 50)
  }, [points, line])

  return <div ref={ref} style={{ height }} className={`w-full overflow-hidden rounded-2xl border border-slate-200 ${className}`} role="img" aria-label="Carte du trajet" />
}
