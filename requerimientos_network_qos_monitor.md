# 01 Network QoS Monitor — Requerimientos

**Licenciatura en Sistemas de Información — Desarrollo de Aplicaciones Móviles 2026**
**Tecnología:** React Native | **Nivel:** Medio-Avanzado
**Área temática:** Redes de Datos, Telecomunicaciones y Telecomunicaciones Satelitales

> Analizador y visualizador de calidad de red móvil en tiempo real con mapeo de cobertura personal.

---

## 1. Requerimientos funcionales

| ID | Requerimiento | Prioridad |
|----|-----------|-----------|
| RF-01 | Detectar y mostrar el tipo de red activa y el operador (cuando esté disponible) | Alta |
| RF-02 | Medir RTT (ping) contra al menos 3 hosts configurables, mostrando min/avg/max/jitter | Alta |
| RF-03 | Ejecutar un test de descarga y subida y calcular throughput en Mbps | Alta |
| RF-04 | Registrar cada medición con timestamp y coordenadas GPS | Alta |
| RF-05 | Visualizar el historial en un mapa con heatmap de intensidad de señal/calidad | Alta |
| RF-06 | Graficar series temporales de latencia y throughput por sesión | Media |
| RF-07 | Ejecutar mediciones periódicas en background y notificar degradaciones severas | Media |
| RF-08 | Exportar el historial de mediciones a CSV/JSON | Baja |
| RF-09 | Filtrar el historial por tipo de red, rango de fechas y zona geográfica | Baja |

---

## 2. Requerimientos técnicos y stack sugerido

### 2.1 Frontend / aplicación móvil

- **React Native (CLI, no Expo Go puro)** — se requieren módulos nativos custom.
- **`@react-native-community/netinfo`** — detección de tipo de conexión y estado.
- **`react-native-tcp-socket`** — sondas de latencia RTT reales sobre TCP.
- **Módulo nativo propio (Kotlin/Swift)** para acceder a `TelephonyManager` (Android) / `CoreTelephony` (iOS) y exponer RSSI, tipo de red celular y operador vía Native Modules / TurboModules.
- **`react-native-background-fetch`** o **Headless JS** (Android) — muestreo periódico en segundo plano.
- **`react-native-maps`** — visualización de heatmap (Heatmap overlay) y marcadores de medición.
- **`victory-native`** o **`react-native-svg-charts`** — series temporales de latencia/throughput.
- **WatermelonDB** o **SQLite** (`react-native-sqlite-storage`) — persistencia local performante.
- **`@notifee/react-native`** — notificaciones locales ante degradación de calidad.

### 2.2 Backend de referencia (requerido para el test de throughput)

- Servicio mínimo (Node.js/Express o Fastify) con endpoints de **descarga de payload de tamaño fijo** y de **subida (echo)**, desplegable en un contenedor simple.
- Medición de tiempo transcurrido en cliente para calcular Mbps, con corrección por tamaño de payload.

---

## 3. Arquitectura propuesta

Arquitectura en capas que separe la adquisición de datos nativos, el motor de medición, la persistencia y la presentación:

| Capa | Responsabilidad | Tecnología |
|------|-----------------|------------|
| Native Bridge | Exponer RSSI, tipo de red celular, operador | Kotlin / Swift + TurboModules |
| Measurement Engine | Orquestar pings, throughput test y muestreo periódico | TypeScript, sockets, background tasks |
| Persistence Layer | Guardar mediciones, exponer queries por fecha/zona | WatermelonDB / SQLite |
| Geo Layer | Obtener y cachear ubicación, calcular heatmap | react-native-geolocation-service |
| Presentation Layer | Mapa, gráficos, listado histórico | react-native-maps, victory-native |
| Sync/Export (opcional) | Backend propio para test de throughput y exportación remota | Node.js / Express |

**Punto de diseño central:** evitar bloquear el hilo de JavaScript durante las mediciones. Los sockets y timers de las sondas deben correr en un contexto que no degrade la UI, y los resultados deben comunicarse a la capa de presentación mediante un store reactivo (Zustand, Redux Toolkit o Context + `useReducer`).

---

## 4. Entregables

- [ ] Código fuente completo en repositorio Git con historial de commits significativo.
- [ ] APK/IPA de prueba o build accesible vía Expo Dev Client / TestFlight interno.
- [ ] Documento técnico (README extendido) con arquitectura, decisiones de diseño y limitaciones conocidas.
- [ ] Backend de referencia para el test de throughput, con instrucciones de despliegue.

---

## 6. Recursos sugeridos

- Documentación oficial de React Native — Native Modules / TurboModules.
- Android: `android.telephony.TelephonyManager` — Android Developers.
- iOS: CoreTelephony framework — Apple Developer Documentation.
- RFC 2544 — Benchmarking Methodology for Network Interconnect Devices.
- Documentación de OpenCelliD y Mozilla Location Service (validación cruzada de cobertura).
