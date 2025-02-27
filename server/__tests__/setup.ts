import { storage } from '../storage';

// Mock storage methods
jest.mock('../storage', () => ({
  storage: {
    getUserByUsername: jest.fn(),
    getUser: jest.fn(),
    createUser: jest.fn(),
    sessionStore: {
      get: jest.fn(),
      set: jest.fn(),
      destroy: jest.fn()
    }
  }
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Ensure environment variables are set for testing
process.env.SESSION_SECRET = 'test_session_secret_that_is_at_least_32_chars_long';
process.env.NODE_ENV = 'test';
