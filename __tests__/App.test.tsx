/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/navigation/AppNavigator', () => () => null);
jest.mock('../src/services/persistence/PersistenceService', () => ({
  PersistenceService: { loadIntoStore: jest.fn(async () => undefined) },
}));
jest.mock('../src/services/background/BackgroundService', () => ({
  BackgroundService: { configure: jest.fn(async () => undefined) },
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
