# Network QoS Monitor

Aplicación React Native que mide y registra la calidad de la red móvil: latencia, throughput, RSSI/señal, tipo de red, y geolocalización de mediciones.

## Features (RFs implementados)

| RF | Descripción | Estado |
|----|-------------|--------|
| RF-01 | Detección de tipo de red (5G/LTE/3G/2G/Wi-Fi), RSSI, operador | ✅ |
| RF-02 | Ping TCP (RTT min/avg/max/jitter/packet-loss) | ✅ |
| RF-03 | Throughput (download Mbps + upload Mbps) | ✅ |
| RF-04 | Geolocalización de cada medición | ✅ |
| RF-05 | Mapa de cobertura con heatmap | ✅ |
| RF-06 | Gráficas temporales (RTT, throughput, QoS score) por sesión | ✅ |
| RF-07 | Medición periódica en background y alertas | ✅* |
| RF-08 | Exportación CSV / JSON como archivos compartibles | ✅ |
| RF-09 | Historial/mapa con filtros por tipo de red, fecha y área | ✅ |

## Stack

- **React Native 0.87** (CLI — no Expo, por requerimiento de módulos nativos)
- **UI:** React Native Paper (Material 3) + tipografía Inter
- **Estado:** Zustand
- **Navegación:** React Navigation bottom tabs
- **Gráficas:** react-native-gifted-charts
- **Mapas:** react-native-maps (Heatmap + Markers)
- **Sockets:** react-native-tcp-socket (ping TCP)
- **GPS:** react-native-geolocation-service
- **Background:** react-native-background-fetch
- **Notificaciones:** @notifee/react-native
- **SQLite:** react-native-sqlite-storage
- **Bottom sheet:** @gorhom/bottom-sheet
- **Backend:** Node.js / Express (servidor de throughput)

## Estructura del proyecto

```
├── src/
│   ├── components/common/     # QualityChip, MetricCard, NetworkTypeBadge, SectionHeader
│   ├── navigation/            # AppNavigator (5 tabs)
│   ├── screens/               # Dashboard, Map, History, Charts, Settings
│   ├── services/
│   │   ├── background/        # BackgroundService (react-native-background-fetch + notifee)
│   │   ├── geo/               # GeoService (GPS + permission handling)
│   │   ├── measurement/       # MeasurementEngine, PingProbe, ThroughputProbe
│   │   ├── network/           # useNetworkInfo hook
│   │   └── persistence/       # PersistenceService (SQLite + CSV/JSON export)
│   ├── store/                 # Zustand stores (Network, Measurement, History, Settings)
│   ├── theme/                 # Design system (colores, tipografía, espaciado)
│   └── types/                 # TypeScript interfaces globales
├── android/
│   └── app/src/main/java/com/networkqosmonitor/modules/
│       ├── CellularInfoModule.kt   # Native module: TelephonyManager → RSSI/tipo/operador
│       └── CellularInfoPackage.kt  # ReactPackage registration
├── ios/NetworkQoSMonitor/
│   ├── CellularInfoModule.swift    # Native module: CoreTelephony → tipo/operador
│   └── CellularInfoModule.m        # ObjC bridge header
└── backend/
    ├── server.js       # Express throughput server (download/upload endpoints)
    ├── package.json
    └── Dockerfile
```

## Configuración

### Android — permisos ya declarados en AndroidManifest.xml

```xml
INTERNET, ACCESS_NETWORK_STATE, READ_PHONE_STATE,
ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_BACKGROUND_LOCATION,
RECEIVE_BOOT_COMPLETED, FOREGROUND_SERVICE, POST_NOTIFICATIONS
```

### iOS — permisos declarados en Info.plist

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Network QoS Monitor uses your location to geotag measurements.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Network QoS Monitor needs background location for periodic monitoring.</string>
```

## Backend de throughput (RF-03)

### Desarrollo local

```bash
cd backend
npm install
npm start
# → Escucha en http://0.0.0.0:3000
```

### Docker

```bash
cd backend
docker build -t qos-backend .
docker run -p 3000:3000 qos-backend
```

### Endpoints

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/download?bytes=10000000` | Descarga N bytes de payload |
| `POST` | `/upload` | Recibe payload y reporta bytes recibidos |

Configurar la URL del servidor en la pantalla **Settings**. El valor inicial es `http://localhost:3000`; en el emulador Android debe cambiarse a `http://10.0.2.2:3000`, y en un dispositivo físico a la IP LAN de la computadora.

## Correr la app

```bash
# 1. Instalar deps
npm install

# 2. Android
npx react-native run-android

# 3. iOS (requiere Mac)
cd ios && pod install
npx react-native run-ios
```

## Módulo nativo — CellularInfoModule

El módulo nativo expone el método `getCellularInfo()` que devuelve:

```ts
{
  rssi: number | null;     // dBm (Android only, requiere ACCESS_FINE_LOCATION)
  operator: string | null; // Nombre del operador (Claro, Personal, Movistar...)
  cellType: string | null; // "5G" | "LTE" | "3G" | "2G"
}
```

> **iOS:** RSSI retorna `null`. Apple no expone señal dBm por API pública. El tipo de red y el operador sí funcionan vía CoreTelephony.

## Score QoS

El score 0–100 es un compuesto ponderado:

| Componente | Peso | Escala |
|------------|------|--------|
| Latencia media (RTT) | 40% | 0ms → 100, 500ms → 0 |
| Throughput descarga | 40% | 100Mbps → 100, 0 → 0 |
| RSSI score | 20% | -50dBm → 100, -110dBm → 0 |

## Background measurements

El servicio usa `react-native-background-fetch` configurado con el intervalo definido en Settings (default 15 min), registra el handler Headless JS Android y reprograma la tarea al cambiar el intervalo. Cuando la medición supera los umbrales configurados, se dispara una notificación local via `@notifee/react-native`.

> *Las plataformas pueden aplazar o agrupar tareas de background por políticas de batería/OS; se debe validar en dispositivo real con los permisos de ubicación y notificaciones aceptados.

## Exportación

Desde la pantalla **History** → botón **Export**:
- **CSV:** una fila por medición con todos los campos
- **JSON:** array de `MeasurementRecord[]` completo

Cada exportación se escribe primero en el directorio de documentos de la app y luego se abre el selector nativo para guardar o compartir el archivo.

## Validación y entregables físicos

Ejecutar `npm test`, `npm run lint` y `npx tsc --noEmit`. El repositorio contiene código y configuración reproducible; la generación/firma de APK o IPA y el video demo exigido por la entrega requieren una máquina/dispositivo físico y no se sustituyen por pruebas estáticas.
