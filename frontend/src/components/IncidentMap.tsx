import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';
import { Incident, UserLocation, IncidentSeverity } from '../types/index.js';

interface IncidentMapProps {
  incidents: Incident[];
  userLocation: UserLocation | null;
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident) => void;
}

const getSeverityColor = (severity: IncidentSeverity): string => {
  switch (severity) {
    case 'critical':
      return '#ef4444'; // Red
    case 'high':
      return '#f97316'; // Orange
    case 'medium':
      return '#eab308'; // Yellow
    case 'low':
      return '#3b82f6'; // Blue
    default:
      return '#64748b';
  }
};

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  userLocation,
  selectedIncident,
  onSelectIncident
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const incidentMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userRadiusCircleRef = useRef<L.Circle | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const hasCenteredOnUserRef = useRef<boolean>(false);
  const prevUserCoordsRef = useRef<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on user location if already present; otherwise default to SRMIST region
    const initialCenter: [number, number] = userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : [12.8230, 80.0444];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: userLocation ? 13 : 10,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user location marker, accuracy circle, notification perimeter circle, and center map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      const userCoords: [number, number] = [userLocation.latitude, userLocation.longitude];
      const isManual = userLocation.source === 'manual';

      // 1. Icon: pulsing blue for GPS, distinct purple for manual pin
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: isManual
          ? `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
              <div style="width: 16px; height: 16px; background: #9333ea; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(147,51,234,0.9);"></div>
            </div>
          `
          : `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 26px; height: 26px; background: rgba(59, 130, 246, 0.45); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 14px; height: 14px; background: #2563eb; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(37,99,235,0.85);"></div>
            </div>
          `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const popupHtml = isManual
        ? `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 180px;">
            <strong style="color: #9333ea; font-size: 13px;">Manual Benchmark Pin</strong>
            <p style="margin: 2px 0 4px 0; font-size: 11px; color: #475569;">Simulated location benchmark (SRMIST Campus)</p>
            <span style="font-size: 11px; font-family: monospace; color: #64748b;">
              ${userCoords[0].toFixed(4)}°N, ${userCoords[1].toFixed(4)}°E
            </span>
          </div>
        `
        : `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 180px;">
            <strong style="color: #2563eb; font-size: 13px;">Your Location (GPS)</strong>
            <p style="margin: 2px 0 4px 0; font-size: 11px; color: #475569;">Browser geolocation position</p>
            <span style="font-size: 11px; font-family: monospace; color: #64748b;">
              ${userCoords[0].toFixed(4)}°N, ${userCoords[1].toFixed(4)}°E
            </span>
            ${
              userLocation.accuracyMeters !== undefined
                ? `<div style="font-size: 10px; color: #0284c7; margin-top: 4px; font-weight: 600;">
                     Accuracy: ±${Math.round(userLocation.accuracyMeters)} meters
                   </div>`
                : ''
            }
          </div>
        `;

      if (!userMarkerRef.current) {
        const marker = L.marker(userCoords, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(popupHtml);
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng(userCoords);
        userMarkerRef.current.setIcon(userIcon);
        userMarkerRef.current.setPopupContent(popupHtml);
      }

      // 2. Render reported GPS accuracy radius circle (light blue translucent)
      if (userLocation.accuracyMeters && !isManual && userLocation.accuracyMeters > 0) {
        if (!userAccuracyCircleRef.current) {
          const accCircle = L.circle(userCoords, {
            radius: userLocation.accuracyMeters,
            color: '#3b82f6',
            weight: 1,
            dashArray: '3, 4',
            fillColor: '#60a5fa',
            fillOpacity: 0.15
          }).addTo(map);
          accCircle.bindTooltip(`GPS Accuracy Radius: ±${Math.round(userLocation.accuracyMeters)}m`, {
            permanent: false,
            direction: 'bottom'
          });
          userAccuracyCircleRef.current = accCircle;
        } else {
          userAccuracyCircleRef.current.setLatLng(userCoords);
          userAccuracyCircleRef.current.setRadius(userLocation.accuracyMeters);
          userAccuracyCircleRef.current.setTooltipContent(`GPS Accuracy Radius: ±${Math.round(userLocation.accuracyMeters)}m`);
        }
      } else if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }

      // 3. Render or update user notification perimeter circle (cyan transparent dashed)
      const radiusMeters = userLocation.radiusKm * 1000;
      if (!userRadiusCircleRef.current) {
        const circle = L.circle(userCoords, {
          radius: radiusMeters,
          color: '#06b6d4',
          dashArray: '6, 8',
          weight: 1.5,
          fillColor: '#0891b2',
          fillOpacity: 0.06
        }).addTo(map);
        circle.bindTooltip(`User Alert Radius: ${userLocation.radiusKm} km`, {
          permanent: false,
          direction: 'top'
        });
        userRadiusCircleRef.current = circle;
      } else {
        userRadiusCircleRef.current.setLatLng(userCoords);
        userRadiusCircleRef.current.setRadius(radiusMeters);
        userRadiusCircleRef.current.setTooltipContent(`User Alert Radius: ${userLocation.radiusKm} km`);
      }

      // 4. Center map on user location if freshly acquired or coordinates significantly changed
      const coordKey = `${userLocation.latitude.toFixed(4)},${userLocation.longitude.toFixed(4)}`;
      if (!hasCenteredOnUserRef.current || prevUserCoordsRef.current !== coordKey) {
        map.flyTo(userCoords, Math.max(13, map.getZoom()), { duration: 1.0 });
        hasCenteredOnUserRef.current = true;
        prevUserCoordsRef.current = coordKey;
      }
    } else {
      // Clean up markers and circles when location is cleared
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userRadiusCircleRef.current) {
        userRadiusCircleRef.current.remove();
        userRadiusCircleRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
      hasCenteredOnUserRef.current = false;
      prevUserCoordsRef.current = null;
    }
  }, [userLocation]);

  // Update incident markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = incidentMarkersRef.current;
    const currentIds = new Set(incidents.map((i) => i.id));

    // Remove markers no longer in current incidents list
    for (const [id, marker] of currentMarkers.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    }

    // Add or update markers
    incidents.forEach((incident) => {
      const coords: [number, number] = [incident.latitude, incident.longitude];
      const color = getSeverityColor(incident.severity);

      const markerHtml = `
        <div style="
          width: 28px;
          height: 28px;
          background-color: ${color};
          border: 2px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'incident-map-pin',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 210px; max-width: 260px; color: #0f172a; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: ${color}20; color: ${color}; border: 1px solid ${color}60; padding: 2px 6px; border-radius: 4px;">
              ${incident.severity} • ${incident.incident_type}
            </span>
            ${
              incident.is_simulated
                ? `<span style="font-size: 10px; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px;">Simulated</span>`
                : `<span style="font-size: 10px; font-weight: 700; background: #d1fae5; color: #047857; padding: 2px 6px; border-radius: 4px;">${incident.source}</span>`
            }
          </div>
          <strong style="font-size: 13px; display: block; line-height: 1.3; margin-bottom: 4px;">${incident.title}</strong>
          <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.4;">${incident.description}</p>
          <div style="font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; display: flex; justify-content: space-between;">
            <span>Loc: ${incident.location_name}</span>
            ${
              incident.distance_km !== undefined
                ? `<strong style="color: #2563eb;">${incident.distance_km.toFixed(1)} km</strong>`
                : ''
            }
          </div>
        </div>
      `;

      let marker = currentMarkers.get(incident.id);
      if (!marker) {
        marker = L.marker(coords, { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);
        marker.on('click', () => {
          onSelectIncident(incident);
        });
        currentMarkers.set(incident.id, marker);
      } else {
        marker.setLatLng(coords);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupContent);
      }
    });
  }, [incidents, onSelectIncident]);

  // Pan to selected incident when requested
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIncident) return;

    const coords: [number, number] = [selectedIncident.latitude, selectedIncident.longitude];
    map.flyTo(coords, Math.max(12, map.getZoom()), { duration: 1.2 });

    const marker = incidentMarkersRef.current.get(selectedIncident.id);
    if (marker) {
      marker.openPopup();
    }
  }, [selectedIncident]);

  const handleRecenterOnUser = () => {
    const map = mapInstanceRef.current;
    if (map && userLocation) {
      map.flyTo([userLocation.latitude, userLocation.longitude], Math.max(13, map.getZoom()), {
        duration: 0.8
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-800 shadow-sm bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-0" />

      {/* Floating Recenter Map Button */}
      {userLocation && (
        <button
          type="button"
          onClick={handleRecenterOnUser}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg border border-slate-700 shadow-lg text-xs font-medium backdrop-blur-sm transition-all"
          title="Recenter map on your coordinates"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-400" />
          <span>My Location</span>
        </button>
      )}

      {/* Legend Badge Overlay */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-800 p-2.5 rounded-lg text-xs space-y-1.5 shadow-lg pointer-events-none hidden sm:block">
        <div className="font-bold text-slate-300 text-[11px] mb-1">Map Legend</div>
        <div className="flex items-center gap-2 text-slate-300 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> High
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Medium
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Low
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[10px] pt-1 border-t border-slate-800 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-cyan-400 bg-cyan-400/20"></span>
            <span>Dashed Circle: Alert Perimeter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-blue-400 bg-blue-400/20"></span>
            <span>Shaded Circle: GPS Accuracy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentMap;
