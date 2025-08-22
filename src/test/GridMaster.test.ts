// src/test/GridMaster.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GridMaster } from '../GridMaster';
import { ToolMode } from '../types';

// Mock DOM element
const createMockContainer = () => {
  const container = document.createElement('div');
  container.id = 'test-canvas';
  document.body.appendChild(container);
  return container;
};

describe('GridMaster', () => {
  let gridMaster: GridMaster;
  let container: HTMLElement;

  beforeEach(() => {
    container = createMockContainer();
  });

  afterEach(() => {
    if (gridMaster) {
      gridMaster.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      gridMaster = new GridMaster('test-canvas');
      
      const config = gridMaster.getGridConfig();
      const state = gridMaster.getAppState();
      
      expect(config.tileSize).toBe(48);
      expect(config.width).toBe(20);
      expect(config.height).toBe(15);
      expect(state.currentTool).toBe(ToolMode.PLACE);
      expect(state.showGrid).toBe(true);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        tileSize: 32,
        width: 25,
        height: 20,
        gridColor: '#ff0000'
      };
      
      gridMaster = new GridMaster('test-canvas', customConfig);
      const config = gridMaster.getGridConfig();
      
      expect(config.tileSize).toBe(32);
      expect(config.width).toBe(25);
      expect(config.height).toBe(20);
      expect(config.gridColor).toBe('#ff0000');
    });

    it('should throw error for invalid container', () => {
      expect(() => {
        new GridMaster('non-existent-container');
      }).toThrow('Container element with id "non-existent-container" not found');
    });
  });

  describe('Coordinate Conversion', () => {
    beforeEach(() => {
      gridMaster = new GridMaster('test-canvas');
    });

    it('should convert pixel coordinates to grid coordinates', () => {
      const pixelPos = { x: 96, y: 144 }; // 2 tiles right, 3 tiles down
      const gridPos = gridMaster.pixelToGrid(pixelPos);
      
      expect(gridPos.x).toBe(2);
      expect(gridPos.y).toBe(3);
    });

    it('should convert grid coordinates to pixel coordinates', () => {
      const gridPos = { x: 3, y: 2 };
      const pixelPos = gridMaster.gridToPixel(gridPos);
      
      expect(pixelPos.x).toBe(144); // 3 * 48
      expect(pixelPos.y).toBe(96);  // 2 * 48
    });

    it('should snap pixel coordinates to grid', () => {
      const unalignedPixel = { x: 75, y: 130 }; // Between grid lines
      const snappedPixel = gridMaster.snapToGrid(unalignedPixel);
      
      expect(snappedPixel.x).toBe(48); // Snapped to tile 1
      expect(snappedPixel.y).toBe(96); // Snapped to tile 2
    });

    it('should handle edge coordinates correctly', () => {
      const edgePixel = { x: 0, y: 0 };
      const gridPos = gridMaster.pixelToGrid(edgePixel);
      
      expect(gridPos.x).toBe(0);
      expect(gridPos.y).toBe(0);
    });

    it('should handle coordinate conversion with custom tile size', () => {
      gridMaster.destroy();
      gridMaster = new GridMaster('test-canvas', { tileSize: 32 });
      
      const pixelPos = { x: 64, y: 96 };
      const gridPos = gridMaster.pixelToGrid(pixelPos);
      
      expect(gridPos.x).toBe(2);
      expect(gridPos.y).toBe(3);
    });
  });

  describe('Tool Management', () => {
    beforeEach(() => {
      gridMaster = new GridMaster('test-canvas');
    });

    it('should start with PLACE tool by default', () => {
      const state = gridMaster.getAppState();
      expect(state.currentTool).toBe(ToolMode.PLACE);
    });

    it('should change tools correctly', () => {
      gridMaster.setTool(ToolMode.SELECT);
      expect(gridMaster.getAppState().currentTool).toBe(ToolMode.SELECT);
      
      gridMaster.setTool(ToolMode.DELETE);
      expect(gridMaster.getAppState().currentTool).toBe(ToolMode.DELETE);
      
      gridMaster.setTool(ToolMode.MOVE);
      expect(gridMaster.getAppState().currentTool).toBe(ToolMode.MOVE);
    });
  });

  describe('Grid Visibility', () => {
    beforeEach(() => {
      gridMaster = new GridMaster('test-canvas');
    });

    it('should show grid by default', () => {
      const state = gridMaster.getAppState();
      expect(state.showGrid).toBe(true);
    });

    it('should toggle grid visibility', () => {
      gridMaster.toggleGrid();
      expect(gridMaster.getAppState().showGrid).toBe(false);
      
      gridMaster.toggleGrid();
      expect(gridMaster.getAppState().showGrid).toBe(true);
    });
  });

  describe('Object Management', () => {
    beforeEach(() => {
      gridMaster = new GridMaster('test-canvas');
    });

    it('should clear all objects', () => {
      // Test objects are added automatically in constructor
      gridMaster.clearAll();
      
      // After clearing, canvas should be clean
      // We can't easily test the visual state, but the method should not throw
      expect(() => gridMaster.clearAll()).not.toThrow();
    });
  });

  describe('State Immutability', () => {
    beforeEach(() => {
      gridMaster = new GridMaster('test-canvas');
    });

    it('should return copies of state objects', () => {
      const state1 = gridMaster.getAppState();
      const state2 = gridMaster.getAppState();
      
      // Should be equal but not same reference
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it('should return copies of config objects', () => {
      const config1 = gridMaster.getGridConfig();
      const config2 = gridMaster.getGridConfig();
      
      // Should be equal but not same reference
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });

    it('should not allow external mutation of returned state', () => {
      const state = gridMaster.getAppState();
      const originalTool = state.currentTool;
      
      // Mutating returned state should not affect internal state
      state.currentTool = ToolMode.DELETE;
      
      const newState = gridMaster.getAppState();
      expect(newState.currentTool).toBe(originalTool);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing container gracefully', () => {
      expect(() => {
        new GridMaster('missing-container');
      }).toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should destroy cleanly', () => {
      gridMaster = new GridMaster('test-canvas');
      
      expect(() => {
        gridMaster.destroy();
      }).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      gridMaster = new GridMaster('test-canvas');
      
      gridMaster.destroy();
      expect(() => {
        gridMaster.destroy();
      }).not.toThrow();
    });
  });
});