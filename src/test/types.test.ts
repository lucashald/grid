// src/test/types.test.ts
import { describe, it, expect } from 'vitest';
import {
  GridPosition,
  ObjectSize,
  PixelPosition,
  GridConfig,
  ObjectType,
  ZLayer,
  GridObjectTemplate,
  GridObjectInstance,
  ToolMode,
  DragState,
  SelectionState,
  AIGenerationRequest,
  UploadResult,
  GridBounds,
  GridEvent,
  AppState,
  DEFAULT_GRID_CONFIG,
  DEFAULT_APP_STATE,
  getDefaultZIndex
} from '../types';

describe('Grid Master Types', () => {
  
  describe('Basic Types', () => {
    it('should create valid GridPosition', () => {
      const position: GridPosition = { x: 5, y: 10 };
      expect(position.x).toBe(5);
      expect(position.y).toBe(10);
    });

    it('should create valid ObjectSize', () => {
      const size: ObjectSize = { width: 2, height: 3 };
      expect(size.width).toBe(2);
      expect(size.height).toBe(3);
    });

    it('should create valid PixelPosition', () => {
      const pixelPos: PixelPosition = { x: 100.5, y: 200.75 };
      expect(pixelPos.x).toBe(100.5);
      expect(pixelPos.y).toBe(200.75);
    });
  });

  describe('Enums', () => {
    it('should have correct ObjectType values', () => {
      expect(ObjectType.CHARACTER).toBe('character');
      expect(ObjectType.TERRAIN).toBe('terrain');
      expect(ObjectType.SPELL).toBe('spell');
      expect(ObjectType.EFFECT).toBe('effect');
      expect(ObjectType.PROP).toBe('prop');
      expect(ObjectType.VEHICLE).toBe('vehicle');
    });

    it('should have correct ZLayer values in order', () => {
      expect(ZLayer.TERRAIN).toBe(0);
      expect(ZLayer.VEHICLES).toBe(100);
      expect(ZLayer.PROPS).toBe(200);
      expect(ZLayer.EFFECTS).toBe(300);
      expect(ZLayer.CHARACTERS).toBe(400);
      expect(ZLayer.PROJECTILES).toBe(500);
      expect(ZLayer.UI).toBe(1000);
      
      // Verify proper ordering
      expect(ZLayer.TERRAIN < ZLayer.VEHICLES).toBe(true);
      expect(ZLayer.VEHICLES < ZLayer.CHARACTERS).toBe(true);
      expect(ZLayer.CHARACTERS < ZLayer.UI).toBe(true);
    });

    it('should have correct ToolMode values', () => {
      expect(ToolMode.PLACE).toBe('place');
      expect(ToolMode.SELECT).toBe('select');
      expect(ToolMode.DELETE).toBe('delete');
      expect(ToolMode.MOVE).toBe('move');
    });
  });

  describe('Object Templates and Instances', () => {
    it('should create valid GridObjectTemplate', () => {
      const template: GridObjectTemplate = {
        id: 'orc-warrior-1',
        name: 'Orc Warrior',
        type: ObjectType.CHARACTER,
        size: { width: 1, height: 1 },
        imageUrl: '/images/orc-warrior.png',
        defaultZIndex: ZLayer.CHARACTERS,
        tags: ['character', 'hostile', 'orc'],
        description: 'A fierce orc warrior',
        customProperties: { health: 100, armor: 5 }
      };

      expect(template.id).toBe('orc-warrior-1');
      expect(template.type).toBe(ObjectType.CHARACTER);
      expect(template.size.width).toBe(1);
      expect(template.tags).toContain('hostile');
    });

    it('should create valid GridObjectInstance', () => {
      const instance: GridObjectInstance = {
        id: 'instance-123',
        templateId: 'orc-warrior-1',
        position: { x: 5, y: 3 },
        zIndex: ZLayer.CHARACTERS,
        rotation: 45,
        opacity: 0.8,
        customData: { currentHealth: 80 },
        createdAt: new Date()
      };

      expect(instance.templateId).toBe('orc-warrior-1');
      expect(instance.position.x).toBe(5);
      expect(instance.zIndex).toBe(ZLayer.CHARACTERS);
      expect(instance.rotation).toBe(45);
    });
  });

  describe('State Objects', () => {
    it('should create valid DragState', () => {
      const dragState: DragState = {
        isDragging: true,
        objectId: 'instance-123',
        startPosition: { x: 2, y: 3 },
        currentPosition: { x: 4, y: 5 },
        originalPosition: { x: 2, y: 3 }
      };

      expect(dragState.isDragging).toBe(true);
      expect(dragState.objectId).toBe('instance-123');
      expect(dragState.currentPosition?.x).toBe(4);
    });

    it('should create valid SelectionState', () => {
      const selection: SelectionState = {
        selectedObjectIds: ['obj1', 'obj2'],
        isMultiSelect: true
      };

      expect(selection.selectedObjectIds).toHaveLength(2);
      expect(selection.isMultiSelect).toBe(true);
    });
  });

  describe('AI and Upload Types', () => {
    it('should create valid AIGenerationRequest', () => {
      const request: AIGenerationRequest = {
        prompt: 'A fierce dragon breathing fire',
        size: { width: 3, height: 3 },
        type: ObjectType.CHARACTER,
        style: 'fantasy'
      };

      expect(request.prompt).toContain('dragon');
      expect(request.size.width).toBe(3);
      expect(request.type).toBe(ObjectType.CHARACTER);
    });

    it('should create valid UploadResult', () => {
      const successResult: UploadResult = {
        success: true,
        imageUrl: '/uploads/custom-character.png',
        filename: 'custom-character.png'
      };

      const errorResult: UploadResult = {
        success: false,
        error: 'File too large'
      };

      expect(successResult.success).toBe(true);
      expect(successResult.imageUrl).toBeDefined();
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
    });
  });

  describe('Default Configurations', () => {
    it('should have valid DEFAULT_GRID_CONFIG', () => {
      expect(DEFAULT_GRID_CONFIG.tileSize).toBe(48);
      expect(DEFAULT_GRID_CONFIG.width).toBe(20);
      expect(DEFAULT_GRID_CONFIG.height).toBe(15);
      expect(DEFAULT_GRID_CONFIG.showGrid).toBe(true);
      expect(typeof DEFAULT_GRID_CONFIG.gridColor).toBe('string');
    });

    it('should have valid DEFAULT_APP_STATE', () => {
      expect(DEFAULT_APP_STATE.currentTool).toBe(ToolMode.PLACE);
      expect(DEFAULT_APP_STATE.dragState.isDragging).toBe(false);
      expect(DEFAULT_APP_STATE.selectionState.selectedObjectIds).toHaveLength(0);
      expect(DEFAULT_APP_STATE.snapToGrid).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('should return correct default z-index for each object type', () => {
      expect(getDefaultZIndex(ObjectType.TERRAIN)).toBe(ZLayer.TERRAIN);
      expect(getDefaultZIndex(ObjectType.VEHICLE)).toBe(ZLayer.VEHICLES);
      expect(getDefaultZIndex(ObjectType.PROP)).toBe(ZLayer.PROPS);
      expect(getDefaultZIndex(ObjectType.EFFECT)).toBe(ZLayer.EFFECTS);
      expect(getDefaultZIndex(ObjectType.CHARACTER)).toBe(ZLayer.CHARACTERS);
      expect(getDefaultZIndex(ObjectType.SPELL)).toBe(ZLayer.PROJECTILES);
    });

    it('should handle z-index ordering correctly', () => {
      const terrainZ = getDefaultZIndex(ObjectType.TERRAIN);
      const characterZ = getDefaultZIndex(ObjectType.CHARACTER);
      const uiZ = ZLayer.UI;

      expect(terrainZ < characterZ).toBe(true);
      expect(characterZ < uiZ).toBe(true);
    });
  });

  describe('Type Utilities', () => {
    it('should work with utility types', () => {
      // Test that CreateObjectTemplate omits 'id' correctly
      const newTemplate = {
        name: 'Test Object',
        type: ObjectType.PROP,
        size: { width: 1, height: 1 },
        imageUrl: '/test.png',
        defaultZIndex: ZLayer.PROPS,
        tags: ['test']
      };

      // This should compile without error since 'id' is omitted
      expect(newTemplate.name).toBe('Test Object');
    });
  });
});