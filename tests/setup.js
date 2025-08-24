import { vi } from 'vitest';

// Mock de window.location para tests
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'https:',
    hostname: 'localhost',
    host: 'localhost:3000'
  },
  writable: true
});

// Mock de window.isSecureContext
Object.defineProperty(window, 'isSecureContext', {
  value: true,
  writable: true
});

// Mock de navigator para tests
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Environment)'
  },
  writable: true
});

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Limpiar mocks antes de cada test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});