// src/test/setup.ts
import { vi } from 'vitest';

// Mock Konva completely to avoid canvas dependency
vi.mock('konva', () => {
  const mockStage = {
    add: vi.fn(),
    on: vi.fn(),
    width: vi.fn(() => 960),
    height: vi.fn(() => 720),
    getPointerPosition: vi.fn(() => ({ x: 100, y: 100 })),
    destroy: vi.fn(),
  };

  const mockLayer = {
    add: vi.fn(),
    draw: vi.fn(),
    destroyChildren: vi.fn(),
  };

  const mockRect = {
    x: vi.fn(() => 50),
    y: vi.fn(() => 50),
    on: vi.fn(),
    zIndex: vi.fn(),
  };

  const mockLine = {
    // Line doesn't need methods for our tests
  };

  return {
    default: {
      Stage: vi.fn(() => mockStage),
      Layer: vi.fn(() => mockLayer),
      Rect: vi.fn(() => mockRect),
      Line: vi.fn(() => mockLine),
    },
    Stage: vi.fn(() => mockStage),
    Layer: vi.fn(() => mockLayer),
    Rect: vi.fn(() => mockRect),
    Line: vi.fn(() => mockLine),
  };
});

// Mock file reading for uploads
global.FileReader = class {
  readAsDataURL = vi.fn();
  onload = vi.fn();
} as any;

// Mock requestAnimationFrame  
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();