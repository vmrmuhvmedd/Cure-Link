// Jest setup file for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.JWT_COOKIE_EXPIRES_IN = '7';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock mongoose connection
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    on: jest.fn(),
    once: jest.fn(),
  },
  model: jest.fn(),
  Schema: jest.fn(),
}));

// Mock logger utility
jest.mock('./utilities/logger.util', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
