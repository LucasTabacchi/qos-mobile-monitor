/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { customDirectEventTypes } from 'react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry';
import App from './App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import { BackgroundService } from './src/services/background/BackgroundService';

// Shim for react-native-maps events under Fabric (New Architecture)
if (customDirectEventTypes) {
  const mapDirectEvents = [
    'topUserLocationChange',
    'topMapLoaded',
    'topMapReady',
    'topRegionChange',
    'topRegionChangeStart',
    'topRegionChangeComplete',
    'topPoiClick',
    'topMarkerPress',
    'topMarkerSelect',
    'topMarkerDeselect',
    'topCalloutPress',
  ];

  mapDirectEvents.forEach(eventName => {
    if (!customDirectEventTypes[eventName]) {
      const registrationName = 'on' + eventName.replace(/^top/, '');
      customDirectEventTypes[eventName] = { registrationName };
    }
  });
}

BackgroundFetch.registerHeadlessTask(async event => {
  await BackgroundService.handleHeadlessEvent(event.taskId);
});

AppRegistry.registerComponent(appName, () => App);

