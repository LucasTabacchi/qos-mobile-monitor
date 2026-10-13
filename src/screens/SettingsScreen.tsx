import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Server,
  Clock,
  PlusCircle,
  Trash2,
  Sliders,
  Globe,
  Smartphone,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { Card } from '../components/common';
import { BackgroundService } from '../services/background/BackgroundService';
import { useSettingsStore } from '../store';

// ---------------------------------------------------------------------------
// SettingsScreen matching MD3 prototype 3 ajustes
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { settings, updateSettings, addPingHost, removePingHost } = useSettingsStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [newHostLabel, setNewHostLabel] = useState('');
  const [newHostAddress, setNewHostAddress] = useState('');
  const [newHostPort, setNewHostPort] = useState('443');

  const handleAddHost = () => {
    if (!newHostLabel.trim() || !newHostAddress.trim()) {
      Alert.alert('Campos incompletos', 'Por favor ingresá un nombre y la dirección del host.');
      return;
    }
    const port = parseInt(newHostPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      Alert.alert('Puerto inválido', 'El puerto debe estar entre 1 y 65535.');
      return;
    }
    addPingHost({
      id: String(Date.now()),
      label: newHostLabel.trim(),
      host: newHostAddress.trim(),
      port,
    });
    setNewHostLabel('');
    setNewHostAddress('');
    setNewHostPort('443');
    setModalVisible(false);
  };

  const handleIntervalChange = (delta: number) => {
    const minutes = Math.max(5, settings.backgroundIntervalMinutes + delta);
    updateSettings({ backgroundIntervalMinutes: minutes });
    BackgroundService.updateInterval(minutes).catch(error =>
      console.warn('[Settings] Error al actualizar intervalo:', error),
    );
  };

  const handleRttThresholdChange = (delta: number) => {
    const threshold = Math.max(50, settings.alertRttThresholdMs + delta);
    updateSettings({ alertRttThresholdMs: threshold });
  };

  const handleThroughputThresholdChange = (delta: number) => {
    const threshold = Math.max(1, settings.alertThroughputThresholdMbps + delta);
    updateSettings({ alertThroughputThresholdMbps: threshold });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.eyebrow}>CONFIGURACIÓN TÉCNICA</Text>
            <Text style={styles.title}>Ajustes de Monitoreo</Text>
          </View>
          <View style={styles.headerIconBox}>
            <Sliders size={20} color={Colors.accent.onPrimaryFixedVariant} />
          </View>
        </View>
        <Text style={styles.subtitle}>
          Personalizá cómo y cuándo tu celu mide el rendimiento de red.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── SECCIÓN: Hosts de ping ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Server size={18} color={Colors.accent.primary} />
              <Text style={styles.sectionTitle}>Hosts de ping</Text>
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{settings.pingHosts.length} activos</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>
            Servidores utilizados para medir RTT y sondas TCP reales.
          </Text>

          <View style={styles.hostsList}>
            {settings.pingHosts.map(host => (
              <View key={host.id} style={styles.hostCard}>
                <View style={styles.hostCardLeft}>
                  <View style={styles.hostIconBox}>
                    <Globe size={18} color={Colors.accent.primary} />
                  </View>
                  <View style={styles.hostInfo}>
                    <View style={styles.hostNameRow}>
                      <Text style={styles.hostAddress}>{host.host}:{host.port}</Text>
                    </View>
                    <Text style={styles.hostLabel}>{host.label}</Text>
                  </View>
                </View>
                {settings.pingHosts.length > 3 ? (
                  <TouchableOpacity
                    onPress={() => removePingHost(host.id)}
                    style={styles.hostDeleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar host ${host.label}`}>
                    <Trash2 size={16} color={Colors.error.main} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

            {/* Botón Agregar Host */}
            <TouchableOpacity
              style={styles.addHostBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}>
              <PlusCircle size={18} color={Colors.accent.onPrimaryFixedVariant} />
              <Text style={styles.addHostBtnText}>Agregar nuevo host</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECCIÓN: Segundo plano ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Clock size={18} color={Colors.accent.primary} />
              <Text style={styles.sectionTitle}>Segundo plano</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>
            Controlá las pruebas silenciosas para detectar cortes o microcaídas.
          </Text>

          <Card style={styles.cardSettings}>
            {/* Frecuencia de test */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>Frecuencia de muestreo</Text>
                <Text style={styles.settingSub}>Impacto mínimo estimado de batería (&lt; 2%/día)</Text>
              </View>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleIntervalChange(-5)}>
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperVal}>{settings.backgroundIntervalMinutes} min</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleIntervalChange(5)}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Umbral Latencia */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>
                  Alerta de latencia crítica
                </Text>
                <Text style={styles.settingSub}>Notificación si el RTT supera el umbral</Text>
              </View>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRttThresholdChange(-25)}>
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperVal}>{settings.alertRttThresholdMs} ms</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRttThresholdChange(25)}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Umbral Descarga */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>
                  Alerta de throughput mínimo
                </Text>
                <Text style={styles.settingSub}>Aviso si el enlace cae por debajo del umbral</Text>
              </View>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleThroughputThresholdChange(-1)}>
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperVal}>{settings.alertThroughputThresholdMbps} Mbps</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleThroughputThresholdChange(1)}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>

        {/* ── SECCIÓN: Servidor de Throughput ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Server size={18} color={Colors.accent.primary} />
              <Text style={styles.sectionTitle}>Servidor de prueba</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>
            Dirección del backend de referencia para las pruebas de throughput.
          </Text>

          <Card style={styles.cardSettings}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL del backend (Node.js/Express)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="http://192.168.x.x:3000"
                placeholderTextColor={Colors.text.tertiary}
                value={settings.throughputServerUrl}
                onChangeText={url => updateSettings({ throughputServerUrl: url })}
                autoCapitalize="none"
              />
              <Text style={styles.inputHint}>
                {settings.throughputServerUrl.includes('10.0.2.2')
                  ? '🟢 Emulador detectado — URL configurada automáticamente'
                  : settings.throughputServerUrl
                    ? '🟢 URL configurada manualmente'
                    : '⚠️ Ingresá la IP local de tu PC (ej: 192.168.1.x:3000)'}
              </Text>
            </View>
          </Card>
        </View>


        {/* ── Tarjeta Informativa de Optimización ── */}
        <View style={styles.optimizationCard}>
          <View style={styles.optimizationIconBox}>
            <Smartphone size={20} color={Colors.text.inverse} />
          </View>
          <View style={styles.optimizationCopy}>
            <Text style={styles.optimizationTitle}>Optimización para redes móviles</Text>
            <Text style={styles.optimizationDesc}>
              Las pruebas automáticas se ejecutan respetando el plan de datos y batería de tu dispositivo.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Modal Agregar Host ── */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo Host de Ping</Text>
            <Text style={styles.modalDesc}>
              Ingresá el dominio o IP con su puerto respectivo (ej: 1.1.1.1:443).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Etiqueta / Nombre</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Cloudflare DNS"
                placeholderTextColor={Colors.text.tertiary}
                value={newHostLabel}
                onChangeText={setNewHostLabel}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dirección del host</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1.1.1.1 o ping.ejemplo.ar"
                placeholderTextColor={Colors.text.tertiary}
                value={newHostAddress}
                onChangeText={setNewHostAddress}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Puerto TCP</Text>
              <TextInput
                style={styles.textInput}
                placeholder="443"
                placeholderTextColor={Colors.text.tertiary}
                value={newHostPort}
                onChangeText={setNewHostPort}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddHost}>
                <Text style={styles.modalSaveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles matching MD3 prototype 3 ajustes
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
    alignItems: 'center',
  },
  eyebrow: {
    ...Typography.labelSmall,
    color: Colors.accent.primary,
    letterSpacing: 0.8,
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
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },

  // Sections
  section: {
    gap: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  badgePill: {
    backgroundColor: Colors.accent.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgePillText: {
    ...Typography.labelSmall,
    color: Colors.accent.onSecondaryFixedVariant,
    fontWeight: '700',
  },
  sectionDesc: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },

  // Hosts list
  hostsList: {
    gap: Spacing.sm,
  },
  hostCard: {
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
  hostCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  hostIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostInfo: {
    flex: 1,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostAddress: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  hostLabel: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  hostDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHostBtn: {
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent.primaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  addHostBtnText: {
    ...Typography.titleSmall,
    color: Colors.accent.onPrimaryFixedVariant,
    fontWeight: '700',
  },

  // Card Settings
  cardSettings: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingLabel: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  settingSub: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.bg.secondary,
    marginVertical: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent.primary,
  },
  stepperVal: {
    ...Typography.labelMedium,
    color: Colors.accent.primary,
    fontWeight: '700',
    minWidth: 54,
    textAlign: 'center',
  },
  statusPillActive: {
    backgroundColor: Colors.accent.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusPillActiveText: {
    ...Typography.labelSmall,
    color: Colors.accent.onSecondaryFixedVariant,
    fontWeight: '700',
  },

  // Optimization Card
  optimizationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accent.dim,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent.primaryFixed,
  },
  optimizationIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizationCopy: {
    flex: 1,
  },
  optimizationTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  optimizationDesc: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    ...Typography.titleLarge,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  modalDesc: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    ...Typography.labelMedium,
    color: Colors.text.secondary,
  },
  textInput: {
    height: 46,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    color: Colors.text.primary,
    ...Typography.body,
  },
  inputHint: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  modalCancelBtnText: {
    ...Typography.labelLarge,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: Colors.accent.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  modalSaveBtnText: {
    ...Typography.labelLarge,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
});
