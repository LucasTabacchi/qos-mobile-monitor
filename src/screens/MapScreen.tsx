import React, { useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';
import Svg, { Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Layers,
  Check,
  Radio,
  Download,
  Crosshair,
  Flame,
  MapPin,
  Timer,
} from 'lucide-react-native';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  QualityColors,
  scoreToQuality,
  rttToQuality,
  throughputToQuality,
  type QualityLevel,
} from '../theme';
import { QualityChip, NetworkTypeBadge } from '../components/common';
import { useHistoryStore } from '../store';
import { PersistenceService } from '../services/persistence/PersistenceService';
import type { MeasurementRecord } from '../types';

// ---------------------------------------------------------------------------
// Metric layer modes
// ---------------------------------------------------------------------------

type MetricLayer = 'latency' | 'signal' | 'speed';

function getMetricQuality(record: MeasurementRecord, mode: MetricLayer): QualityLevel {
  if (mode === 'latency') {
    const avg = record.ping?.[0]?.avg;
    if (avg !== undefined && avg !== null) {
      return rttToQuality(avg);
    }
  } else if (mode === 'signal') {
    const rssi = record.network.rssi;
    if (rssi !== null && rssi !== undefined) {
      if (rssi >= -70) return 'excellent';
      if (rssi >= -85) return 'good';
      if (rssi >= -100) return 'fair';
      if (rssi >= -110) return 'poor';
      return 'bad';
    }
    const score = record.network.rssiScore;
    if (score !== null && score !== undefined) {
      return scoreToQuality(score);
    }
  } else if (mode === 'speed') {
    const dl = record.throughput?.downloadMbps;
    if (dl !== null && dl !== undefined && dl > 0) {
      return throughputToQuality(dl);
    }
  }

  const qos = record.qosScore;
  return qos !== null && qos !== undefined ? scoreToQuality(qos) : 'noData';
}

const METRIC_CONFIG: Record<
  MetricLayer,
  {
    title: string;
    good: string;
    regular: string;
    bad: string;
  }
> = {
  latency: {
    title: 'LATENCIA RTT',
    good: '<60 ms',
    regular: '60-120 ms',
    bad: '>120 ms',
  },
  signal: {
    title: 'POTENCIA SEÑAL',
    good: '>-80 dBm',
    regular: '-80 a -100',
    bad: '<-100 dBm',
  },
  speed: {
    title: 'VELOCIDAD BAJADA',
    good: '>20 Mbps',
    regular: '5-20 Mbps',
    bad: '<5 Mbps',
  },
};

// ---------------------------------------------------------------------------
// Heatmap weight helpers
// ---------------------------------------------------------------------------

function recordToHeatPoint(record: MeasurementRecord, mode: MetricLayer) {
  if (!record.location) return null;

  let weight = 0.5;
  if (mode === 'latency') {
    const avg = record.ping?.[0]?.avg;
    weight = avg !== undefined && avg !== null ? Math.min(1, Math.max(0.1, avg / 150)) : 0.5;
  } else if (mode === 'signal') {
    const score = record.network.rssiScore;
    weight = score !== null ? Math.max(0.1, 1 - score / 100) : 0.5;
  } else if (mode === 'speed') {
    const dl = record.throughput?.downloadMbps;
    weight = dl !== null && dl !== undefined ? Math.max(0.1, 1 - Math.min(1, dl / 50)) : 0.5;
  }

  return {
    latitude: record.location.latitude,
    longitude: record.location.longitude,
    weight,
  };
}

// ---------------------------------------------------------------------------
// Selected marker detail panel
// ---------------------------------------------------------------------------

