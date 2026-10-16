import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GeofenceAlert, Incident, UserLocation } from '../types/index.js';

export type SocketConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface UseSocketOptions {
  userLocation: UserLocation | null;
  onIncidentEvent?: (data: { action: string; incident: Incident; timestamp: string }) => void;
  onGeofenceAlert?: (alert: GeofenceAlert) => void;
}

export function useSocket({ userLocation, onIncidentEvent, onGeofenceAlert }: UseSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus>('connecting');
  const socketRef = useRef<Socket | null>(null);
  const lastSyncTimeRef = useRef<string>(new Date().toISOString());

  // Store latest callbacks in refs to avoid re-subscribing socket listeners on every render
  const onIncidentEventRef = useRef(onIncidentEvent);
  onIncidentEventRef.current = onIncidentEvent;

  const onGeofenceAlertRef = useRef(onGeofenceAlert);
  onGeofenceAlertRef.current = onGeofenceAlert;

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');

      // Request recovery sync since last known timestamp
      socket.emit('request_sync', { lastSyncTime: lastSyncTimeRef.current });

      // Re-subscribe location if available
      if (userLocation) {
        socket.emit('subscribe_geofence', {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius_km: userLocation.radiusKm
        });
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('incident_event', (data: { action: string; incident: Incident; timestamp: string }) => {
      lastSyncTimeRef.current = data.timestamp || new Date().toISOString();
      if (onIncidentEventRef.current) {
        onIncidentEventRef.current(data);
      }
    });

    socket.on('geofence_alert', (alert: GeofenceAlert) => {
      if (onGeofenceAlertRef.current) {
        onGeofenceAlertRef.current(alert);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Run on mount

  // Sync geofence subscription whenever user location or radius changes
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.connected && userLocation) {
      socket.emit('subscribe_geofence', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius_km: userLocation.radiusKm
      });
    }
  }, [userLocation?.latitude, userLocation?.longitude, userLocation?.radiusKm]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      setConnectionStatus('connecting');
      socketRef.current.connect();
    }
  }, []);

  return {
    connectionStatus,
    reconnect
  };
}
