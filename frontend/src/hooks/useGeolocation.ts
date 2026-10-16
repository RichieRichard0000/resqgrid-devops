import { useState, useCallback } from 'react';
import { UserLocation } from '../types/index.js';

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export interface UseGeolocationReturn {
  status: GeolocationStatus;
  location: UserLocation | null;
  radiusKm: number;
  errorMessage: string | null;
  requestLocation: () => void;
  setRadiusKm: (radius: number) => void;
  clearLocation: () => void;
}

export function useGeolocation(initialRadiusKm = 50): UseGeolocationReturn {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [radiusKm, setRadiusKmState] = useState<number>(initialRadiusKm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          radiusKm
        };
        setLocation(userLoc);
        setStatus('granted');
        setErrorMessage(null);
      },
      (error) => {
        let msg = 'Failed to acquire location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus('denied');
            msg = 'Location permission was denied. Enable permission in browser settings to receive geofenced alerts.';
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus('unavailable');
            msg = 'Location information is currently unavailable.';
            break;
          case error.TIMEOUT:
            setStatus('timeout');
            msg = 'Location request timed out. Please try again.';
            break;
        }
        setErrorMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [radiusKm]);

  const setRadiusKm = useCallback((newRadius: number) => {
    setRadiusKmState(newRadius);
    setLocation((prev) => (prev ? { ...prev, radiusKm: newRadius } : null));
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return {
    status,
    location,
    radiusKm,
    errorMessage,
    requestLocation,
    setRadiusKm,
    clearLocation
  };
}
