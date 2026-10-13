/**
 * BackgroundService — periodic measurements in background
 *
 * Uses react-native-background-fetch for cross-platform scheduling.
 * On Android it also configures a Headless JS task fallback so the app
 * can wake up even after being killed.
 *
 * The service reads the configured interval from SettingsStore and
 * compares measurement results against alert thresholds to fire local
 * notifications via @notifee/react-native.
 */

import BackgroundFetch from 'react-native-background-fetch';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';
import { MeasurementEngine } from '../measurement/MeasurementEngine';
import { useHistoryStore, useSettingsStore } from '../../store';

const CHANNEL_ID = 'qos_alerts';
const TASK_ID = 'com.networkqosmonitor.measurement';

// ---------------------------------------------------------------------------
// Notification channel (Android)
// ---------------------------------------------------------------------------

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'QoS Alerts',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
  });
}

// ---------------------------------------------------------------------------
// Alert logic
// ---------------------------------------------------------------------------

async function checkAndNotify(): Promise<void> {
  const { records } = useHistoryStore.getState();
  const { settings } = useSettingsStore.getState();
  const last = records[0];
  if (!last) return;

  const ping = last.ping?.[0];
  const avgRtt = ping?.avg ?? null;
  const dl = last.throughput?.downloadMbps ?? null;

  const rttAlert = avgRtt !== null && avgRtt > settings.alertRttThresholdMs;
  const throughputAlert = dl !== null && dl < settings.alertThroughputThresholdMbps;

  if (!rttAlert && !throughputAlert) return;

  await ensureChannel();

  const lines: string[] = [];
  if (rttAlert) lines.push(`High latency: ${Math.round(avgRtt!)}ms (threshold ${settings.alertRttThresholdMs}ms)`);
  if (throughputAlert) lines.push(`Low speed: ${dl!.toFixed(1)} Mbps (threshold ${settings.alertThroughputThresholdMbps} Mbps)`);

  await notifee.displayNotification({
    title: '⚠️ Network quality degraded',
    body: lines.join(' · '),
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_notification', // drawable resource name
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
    },
  });
}

// ---------------------------------------------------------------------------
// Background task handler
// ---------------------------------------------------------------------------

async function onBackgroundEvent(taskId: string): Promise<void> {
  try {
    await MeasurementEngine.runFullMeasurement();
    await checkAndNotify();
  } catch (e) {
    console.warn('[BackgroundService] Error in background task:', e);
  } finally {
    BackgroundFetch.finish(taskId);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const BackgroundService = {
  handleHeadlessEvent: onBackgroundEvent,
  /** Call once at app startup */
  async configure(): Promise<void> {
    const { settings } = useSettingsStore.getState();
    const intervalMinutes = settings.backgroundIntervalMinutes;

    try {
      await notifee.requestPermission();
      await ensureChannel();
    } catch (e) {
      console.warn('[BackgroundService] Failed to init notification permissions:', e);
    }

    await BackgroundFetch.configure(
      {
        minimumFetchInterval: intervalMinutes,
        stopOnTerminate: false, // Android: keep going after app kill
        startOnBoot: true,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      onBackgroundEvent,
      (taskId: string) => {
        // Timeout callback — must call finish even on timeout
        BackgroundFetch.finish(taskId);
      },
    );

    // Register the specific task ID used by Headless JS on Android
    BackgroundFetch.scheduleTask({
      taskId: TASK_ID,
      delay: intervalMinutes * 60 * 1000,
      periodic: true,
      forceAlarmManager: false,
      stopOnTerminate: false,
      enableHeadless: true,
    });
  },

  /** Update the measurement interval (call when settings change) */
  async updateInterval(minutes: number): Promise<void> {
    await BackgroundFetch.stop(TASK_ID);
    await BackgroundFetch.scheduleTask({
      taskId: TASK_ID,
      delay: minutes * 60 * 1000,
      periodic: true,
      forceAlarmManager: false,
      stopOnTerminate: false,
      enableHeadless: true,
    });
  },

  async stop(): Promise<void> {
    await BackgroundFetch.stop();
  },
};
