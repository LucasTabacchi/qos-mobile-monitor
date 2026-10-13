import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  Activity,
  Radio,
  Timer,
  ArrowDownToLine,
  ArrowUpToLine,
  Percent,
  Server,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from 'lucide-react-native';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  QualityColors,
  scoreToQuality,
} from '../theme';
import {
  Card,
  MetricCard,
  QualityChip,
  Button,
} from '../components/common';
import { useNetworkStore, useMeasurementStore, useSettingsStore } from '../store';
import { MeasurementEngine } from '../services/measurement/MeasurementEngine';

// ---------------------------------------------------------------------------
// Dashboard Screen (Material 3 Light Aesthetic from Prototype 3)
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const { networkInfo } = useNetworkStore();
  const { state: measureState, lastRecord } = useMeasurementStore();
  const { settings } = useSettingsStore();

  const isMeasuring =
    measureState.status !== 'idle' &&
    measureState.status !== 'error';

  const isConnected =
    networkInfo.isConnected &&
    networkInfo.type !== 'UNKNOWN' &&
    networkInfo.type !== 'NONE';

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const handleMeasureNow = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    MeasurementEngine.runFullMeasurement();
  }, []);

  const ping = lastRecord?.ping?.[0] ?? null;
  const throughput = lastRecord?.throughput ?? null;
  const qosScore = lastRecord?.qosScore ?? null;
  const rssi = networkInfo.rssi;
  const rssiScore = networkInfo.rssiScore;

  // Signal level (1-5 bars)
  const signalBars = rssiScore !== null
    ? Math.max(1, Math.min(5, Math.ceil(rssiScore / 20)))
    : null;

  useEffect(() => {
    if (isMeasuring) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMeasuring]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── App Top Header ── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderTitleRow}>
          <Text style={styles.appName}>Network QoS Monitor</Text>
          <View style={[styles.statusChip, isConnected ? styles.statusChipConnected : styles.statusChipOffline]}>
            <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotOffline]} />
            <Text style={[styles.statusChipText, isConnected ? styles.statusChipTextConnected : styles.statusChipTextOffline]}>
              {isConnected ? 'Conectado' : 'Sin conexión'}
            </Text>
          </View>
        </View>
        <Text style={styles.screenLabel}>Medir</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Status & Carrier Header Pills ── */}
        <View style={styles.pillsRow}>
          <View style={styles.carrierPill}>
            <Radio size={15} color={Colors.accent.primary} strokeWidth={2.5} />
            <Text style={styles.carrierPillTech}>{networkInfo.type}</Text>
            <View style={styles.pillDot} />
            <Text style={styles.carrierPillOperator} numberOfLines={1}>
              {networkInfo.operator ?? 'Móvil genérico'}
            </Text>
          </View>

          <View style={styles.serverPill}>
            <View style={styles.serverDot} />
            <Text style={styles.serverPillText} numberOfLines={1}>
              {settings.throughputServerUrl ? 'Servidor activo' : 'Servidor local'}
            </Text>
          </View>
        </View>

        {/* ── Measurement in progress view (when active) ── */}
        {isMeasuring ? (
          <Card style={styles.activeMeasureCard}>
            <View style={styles.activeMeasureHeader}>
              <View style={styles.activePulseRow}>
                <View
                  style={[
                    styles.activePulseDot,
                    measureState.status === 'done' && { backgroundColor: Colors.accent.secondary },
                  ]}
                />
                <Text
                  style={[
                    styles.activeMeasurePhase,
                    measureState.status === 'done' && { color: Colors.accent.secondary },
                  ]}>
                  {measureState.status === 'pinging'
                    ? `Sondeando ${measureState.currentHost ?? 'hosts'}...`
                    : measureState.status === 'downloading'
                    ? 'Descarga en curso (Throughput)'
                    : measureState.status === 'uploading'
                    ? 'Subida en curso (Throughput)'
                    : measureState.status === 'done'
                    ? '¡Diagnóstico completado!'
                    : 'Midiendo calidad de enlace...'}
                </Text>
              </View>
              <Text
                style={[
                  styles.activeMeasureProgress,
                  measureState.status === 'done' && { color: Colors.accent.secondary },
                ]}>
                {measureState.progress}%
              </Text>
            </View>

            {/* Circular Gauge / Speed Value */}
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeCenter}>
                <Text style={styles.gaugeSpeedLabel}>
                  {measureState.status === 'downloading'
                    ? 'BAJADA EN VIVO'
                    : measureState.status === 'uploading'
                    ? 'SUBIDA EN VIVO'
                    : measureState.status === 'done'
                    ? 'CALIDAD ESTIMADA'
                    : 'PROCESANDO'}
                </Text>
                <Text style={styles.gaugeSpeedValue}>
                  {measureState.status === 'done' && qosScore !== null
                    ? Math.round(qosScore)
                    : measureState.progress}
                </Text>
                <Text
                  style={[
                    styles.gaugeSpeedUnit,
                    measureState.status === 'done' && { color: Colors.accent.secondary },
                  ]}>
                  {measureState.status === 'done' ? 'PUNTOS MOS' : '%'}
                </Text>
              </View>
            </View>

            {/* Progress track */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${measureState.progress}%` },
                  measureState.status === 'done' && { backgroundColor: Colors.accent.secondary },
                ]}
              />
            </View>

            {/* Phase steps */}
            <View style={styles.phasesList}>
              <View style={styles.phaseItem}>
                <View style={styles.phaseItemLeft}>
                  <CheckCircle2
                    size={16}
                    color={
                      measureState.status !== 'idle' && measureState.status !== 'pinging'
                        ? Colors.accent.secondary
                        : measureState.status === 'pinging'
                        ? Colors.accent.primary
                        : Colors.border.default
                    }
                  />
                  <Text style={styles.phaseText}>Latencia RTT (3 hosts)</Text>
                </View>
                <Text
                  style={[
                    styles.phaseStatusBadge,
                    measureState.status === 'pinging' && styles.phaseStatusActive,
                    measureState.status !== 'idle' && measureState.status !== 'pinging' && styles.phaseStatusDone,
                  ]}>
                  {measureState.status === 'pinging'
                    ? 'Midiendo...'
                    : measureState.status !== 'idle'
                    ? 'Listo'
                    : 'Pendiente'}
                </Text>
              </View>

              <View style={styles.phaseItem}>
                <View style={styles.phaseItemLeft}>
                  <CheckCircle2
                    size={16}
                    color={
                      measureState.status === 'uploading' || measureState.status === 'done'
                        ? Colors.accent.secondary
                        : measureState.status === 'downloading'
                        ? Colors.accent.primary
                        : Colors.border.default
                    }
                  />
                  <Text style={styles.phaseText}>Throughput Descarga</Text>
                </View>
                <Text
                  style={[
                    styles.phaseStatusBadge,
                    measureState.status === 'downloading' && styles.phaseStatusActive,
                    (measureState.status === 'uploading' || measureState.status === 'done') && styles.phaseStatusDone,
                  ]}>
                  {measureState.status === 'downloading'
                    ? 'Descargando...'
                    : (measureState.status === 'uploading' || measureState.status === 'done')
                    ? 'Listo'
                    : 'Pendiente'}
                </Text>
              </View>

              <View style={styles.phaseItem}>
                <View style={styles.phaseItemLeft}>
                  <CheckCircle2
                    size={16}
                    color={
                      measureState.status === 'done'
                        ? Colors.accent.secondary
                        : measureState.status === 'uploading'
                        ? Colors.accent.primary
                        : Colors.border.default
                    }
                  />
                  <Text style={styles.phaseText}>Throughput Subida</Text>
                </View>
                <Text
                  style={[
                    styles.phaseStatusBadge,
                    measureState.status === 'uploading' && styles.phaseStatusActive,
                    measureState.status === 'done' && styles.phaseStatusDone,
                  ]}>
                  {measureState.status === 'uploading'
                    ? 'Subiendo...'
                    : measureState.status === 'done'
                    ? 'Listo'
                    : 'Pendiente'}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* ── Radio & Signal Card (MD3 Elevated Card) ── */}
        <Card style={styles.signalCard}>
          <View style={styles.signalCardHeader}>
            <View style={styles.signalHeaderLeft}>
              <View style={styles.signalIconBox}>
                {networkInfo.type === 'WIFI' ? (
                  <Wifi size={20} color={Colors.accent.onSecondaryFixedVariant} strokeWidth={2.5} />
                ) : (
                  <Radio size={20} color={Colors.accent.onSecondaryFixedVariant} strokeWidth={2.5} />
                )}
              </View>
              <View>
                <Text style={styles.signalSubLabel}>
                  {networkInfo.type === 'WIFI' ? 'RED INALÁMBRICA' : 'INTENSIDAD RSRP'}
                </Text>
                <Text style={styles.signalMainTitle}>
                  {networkInfo.type === 'WIFI' ? 'Conexión Wi-Fi' : 'Conexión Celular'}
                </Text>
              </View>
            </View>

            {rssi !== null ? (
              <View style={styles.signalQualityPill}>
                <CheckCircle2 size={13} color={Colors.accent.onSecondaryContainer} />
                <Text style={styles.signalQualityText}>
                  {rssiScore !== null && rssiScore >= 60 ? 'Señal buena' : 'Señal regular'}
                </Text>
              </View>
            ) : (
              <View style={styles.signalRestrictedPill}>
                <AlertCircle size={13} color={Colors.text.tertiary} />
                <Text style={styles.signalRestrictedText}>No disponible</Text>
              </View>
            )}
          </View>

          <View style={styles.signalValueRow}>
            <View style={styles.signalDbmGroup}>
              <Text style={styles.signalDbmNumber}>
                {rssi !== null ? rssi : '—'}
              </Text>
              <Text style={styles.signalDbmUnit}>dBm</Text>
            </View>

            {/* 5-bar signal strength indicator */}
            <View style={styles.signalBarsContainer}>
              {[1, 2, 3, 4, 5].map(barIndex => {
                const isActive = signalBars !== null && barIndex <= signalBars;
                const barHeight = 8 + barIndex * 6;
                return (
                  <View
                    key={barIndex}
                    style={[
                      styles.signalBar,
                      { height: barHeight },
                      isActive ? styles.signalBarActive : styles.signalBarInactive,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Tech specs footer inside card */}
          <View style={styles.signalFooter}>
            <Text style={styles.signalFooterItem}>
              Tecnología: <Text style={styles.signalFooterHighlight}>{networkInfo.type}</Text>
            </Text>
            <Text style={styles.signalFooterItem}>
              Operador: <Text style={styles.signalFooterHighlight}>{networkInfo.operator ?? 'Estándar'}</Text>
            </Text>
          </View>
        </Card>

        {/* ── 2-Column Bento Grid of QoS Metrics ── */}
        <View style={styles.bentoGrid}>
          {/* 1. Latencia promedio */}
          <MetricCard
            label="Latencia prom."
            value={ping?.avg !== undefined && ping.avg !== null ? String(Math.round(ping.avg)) : null}
            unit="ms"
            icon={<Timer size={16} color={Colors.accent.primary} />}
            badgeLabel={ping?.avg ? (ping.avg < 50 ? 'Óptimo' : ping.avg < 120 ? 'Normal' : 'Alto') : undefined}
            style={styles.bentoItem}
          />

          {/* 2. Jitter */}
          <MetricCard
            label="Jitter (variación)"
            value={ping?.jitter !== undefined && ping.jitter !== null ? String(Math.round(ping.jitter)) : null}
            unit="ms"
            icon={<Activity size={16} color={Colors.accent.primary} />}
            badgeLabel={ping?.jitter ? (ping.jitter < 10 ? 'Bajo' : 'Medio') : undefined}
            style={styles.bentoItem}
          />

          {/* 3. Descarga */}
          <MetricCard
            label="Descarga"
            value={throughput?.downloadMbps ? throughput.downloadMbps.toFixed(1) : null}
            unit="Mbps"
            icon={<ArrowDownToLine size={16} color={Colors.accent.secondary} />}
            badgeLabel={throughput?.downloadMbps ? (throughput.downloadMbps >= 25 ? 'Veloz' : 'Estable') : undefined}
            style={styles.bentoItem}
          />

          {/* 4. Subida */}
          <MetricCard
            label="Subida"
            value={throughput?.uploadMbps ? throughput.uploadMbps.toFixed(1) : null}
            unit="Mbps"
            icon={<ArrowUpToLine size={16} color={Colors.accent.secondary} />}
            badgeLabel={throughput?.uploadMbps ? 'Estable' : undefined}
            style={styles.bentoItem}
          />

          {/* 5. Pérdida de paquetes */}
          <MetricCard
            label="Pérdida paq."
            value={ping !== null ? String(ping.packetLoss) : null}
            unit="%"
            icon={<Percent size={16} color={Colors.accent.primary} />}
            badgeLabel={ping !== null ? (ping.packetLoss === 0 ? 'Sin pérdidas' : `${ping.packetLoss}%`) : undefined}
            style={styles.bentoItem}
          />

          {/* 6. Hosts de prueba */}
          <MetricCard
            label="Hosts de prueba"
            value={lastRecord?.ping ? `${lastRecord.ping.filter(p => p.avg !== null).length}/${lastRecord.ping.length}` : `${settings.pingHosts.length}/${settings.pingHosts.length}`}
            unit="ok"
            icon={<Server size={16} color={Colors.accent.primary} />}
            badgeLabel="Configurados"
            style={styles.bentoItem}
          />
        </View>

        {/* ── Realtime RTT Summary / Benchmark Card ── */}
        <Card style={styles.benchmarkCard}>
          <View style={styles.benchmarkHeader}>
            <View style={styles.benchmarkTitleRow}>
              <Activity size={18} color={Colors.accent.primary} />
              <Text style={styles.benchmarkTitle}>Calidad Global de Sesión</Text>
            </View>
            {qosScore !== null ? (
              <QualityChip level={scoreToQuality(qosScore)} />
            ) : (
              <Text style={styles.benchmarkBadge}>Sin benchmark</Text>
            )}
          </View>

          <View style={styles.benchmarkContent}>
            {qosScore !== null ? (
              <View style={styles.benchmarkScoreRow}>
                <Text style={[styles.benchmarkScoreVal, { color: QualityColors[scoreToQuality(qosScore)] }]}>
                  {Math.round(qosScore)}
                </Text>
                <Text style={styles.benchmarkScoreMax}>/100 MOS</Text>
              </View>
            ) : (
              <Text style={styles.benchmarkEmptyText}>
                Ejecutá una medición para registrar telemetría completa y benchmark de calidad.
              </Text>
            )}

            <View style={styles.benchmarkStatsRow}>
              <Text style={styles.benchmarkStatItem}>
                mín: <Text style={styles.benchmarkStatVal}>{ping?.min ? `${Math.round(ping.min)}ms` : '—'}</Text>
              </Text>
              <Text style={styles.benchmarkStatDivider}>·</Text>
              <Text style={styles.benchmarkStatItem}>
                prom: <Text style={[styles.benchmarkStatVal, { color: Colors.accent.primary }]}>{ping?.avg ? `${Math.round(ping.avg)}ms` : '—'}</Text>
              </Text>
              <Text style={styles.benchmarkStatDivider}>·</Text>
              <Text style={styles.benchmarkStatItem}>
                máx: <Text style={styles.benchmarkStatVal}>{ping?.max ? `${Math.round(ping.max)}ms` : '—'}</Text>
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Primary MD3 Action Button ── */}
        <View style={styles.actionContainer}>
          <Button
            size="lg"
            variant={isMeasuring ? 'secondary' : 'default'}
            disabled={isMeasuring}
            onPress={handleMeasureNow}
            iconLeft={
              !isMeasuring ? (
                <Play size={20} color={Colors.text.inverse} fill={Colors.text.inverse} />
              ) : (
                <ActivityIndicator color={Colors.accent.primary} size="small" />
              )
            }
            style={styles.measureButton}>
            {measureState.status === 'done'
              ? '¡Listo!'
              : isMeasuring
              ? 'Midiendo calidad...'
              : 'Medir ahora'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles matching MD3 prototype
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  topHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg.primary,
  },
  topHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusChipConnected: {
    backgroundColor: Colors.accent.secondaryFixed,
  },
  statusChipOffline: {
    backgroundColor: Colors.bg.high,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotConnected: {
    backgroundColor: Colors.accent.secondary,
  },
  statusDotOffline: {
    backgroundColor: Colors.text.tertiary,
  },
  statusChipText: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
  statusChipTextConnected: {
    color: Colors.accent.onSecondaryFixedVariant,
  },
  statusChipTextOffline: {
    color: Colors.text.secondary,
  },
  screenLabel: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  // Pills Row
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: 2,
  },
  carrierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.high,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    flex: 1,
  },
  carrierPillTech: {
    ...Typography.labelMedium,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  pillDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.border.default,
  },
  carrierPillOperator: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    flexShrink: 1,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent.secondary,
  },
  serverPillText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  // Signal Card
  signalCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  signalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signalIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalSubLabel: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    letterSpacing: 0.8,
  },
  signalMainTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  signalQualityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  signalQualityText: {
    ...Typography.labelSmall,
    color: Colors.accent.onSecondaryContainer,
    fontWeight: '600',
  },
  signalRestrictedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bg.high,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  signalRestrictedText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  signalValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  signalDbmGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  signalDbmNumber: {
    ...Typography.display,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  signalDbmUnit: {
    ...Typography.titleMedium,
    color: Colors.text.secondary,
  },
  signalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingBottom: 6,
  },
  signalBar: {
    width: 6,
    borderRadius: 3,
  },
  signalBarActive: {
    backgroundColor: Colors.accent.secondary,
  },
  signalBarInactive: {
    backgroundColor: Colors.bg.highest,
  },
  signalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    marginTop: 4,
  },
  signalFooterItem: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  signalFooterHighlight: {
    color: Colors.text.primary,
    fontWeight: '600',
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  bentoItem: {
    width: '48.5%',
  },

  // Active Measurement Card
  activeMeasureCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.accent.primaryFixed,
  },
  activeMeasureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activePulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent.primary,
  },
  activeMeasurePhase: {
    ...Typography.titleSmall,
    color: Colors.accent.primary,
    fontWeight: '600',
  },
  activeMeasureProgress: {
    ...Typography.titleSmall,
    color: Colors.accent.primary,
    fontWeight: '700',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  gaugeCenter: {
    alignItems: 'center',
  },
  gaugeSpeedLabel: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    letterSpacing: 0.8,
  },
  gaugeSpeedValue: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  gaugeSpeedUnit: {
    ...Typography.titleMedium,
    color: Colors.accent.primary,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.bg.high,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent.primary,
    borderRadius: Radius.full,
  },
  phasesList: {
    gap: 6,
    paddingTop: Spacing.xs,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  phaseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  phaseText: {
    ...Typography.bodySmall,
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  phaseStatusBadge: {
    ...Typography.labelSmall,
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  phaseStatusActive: {
    color: Colors.accent.primary,
    fontWeight: '700',
  },
  phaseStatusDone: {
    color: Colors.accent.secondary,
    fontWeight: '700',
  },

  // Benchmark Card
  benchmarkCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  benchmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  benchmarkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benchmarkTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  benchmarkBadge: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
    backgroundColor: Colors.bg.high,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  benchmarkContent: {
    gap: 6,
  },
  benchmarkScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  benchmarkScoreVal: {
    ...Typography.display,
    fontWeight: '800',
  },
  benchmarkScoreMax: {
    ...Typography.titleMedium,
    color: Colors.text.secondary,
  },
  benchmarkEmptyText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  benchmarkStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  benchmarkStatItem: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  benchmarkStatVal: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  benchmarkStatDivider: {
    color: Colors.border.default,
  },

  // Action Button
  actionContainer: {
    marginTop: Spacing.xs,
  },
  measureButton: {
    width: '100%',
  },
});
