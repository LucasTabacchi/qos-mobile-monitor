import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Gauge,
  MapPin,
  History,
  Sliders,
} from 'lucide-react-native';
import { Colors, Typography, Radius } from '../theme';
import DashboardScreen from '../screens/DashboardScreen';
import MapScreen from '../screens/MapScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ChartsScreen from '../screens/ChartsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { RootTabParamList, HistoryStackParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();

// ---------------------------------------------------------------------------
// Tab icon renderer using Lucide Icons matching MD3 prototype
// ---------------------------------------------------------------------------

function renderTabIcon(routeName: keyof RootTabParamList, focused: boolean) {
  const iconColor = focused ? Colors.accent.onPrimaryFixedVariant : Colors.text.secondary;
  const strokeWidth = focused ? 2.5 : 2.0;
  const size = 22;

  switch (routeName) {
    case 'Dashboard':
      return <Gauge size={size} color={iconColor} strokeWidth={strokeWidth} />;
    case 'Map':
      return <MapPin size={size} color={iconColor} strokeWidth={strokeWidth} />;
    case 'History':
      return <History size={size} color={iconColor} strokeWidth={strokeWidth} />;
    case 'Settings':
      return <Sliders size={size} color={iconColor} strokeWidth={strokeWidth} />;
  }
}

// ---------------------------------------------------------------------------
// Custom tab bar label
// ---------------------------------------------------------------------------

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  Dashboard: 'Medir',
  Map: 'Mapa',
  History: 'Historial',
  Settings: 'Ajustes',
};

function TabLabel({ routeName, focused }: { routeName: keyof RootTabParamList; focused: boolean }) {
  const label = TAB_LABELS[routeName] ?? routeName;
  return (
    <Text
      style={[
        styles.tabLabel,
        focused ? styles.tabLabelFocused : styles.tabLabelBlurred,
      ]}>
      {label}
    </Text>
  );
}

function TabBarBackground() {
  return <View style={styles.tabBarBackground} />;
}

function HistoryNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryList" component={HistoryScreen} />
      <HistoryStack.Screen name="Charts" component={ChartsScreen} />
    </HistoryStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// AppNavigator: four primary destinations with MD3 active pill indicators
// ---------------------------------------------------------------------------

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.accent.primary,
          tabBarInactiveTintColor: Colors.text.secondary,
          tabBarItemStyle: styles.tabItem,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && styles.tabIconWrapperFocused,
              ]}>
              {renderTabIcon(route.name, focused)}
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel routeName={route.name} focused={focused} />
          ),
          tabBarBackground: TabBarBackground,
        })}>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="History" component={HistoryNavigator} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg.high,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 84 : 72,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarBackground: {
    flex: 1,
    backgroundColor: Colors.bg.high,
  },
  tabItem: {
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapper: {
    width: 64,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapperFocused: {
    backgroundColor: Colors.accent.primaryFixed,
  },
  tabLabel: {
    ...Typography.labelSmall,
    fontSize: 12,
    letterSpacing: 0.3,
    marginTop: 3,
  },
  tabLabelFocused: {
    color: Colors.accent.primary,
    fontWeight: '700',
  },
  tabLabelBlurred: {
    color: Colors.text.secondary,
    fontWeight: '500',
  },
});
