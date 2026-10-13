module.exports = {
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ type: 'unknown', isConnected: false, details: null })),
};
