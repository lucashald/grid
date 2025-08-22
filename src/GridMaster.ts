// src/GridMaster.ts
// Updated to use dedicated GridRenderer and GridState classes

import Konva from 'konva';
import {
  AppState,
  GridConfig,
  GridPosition,
  PixelPosition,
  DEFAULT_APP_STATE,
  DEFAULT_GRID_CONFIG,
  ToolMode,
  GridObjectInstance,
  GridObjectTemplate,
  ObjectType,
  ZLayer,
  ObjectSize
} from './types';
import { GridRenderer } from './grid/GridRenderer';
import { GridState } from './grid/GridState';

export class GridMaster {
  private stage: Konva.Stage;
  private objectLayer: Konva.Layer;
  private uiLayer: Konva.Layer;
  
  private appState: AppState;
  private gridConfig: GridConfig;
  
  // Core grid system
  private gridRenderer: GridRenderer;
  private gridState: GridState;
  
  // Object management (will be replaced with ObjectManager in later phases)
  private objects: Map<string, GridObjectInstance> = new Map();
  private templates: Map<string, GridObjectTemplate> = new Map();
  private konvaObjects: Map<string, Konva.Group> = new Map();

  constructor(containerId: string, config?: Partial<GridConfig>) {
    console.log('🎮 GridMaster initializing...');
    
    // Initialize configuration
    this.gridConfig = { ...DEFAULT_GRID_CONFIG, ...config };
    this.appState = { ...DEFAULT_APP_STATE, gridConfig: this.gridConfig };
    
    // Get container element
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    // Initialize Konva stage
    this.stage = new Konva.Stage({
      container: container,
      width: this.gridConfig.tileSize * this.gridConfig.width,
      height: this.gridConfig.tileSize * this.gridConfig.height,
    });

    // Initialize grid system
    this.gridRenderer = new GridRenderer(this.stage, this.gridConfig);
    this.gridState = new GridState(this.gridConfig.width, this.gridConfig.height);

    // Create object and UI layers
    this.objectLayer = new Konva.Layer();
    this.uiLayer = new Konva.Layer();

    // Add layers to stage (grid layers already added by GridRenderer)
    this.stage.add(this.objectLayer);
    this.stage.add(this.uiLayer);

    // Initialize the grid
    this.gridRenderer.initialize();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Add test objects
    this.addTestObjects();

    console.log('✅ GridMaster ready');
    console.log(`Grid: ${this.gridConfig.width}x${this.gridConfig.height} tiles`);
    console.log(`Canvas: ${this.stage.width()}x${this.stage.height()} pixels`);
  }

  private setupEventHandlers(): void {
    // Canvas click handler
    this.stage.on('click', (e) => {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        const gridPos = this.gridRenderer.pixelToGrid(pos);
        console.log(`Clicked grid tile: (${gridPos.x}, ${gridPos.y})`);
        
        // Handle different tool modes
        this.handleCanvasClick(gridPos, e);
      }
    });

