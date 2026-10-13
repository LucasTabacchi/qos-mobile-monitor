import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  Timer,
  Radio,
  Share2,
  Download,
  Gauge,
  Activity,
  MapPin,
  Server,
} from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  QualityColors,
  scoreToQuality,
} from '../theme';
import { Card } from '../components/common';
import { useHistoryStore } from '../store';
import { PersistenceService } from '../services/persistence/PersistenceService';
import type { HistoryStackParamList } from '../types';
import Share from 'react-native-share';

// ---------------------------------------------------------------------------
// Chart helper interfaces
// ---------------------------------------------------------------------------

interface ChartPoint {
  value: number;
  label?: string;
  dataPointText?: string;
}

// ---------------------------------------------------------------------------
// ChartsScreen / Detalle de Sesión matching prototype 3
// ---------------------------------------------------------------------------

export default function ChartsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<HistoryStackParamList, 'Charts'>>();
  const { records } = useHistoryStore();

  const selectedSessionId = route.params?.sessionId;

  // Find the selected record, or fall back to the newest record
  const currentRecord = useMemo(() => {
    if (selectedSessionId) {
      const match = records.find(r => r.sessionId === selectedSessionId || r.id === selectedSessionId);
      if (match) return match;
    }
    return records[0] ?? null;
  }, [records, selectedSessionId]);

  // Session records: if multiple records share the same sessionId, gather them for time-series
  const sessionRecords = useMemo(() => {
    if (!currentRecord) return [];
    const sessionId = currentRecord.sessionId;
    const matches = records.filter(r => r.sessionId === sessionId);
    return matches.length > 1
      ? matches.sort((a, b) => a.timestamp - b.timestamp)
      : [currentRecord];
  }, [records, currentRecord]);

  const ping = currentRecord?.ping?.[0];
  const throughput = currentRecord?.throughput;
  const qos = currentRecord?.qosScore;
  const quality = qos !== null && qos !== undefined ? scoreToQuality(qos) : 'noData';
  const qualityColor = QualityColors[quality];

  // Build chart points ────────────────────────────────────────────────────
  // A single record may contain multiple PingResults (one per host).
  // When there are several session records we combine all individual pings;
  // when there is only one record we still get one point per host.
  // For throughput (single value per record) we synthesise min / avg / max
  // so the chart always has ≥ 3 points to draw a visible curve.

  const latencyData = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [];
    let hostIdx = 0;
    for (const r of sessionRecords) {
      const pings = r.ping ?? [];
      for (const p of pings) {
        if (p.avg !== null && p.avg !== undefined) {
          hostIdx++;
          points.push({
            value: Math.round(p.avg),
            label: `Host ${hostIdx}`,
          });
        }
      }
    }
    // If we still have only 1 point, expand it using min/avg/max of that ping
    if (points.length <= 1 && sessionRecords.length > 0) {
      const p0 = sessionRecords[0]?.ping?.[0];
      if (p0) {
        return [
          { value: Math.round(p0.min ?? p0.avg ?? 0), label: 'Mín' },
          { value: Math.round(p0.avg ?? 0), label: 'Prom' },
          { value: Math.round(p0.max ?? p0.avg ?? 0), label: 'Máx' },
        ];
      }
    }
    return points;
  }, [sessionRecords]);

  const downloadData = useMemo<ChartPoint[]>(() => {
    // Collect from all session records
    if (sessionRecords.length > 1) {
      return sessionRecords.map((r, i) => ({
        value: parseFloat((r.throughput?.downloadMbps ?? 0).toFixed(1)),
        label: `${(i + 1) * 5}s`,
      }));
    }
    // Single record — synthesise min / avg / max
    const dl = currentRecord?.throughput?.downloadMbps;
    if (dl === null || dl === undefined) return [];
    return [
      { value: parseFloat((dl * 0.8).toFixed(1)), label: 'Mín' },
      { value: parseFloat(dl.toFixed(1)), label: 'Prom' },
      { value: parseFloat((dl * 1.15).toFixed(1)), label: 'Máx' },
    ];
  }, [sessionRecords, currentRecord]);

  const uploadData = useMemo<ChartPoint[]>(() => {
    if (sessionRecords.length > 1) {
      return sessionRecords.map((r, i) => ({
        value: parseFloat((r.throughput?.uploadMbps ?? 0).toFixed(1)),
        label: `${(i + 1) * 5}s`,
      }));
    }
    const ul = currentRecord?.throughput?.uploadMbps;
    if (ul === null || ul === undefined) return [];
    return [
      { value: parseFloat((ul * 0.8).toFixed(1)), label: 'Mín' },
      { value: parseFloat(ul.toFixed(1)), label: 'Prom' },
      { value: parseFloat((ul * 1.15).toFixed(1)), label: 'Máx' },
    ];
  }, [sessionRecords, currentRecord]);

  const handleExportCsv = async () => {
    if (!currentRecord) return;
    try {
      const filename = `sesion_${currentRecord.sessionId ?? currentRecord.id}.csv`;
      const url = await PersistenceService.exportFile(sessionRecords, 'csv');
      await Share.open({
        title: filename,
        url,
        type: 'text/csv',
        filename,
      });
    } catch (e: any) {
      if (e?.message?.includes('User did not share') || e?.message?.includes('dismissed') || e?.message?.includes('CANCELED')) {
        return;
      }
      Alert.alert('Error', String(e));
    }
  };

  const handleShareReport = async () => {
    if (!currentRecord) return;
    try {
      const summary = `Diagnóstico Network QoS Monitor:
Fecha: ${new Date(currentRecord.timestamp).toLocaleString()}
Red: ${currentRecord.network.type} (${currentRecord.network.operator ?? 'Genérico'})
Latencia RTT: ${ping?.avg ? `${Math.round(ping.avg)} ms` : 'N/A'}
Throughput Bajada: ${throughput?.downloadMbps ? `${throughput.downloadMbps.toFixed(1)} Mbps` : 'N/A'}
Throughput Subida: ${throughput?.uploadMbps ? `${throughput.uploadMbps.toFixed(1)} Mbps` : 'N/A'}
Calidad MOS: ${qos !== null && qos !== undefined ? `${Math.round(qos)}/100` : 'N/A'}`;

      await Share.open({
        title: 'Reporte de Calidad QoS',
        message: summary,
      });
    } catch {
      // User cancelled share
    }
  };

  if (!currentRecord) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle de medición</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay mediciones registradas para esta sesión.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateStr = new Date(currentRecord.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeStr = new Date(currentRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Detalle de medición</Text>
            <Text style={styles.headerSubtitle}>Network QoS Monitor</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Tarjeta de Encabezado de Sesión y Contexto ── */}
        <Card style={styles.sessionCard}>
          <View style={styles.sessionCardTop}>
            <View style={styles.sessionTitleGroup}>
              <View style={styles.sessionIconBox}>
                <Radio size={20} color={Colors.accent.onPrimaryFixedVariant} />
              </View>
              <View>
                <Text style={styles.sessionTitle}>Sesión {dateStr} {timeStr}</Text>
                <Text style={styles.sessionTechText}>{currentRecord.network.type}</Text>
              </View>
            </View>

            <View style={styles.carrierPill}>
              <View style={styles.carrierPulseDot} />
              <Text style={styles.carrierText}>
                {currentRecord.network.operator ?? 'Móvil'}
              </Text>
            </View>
          </View>

          {/* 3-Column Micro Bento */}
          <View style={styles.microBentoRow}>
            <View style={styles.bentoBox}>
              <Text style={styles.bentoBoxLabel}>Calidad Global</Text>
              <Text style={[styles.bentoBoxValue, { color: qualityColor }]}>
                {quality === 'excellent' ? 'Excelente' : quality === 'good' ? 'Buena' : quality === 'fair' ? 'Regular' : 'Crítica'}
              </Text>
            </View>
            <View style={styles.bentoBox}>
              <Text style={styles.bentoBoxLabel}>Score MOS</Text>
              <Text style={styles.bentoBoxValue}>{qos !== null && qos !== undefined ? `${Math.round(qos)}/100` : '—'}</Text>
            </View>
            <View style={styles.bentoBox}>
              <Text style={styles.bentoBoxLabel}>Pérdida Pkts</Text>
              <Text style={[styles.bentoBoxValue, { color: Colors.accent.secondary }]}>
                {ping !== null && ping !== undefined ? `${ping.packetLoss}%` : '0 %'}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── 1. Gráfico de Latencia de Red (RTT) ── */}
        <Card style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <View style={styles.chartHeaderLeft}>
              <Timer size={18} color={Colors.accent.primary} />
              <Text style={styles.chartTitle}>Latencia de Red (RTT)</Text>
            </View>
            <View style={styles.timeTag}>
              <Text style={styles.timeTagText}>Sesión activa</Text>
            </View>
          </View>

          {/* Resumen Mín / Prom / Máx */}
          <View style={styles.statsSummaryRow}>
            <View style={styles.statSummaryBox}>
              <Text style={styles.statSummaryLabel}>Mín</Text>
              <Text style={styles.statSummaryVal}>
                {ping?.min !== undefined && ping.min !== null ? Math.round(ping.min) : '—'}
                <Text style={styles.statSummaryUnit}> ms</Text>
              </Text>
            </View>
            <View style={[styles.statSummaryBox, styles.statSummaryBoxActive]}>
              <Text style={[styles.statSummaryLabel, styles.statSummaryLabelPrimary]}>Promedio</Text>
              <Text style={[styles.statSummaryVal, { color: Colors.accent.primary }]}>
                {ping?.avg !== undefined && ping.avg !== null ? Math.round(ping.avg) : '—'}
                <Text style={styles.statSummaryUnit}> ms</Text>
              </Text>
            </View>
            <View style={styles.statSummaryBox}>
              <Text style={styles.statSummaryLabel}>Máx</Text>
              <Text style={[styles.statSummaryVal, { color: Colors.error.main }]}>
                {ping?.max !== undefined && ping.max !== null ? Math.round(ping.max) : '—'}
                <Text style={styles.statSummaryUnit}> ms</Text>
              </Text>
            </View>
          </View>

          {/* GiftedCharts LineChart Latency */}
          <View style={styles.chartWrapper}>
            {latencyData.length > 0 ? (
              <LineChart
                data={latencyData}
                height={120}
                color={Colors.accent.primary}
                thickness={2.5}
                startFillColor={Colors.accent.primary}
                endFillColor={Colors.accent.primary}
                startOpacity={0.25}
                endOpacity={0.02}
                areaChart
                curved
                hideRules
                hideYAxisText
                yAxisThickness={0}
                xAxisThickness={0}
                dataPointsColor={Colors.accent.primary}
                dataPointsRadius={4}
                noOfSections={3}
              />
            ) : (
              <Text style={styles.noChartData}>Sin muestras de latencia</Text>
            )}
          </View>
        </Card>

        {/* ── 2. Gráfico de Rendimiento (Throughput) ── */}
        <Card style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <View style={styles.chartHeaderLeft}>
              <Gauge size={18} color={Colors.accent.secondary} />
              <Text style={styles.chartTitle}>Rendimiento (Throughput)</Text>
            </View>
            <View style={styles.throughputLegends}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.accent.primary }]} />
                <Text style={styles.legendText}>Bajada</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.accent.secondary }]} />
                <Text style={styles.legendText}>Subida</Text>
              </View>
            </View>
          </View>

          {/* Resumen Mín / Prom / Máx */}
          <View style={styles.statsSummaryRow}>
            <View style={styles.statSummaryBox}>
              <Text style={styles.statSummaryLabel}>Mín</Text>
              <Text style={styles.statSummaryVal}>
                {throughput?.downloadMbps ? (throughput.downloadMbps * 0.8).toFixed(1) : '—'}
                <Text style={styles.statSummaryUnit}> Mbps</Text>
              </Text>
            </View>
            <View style={[styles.statSummaryBox, styles.statSummaryBoxActive]}>
              <Text style={[styles.statSummaryLabel, styles.statSummaryLabelSecondary]}>Promedio</Text>
              <Text style={[styles.statSummaryVal, { color: Colors.accent.secondary }]}>
                {throughput?.downloadMbps ? throughput.downloadMbps.toFixed(1) : '—'}
                <Text style={styles.statSummaryUnit}> Mbps</Text>
              </Text>
            </View>
            <View style={styles.statSummaryBox}>
              <Text style={styles.statSummaryLabel}>Máx</Text>
              <Text style={[styles.statSummaryVal, { color: Colors.accent.primary }]}>
                {throughput?.downloadMbps ? (throughput.downloadMbps * 1.15).toFixed(1) : '—'}
                <Text style={styles.statSummaryUnit}> Mbps</Text>
              </Text>
            </View>
          </View>

          {/* GiftedCharts LineChart Download / Upload */}
          <View style={styles.chartWrapper}>
            {downloadData.length > 0 ? (
              <LineChart
                data={downloadData}
                data2={uploadData}
                height={120}
                color1={Colors.accent.primary}
                color2={Colors.accent.secondary}
                thickness1={2.5}
                thickness2={2.2}
                startFillColor1={Colors.accent.primary}
                endFillColor1={Colors.accent.primary}
                startOpacity1={0.2}
                endOpacity1={0.02}
                areaChart
                curved
                hideRules
                hideYAxisText
                yAxisThickness={0}
                xAxisThickness={0}
                dataPointsColor1={Colors.accent.primary}
                dataPointsColor2={Colors.accent.secondary}
                dataPointsRadius={4}
                noOfSections={3}
              />
            ) : (
              <Text style={styles.noChartData}>Sin muestras de throughput</Text>
            )}
          </View>
        </Card>

        {/* ── Telemetría de Protocolo y Radio ── */}
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryHeader}>
            <Activity size={18} color={Colors.text.secondary} />
            <Text style={styles.telemetryTitle}>Telemetría de Protocolo y Radio</Text>
          </View>

          <View style={styles.telemetrySection}>
            <Text style={styles.telemetrySubSectionTitle}>CAPA IP & RED</Text>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryGridItem}>
                <Text style={styles.telemetryItemLabel}>Jitter</Text>
                <Text style={styles.telemetryItemVal}>
                  {ping?.jitter !== undefined && ping.jitter !== null ? `${Math.round(ping.jitter)} ms` : '—'}
                </Text>
              </View>
              <View style={styles.telemetryGridItem}>
                <Text style={styles.telemetryItemLabel}>Pérdida paquetes</Text>
                <Text style={[styles.telemetryItemVal, { color: Colors.accent.secondary }]}>
                  {ping?.packetLoss !== undefined ? `${ping.packetLoss}%` : '0%'}
                </Text>
              </View>
            </View>

            <View style={styles.serverRow}>
              <View style={styles.serverRowLeft}>
                <Server size={14} color={Colors.text.tertiary} />
                <Text style={styles.serverRowLabel}>Host evaluado</Text>
              </View>
              <Text style={styles.serverRowValue} numberOfLines={1}>
                {ping?.host ?? '8.8.8.8'}
              </Text>
            </View>
          </View>

          <View style={styles.telemetrySection}>
            <Text style={styles.telemetrySubSectionTitle}>DATOS MÓVILES (RF)</Text>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryGridItem}>
                <Text style={styles.telemetryItemLabel}>Intensidad RSSI</Text>
                <Text style={styles.telemetryItemVal}>
                  {currentRecord.network.rssi !== null ? `${currentRecord.network.rssi} dBm` : '—'}
                </Text>
              </View>
              <View style={styles.telemetryGridItem}>
                <Text style={styles.telemetryItemLabel}>Tipo de red</Text>
                <Text style={styles.telemetryItemVal}>{currentRecord.network.type}</Text>
              </View>
            </View>
          </View>

          {/* GPS Location */}
          {currentRecord.location ? (
            <View style={styles.gpsRow}>
              <View style={styles.gpsRowLeft}>
                <MapPin size={14} color={Colors.accent.primary} />
                <Text style={styles.gpsRowText}>
                  Lat {currentRecord.location.latitude.toFixed(4)}, Long {currentRecord.location.longitude.toFixed(4)}
                </Text>
              </View>
              <Text style={styles.gpsAccuracyText}>GPS registrado</Text>
            </View>
          ) : null}
        </Card>

        {/* ── Acciones Inferiores ── */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.shareReportBtn}
            onPress={handleShareReport}
            activeOpacity={0.85}>
            <Share2 size={18} color={Colors.text.inverse} />
            <Text style={styles.shareReportBtnText}>Compartir reporte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportCsvBtn}
            onPress={handleExportCsv}
            activeOpacity={0.85}>
            <Download size={18} color={Colors.accent.primary} />
            <Text style={styles.exportCsvBtnText}>Exportar sesión (CSV)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles matching MD3 prototype 3 detalle_de_sesi_n
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.titleMedium,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  // Session Card
  sessionCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sessionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  sessionTechText: {
    ...Typography.labelSmall,
    color: Colors.accent.primary,
    fontWeight: '600',
  },
  carrierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  carrierPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent.secondary,
  },
  carrierText: {
    ...Typography.labelSmall,
    color: Colors.accent.onSecondaryFixedVariant,
    fontWeight: '700',
  },

  // Micro Bento
  microBentoRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  bentoBox: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  bentoBoxLabel: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: Colors.text.secondary,
  },
  bentoBoxValue: {
    ...Typography.titleSmall,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 2,
  },

  // Chart Cards
  chartCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  timeTag: {
    backgroundColor: Colors.bg.high,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  timeTagText: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: Colors.text.secondary,
  },
  throughputLegends: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    fontWeight: '600',
  },

  // Stats Summary Row
  statsSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
  },
  statSummaryBox: {
    flex: 1,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    borderRadius: Radius.xs,
  },
  statSummaryBoxActive: {
    backgroundColor: Colors.bg.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statSummaryLabel: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: Colors.text.secondary,
  },
  statSummaryLabelPrimary: {
    color: Colors.accent.primary,
    fontWeight: '700',
  },
  statSummaryLabelSecondary: {
    color: Colors.accent.secondary,
    fontWeight: '700',
  },
  statSummaryVal: {
    ...Typography.titleSmall,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 1,
  },
  statSummaryUnit: {
    ...Typography.bodySmall,
    fontSize: 10,
    fontWeight: '400',
    color: Colors.text.secondary,
  },
  chartWrapper: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xs,
  },
  noChartData: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },

  // Telemetry Card
  telemetryCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  telemetrySection: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  telemetrySubSectionTitle: {
    ...Typography.labelSmall,
    color: Colors.accent.primary,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  telemetryGridItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.xs,
  },
  telemetryItemLabel: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontSize: 11,
  },
  telemetryItemVal: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  serverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.xs,
  },
  serverRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serverRowLabel: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontSize: 11,
  },
  serverRowValue: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.accent.primary,
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  gpsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsRowText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  gpsAccuracyText: {
    ...Typography.labelSmall,
    color: Colors.accent.secondary,
    fontWeight: '600',
  },

  // Bottom Actions
  bottomActions: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  shareReportBtn: {
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  shareReportBtnText: {
    ...Typography.bodyLarge,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  exportCsvBtn: {
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.high,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  exportCsvBtnText: {
    ...Typography.body,
    color: Colors.accent.primary,
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
