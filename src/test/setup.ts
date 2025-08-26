import '@testing-library/jest-dom';
import { beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock requestAnimationFrame
(globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0);
};

(globalThis as any).cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock performance.now
if (!(globalThis as any).performance) {
  (globalThis as any).performance = {
    now: () => Date.now(),
  };
}