    // Canvas right-click handler
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
      const pos = this.stage.getPointerPosition();
      if (pos) {
        const gridPos = this.gridRenderer.pixelToGrid(pos);
        this.handleCanvasRightClick(gridPos);
      }
    });

    console.log('✅ Event handlers setup');
  }

  private handleCanvasClick(gridPos: GridPosition, e: Konva.KonvaEventObject<MouseEvent>): void {
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        console.log(`Place mode: clicked (${gridPos.x}, ${gridPos.y})`);
        // Check if we can place something here
        const canPlace = this.gridState.canPlaceObject(gridPos, { width: 1, height: 1 }, ZLayer.CHARACTERS);
        console.log(`Can place: ${canPlace}`);
        break;
        
      case ToolMode.SELECT:
        const objectAtPos = this.gridState.getObjectAtPosition(gridPos);
        if (objectAtPos) {
          console.log(`Selected object: ${objectAtPos.objectId} (${objectAtPos.objectType})`);
          this.selectObject(objectAtPos.objectId);
        } else {
          console.log(`No object at (${gridPos.x}, ${gridPos.y})`);
          this.clearSelection();
        }
        break;
        
      case ToolMode.DELETE:
        const objectToDelete = this.gridState.getObjectAtPosition(gridPos);
        if (objectToDelete) {
          console.log(`Deleting object: ${objectToDelete.objectId}`);
          this.removeObject(objectToDelete.objectId);
        } else {
          console.log(`No object to delete at (${gridPos.x}, ${gridPos.y})`);
        }
        break;
        
      case ToolMode.MOVE:
        console.log(`Move mode: clicked (${gridPos.x}, ${gridPos.y})`);
        break;
    }
  }

  private handleCanvasRightClick(gridPos: GridPosition): void {
    const objects = this.gridState.getAllObjectsAtPosition(gridPos);
    console.log(`Right-clicked grid tile: (${gridPos.x}, ${gridPos.y})`);
    console.log(`Objects at position: ${objects.length}`);
    objects.forEach(obj => {
      console.log(`  - ${obj.objectId} (${obj.objectType}) z:${obj.zIndex}`);
    });
  }

  // Object management methods
  private selectObject(objectId: string): void {
    // Clear previous selection
    this.clearSelection();
    
    // Add to selection
    this.appState.selectionState.selectedObjectIds = [objectId];
    
    // Visual feedback (basic highlight)
    const konvaObject = this.konvaObjects.get(objectId);
    if (konvaObject) {
      // Add selection indicator
      const bounds = konvaObject.getClientRect();
      const selectionRect = new Konva.Rect({
        x: bounds.x - 2,
        y: bounds.y - 2,
        width: bounds.width + 4,
        height: bounds.height + 4,
        stroke: '#FFD700',
        strokeWidth: 2,
        dash: [5, 5],
        listening: false,
        name: 'selection-indicator'
      });
      
      this.uiLayer.add(selectionRect);
      this.uiLayer.draw();
    }
  }

  private clearSelection(): void {
    this.appState.selectionState.selectedObjectIds = [];
    
    // Remove selection indicators
    const selectionIndicators = this.uiLayer.find('.selection-indicator');
    selectionIndicators.forEach(indicator => indicator.destroy());
    this.uiLayer.draw();
  }

  private removeObject(objectId: string): boolean {
    // Remove from grid state
    const removed = this.gridState.removeObject(objectId);
    
    if (removed) {
      // Remove visual representation
      const konvaObject = this.konvaObjects.get(objectId);
      if (konvaObject) {
        konvaObject.destroy();
        this.konvaObjects.delete(objectId);
      }
      
      // Remove from object tracking
      this.objects.delete(objectId);
      
      // Clear selection if this object was selected
      if (this.appState.selectionState.selectedObjectIds.includes(objectId)) {
        this.clearSelection();
      }
      
      this.objectLayer.draw();
      console.log(`✅ Object ${objectId} removed`);
    }
    
    return removed;
  }

  // Test objects - will be replaced with ObjectManager
  private addTestObjects(): void {
    // Create test character template
    const characterTemplate: GridObjectTemplate = {
      id: 'test-character',
      name: 'Test Character',
      type: ObjectType.CHARACTER,
      size: { width: 1, height: 1 },
      imageUrl: '',
      defaultZIndex: ZLayer.CHARACTERS,
      tags: ['test', 'character']
    };

    // Create test vehicle template
    const vehicleTemplate: GridObjectTemplate = {
      id: 'test-vehicle',
      name: 'Test Vehicle',
      type: ObjectType.VEHICLE,
      size: { width: 2, height: 2 },
      imageUrl: '',
      defaultZIndex: ZLayer.VEHICLES,
      tags: ['test', 'vehicle']
    };

    // Create test terrain template
    const terrainTemplate: GridObjectTemplate = {
      id: 'test-terrain',
      name: 'Test Terrain',
      type: ObjectType.TERRAIN,
      size: { width: 1, height: 1 },
      imageUrl: '',
      defaultZIndex: ZLayer.TERRAIN,
      tags: ['test', 'terrain']
    };

    this.templates.set(characterTemplate.id, characterTemplate);
    this.templates.set(vehicleTemplate.id, vehicleTemplate);
    this.templates.set(terrainTemplate.id, terrainTemplate);

    // Place test objects with collision detection
    this.placeTestObject('test-character', { x: 2, y: 2 }, '#4CAF50');
    this.placeTestObject('test-vehicle', { x: 5, y: 4 }, '#FF5722');
    this.placeTestObject('test-terrain', { x: 8, y: 6 }, '#8D6E63');
    
    // Try to place overlapping objects to test collision
    this.placeTestObject('test-character', { x: 5, y: 4 }, '#2196F3'); // Should fail
    this.placeTestObject('test-character', { x: 10, y: 8 }, '#9C27B0'); // Should succeed

    console.log('✅ Test objects added');
  }

  private placeTestObject(templateId: string, position: GridPosition, color: string): void {
    const template = this.templates.get(templateId);
    if (!template) return;

    // Check if placement is valid using GridState
    const canPlace = this.gridState.canPlaceObject(position, template.size, template.defaultZIndex);
    
    if (!canPlace) {
      console.log(`❌ Cannot place ${template.name} at (${position.x}, ${position.y}) - collision detected`);
      return;
    }

    const instance: GridObjectInstance = {
      id: `${templateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId: templateId,
      position: position,
      zIndex: template.defaultZIndex,
      createdAt: new Date()
    };

    // Place in grid state
    const placed = this.gridState.placeObject(
      instance.id,
      position,
      template.size,
      template.defaultZIndex,
      template.type
    );

    if (!placed) {
      console.log(`❌ Failed to place ${template.name} in grid state`);
      return;
    }

    // Create visual representation
    const pixelPos = this.gridRenderer.gridToPixel(position);
    
    const group = new Konva.Group({
      x: pixelPos.x,
      y: pixelPos.y,
      draggable: true,
    });

    const rect = new Konva.Rect({
      x: 1, // Small padding for grid visibility
      y: 1,
      width: template.size.width * this.gridConfig.tileSize - 2,
      height: template.size.height * this.gridConfig.tileSize - 2,
      fill: color,
      stroke: this.darkenColor(color, 0.2),
      strokeWidth: 2,
    });

    // Add type label
    const label = new Konva.Text({
      x: 4,
      y: 4,
      text: template.type.charAt(0).toUpperCase(),
      fontSize: 12,
      fontFamily: 'Arial',
      fill: 'white',
      listening: false
    });

    group.add(rect);
    group.add(label);

    // Add drag behavior with collision detection
    group.on('dragstart', () => {
      this.appState.dragState.isDragging = true;
      this.appState.dragState.objectId = instance.id;
      this.appState.dragState.originalPosition = { ...position };
    });

    group.on('dragmove', () => {
      // Show ghost position while dragging
      const newPixelPos = { x: group.x(), y: group.y() };
      const newGridPos = this.gridRenderer.pixelToGrid(newPixelPos);
      
      // Check if position is valid
      const canMove = this.gridState.canPlaceObject(newGridPos, template.size, template.defaultZIndex, instance.id);
      
      // Visual feedback for valid/invalid placement
      rect.stroke(canMove ? '#4CAF50' : '#F44336');
      rect.strokeWidth(canMove ? 2 : 3);
    });

    group.on('dragend', () => {
      const newPixelPos = { x: group.x(), y: group.y() };
      const newGridPos = this.gridRenderer.pixelToGrid(newPixelPos);
      
      // Try to move object in grid state
      const moved = this.gridState.moveObject(instance.id, newGridPos);
      
      if (moved) {
        // Snap to grid
        const snappedPixelPos = this.gridRenderer.gridToPixel(newGridPos);
        group.x(snappedPixelPos.x);
        group.y(snappedPixelPos.y);
        
        // Update instance position
        instance.position = newGridPos;
        
        console.log(`${template.name} moved to (${newGridPos.x}, ${newGridPos.y})`);
      } else {
        // Revert to original position
        const originalPixelPos = this.gridRenderer.gridToPixel(this.appState.dragState.originalPosition!);
        group.x(originalPixelPos.x);
        group.y(originalPixelPos.y);
        
        console.log(`❌ Cannot move ${template.name} to (${newGridPos.x}, ${newGridPos.y}) - collision`);
      }
      
      // Reset visual feedback
      rect.stroke(this.darkenColor(color, 0.2));
      rect.strokeWidth(2);
      
      // Clear drag state
      this.appState.dragState.isDragging = false;
      this.appState.dragState.objectId = null;
      this.appState.dragState.originalPosition = null;
    });

    // Set z-index
    group.zIndex(instance.zIndex);

    this.objectLayer.add(group);
    this.objectLayer.draw();
    
    // Store references
    this.objects.set(instance.id, instance);
    this.konvaObjects.set(instance.id, group);
    
    console.log(`✅ ${template.name} placed at (${position.x}, ${position.y})`);
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening - in real implementation would use proper color library
    return color; // For now, return same color
  }

  // Public API methods using new grid system
  public setTool(tool: ToolMode): void {
    this.appState.currentTool = tool;
    console.log(`Tool changed to: ${tool}`);
  }

  public toggleGrid(): void {
    this.gridRenderer.toggleGrid();
    this.appState.showGrid = this.gridRenderer.getConfig().showGrid;
    console.log(`Grid visibility: ${this.appState.showGrid}`);
  }

  public clearAll(): void {
    // Clear grid state
    this.gridState.clearAll();
    
    // Clear visual objects
    this.objectLayer.destroyChildren();
    this.objectLayer.draw();
    
    // Clear UI elements
    this.uiLayer.destroyChildren();
    this.uiLayer.draw();
    
    // Clear tracking maps
    this.objects.clear();
    this.konvaObjects.clear();
    
    // Clear selection
    this.appState.selectionState.selectedObjectIds = [];
    
    console.log('All objects cleared');
  }

  // Utility methods
  public pixelToGrid(pixel: PixelPosition): GridPosition {
    return this.gridRenderer.pixelToGrid(pixel);
  }

  public gridToPixel(grid: GridPosition): PixelPosition {
    return this.gridRenderer.gridToPixel(grid);
  }

  public snapToGrid(pixel: PixelPosition): PixelPosition {
    return this.gridRenderer.snapToGrid(pixel);
  }

  // Getters
  public getStage(): Konva.Stage {
    return this.stage;
  }

  public getAppState(): AppState {
    return { ...this.appState }; // Return copy to prevent mutation
  }

  public getGridConfig(): GridConfig {
    return this.gridRenderer.getConfig();
  }

  public getGridStats() {
    return this.gridState.getStats();
  }

  // Cleanup
  public destroy(): void {
    this.gridRenderer.destroy();
    this.gridState.destroy();
    this.stage.destroy();
    this.objects.clear();
    this.templates.clear();
    this.konvaObjects.clear();
    console.log('GridMaster destroyed');
  }
}