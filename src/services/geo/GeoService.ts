/**
 * GeoService — GPS location with caching and permission handling
 *
 * Uses react-native-geolocation-service for accurate cross-platform GPS.
 * Caches the last known position to avoid redundant GPS calls within
 * the same measurement session.
 *
 * Android: add to AndroidManifest.xml:
 *   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
 *   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
 *
 * iOS: add to Info.plist:
 *   NSLocationWhenInUseUsageDescription
 *   NSLocationAlwaysAndWhenInUseUsageDescription (for background)
 */

import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Coordinates } from '../../types';

const CACHE_TTL_MS = 30_000; // 30 s — reuse GPS reading within the same session

let cachedPosition: Coordinates | null = null;
let cacheTimestamp = 0;

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

async function requestAndroidPermissions(): Promise<boolean> {
  const foreground = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  if (foreground['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED) return false;

  // Android 10+ requires a separate, user-visible request for background access.
  // Request it only after foreground access is granted; older Android versions do
  // not expose this runtime permission.
  if (Number(Platform.Version) >= 29) {
    const background = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    );
    return background === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return requestAndroidPermissions();
  }
  // iOS needs Always authorization to provide locations while background fetch
  // wakes the application. Some managed devices reject it: retain an explicit
  // foreground fallback so manual measurements still work.
  const alwaysStatus = await Geolocation.requestAuthorization('always');
  if (alwaysStatus === 'granted' || alwaysStatus === 'restricted') return true;
  const foregroundStatus = await Geolocation.requestAuthorization('whenInUse');
  return foregroundStatus === 'granted' || foregroundStatus === 'restricted';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current GPS position.
 * Returns null if permissions are denied or the GPS fix times out.
 */
export async function getCurrentPosition(): Promise<Coordinates | null> {
  // Return from cache if fresh enough
  if (cachedPosition && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPosition;
  }

  const hasPermission = await ensurePermissions();
  if (!hasPermission) return null;

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
        };
        cachedPosition = coords;
        cacheTimestamp = Date.now();
        resolve(coords);
      },
      _error => {
        // GPS unavailable (airplane mode, denied, timeout)
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: CACHE_TTL_MS,
        forceRequestLocation: true,
      },
    );
  });
}

/** Clears the position cache (call when starting a new session) */
export function clearPositionCache(): void {
  cachedPosition = null;
  cacheTimestamp = 0;
}
