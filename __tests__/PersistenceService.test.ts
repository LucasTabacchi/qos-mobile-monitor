import { distanceMeters, filterRecords } from '../src/services/persistence/PersistenceService';

jest.mock('react-native-sqlite-storage', () => ({ enablePromise: jest.fn(), DEBUG: jest.fn() }));
jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/documents', writeFile: jest.fn() }));
jest.mock('../src/store', () => ({ useHistoryStore: { getState: jest.fn() } }));

const record = (id: string, timestamp: number, type: any, latitude?: number) => ({
  id, timestamp, sessionId: 'session-a', network: { type, operator: null, rssi: null, rssiScore: null, isConnected: true },
  location: latitude === undefined ? null : { latitude, longitude: -58.38, accuracy: 10, altitude: null }, ping: [], throughput: null, qosScore: 50,
});

describe('history filtering', () => {
  it('filters by network, date and radius together', () => {
    const now = Date.now();
    const result = filterRecords([
      record('included', now, 'LTE', -34.60),
      record('wrong-network', now, 'WIFI', -34.60),
      record('too-old', now - 1000, 'LTE', -34.60),
      record('too-far', now, 'LTE', -34.50),
    ], { networkType: 'LTE', fromTimestamp: now - 500, center: { latitude: -34.60, longitude: -58.38 }, radiusMeters: 5_000 });
    expect(result.map(value => value.id)).toEqual(['included']);
  });

  it('uses a realistic haversine distance', () => {
    expect(distanceMeters({ latitude: -34.60, longitude: -58.38 }, { latitude: -34.60, longitude: -58.38 })).toBe(0);
    expect(distanceMeters({ latitude: -34.60, longitude: -58.38 }, { latitude: -34.61, longitude: -58.38 })).toBeGreaterThan(1_000);
  });
});
