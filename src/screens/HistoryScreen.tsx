import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  Calendar,
  MapPin,
  Check,
  Timer,
  ArrowDown,
  FileText,
  FileCode,
  Trash2,
  Play,
  TrendingUp,
} from 'lucide-react-native';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  QualityColors,
  scoreToQuality,
} from '../theme';
import { useHistoryStore } from '../store';
import { PersistenceService } from '../services/persistence/PersistenceService';
import type { MeasurementRecord, NetworkType, HistoryStackParamList } from '../types';
import Share from 'react-native-share';

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type NetworkFilter = NetworkType | 'ALL';
const NETWORK_FILTERS: { label: string; value: NetworkFilter }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'WiFi', value: 'WIFI' },
  { label: '3G', value: '3G' },
  { label: '4G', value: '4G' },
  { label: '5G', value: '5G' },
];

// ---------------------------------------------------------------------------
// HistoryItem matching MD3 prototype metric-row
// ---------------------------------------------------------------------------

function HistoryItem({ record, onPress }: { record: MeasurementRecord; onPress: () => void }) {
  const qos = record.qosScore;
  const quality = qos !== null ? scoreToQuality(qos) : 'noData';
  const color = QualityColors[quality];
  const ping = record.ping?.[0];
  const dl = record.throughput?.downloadMbps;

  const dateObj = new Date(record.timestamp);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isGood = quality === 'excellent' || quality === 'good';
  const isFair = quality === 'fair';

  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.itemLeft}>
        {/* Status dot */}
        <View style={styles.statusDotWrapper}>
          <View style={[styles.statusRing, { backgroundColor: isGood ? Colors.accent.secondaryFixed : isFair ? Colors.accent.tertiaryFixed : Colors.error.container }]} />
          <View style={[styles.statusInnerDot, { backgroundColor: color }]} />
        </View>

        <View style={styles.itemInfo}>
          <View style={styles.itemBadgeRow}>
            <Text style={styles.itemTime}>{timeStr}</Text>
            <View style={styles.itemTechPill}>
              <Text style={styles.itemTechPillText}>{record.network.type}</Text>
            </View>
            {record.network.operator ? (
              <View style={styles.itemOperatorPill}>
                <Text style={styles.itemOperatorPillText} numberOfLines={1}>
                  {record.network.operator}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.itemMetricsRow}>
            <Timer size={13} color={Colors.text.tertiary} />
            <Text style={styles.itemMetricText}>
              {ping?.avg !== undefined && ping.avg !== null ? `${Math.round(ping.avg)} ms` : '— ms'}
            </Text>
            <Text style={styles.metricDivider}>·</Text>
            <Text style={[styles.itemMetricQuality, { color }]}>
              {isGood ? 'Estable' : isFair ? 'Regular' : 'Crítico'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={styles.itemSpeedValue}>
          {dl !== null && dl !== undefined ? dl.toFixed(1) : '—'}
          <Text style={styles.itemSpeedUnit}> Mbps</Text>
        </Text>
        <View style={styles.itemSpeedLabelRow}>
          <ArrowDown size={12} color={isGood ? Colors.accent.secondary : Colors.error.main} />
          <Text style={styles.itemSpeedLabel}>Descarga</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

async function exportAs(records: MeasurementRecord[], format: 'csv' | 'json') {
  if (records.length === 0) {
    Alert.alert('Sin registros', 'No hay mediciones para exportar.');
    return;
  }

  const filename = `qos_export_${Date.now()}.${format}`;
  try {
    const url = await PersistenceService.exportFile(records, format);
    await Share.open({
      title: filename,
      url,
      type: format === 'csv' ? 'text/csv' : 'application/json',
      filename,
    });
  } catch (e: any) {
    if (e?.message?.includes('User did not share') || e?.message?.includes('dismissed') || e?.message?.includes('CANCELED')) {
      return;
    }
    Alert.alert('Error al exportar', String(e));
  }
}

// ---------------------------------------------------------------------------
// HistoryScreen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const { records, clearHistory } = useHistoryStore();
  const navigation = useNavigation<StackNavigationProp<HistoryStackParamList>>();
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | '24H' | '7D'>('ALL');
  const [areaFilter, setAreaFilter] = useState<'ALL' | '5KM'>('ALL');

  const filtered = useMemo(() => {
    const seen = new Set<string>();
    const newestLocation = records.find(r => r.location)?.location;
    const fromTimestamp =
      dateRange === '24H'
        ? Date.now() - 86_400_000
        : dateRange === '7D'
        ? Date.now() - 7 * 86_400_000
        : undefined;

    return PersistenceService.filterRecords(records, {
      networkType: networkFilter === 'ALL' ? undefined : networkFilter,
      fromTimestamp,
      center: areaFilter === '5KM' ? newestLocation ?? undefined : undefined,
      radiusMeters: areaFilter === '5KM' ? 5_000 : undefined,
    }).filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [records, networkFilter, dateRange, areaFilter]);

  // Median / Average Latency calculation
  const medianLatency = useMemo(() => {
    const lats = filtered
      .map(r => r.ping?.[0]?.avg)
      .filter((v): v is number => v !== undefined && v !== null)
      .sort((a, b) => a - b);
    if (lats.length === 0) return null;
    const mid = Math.floor(lats.length / 2);
    return lats.length % 2 !== 0 ? lats[mid] : (lats[mid - 1] + lats[mid]) / 2;
  }, [filtered]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Borrar historial',
      '¿Deseas eliminar permanentemente todas las mediciones locales?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            clearHistory();
            await PersistenceService.clearAll();
          },
        },
      ],
    );
  }, [clearHistory]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Historial de Mediciones</Text>
            <Text style={styles.subtitle}>Monitoreo continuo de calidad de enlace</Text>
          </View>
          {records.length > 0 ? (
            <TouchableOpacity
              onPress={handleClearAll}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Borrar historial">
              <Trash2 size={16} color={Colors.error.main} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Date & Area Filter Chips Row */}
        <View style={styles.topFilterChipsRow}>
          <TouchableOpacity
            style={[styles.topPill, dateRange !== 'ALL' && styles.topPillActive]}
            onPress={() => setDateRange(prev => prev === 'ALL' ? '7D' : prev === '7D' ? '24H' : 'ALL')}>
            <Calendar size={14} color={dateRange !== 'ALL' ? Colors.accent.primary : Colors.text.secondary} />
            <Text style={[styles.topPillText, dateRange !== 'ALL' && styles.topPillTextActive]}>
              {dateRange === 'ALL' ? 'Todas las fechas' : dateRange === '7D' ? 'Últimos 7 días' : 'Últimas 24h'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topPill, areaFilter === '5KM' && styles.topPillActive]}
            onPress={() => setAreaFilter(prev => prev === 'ALL' ? '5KM' : 'ALL')}>
            <MapPin size={14} color={areaFilter === '5KM' ? Colors.accent.secondary : Colors.text.secondary} />
            <Text style={[styles.topPillText, areaFilter === '5KM' && styles.topPillTextActive]}>
              {areaFilter === '5KM' ? 'Zona: 5 km' : 'Todas las zonas'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Micro Bento Summary (Latency & Count) ── */}
      <View style={styles.microBentoRow}>
        <View style={styles.microBentoCard}>
          <Text style={styles.microBentoLabel}>Latencia mediana</Text>
          <Text style={styles.microBentoValue}>
            {medianLatency !== null ? Math.round(medianLatency) : '—'}
            <Text style={styles.microBentoUnit}> ms</Text>
          </Text>
          <Text style={styles.microBentoSub}>Percentil 50 de muestras</Text>
        </View>

        <View style={styles.microBentoCard}>
          <Text style={styles.microBentoLabel}>Mediciones filtradas</Text>
          <Text style={styles.microBentoCount}>{filtered.length}</Text>
          <Text style={styles.microBentoSub}>de {records.length} registradas</Text>
        </View>
      </View>

      {/* ── Technology Filter Chips (Horizontal) ── */}
      <View style={styles.techFilterRow}>
        {NETWORK_FILTERS.map(f => {
          const isActive = f.value === networkFilter;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setNetworkFilter(f.value)}
              style={[styles.techChip, isActive ? styles.techChipActive : styles.techChipInactive]}>
              {isActive ? (
                <Check size={14} color={Colors.accent.primary} strokeWidth={2.5} />
              ) : null}
              <Text style={[styles.techChipText, isActive ? styles.techChipTextActive : styles.techChipTextInactive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Measurement List ── */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyGraphicBox}>
            <View style={styles.emptyGlow} />
            <TrendingUp size={44} color={Colors.accent.primary} />
          </View>
          <Text style={styles.emptyTitle}>Todavía no hay mediciones</Text>
          <Text style={styles.emptyDescription}>
            Hacé tu primera medición para empezar a armar tu mapa de cobertura y registrar la telemetría de tu red.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => (navigation as any).navigate('Dashboard')}>
            <Play size={18} color={Colors.text.inverse} fill={Colors.text.inverse} />
            <Text style={styles.emptyActionBtnText}>Medir ahora</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <HistoryItem
              record={item}
              onPress={() => navigation.navigate('Charts', { sessionId: item.sessionId })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            /* ── Bottom Export Telemetría Actions ── */
            <View style={styles.exportSection}>
              <View style={styles.exportHeader}>
                <Text style={styles.exportSectionTitle}>EXPORTAR TELEMETRÍA</Text>
                <Text style={styles.exportSectionCount}>{filtered.length} diagnósticos</Text>
              </View>
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => exportAs(filtered, 'csv')}>
                  <FileText size={18} color={Colors.accent.primary} />
                  <Text style={styles.exportBtnText}>Exportar CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => exportAs(filtered, 'json')}>
                  <FileCode size={18} color={Colors.accent.primary} />
                  <Text style={styles.exportBtnText}>Exportar JSON</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles matching MD3 prototype 3
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.high,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topFilterChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.high,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  topPillActive: {
    backgroundColor: Colors.accent.primaryFixed,
  },
  topPillText: {
    ...Typography.labelMedium,
    color: Colors.text.secondary,
  },
  topPillTextActive: {
    color: Colors.accent.onPrimaryFixedVariant,
    fontWeight: '600',
  },

  // Micro Bento
  microBentoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  microBentoCard: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.sm + 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  microBentoLabel: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  microBentoValue: {
    ...Typography.h2,
    color: Colors.accent.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  microBentoUnit: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '400',
  },
  microBentoCount: {
    ...Typography.h2,
    color: Colors.text.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  microBentoSub: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Tech Filter Row
  techFilterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  techChipActive: {
    backgroundColor: Colors.accent.primaryFixed,
  },
  techChipInactive: {
    backgroundColor: Colors.bg.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  techChipText: {
    ...Typography.labelMedium,
  },
  techChipTextActive: {
    color: Colors.accent.onPrimaryFixedVariant,
    fontWeight: '700',
  },
  techChipTextInactive: {
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  // List Items
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xs,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  statusDotWrapper: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
  },
  statusInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemTime: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  itemTechPill: {
    backgroundColor: Colors.bg.elevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  itemTechPillText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  itemOperatorPill: {
    backgroundColor: Colors.bg.high,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    maxWidth: 90,
  },
  itemOperatorPillText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  itemMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemMetricText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  metricDivider: {
    color: Colors.border.default,
  },
  itemMetricQuality: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  itemRight: {
    alignItems: 'flex-end',
    paddingLeft: Spacing.sm,
  },
  itemSpeedValue: {
    ...Typography.titleMedium,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  itemSpeedUnit: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '400',
  },
  itemSpeedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  itemSpeedLabel: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },

  // Export Section
  exportSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportSectionTitle: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    letterSpacing: 0.8,
  },
  exportSectionCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  exportBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  exportBtnText: {
    ...Typography.labelLarge,
    color: Colors.accent.primary,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  emptyGraphicBox: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent.dim,
  },
  emptyTitle: {
    ...Typography.titleLarge,
    color: Colors.text.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 52,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.accent.primary,
    borderRadius: Radius.full,
    marginTop: Spacing.lg,
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyActionBtnText: {
    ...Typography.titleSmall,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
});
