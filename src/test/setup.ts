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
    destroy: vi.fn(),
  };

  const mockRect = {
    x: vi.fn(() => 50),
    y: vi.fn(() => 50),
    on: vi.fn(),
    zIndex: vi.fn(),
    stroke: vi.fn(),
    strokeWidth: vi.fn(),
  };

  const mockGroup = {
    x: vi.fn(() => 100),
    y: vi.fn(() => 100),
    add: vi.fn(),
    on: vi.fn(),
    draggable: vi.fn(),
    zIndex: vi.fn(),
    destroy: vi.fn(),
    getClientRect: vi.fn(() => ({ x: 100, y: 100, width: 50, height: 50 })),
    find: vi.fn(() => [mockRect]),
    attrs: {}
  };

  const mockText = {
    x: vi.fn(),
    y: vi.fn(),
    text: vi.fn(),
    fontSize: vi.fn(),
    fontFamily: vi.fn(),
    fill: vi.fn(),
    listening: vi.fn(),
  };

  const mockLine = {
    // Line doesn't need methods for our tests
  };

  return {
    default: {
      Stage: vi.fn(() => mockStage),
      Layer: vi.fn(() => mockLayer),
      Rect: vi.fn(() => mockRect),
      Group: vi.fn(() => mockGroup),
      Text: vi.fn(() => mockText),
      Line: vi.fn(() => mockLine),
    },
    Stage: vi.fn(() => mockStage),
    Layer: vi.fn(() => mockLayer),
    Rect: vi.fn(() => mockRect),
    Group: vi.fn(() => mockGroup),
    Text: vi.fn(() => mockText),
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