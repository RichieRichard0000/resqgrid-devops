import { useState, useCallback, useRef, useEffect } from 'react';
import { UserLocation } from '../types/index.js';

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export interface UseGeolocationReturn {
  status: GeolocationStatus;
  location: UserLocation | null;
  radiusKm: number;
  errorMessage: string | null;
  isWatching: boolean;
  requestLocation: (options?: UseGeolocationOptions) => void;
  retryLocation: () => void;
  setTestLocation: (lat?: number, lon?: number) => void;
  setRadiusKm: (radius: number) => void;
  clearLocation: () => void;
}

/**
 * Validates that latitude is within [-90, 90] and longitude is within [-180, 180].
 */
export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

export function useGeolocation(initialRadiusKm = 50): UseGeolocationReturn {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [radiusKm, setRadiusKmState] = useState<number>(initialRadiusKm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const radiusKmRef = useRef<number>(initialRadiusKm);
  radiusKmRef.current = radiusKm;

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  // Guarantee clean-up of any active geolocation watcher on component unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;

    if (!isValidCoordinate(latitude, longitude)) {
      setStatus('unavailable');
      setErrorMessage('Received invalid geographic coordinates from browser.');
      return;
    }

    const userLoc: UserLocation = {
      latitude,
      longitude,
      accuracyMeters: typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : undefined,
      radiusKm: radiusKmRef.current,
      source: 'gps',
      timestamp: position.timestamp || Date.now()
    };

    setLocation(userLoc);
    setStatus('granted');
    setErrorMessage(null);
  }, []);

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    let msg = 'Failed to acquire location.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setStatus('denied');
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          msg = 'Location permission was denied. Browser location access requires HTTPS (or localhost). On plain HTTP (http://16.4.118.98), location services are restricted by modern browsers. Please select a manual location pin below.';
        } else {
          msg = 'Location permission was denied. Please allow location access in your browser settings to receive geofenced alerts.';
        }
        break;
      case error.POSITION_UNAVAILABLE:
        setStatus('unavailable');
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          msg = 'Location information is unavailable on insecure HTTP origins. Modern browsers require HTTPS for GPS geolocation. Please select a manual location pin below.';
        } else {
          msg = 'Location information is currently unavailable. High-accuracy GPS/Wi-Fi fix could not be established.';
        }
        break;
      case error.TIMEOUT:
        setStatus('timeout');
        msg = 'Location request timed out. Please click "Retry Location" to attempt another fix.';
        break;
      default:
        setStatus('unavailable');
        msg = error.message || 'Failed to acquire location.';
        break;
    }
    setErrorMessage(msg);
  }, []);

  const requestLocation = useCallback(
    (options?: UseGeolocationOptions) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        setStatus('unavailable');
        setErrorMessage('Geolocation is not supported by your browser.');
        return;
      }

      // Stop any existing watcher before starting a new request
      stopWatching();

      setStatus('requesting');
      setErrorMessage(null);

      const geoOptions: PositionOptions = {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 15000,
        maximumAge: options?.maximumAge ?? 0 // Never return stale cached positions
      };

      const shouldUseWatch = options?.watch ?? true;

      if (shouldUseWatch) {
        setIsWatching(true);
        try {
          const id = navigator.geolocation.watchPosition(
            (pos) => handlePositionSuccess(pos),
            (err) => handlePositionError(err),
            geoOptions
          );
          watchIdRef.current = id;
        } catch {
          // Fallback to getCurrentPosition if watchPosition throws
          navigator.geolocation.getCurrentPosition(
            (pos) => handlePositionSuccess(pos),
            (err) => handlePositionError(err),
            geoOptions
          );
        }
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => handlePositionSuccess(pos),
          (err) => handlePositionError(err),
          geoOptions
        );
      }
    },
    [handlePositionSuccess, handlePositionError, stopWatching]
  );

  const retryLocation = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  const setTestLocation = useCallback(
    (lat = 12.823, lon = 80.044) => {
      stopWatching();

      if (!isValidCoordinate(lat, lon)) {
        setStatus('unavailable');
        setErrorMessage('Invalid manual test coordinates specified.');
        return;
      }

      setLocation({
        latitude: lat,
        longitude: lon,
        accuracyMeters: undefined,
        radiusKm: radiusKmRef.current,
        source: 'manual',
        timestamp: Date.now()
      });
      setStatus('granted');
      setErrorMessage(null);
    },
    [stopWatching]
  );

  const setRadiusKm = useCallback((newRadius: number) => {
    setRadiusKmState(newRadius);
    radiusKmRef.current = newRadius;
    setLocation((prev) => (prev ? { ...prev, radiusKm: newRadius } : null));
  }, []);

  const clearLocation = useCallback(() => {
    stopWatching();
    setLocation(null);
    setStatus('idle');
    setErrorMessage(null);
  }, [stopWatching]);

  return {
    status,
    location,
    radiusKm,
    errorMessage,
    isWatching,
    requestLocation,
    retryLocation,
    setTestLocation,
    setRadiusKm,
    clearLocation
  };
}

export default useGeolocation;
