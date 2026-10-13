/**
 * Detects whether the app is running on an Android emulator and returns
 * the appropriate base URL for the throughput test server.
 *
 * - Android emulator: `10.0.2.2` maps to the host machine's localhost.
 * - Physical device / iOS simulator: the user must provide their LAN IP.
 *   We default to empty so the UI can prompt them.
 */

import { Platform, NativeModules } from 'react-native';

/**
 * Best-effort emulator detection without extra native dependencies.
 *
 * On Android we inspect `PlatformConstants` which Hermes/JSI exposes.
 * The `Brand`, `Model` and `Fingerprint` fields on the stock AOSP
 * emulator contain telltale strings like "generic", "sdk", "goldfish".
 */
function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;

  try {
    const constants =
      (Platform as any).constants ?? NativeModules.PlatformConstants ?? {};

    const brand: string = (constants.Brand ?? '').toLowerCase();
    const model: string = (constants.Model ?? '').toLowerCase();
    const fingerprint: string = (constants.Fingerprint ?? '').toLowerCase();
    const hardware: string = (constants.Hardware ?? '').toLowerCase();

    const emulatorHints = ['generic', 'sdk', 'goldfish', 'ranchu', 'emulator', 'genymotion'];

    return emulatorHints.some(
      hint =>
        brand.includes(hint) ||
        model.includes(hint) ||
        fingerprint.includes(hint) ||
        hardware.includes(hint),
    );
  } catch {
    return false;
  }
}

/**
 * Returns the default throughput server URL based on the runtime environment.
 *
 * - Android emulator  → `http://10.0.2.2:3000`
 * - Everything else   → empty string (user must configure via Settings)
 */
export function getDefaultThroughputUrl(): string {
  if (isAndroidEmulator()) {
    return 'http://10.0.2.2:3000';
  }
  // Physical devices need the host machine's LAN IP — no safe default.
  return '';
}
