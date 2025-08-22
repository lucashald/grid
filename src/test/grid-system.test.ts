// src/test/grid-system.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GridRenderer } from '../grid/GridRenderer';
import { GridState } from '../grid/GridState';
import { DEFAULT_GRID_CONFIG, ObjectType, ZLayer } from '../types';

// Mock DOM element for testing
const createMockContainer = () => {
  const container = document.createElement('div');
  container.id = 'test-grid-canvas';
  document.body.appendChild(container);
  return container;
};

describe('Grid System', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = createMockContainer();
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('GridRenderer', () => {
    let gridRenderer: GridRenderer;
    let mockStage: any;

    beforeEach(() => {
      // Create a more detailed mock stage
      mockStage = {
        add: vi.fn(),
        width: vi.fn(() => 960),
        height: vi.fn(() => 720),
        destroy: vi.fn()
      };

      gridRenderer = new GridRenderer(mockStage, DEFAULT_GRID_CONFIG);
    });

    afterEach(() => {
      if (gridRenderer) {
        gridRenderer.destroy();
      }
    });

    describe('Coordinate Conversion', () => {
      it('should convert pixel coordinates to grid coordinates', () => {
        const pixelPos = { x: 96, y: 144 }; // 2 tiles right, 3 tiles down
        const gridPos = gridRenderer.pixelToGrid(pixelPos);
        
        expect(gridPos.x).toBe(2);
        expect(gridPos.y).toBe(3);
      });

      it('should convert grid coordinates to pixel coordinates', () => {
        const gridPos = { x: 3, y: 2 };
        const pixelPos = gridRenderer.gridToPixel(gridPos);
        
        expect(pixelPos.x).toBe(144); // 3 * 48
        expect(pixelPos.y).toBe(96);  // 2 * 48
      });

      it('should convert grid coordinates to centered pixel coordinates', () => {
        const gridPos = { x: 1, y: 1 };
        const pixelPos = gridRenderer.gridToPixelCenter(gridPos);
        
        expect(pixelPos.x).toBe(72); // 1 * 48 + 24
        expect(pixelPos.y).toBe(72); // 1 * 48 + 24
      });

      it('should snap pixel coordinates to grid', () => {
        const unalignedPixel = { x: 75, y: 130 }; // Between grid lines
        const snappedPixel = gridRenderer.snapToGrid(unalignedPixel);
        
        expect(snappedPixel.x).toBe(48); // Snapped to tile 1
        expect(snappedPixel.y).toBe(96); // Snapped to tile 2
      });
    });

    describe('Validation', () => {
      it('should validate grid positions', () => {
        expect(gridRenderer.isValidGridPosition({ x: 0, y: 0 })).toBe(true);
        expect(gridRenderer.isValidGridPosition({ x: 19, y: 14 })).toBe(true); // Max valid position
        expect(gridRenderer.isValidGridPosition({ x: -1, y: 0 })).toBe(false);
        expect(gridRenderer.isValidGridPosition({ x: 20, y: 0 })).toBe(false);
        expect(gridRenderer.isValidGridPosition({ x: 0, y: 15 })).toBe(false);
      });

      it('should validate grid areas', () => {
        expect(gridRenderer.isValidGridArea({ x: 0, y: 0 }, 1, 1)).toBe(true);
        expect(gridRenderer.isValidGridArea({ x: 18, y: 13 }, 2, 2)).toBe(true); // 2x2 at edge
        expect(gridRenderer.isValidGridArea({ x: 19, y: 14 }, 2, 2)).toBe(false); // Would exceed bounds
      });
    });

    describe('Utility Functions', () => {
      it('should get occupied positions for an area', () => {
        const positions = gridRenderer.getOccupiedPositions({ x: 2, y: 3 }, 2, 2);
        
        expect(positions).toHaveLength(4);
        expect(positions).toContainEqual({ x: 2, y: 3 });
        expect(positions).toContainEqual({ x: 3, y: 3 });
        expect(positions).toContainEqual({ x: 2, y: 4 });
        expect(positions).toContainEqual({ x: 3, y: 4 });
      });

      it('should calculate grid distance', () => {
        const distance = gridRenderer.getGridDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
        expect(distance).toBe(5); // 3-4-5 triangle
      });

      it('should get positions in radius', () => {
        const positions = gridRenderer.getPositionsInRadius({ x: 5, y: 5 }, 1);
        
        // Should include center and adjacent tiles (9 total in 3x3 grid)
        expect(positions.length).toBeGreaterThanOrEqual(5); // At least center + 4 adjacent
        expect(positions).toContainEqual({ x: 5, y: 5 }); // Center
        expect(positions).toContainEqual({ x: 4, y: 5 }); // Left
        expect(positions).toContainEqual({ x: 6, y: 5 }); // Right
      });
    });

    describe('Configuration', () => {
      it('should update configuration', () => {
        const newConfig = { tileSize: 32, gridColor: '#ff0000' };
        gridRenderer.updateConfig(newConfig);
        
        const config = gridRenderer.getConfig();
        expect(config.tileSize).toBe(32);
        expect(config.gridColor).toBe('#ff0000');
        expect(config.width).toBe(DEFAULT_GRID_CONFIG.width); // Unchanged
      });

      it('should calculate canvas dimensions', () => {
        expect(gridRenderer.getCanvasWidth()).toBe(960); // 20 * 48
        expect(gridRenderer.getCanvasHeight()).toBe(720); // 15 * 48
      });
    });
  });

  describe('GridState', () => {
    let gridState: GridState;

    beforeEach(() => {
      gridState = new GridState(20, 15); // Same dimensions as default config
    });

    afterEach(() => {
      if (gridState) {
        gridState.destroy();
      }
    });

    describe('Basic Placement', () => {
      it('should place objects successfully', () => {
        const success = gridState.placeObject(
          'test-obj-1',
          { x: 5, y: 5 },
          { width: 1, height: 1 },
          ZLayer.CHARACTERS,
          'character'
        );
        
        expect(success).toBe(true);
        expect(gridState.isTileOccupied({ x: 5, y: 5 })).toBe(true);
      });

      it('should place multi-tile objects', () => {
        const success = gridState.placeObject(
          'big-obj',
          { x: 2, y: 3 },
          { width: 2, height: 2 },
          ZLayer.VEHICLES,
          'vehicle'
        );
        
        expect(success).toBe(true);
        expect(gridState.isTileOccupied({ x: 2, y: 3 })).toBe(true);
        expect(gridState.isTileOccupied({ x: 3, y: 3 })).toBe(true);
        expect(gridState.isTileOccupied({ x: 2, y: 4 })).toBe(true);
        expect(gridState.isTileOccupied({ x: 3, y: 4 })).toBe(true);
      });

      it('should reject out-of-bounds placement', () => {
        const success = gridState.placeObject(
          'invalid-obj',
          { x: 19, y: 14 },
          { width: 2, height: 2 }, // Would exceed 20x15 grid
          ZLayer.PROPS,
          'prop'
        );
        
        expect(success).toBe(false);
      });
    });

    describe('Collision Detection', () => {
      beforeEach(() => {
        // Place a character at (5,5)
        gridState.placeObject('char1', { x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.CHARACTERS, 'character');
      });

      it('should prevent character-character collisions', () => {
        const success = gridState.placeObject(
          'char2',
          { x: 5, y: 5 }, // Same position
          { width: 1, height: 1 },
          ZLayer.CHARACTERS,
          'character'
        );
        
        expect(success).toBe(false);
      });

      it('should allow effects over characters', () => {
        const success = gridState.placeObject(
          'spell1',
          { x: 5, y: 5 }, // Same position as character
          { width: 1, height: 1 },
          ZLayer.EFFECTS,
          'effect'
        );
        
        expect(success).toBe(true);
        
        // Both should be present
        const objects = gridState.getAllObjectsAtPosition({ x: 5, y: 5 });
        expect(objects).toHaveLength(2);
      });

      it('should prevent vehicle-vehicle collisions', () => {
        gridState.placeObject('vehicle1', { x: 2, y: 2 }, { width: 2, height: 2 }, ZLayer.VEHICLES, 'vehicle');
        
        const success = gridState.placeObject(
          'vehicle2',
          { x: 3, y: 3 }, // Overlaps with vehicle1
          { width: 2, height: 2 },
          ZLayer.VEHICLES,
          'vehicle'
        );
        
        expect(success).toBe(false);
      });

      it('should prevent props on vehicles collision', () => {
        gridState.placeObject('vehicle1', { x: 2, y: 2 }, { width: 2, height: 2 }, ZLayer.VEHICLES, 'vehicle');
        
        const success = gridState.placeObject(
          'prop1',
          { x: 2, y: 2 }, // Same position as vehicle
          { width: 1, height: 1 },
          ZLayer.PROPS,
          'prop'
        );
        
        expect(success).toBe(false);
      });
    });

    describe('Object Management', () => {
      beforeEach(() => {
        gridState.placeObject('obj1', { x: 3, y: 4 }, { width: 1, height: 1 }, ZLayer.CHARACTERS, 'character');
        gridState.placeObject('obj2', { x: 7, y: 8 }, { width: 2, height: 2 }, ZLayer.VEHICLES, 'vehicle');
      });

      it('should remove objects', () => {
        expect(gridState.isTileOccupied({ x: 3, y: 4 })).toBe(true);
        
        const success = gridState.removeObject('obj1');
        expect(success).toBe(true);
        expect(gridState.isTileOccupied({ x: 3, y: 4 })).toBe(false);
      });

      it('should move objects', () => {
        expect(gridState.isTileOccupied({ x: 3, y: 4 })).toBe(true);
        expect(gridState.isTileOccupied({ x: 10, y: 10 })).toBe(false);
        
        const success = gridState.moveObject('obj1', { x: 10, y: 10 });
        expect(success).toBe(true);
        
        expect(gridState.isTileOccupied({ x: 3, y: 4 })).toBe(false);
        expect(gridState.isTileOccupied({ x: 10, y: 10 })).toBe(true);
      });

      it('should get object at position', () => {
        const obj = gridState.getObjectAtPosition({ x: 3, y: 4 });
        expect(obj).toBeTruthy();
        expect(obj?.objectId).toBe('obj1');
        expect(obj?.zIndex).toBe(ZLayer.CHARACTERS);
      });

      it('should get object position', () => {
        const position = gridState.getObjectPosition('obj2');
        expect(position).toEqual({ x: 7, y: 8 });
      });

      it('should get objects in area', () => {
        const objects = gridState.getObjectsInArea({ x: 0, y: 0 }, { x: 10, y: 10 });
        expect(objects).toHaveLength(2);
        
        const objectIds = objects.map(obj => obj.objectId);
        expect(objectIds).toContain('obj1');
        expect(objectIds).toContain('obj2');
      });
    });

    describe('Z-Layer Management', () => {
      it('should handle multiple objects at same position with different z-layers', () => {
        // Place terrain
        gridState.placeObject('terrain1', { x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.TERRAIN, 'terrain');
        
        // Place effect over terrain (should work)
        const effectSuccess = gridState.placeObject('effect1', { x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.EFFECTS, 'effect');
        expect(effectSuccess).toBe(true);
        
        // Try to place character on terrain (should fail)
        const charSuccess = gridState.placeObject('char1', { x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.CHARACTERS, 'character');
        expect(charSuccess).toBe(false);
      });

      it('should return highest z-index object when multiple present', () => {
        gridState.placeObject('terrain1', { x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.TERRAIN, 'terrain');
        gridState.placeObject('effect1', { x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.EFFECTS, 'effect');
        
        const topObject = gridState.getObjectAtPosition({ x: 5, y: 5 });
        expect(topObject?.objectId).toBe('effect1'); // Higher z-index
        expect(topObject?.zIndex).toBe(ZLayer.EFFECTS);
      });
    });

    describe('Grid Statistics', () => {
      it('should provide accurate statistics', () => {
        gridState.placeObject('obj1', { x: 0, y: 0 }, { width: 1, height: 1 }, ZLayer.CHARACTERS, 'character');
        gridState.placeObject('obj2', { x: 5, y: 5 }, { width: 2, height: 2 }, ZLayer.VEHICLES, 'vehicle');
        
        const stats = gridState.getStats();
        expect(stats.totalObjects).toBe(2);
        expect(stats.occupiedTiles).toBe(5); // 1 + 4 tiles
        expect(stats.gridSize).toEqual({ width: 20, height: 15 });
      });

      it('should clear all objects', () => {
        gridState.placeObject('obj1', { x: 0, y: 0 }, { width: 1, height: 1 }, ZLayer.CHARACTERS, 'character');
        gridState.placeObject('obj2', { x: 5, y: 5 }, { width: 2, height: 2 }, ZLayer.VEHICLES, 'vehicle');
        
        gridState.clearAll();
        
        const stats = gridState.getStats();
        expect(stats.totalObjects).toBe(0);
        expect(stats.occupiedTiles).toBe(0);
      });
    });

    describe('Grid Resizing', () => {
      it('should update dimensions and remove out-of-bounds objects', () => {
        // Place object near edge
        gridState.placeObject('edge-obj', { x: 18, y: 13 }, { width: 2, height: 2 }, ZLayer.PROPS, 'prop');
        
        // Shrink grid
        gridState.updateDimensions(15, 10);
        
        // Object should be removed as it's now out of bounds
        expect(gridState.getObjectPosition('edge-obj')).toBeNull();
      });
    });

    describe('Validation', () => {
      it('should validate positions and areas', () => {
        expect(gridState.isValidPosition({ x: 0, y: 0 })).toBe(true);
        expect(gridState.isValidPosition({ x: 19, y: 14 })).toBe(true);
        expect(gridState.isValidPosition({ x: 20, y: 15 })).toBe(false);
        
        expect(gridState.isValidArea({ x: 18, y: 13 }, { width: 2, height: 2 })).toBe(true);
        expect(gridState.isValidArea({ x: 19, y: 14 }, { width: 2, height: 2 })).toBe(false);
      });

      it('should check placement validity', () => {
        // Place a character
        gridState.placeObject('char1', { x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.CHARACTERS, 'character');
        
        // Check if another character can be placed at same position
        expect(gridState.canPlaceObject({ x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.CHARACTERS)).toBe(false);
        
        // Check if effect can be placed at same position
        expect(gridState.canPlaceObject({ x: 5, y: 5 }, { width: 1, height: 1 }, ZLayer.EFFECTS)).toBe(true);
      });
    });
  });

  describe('Integration', () => {
    let gridRenderer: GridRenderer;
    let gridState: GridState;
    let mockStage: any;

    beforeEach(() => {
      mockStage = {
        add: vi.fn(),
        width: vi.fn(() => 960),
        height: vi.fn(() => 720),
        destroy: vi.fn()
      };

      gridRenderer = new GridRenderer(mockStage, DEFAULT_GRID_CONFIG);
      gridState = new GridState(DEFAULT_GRID_CONFIG.width, DEFAULT_GRID_CONFIG.height);
    });

    afterEach(() => {
      gridRenderer?.destroy();
      gridState?.destroy();
    });

    it('should work together for coordinate conversion and placement', () => {
      // Convert pixel click to grid position
      const clickPixel = { x: 240, y: 192 }; // 5 tiles right, 4 tiles down
      const gridPos = gridRenderer.pixelToGrid(clickPixel);
      
      expect(gridPos).toEqual({ x: 5, y: 4 });
      
      // Check if we can place an object there
      const canPlace = gridState.canPlaceObject(gridPos, { width: 1, height: 1 }, ZLayer.CHARACTERS);
      expect(canPlace).toBe(true);
      
      // Place the object
      const placed = gridState.placeObject('click-obj', gridPos, { width: 1, height: 1 }, ZLayer.CHARACTERS, 'character');
      expect(placed).toBe(true);
      
      // Convert back to pixel for rendering
      const renderPixel = gridRenderer.gridToPixel(gridPos);
      expect(renderPixel).toEqual({ x: 240, y: 192 });
    });

    it('should validate areas consistently', () => {
      const position = { x: 18, y: 13 };
      const size = { width: 2, height: 2 };
      
      // Both should agree on validity
      const rendererValid = gridRenderer.isValidGridArea(position, size.width, size.height);
      const stateValid = gridState.isValidArea(position, size);
      
      expect(rendererValid).toBe(stateValid);
      expect(rendererValid).toBe(true); // This should fit in 20x15 grid
    });
  });
});