function MeasurementDetail({
  record,
  activeMetric,
}: {
  record: MeasurementRecord;
  activeMetric: MetricLayer;
}) {
  const ping = record.ping?.[0];
  const qos = record.qosScore;
  const quality = getMetricQuality(record, activeMetric);
  const qualityColor = QualityColors[quality];

  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleGroup}>
          <Text style={styles.detailTime}>
            {new Date(record.timestamp).toLocaleString()}
          </Text>
          <Text style={styles.detailOperator}>
            {record.network.operator ?? 'Móvil genérico'}
          </Text>
        </View>
        <View style={styles.detailBadges}>
          <NetworkTypeBadge type={record.network.type} />
          <QualityChip level={quality} />
        </View>
      </View>

      {/* Metrics grid with dynamic highlight for activeMetric */}
      <View style={styles.detailGrid}>
        {qos !== null && qos !== undefined ? (
          <View style={styles.detailMetricBox}>
            <Text style={styles.detailMetricLabel}>Score MOS</Text>
            <Text style={[styles.detailMetricVal, { color: QualityColors[scoreToQuality(qos)] }]}>
              {Math.round(qos)}/100
            </Text>
          </View>
        ) : null}

        {ping?.avg !== undefined && ping.avg !== null ? (
          <View
            style={[
              styles.detailMetricBox,
              activeMetric === 'latency' && styles.detailMetricBoxActive,
            ]}>
            <Text
              style={[
                styles.detailMetricLabel,
                activeMetric === 'latency' && styles.detailMetricLabelActive,
              ]}>
              Latencia RTT
            </Text>
            <Text
              style={[
                styles.detailMetricVal,
                { color: QualityColors[rttToQuality(ping.avg)] },
              ]}>
              {Math.round(ping.avg)} ms
            </Text>
          </View>
        ) : null}

        {ping?.jitter !== undefined && ping.jitter !== null ? (
          <View style={styles.detailMetricBox}>
            <Text style={styles.detailMetricLabel}>Jitter</Text>
            <Text style={styles.detailMetricVal}>{Math.round(ping.jitter)} ms</Text>
          </View>
        ) : null}

        {record.throughput?.downloadMbps !== undefined && record.throughput?.downloadMbps !== null ? (
          <View
            style={[
              styles.detailMetricBox,
              activeMetric === 'speed' && styles.detailMetricBoxActive,
            ]}>
            <Text
              style={[
                styles.detailMetricLabel,
                activeMetric === 'speed' && styles.detailMetricLabelActive,
              ]}>
              Descarga
            </Text>
            <Text
              style={[
                styles.detailMetricVal,
                { color: QualityColors[throughputToQuality(record.throughput.downloadMbps)] },
              ]}>
              {record.throughput.downloadMbps.toFixed(1)} Mbps
            </Text>
          </View>
        ) : null}

        {record.throughput?.uploadMbps !== undefined && record.throughput?.uploadMbps !== null ? (
          <View style={styles.detailMetricBox}>
            <Text style={styles.detailMetricLabel}>Subida</Text>
            <Text style={styles.detailMetricVal}>
              {record.throughput.uploadMbps.toFixed(1)} Mbps
            </Text>
          </View>
        ) : null}

        {record.network.rssi !== null && record.network.rssi !== undefined ? (
          <View
            style={[
              styles.detailMetricBox,
              activeMetric === 'signal' && styles.detailMetricBoxActive,
            ]}>
            <Text
              style={[
                styles.detailMetricLabel,
                activeMetric === 'signal' && styles.detailMetricLabelActive,
              ]}>
              Señal RSSI
            </Text>
            <Text
              style={[
                styles.detailMetricVal,
                {
                  color:
                    QualityColors[
                      record.network.rssi >= -80
                        ? 'good'
                        : record.network.rssi >= -100
                        ? 'fair'
                        : 'bad'
                    ],
                },
              ]}>
              {record.network.rssi} dBm
            </Text>
          </View>
        ) : null}
      </View>

      {record.location ? (
        <View style={styles.detailCoordsRow}>
          <MapPin size={13} color={Colors.accent.primary} />
          <Text style={styles.detailCoordsText}>
            Lat {record.location.latitude.toFixed(5)}, Long {record.location.longitude.toFixed(5)}
            {record.location.accuracy ? ` (±${Math.round(record.location.accuracy)}m)` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// MapScreen
// ---------------------------------------------------------------------------

export default function MapScreen() {
  const { records } = useHistoryStore();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [activeMetric, setActiveMetric] = useState<MetricLayer>('latency');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [radiusFilter, setRadiusFilter] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MeasurementRecord | null>(null);

  const snapPoints = useMemo(() => ['22%', '55%'], []);

  const withLocation = useMemo(() => {
    const seenCoords = new Set<string>();
    const located: MeasurementRecord[] = [];
    for (const r of records) {
      if (!r.location) continue;
      const key = `${r.location.latitude.toFixed(4)}_${r.location.longitude.toFixed(4)}`;
      if (!seenCoords.has(key)) {
        seenCoords.add(key);
        located.push(r);
      }
    }
    const center = located[0]?.location;
    return radiusFilter && center
      ? PersistenceService.filterRecords(located, { center, radiusMeters: 5_000 })
      : located;
  }, [records, radiusFilter]);

  const heatPoints = useMemo(
    () =>
      withLocation
        .map(r => recordToHeatPoint(r, activeMetric))
        .filter((p): p is { latitude: number; longitude: number; weight: number } => p !== null),
    [withLocation, activeMetric],
  );

  const initialRegion = useMemo<Region>(() => {
    if (withLocation.length > 0 && withLocation[0].location) {
      const loc = withLocation[0].location;
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    // Default Buenos Aires center coordinates
    return {
      latitude: -34.6037,
      longitude: -58.3816,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [withLocation]);

  const handleRecenter = useCallback(() => {
    if (withLocation[0]?.location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: withLocation[0].location.latitude,
        longitude: withLocation[0].location.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    }
  }, [withLocation]);

  const handleMarkerPress = useCallback((record: MeasurementRecord) => {
    setSelectedRecord(record);
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Sub-header & Filter Chips Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarHeader}>
          <View style={styles.topBarTitleRow}>
            <Layers size={18} color={Colors.accent.primary} />
            <Text style={styles.topBarTitle}>Capa de diagnóstico</Text>
          </View>
          <View style={styles.zoneBadge}>
            <View style={styles.zoneDot} />
            <Text style={styles.zoneText}>
              {radiusFilter ? `${withLocation.length} en 5 km` : `${withLocation.length} muestras GPS`}
            </Text>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsScrollContent}>
          <TouchableOpacity
            style={[styles.metricChip, activeMetric === 'latency' && styles.metricChipActive]}
            onPress={() => setActiveMetric('latency')}>
            {activeMetric === 'latency' ? (
              <Check size={14} color={Colors.accent.primary} strokeWidth={2.5} />
            ) : (
              <Timer size={14} color={Colors.text.secondary} />
            )}
            <Text style={[styles.metricChipText, activeMetric === 'latency' && styles.metricChipTextActive]}>
              Latencia
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricChip, activeMetric === 'signal' && styles.metricChipActive]}
            onPress={() => setActiveMetric('signal')}>
            {activeMetric === 'signal' ? (
              <Check size={14} color={Colors.accent.primary} strokeWidth={2.5} />
            ) : (
              <Radio size={14} color={Colors.text.secondary} />
            )}
            <Text style={[styles.metricChipText, activeMetric === 'signal' && styles.metricChipTextActive]}>
              Señal (dBm)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricChip, activeMetric === 'speed' && styles.metricChipActive]}
            onPress={() => setActiveMetric('speed')}>
            {activeMetric === 'speed' ? (
              <Check size={14} color={Colors.accent.primary} strokeWidth={2.5} />
            ) : (
              <Download size={14} color={Colors.text.secondary} />
            )}
            <Text style={[styles.metricChipText, activeMetric === 'speed' && styles.metricChipTextActive]}>
              Mbps descarga
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricChip, radiusFilter && styles.metricChipActive]}
            onPress={() => setRadiusFilter(prev => !prev)}>
            {radiusFilter ? (
              <Check size={14} color={Colors.accent.primary} strokeWidth={2.5} />
            ) : (
              <MapPin size={14} color={Colors.text.secondary} />
            )}
            <Text style={[styles.metricChipText, radiusFilter && styles.metricChipTextActive]}>
              {radiusFilter ? 'Radio 5 km (Activo)' : 'Radio 5 km'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Map Canvas Stage ── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation
          onUserLocationChange={() => {}}
          showsCompass={false}
          showsMyLocationButton={false}>

          {/* Custom Pin Markers with Organic SVG Thermal Halos colored by activeMetric */}
          {withLocation.map(record => {
            if (!record.location) return null;
            const quality = getMetricQuality(record, activeMetric);
            const pinColor = QualityColors[quality];

            return (
              <Marker
                key={`${record.id}_${activeMetric}`}
                coordinate={{
                  latitude: record.location.latitude,
                  longitude: record.location.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={() => handleMarkerPress(record)}>
                <View style={styles.markerContainer}>
                  {showHeatmap && (
                    <Svg
                      width={110}
                      height={110}
                      viewBox="0 0 110 110"
                      style={styles.svgAura}
                      pointerEvents="none">
                      <Defs>
                        <RadialGradient
                          id={`heatGrad_${record.id}_${activeMetric}`}
                          cx="50%"
                          cy="50%"
                          rx="50%"
                          ry="50%">
                          <Stop offset="0%" stopColor={pinColor} stopOpacity="0.60" />
                          <Stop offset="50%" stopColor={pinColor} stopOpacity="0.22" />
                          <Stop offset="100%" stopColor={pinColor} stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <SvgCircle cx="55" cy="55" r="55" fill={`url(#heatGrad_${record.id}_${activeMetric})`} />
                    </Svg>
                  )}
                  <View style={[styles.markerRing, { borderColor: pinColor }]}>
                    <View style={[styles.markerDot, { backgroundColor: pinColor }]} />
                  </View>
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* ── Floating Compact Legend Box (Top Left over map) ── */}
        <View style={styles.legendBox}>
          <Text style={styles.legendTitle}>{METRIC_CONFIG[activeMetric].title}</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDotSmall, styles.dotGood]} />
              <Text style={styles.legendLabel}>Buena</Text>
              <Text style={styles.legendValue}>{METRIC_CONFIG[activeMetric].good}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDotSmall, styles.dotRegular]} />
              <Text style={styles.legendLabel}>Regular</Text>
              <Text style={styles.legendValue}>{METRIC_CONFIG[activeMetric].regular}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDotSmall, styles.dotBad]} />
              <Text style={styles.legendLabel}>Mala</Text>
              <Text style={styles.legendValue}>{METRIC_CONFIG[activeMetric].bad}</Text>
            </View>
          </View>
        </View>

        {/* ── Floating Map Action Buttons (Right) ── */}
        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={handleRecenter}
            accessibilityRole="button"
            accessibilityLabel="Centrar en mi ubicación">
            <Crosshair size={20} color={Colors.accent.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.floatingBtn, showHeatmap && styles.floatingBtnActive]}
            onPress={() => setShowHeatmap(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Alternar mapa de calor">
            <Flame size={20} color={showHeatmap ? Colors.accent.primary : Colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Persistent Bottom Sheet Card Inspector ── */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          handleIndicatorStyle={styles.sheetHandle}
          backgroundStyle={styles.sheetBackground}>
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
            {selectedRecord ? (
              <MeasurementDetail record={selectedRecord} activeMetric={activeMetric} />
            ) : withLocation[0] ? (
              <MeasurementDetail record={withLocation[0]} activeMetric={activeMetric} />
            ) : (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyTitle}>Sin muestras de mapa</Text>
                <Text style={styles.sheetEmptySub}>
                  Ejecutá una medición con GPS habilitado para mapear la calidad de tu red.
                </Text>
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles matching MD3 prototype 3 mapa_de_cobertura
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg.primary,
    zIndex: 20,
  },
  topBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  topBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.bg.high,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  zoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent.secondary,
  },
  zoneText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  chipsScroll: {
    marginHorizontal: -Spacing.md,
  },
  chipsScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  metricChipActive: {
    backgroundColor: Colors.accent.primaryFixed,
  },
  metricChipText: {
    ...Typography.labelMedium,
    color: Colors.text.secondary,
  },
  metricChipTextActive: {
    color: Colors.accent.onPrimaryFixedVariant,
    fontWeight: '700',
  },

  // Map Container
  mapContainer: {
    flex: 1,
    position: 'relative',
  },

  // Custom Markers
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
  },
  svgAura: {
    position: 'absolute',
    width: 110,
    height: 110,
  },
  markerRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Floating Legend Box
  legendBox: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 140,
  },
  legendTitle: {
    ...Typography.labelSmall,
    fontSize: 9,
    color: Colors.text.secondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  legendItems: {
    gap: 3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  legendDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGood: {
    backgroundColor: '#1E8E3E',
  },
  dotRegular: {
    backgroundColor: '#F9AB00',
  },
  dotBad: {
    backgroundColor: '#BA1A1A',
  },
  legendLabel: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: Colors.text.primary,
    flex: 1,
  },
  legendValue: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: Colors.text.tertiary,
  },

  // Floating Actions
  floatingActions: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.md,
    gap: Spacing.sm,
    zIndex: 10,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingBtnActive: {
    backgroundColor: Colors.accent.primaryFixed,
  },

  // Bottom Sheet
  sheetHandle: {
    backgroundColor: Colors.border.default,
    width: 36,
    height: 4,
  },
  sheetBackground: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  sheetContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  detail: {
    gap: Spacing.sm,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailTitleGroup: {
    flex: 1,
  },
  detailTime: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  detailOperator: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
  },
  detailMetricBox: {
    width: '31%',
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.xs,
  },
  detailMetricLabel: {
    ...Typography.labelSmall,
    fontSize: 9,
    color: Colors.text.secondary,
  },
  detailMetricVal: {
    ...Typography.titleSmall,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 1,
  },
  detailMetricBoxActive: {
    borderColor: Colors.accent.primary,
    borderWidth: 1.5,
    backgroundColor: '#EBF2FF',
  },
  detailMetricLabelActive: {
    color: Colors.accent.primary,
    fontWeight: '700',
  },
  detailCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  detailCoordsText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },

  sheetEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  sheetEmptyTitle: {
    ...Typography.titleMedium,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  sheetEmptySub: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});
