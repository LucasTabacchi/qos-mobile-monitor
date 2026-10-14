import { distanceMeters, filterRecords, isNetworkTypeMatch } from '../src/services/persistence/PersistenceService';

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

  it('correctly matches 4G filter with LTE records', () => {
    const now = Date.now();
    const result = filterRecords([
      record('lte-sample', now, 'LTE'),
      record('4g-sample', now, '4G'),
      record('wifi-sample', now, 'WIFI'),
      record('3g-sample', now, '3G'),
    ], { networkType: '4G' });
    expect(result.map(v => v.id)).toEqual(['lte-sample', '4g-sample']);
  });

  it('correctly matches WiFi, 3G, and 5G filters', () => {
    const now = Date.now();
    const dataset = [
      record('wifi-1', now, 'WIFI'),
      record('3g-1', now, '3G'),
      record('5g-1', now, '5G'),
      record('nr-1', now, 'NR'),
      record('lte-1', now, 'LTE'),
    ];

    expect(filterRecords(dataset, { networkType: 'WIFI' }).map(v => v.id)).toEqual(['wifi-1']);
    expect(filterRecords(dataset, { networkType: '3G' }).map(v => v.id)).toEqual(['3g-1']);
    expect(filterRecords(dataset, { networkType: '5G' }).map(v => v.id)).toEqual(['5g-1', 'nr-1']);
  });

  it('isNetworkTypeMatch validates aliases and case-insensitivity', () => {
    expect(isNetworkTypeMatch('LTE', '4G')).toBe(true);
    expect(isNetworkTypeMatch('4G', 'LTE')).toBe(true);
    expect(isNetworkTypeMatch('lte', '4g')).toBe(true);
    expect(isNetworkTypeMatch('5G', '5G')).toBe(true);
    expect(isNetworkTypeMatch('NR', '5G')).toBe(true);
    expect(isNetworkTypeMatch('UMTS', '3G')).toBe(true);
    expect(isNetworkTypeMatch('HSPA', '3G')).toBe(true);
    expect(isNetworkTypeMatch('WIFI', 'WiFi')).toBe(true);
    expect(isNetworkTypeMatch('WIFI', '4G')).toBe(false);
    expect(isNetworkTypeMatch('LTE', 'WIFI')).toBe(false);
  });

  it('excludes records without location when radius filter is applied', () => {
    const now = Date.now();
    const result = filterRecords([
      record('has-loc', now, 'WIFI', -34.60),
      record('no-loc', now, 'WIFI', undefined),
    ], { center: { latitude: -34.60, longitude: -58.38 }, radiusMeters: 5_000 });
    expect(result.map(v => v.id)).toEqual(['has-loc']);
  });

  it('uses a realistic haversine distance', () => {
    expect(distanceMeters({ latitude: -34.60, longitude: -58.38 }, { latitude: -34.60, longitude: -58.38 })).toBe(0);
    expect(distanceMeters({ latitude: -34.60, longitude: -58.38 }, { latitude: -34.61, longitude: -58.38 })).toBeGreaterThan(1_000);
  });
});
