import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation, isValidCoordinate } from '../src/hooks/useGeolocation.js';

describe('isValidCoordinate Validator', () => {
  it('accepts valid global coordinate pairs', () => {
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(12.823, 80.044)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(28.6139, 77.209)).toBe(true);
  });

  it('rejects coordinates with latitude out of [-90, 90]', () => {
    expect(isValidCoordinate(90.1, 80.0)).toBe(false);
    expect(isValidCoordinate(-90.1, 80.0)).toBe(false);
    expect(isValidCoordinate(120, 80.0)).toBe(false);
  });

  it('rejects coordinates with longitude out of [-180, 180]', () => {
    expect(isValidCoordinate(12.0, 180.1)).toBe(false);
    expect(isValidCoordinate(12.0, -180.1)).toBe(false);
    expect(isValidCoordinate(12.0, 200.0)).toBe(false);
  });

  it('rejects non-numeric and NaN coordinates', () => {
    expect(isValidCoordinate(NaN, 80.0)).toBe(false);
    expect(isValidCoordinate(12.0, NaN)).toBe(false);
    expect(isValidCoordinate('12.0', '80.0')).toBe(false);
    expect(isValidCoordinate(null, undefined)).toBe(false);
  });
});

describe('useGeolocation Hook', () => {
  let mockWatchPosition: ReturnType<typeof vi.fn>;
  let mockClearWatch: ReturnType<typeof vi.fn>;
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWatchPosition = vi.fn();
    mockClearWatch = vi.fn();
    mockGetCurrentPosition = vi.fn();

    // Mock navigator.geolocation
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: {
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch,
        getCurrentPosition: mockGetCurrentPosition
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes in idle state without requesting location prior to user consent', () => {
    const { result } = renderHook(() => useGeolocation(50));

    expect(result.current.status).toBe('idle');
    expect(result.current.location).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isWatching).toBe(false);
    expect(mockWatchPosition).not.toHaveBeenCalled();
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it('requests location only upon explicit user trigger with maximumAge=0 and enableHighAccuracy=true', () => {
    const { result } = renderHook(() => useGeolocation(50));

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.status).toBe('requesting');
    expect(mockWatchPosition).toHaveBeenCalledTimes(1);

    const geoOptions = mockWatchPosition.mock.calls[0][2];
    expect(geoOptions.enableHighAccuracy).toBe(true);
    expect(geoOptions.maximumAge).toBe(0); // Crucial: never return stale cached positions
    expect(geoOptions.timeout).toBeGreaterThanOrEqual(10000);
  });

  it('updates location state with reported accuracy when geolocation succeeds', () => {
    let successCallback: (pos: GeolocationPosition) => void = () => {};
    mockWatchPosition.mockImplementation((success) => {
      successCallback = success;
      return 101; // watch ID
    });

    const { result } = renderHook(() => useGeolocation(50));

    act(() => {
      result.current.requestLocation();
    });

    // Simulate browser position fix in Chennai
    act(() => {
      successCallback({
        coords: {
          latitude: 13.0827,
          longitude: 80.2707,
          accuracy: 12.5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: 1700000000000
      });
    });

    expect(result.current.status).toBe('granted');
    expect(result.current.location).toEqual({
      latitude: 13.0827,
      longitude: 80.2707,
      accuracyMeters: 12.5,
      radiusKm: 50,
      source: 'gps',
      timestamp: 1700000000000
    });
    expect(result.current.errorMessage).toBeNull();
  });

  it('handles permission denied error without falling back to arbitrary default', () => {
    let errorCallback: (err: GeolocationPositionError) => void = () => {};
    mockWatchPosition.mockImplementation((_, error) => {
      errorCallback = error;
      return 102;
    });

    const { result } = renderHook(() => useGeolocation(50));

    act(() => {
      result.current.requestLocation();
    });

    act(() => {
      errorCallback({
        code: 1, // PERMISSION_DENIED
        message: 'User denied Geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
    });

    expect(result.current.status).toBe('denied');
    expect(result.current.location).toBeNull(); // Never silently populate fake location
    expect(result.current.errorMessage).toContain('permission was denied');
  });

  it('handles timeout and allows retryLocation()', () => {
    let errorCallback: (err: GeolocationPositionError) => void = () => {};
    mockWatchPosition.mockImplementation((_, error) => {
      errorCallback = error;
      return 103;
    });

    const { result } = renderHook(() => useGeolocation(50));

    act(() => {
      result.current.requestLocation();
    });

    act(() => {
      errorCallback({
        code: 3, // TIMEOUT
        message: 'Timeout expired',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
    });

    expect(result.current.status).toBe('timeout');
    expect(result.current.errorMessage).toContain('timed out');

    // Trigger retry
    act(() => {
      result.current.retryLocation();
    });

    expect(result.current.status).toBe('requesting');
    expect(mockWatchPosition).toHaveBeenCalledTimes(2);
  });

  it('cleans up active watcher on component unmount', () => {
    mockWatchPosition.mockReturnValue(999);

    const { result, unmount } = renderHook(() => useGeolocation(50));

    act(() => {
      result.current.requestLocation();
    });

    expect(mockClearWatch).not.toHaveBeenCalled();

    unmount();

    expect(mockClearWatch).toHaveBeenCalledWith(999);
  });

  it('supports explicit manual benchmark pin with source="manual" and no fake GPS accuracy', () => {
    const { result } = renderHook(() => useGeolocation(50));

    act(() => {
      result.current.setTestLocation(12.823, 80.044);
    });

    expect(result.current.status).toBe('granted');
    expect(result.current.location).toEqual({
      latitude: 12.823,
      longitude: 80.044,
      accuracyMeters: undefined,
      radiusKm: 50,
      source: 'manual',
      timestamp: expect.any(Number)
    });
  });

  it('clears location and unregisters active watcher on clearLocation()', () => {
    mockWatchPosition.mockReturnValue(555);

    const { result } = renderHook(() => useGeolocation(50));

    act(() => {
      result.current.requestLocation();
    });

    act(() => {
      result.current.clearLocation();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(mockClearWatch).toHaveBeenCalledWith(555);
  });
});
