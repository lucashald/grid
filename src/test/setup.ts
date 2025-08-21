import { vi } from 'vitest';
import 'jsdom-global/register';

// Mock Konva for testing
vi.mock('konva', () => ({
  Stage: vi.fn(() => ({
    add: vi.fn(),
    on: vi.fn(),
    getContainer: vi.fn()
  })),
  Layer: vi.fn(() => ({
    add: vi.fn(),
    draw: vi.fn()
  })),
  Image: vi.fn(() => ({
    setAttrs: vi.fn(),
    on: vi.fn()
  })),
  Group: vi.fn(() => ({
    add: vi.fn(),
    draggable: vi.fn()
  }))
}));

// Mock file reading for uploads
global.FileReader = class {
  readAsDataURL = vi.fn();
  onload = vi.fn();
} as any;