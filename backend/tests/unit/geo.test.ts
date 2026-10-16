import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, isWithinRadius } from '../../src/utils/geo.js';

describe('Geographic Utilities (Haversine & Geofencing)', () => {
  // SRM Kattankulathur Campus (Chennai)
  const SRM_LAT = 12.8230;
  const SRM_LON = 80.0444;

  // Tambaram Railway Station (Chennai) ~ 12.8 km away
  const TAMBARAM_LAT = 12.9249;
  const TAMBARAM_LON = 80.1000;

  // Marina Beach, Chennai ~ 36.5 km away
  const MARINA_LAT = 13.0475;
  const MARINA_LON = 80.2824;

  // New Delhi ~ 1750 km away
  const DELHI_LAT = 28.6139;
  const DELHI_LON = 77.2090;

  describe('calculateDistanceKm', () => {
    it('should return 0 when calculating distance to the identical coordinate', () => {
      const dist = calculateDistanceKm(SRM_LAT, SRM_LON, SRM_LAT, SRM_LON);
      expect(dist).toBe(0);
    });

    it('should calculate accurate local distance between SRM and Tambaram (~12-14 km)', () => {
      const dist = calculateDistanceKm(SRM_LAT, SRM_LON, TAMBARAM_LAT, TAMBARAM_LON);
      expect(dist).toBeGreaterThan(12);
      expect(dist).toBeLessThan(14);
    });

    it('should calculate accurate regional distance between SRM and Marina Beach (~35-38 km)', () => {
      const dist = calculateDistanceKm(SRM_LAT, SRM_LON, MARINA_LAT, MARINA_LON);
      expect(dist).toBeGreaterThan(34);
      expect(dist).toBeLessThan(38);
    });

    it('should calculate long-distance coordinates accurately (Chennai to New Delhi)', () => {
      const dist = calculateDistanceKm(SRM_LAT, SRM_LON, DELHI_LAT, DELHI_LON);
      expect(dist).toBeGreaterThan(1700);
      expect(dist).toBeLessThan(1800);
    });

    it('should be symmetric: distance(A, B) === distance(B, A)', () => {
      const distAB = calculateDistanceKm(SRM_LAT, SRM_LON, MARINA_LAT, MARINA_LON);
      const distBA = calculateDistanceKm(MARINA_LAT, MARINA_LON, SRM_LAT, SRM_LON);
      expect(distAB).toEqual(distBA);
    });
  });

  describe('isWithinRadius (Geofencing Decision Engine)', () => {
    it('returns true when incident falls strictly INSIDE the notification radius', () => {
      // Tambaram is ~13km from SRM; radius configured as 20km
      const within = isWithinRadius(SRM_LAT, SRM_LON, TAMBARAM_LAT, TAMBARAM_LON, 20.0);
      expect(within).toBe(true);
    });

    it('returns false when incident falls strictly OUTSIDE the notification radius', () => {
      // Marina Beach is ~36km from SRM; radius configured as 25km
      const within = isWithinRadius(SRM_LAT, SRM_LON, MARINA_LAT, MARINA_LON, 25.0);
      expect(within).toBe(false);
    });

    it('returns true when incident is located on or near the radius threshold', () => {
      // Marina Beach (~36.3km) with radius 40km
      const within = isWithinRadius(SRM_LAT, SRM_LON, MARINA_LAT, MARINA_LON, 40.0);
      expect(within).toBe(true);
    });

    it('returns false for distant national disasters outside local radius', () => {
      // New Delhi incident with local 50km radius
      const within = isWithinRadius(SRM_LAT, SRM_LON, DELHI_LAT, DELHI_LON, 50.0);
      expect(within).toBe(false);
    });
  });
});
