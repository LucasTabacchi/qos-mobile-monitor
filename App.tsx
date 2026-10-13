import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { paperTheme } from './src/theme';
import { useNetworkInfo } from './src/services/network/useNetworkInfo';
import { PersistenceService } from './src/services/persistence/PersistenceService';
import { BackgroundService } from './src/services/background/BackgroundService';

// ---------------------------------------------------------------------------
// AppBootstrap — initializes services before rendering nav
// ---------------------------------------------------------------------------

function AppBootstrap() {
  // RF-01: subscribe to network info changes + poll native RSSI
  useNetworkInfo();

  useEffect(() => {
    // Edge-to-edge is configured via gradle.properties (edgeToEdgeEnabled=true)
    // so no need for imperative setBackgroundColor / setTranslucent calls.
    StatusBar.setBarStyle('dark-content');

    // RF-08/09: load persisted measurements into Zustand store
    PersistenceService.loadIntoStore().catch(e =>
      console.warn('[App] Failed to load history:', e),
    );

    // RF-07: configure background measurement task
    BackgroundService.configure().catch(e =>
      console.warn('[App] BackgroundService config failed:', e),
    );
  }, []);

  return <AppNavigator />;
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme as any}>
          <AppBootstrap />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

