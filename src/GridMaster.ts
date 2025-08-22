// src/GridMaster.ts
// Updated with GridObject class system for better object management

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

// GridObject class - manages its own state and rendering
export class GridObject {
  public instance: GridObjectInstance;
  public template: GridObjectTemplate;
  private konvaGroup: Konva.Group;
  private gridMaster: GridMaster;
  private isDragging = false;

  constructor(
    template: GridObjectTemplate, 
    position: GridPosition, 
    gridMaster: GridMaster
  ) {
    this.template = template;
    this.gridMaster = gridMaster;
    
    // Create instance
    this.instance = {
      id: this.generateId(),
      templateId: template.id,
      position: position,
      zIndex: template.defaultZIndex,
      rotation: 0,
      opacity: 1.0,
      createdAt: new Date()
    };

    // Create visual representation
    this.konvaGroup = this.createVisual();
    this.setupEventHandlers();
  }

  private generateId(): string {
    return `${this.template.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createVisual(): Konva.Group {
    const pixelPos = this.gridMaster.gridToPixel(this.instance.position);
    
    const group = new Konva.Group({
      x: pixelPos.x,
      y: pixelPos.y,
      draggable: false, // Will be enabled based on tool
      name: 'game-object'
    });

    // Store object data for identification
    group.setAttr('objectId', this.instance.id);
    group.setAttr('templateId', this.template.id);
    group.setAttr('gridPosition', this.instance.position);

    // Try to load image, fallback to colored rectangle
    if (this.template.imageUrl && 
        (this.template.imageUrl.startsWith('http') || 
         this.template.imageUrl.startsWith('/assets') || 
         this.template.imageUrl.startsWith('data:'))) {
      this.loadImage(group);
    } else {
      this.createFallbackVisual(group);
    }

    return group;
  }

  private loadImage(group: Konva.Group): void {
    const imageObj = new Image();
    imageObj.onload = () => {
      const image = new Konva.Image({
        x: 1,
        y: 1,
        image: imageObj,
        width: this.template.size.width * this.gridMaster.getTileSize() - 2,
        height: this.template.size.height * this.gridMaster.getTileSize() - 2,
      });
      group.add(image);
      this.addLabels(group);
    };
    
    imageObj.onerror = () => {
      console.warn(`Failed to load image: ${this.template.imageUrl}, using fallback`);
      this.createFallbackVisual(group);
    };
    
    imageObj.src = this.template.imageUrl;
  }

  private createFallbackVisual(group: Konva.Group): void {
    const colors = {
      [ObjectType.CHARACTER]: '#4CAF50',
      [ObjectType.TERRAIN]: '#8D6E63',
      [ObjectType.VEHICLE]: '#FF5722',
      [ObjectType.PROP]: '#2196F3',
      [ObjectType.EFFECT]: '#9C27B0',
      [ObjectType.SPELL]: '#E91E63'
    };

    const color = colors[this.template.type] || '#666666';
    const tileSize = this.gridMaster.getTileSize();
    
    const rect = new Konva.Rect({
      x: 1,
      y: 1,
      width: this.template.size.width * tileSize - 2,
      height: this.template.size.height * tileSize - 2,
      fill: color,
      stroke: this.darkenColor(color, 0.2),
      strokeWidth: 2,
    });

    group.add(rect);
    this.addLabels(group);
  }

  private addLabels(group: Konva.Group): void {
    // Add type label
    const label = new Konva.Text({
      x: 4,
      y: 4,
      text: this.template.type.charAt(0).toUpperCase(),
      fontSize: 12,
      fontFamily: 'Arial',
      fill: 'white',
      listening: false
    });
    group.add(label);

    // Add name label for larger objects
    if (this.template.size.width > 1 || this.template.size.height > 1) {
      const nameLabel = new Konva.Text({
        x: 4,
        y: 18,
        text: this.template.name.substring(0, 8), // Truncate long names
        fontSize: 10,
        fontFamily: 'Arial',
        fill: 'white',
        listening: false
      });
      group.add(nameLabel);
    }
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private setupEventHandlers(): void {
    let dragStartPosition: GridPosition;
    let dragStartPixelPosition: PixelPosition;

    this.konvaGroup.on('dragstart', () => {
      this.isDragging = true;
      dragStartPosition = { ...this.instance.position };
      dragStartPixelPosition = this.gridMaster.gridToPixel(dragStartPosition);
      
      console.log(`🚀 Drag start: ${this.instance.id}`);
      console.log(`   Grid position: (${dragStartPosition.x}, ${dragStartPosition.y})`);
      console.log(`   Pixel position: (${dragStartPixelPosition.x}, ${dragStartPixelPosition.y})`);
      console.log(`   Group position: (${this.konvaGroup.x()}, ${this.konvaGroup.y()})`);
    });

    this.konvaGroup.on('dragmove', () => {
      if (!this.isDragging) return;
      
      // Get current group position (where Konva has dragged it to)
      const currentGroupPos = { x: this.konvaGroup.x(), y: this.konvaGroup.y() };
      
      // Convert to grid coordinates
      const hoveredGridPos = this.gridMaster.pixelToGrid(currentGroupPos);
      
      // Check if new position is valid
      const canMove = this.gridMaster.canMoveObject(this.instance.id, hoveredGridPos);
      
      // Visual feedback
      this.updateDragFeedback(canMove);
      
      // Optional: Snap to grid during drag for better visual feedback
      // Comment this out if you want free-form dragging until drop
      const snappedPixelPos = this.gridMaster.gridToPixel(hoveredGridPos);
      this.konvaGroup.x(snappedPixelPos.x);
      this.konvaGroup.y(snappedPixelPos.y);
    });

    this.konvaGroup.on('dragend', () => {
      if (!this.isDragging) return;
      
      // Get final position
      const finalGroupPos = { x: this.konvaGroup.x(), y: this.konvaGroup.y() };
      const targetGridPos = this.gridMaster.pixelToGrid(finalGroupPos);
      
      console.log(`🏁 Drag end: ${this.instance.id}`);
      console.log(`   Final group position: (${finalGroupPos.x}, ${finalGroupPos.y})`);
      console.log(`   Target grid position: (${targetGridPos.x}, ${targetGridPos.y})`);
      console.log(`   Original grid position: (${dragStartPosition.x}, ${dragStartPosition.y})`);
      
      // Attempt the move
      const success = this.gridMaster.moveObject(this.instance.id, targetGridPos);
      
      let finalGridPos: GridPosition;
      
      if (success) {
        finalGridPos = targetGridPos;
        this.instance.position = finalGridPos;
        console.log(`   ✅ Move successful to (${finalGridPos.x}, ${finalGridPos.y})`);
      } else {
        finalGridPos = dragStartPosition;
        this.instance.position = finalGridPos;
        console.log(`   ❌ Move failed, reverting to (${finalGridPos.x}, ${finalGridPos.y})`);
      }
      
      // Always snap to the final grid position
      const finalPixelPos = this.gridMaster.gridToPixel(finalGridPos);
      this.konvaGroup.x(finalPixelPos.x);
      this.konvaGroup.y(finalPixelPos.y);
      this.konvaGroup.setAttr('gridPosition', finalGridPos);
      
      console.log(`   Final pixel position: (${finalPixelPos.x}, ${finalPixelPos.y})`);
      console.log(`   Final group position: (${this.konvaGroup.x()}, ${this.konvaGroup.y()})`);
      
      this.resetDragFeedback();
      this.isDragging = false;
    });
  }

  private updateDragFeedback(isValid: boolean): void {
    const shapes = this.konvaGroup.find('Rect');
    if (shapes.length > 0) {
      const rect = shapes[0] as Konva.Rect;
      rect.stroke(isValid ? '#4CAF50' : '#F44336');
      rect.strokeWidth(isValid ? 2 : 3);
    }
  }

  private resetDragFeedback(): void {
    const shapes = this.konvaGroup.find('Rect');
    if (shapes.length > 0) {
      const rect = shapes[0] as Konva.Rect;
      const colors = {
        [ObjectType.CHARACTER]: '#4CAF50',
        [ObjectType.TERRAIN]: '#8D6E63',
        [ObjectType.VEHICLE]: '#FF5722',
        [ObjectType.PROP]: '#2196F3',
        [ObjectType.EFFECT]: '#9C27B0',
        [ObjectType.SPELL]: '#E91E63'
      };
      const color = colors[this.template.type] || '#666666';
      rect.stroke(this.darkenColor(color, 0.2));
      rect.strokeWidth(2);
    }
  }

  // Public methods
  public getKonvaGroup(): Konva.Group {
    return this.konvaGroup;
  }

  public getId(): string {
    return this.instance.id;
  }

  public getPosition(): GridPosition {
    return { ...this.instance.position };
  }

  public setDraggable(draggable: boolean): void {
    this.konvaGroup.draggable(draggable);
  }

  public destroy(): void {
    this.konvaGroup.destroy();
  }

  public moveTo(position: GridPosition): void {
    this.instance.position = position;
    const pixelPos = this.gridMaster.gridToPixel(position);
    this.konvaGroup.x(pixelPos.x);
    this.konvaGroup.y(pixelPos.y);
    this.konvaGroup.setAttr('gridPosition', position);
  }

  public select(): void {
    // Add selection visual feedback
    const bounds = this.konvaGroup.getClientRect();
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
    
    // Add to parent layer
    const layer = this.konvaGroup.getLayer();
    if (layer) {
      layer.add(selectionRect);
      layer.draw();
    }
  }

  public deselect(): void {
    // Remove selection indicators
    const layer = this.konvaGroup.getLayer();
    if (layer) {
      const selectionIndicators = layer.find('.selection-indicator');
      selectionIndicators.forEach(indicator => indicator.destroy());
      layer.draw();
    }
  }
}

export class GridMaster {
  private stage: Konva.Stage;
  private objectLayer: Konva.Layer;
  private uiLayer: Konva.Layer;
  
  private appState: AppState;
  private gridConfig: GridConfig;
  
  // Core grid system
  private gridRenderer: GridRenderer;
  private gridState: GridState;
  
  // Object management using GridObject system
  private objects: Map<string, GridObject> = new Map();
  private templates: Map<string, GridObjectTemplate> = new Map();
  private selectedObjects: Set<string> = new Set();

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
    this.objectLayer = new Konva.Layer({ name: 'object-layer' });
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
    const target = e.target;
    const isBackground = target === this.stage || 
                        target.getLayer() === this.gridRenderer.getBackgroundLayer() || 
                        target.getLayer() === this.gridRenderer.getGridLayer();

    if (isBackground) {
      // Clicked on empty space
      this.handleEmptySpaceClick(gridPos);
    } else {
      // Clicked on an object
      const objectId = this.findObjectIdFromTarget(target);
      if (objectId) {
        this.handleObjectClick(objectId, gridPos);
      }
    }
  }

  private handleEmptySpaceClick(gridPos: GridPosition): void {
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        console.log(`Place mode: clicked empty space (${gridPos.x}, ${gridPos.y})`);
        // Placement is handled by PlaceTool through callbacks
        break;
        
      case ToolMode.SELECT:
        this.clearSelection();
        break;
        
      case ToolMode.DELETE:
        console.log('Nothing to delete at empty space');
        break;
        
      case ToolMode.MOVE:
        console.log('Move tool: click empty space');
        break;
    }
  }

  private handleObjectClick(objectId: string, gridPos: GridPosition): void {
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        console.log('Place tool: clicked existing object - no action');
        break;
        
      case ToolMode.SELECT:
        this.selectObject(objectId);
        break;
        
      case ToolMode.DELETE:
        this.removeObject(objectId);
        break;
        
      case ToolMode.MOVE:
        this.selectObject(objectId);
        break;
    }
  }

  private findObjectIdFromTarget(target: Konva.Node): string | null {
    let current: Konva.Node | null = target;
    
    while (current) {
      if (current.attrs && current.attrs.objectId) {
        return current.attrs.objectId;
      }
      current = current.getParent();
    }
    
    return null;
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
    this.selectedObjects.add(objectId);
    this.appState.selectionState.selectedObjectIds = [objectId];
    
    // Visual feedback
    const gridObject = this.objects.get(objectId);
    if (gridObject) {
      gridObject.select();
    }
    
    console.log(`Selected object: ${objectId}`);
  }

  private clearSelection(): void {
    // Clear visual selection for all selected objects
    this.selectedObjects.forEach(objectId => {
      const gridObject = this.objects.get(objectId);
      if (gridObject) {
        gridObject.deselect();
      }
    });
    
    this.selectedObjects.clear();
    this.appState.selectionState.selectedObjectIds = [];
    console.log('Selection cleared');
  }

  // Public API methods
  public addTemplate(template: GridObjectTemplate): void {
    this.templates.set(template.id, template);
    console.log(`✅ Added template: ${template.name}`);
  }

  public addExistingObject(instance: GridObjectInstance, template: GridObjectTemplate): boolean {
    // Create GridObject for an instance that's already placed in GridState
    // This is used when PlaceTool has already placed the object logically
    
    const gridObject = new GridObject(template, instance.position, this);
    
    // Override the generated ID with the existing instance ID
    gridObject.instance = instance;
    
    // Add to object layer
    this.objectLayer.add(gridObject.getKonvaGroup());
    
    // Set z-index
    gridObject.getKonvaGroup().zIndex(template.defaultZIndex);
    
    // Update the Konva group's stored ID to match
    gridObject.getKonvaGroup().setAttr('objectId', instance.id);
    gridObject.getKonvaGroup().setAttr('templateId', template.id);
    gridObject.getKonvaGroup().setAttr('gridPosition', instance.position);
    
    this.objectLayer.draw();
    
    // Store in our tracking (replacing any auto-generated ID)
    this.objects.set(instance.id, gridObject);
    
    console.log(`✅ Added existing object: ${template.name} (${instance.id}) at (${instance.position.x}, ${instance.position.y})`);
    return true;
  }

  public placeObjectFromTemplate(template: GridObjectTemplate, position: GridPosition): boolean {
    // Check if placement is valid
    const canPlace = this.gridState.canPlaceObject(position, template.size, template.defaultZIndex);
    
    if (!canPlace) {
      console.log(`❌ Cannot place ${template.name} at (${position.x}, ${position.y}) - collision detected`);
      return false;
    }

    // Create GridObject
    const gridObject = new GridObject(template, position, this);
    
    // Place in grid state
    const placed = this.gridState.placeObject(
      gridObject.getId(),
      position,
      template.size,
      template.defaultZIndex,
      template.type
    );

    if (!placed) {
      console.log(`❌ Failed to place ${template.name} in grid state`);
      gridObject.destroy();
      return false;
    }

    // Add to object layer
    this.objectLayer.add(gridObject.getKonvaGroup());
    
    // Set z-index
    gridObject.getKonvaGroup().zIndex(template.defaultZIndex);
    
    this.objectLayer.draw();
    
    // Store in our tracking
    this.objects.set(gridObject.getId(), gridObject);
    
    console.log(`✅ ${template.name} placed at (${position.x}, ${position.y})`);
    return true;
  }

  public removeObject(objectId: string): boolean {
    // Remove from grid state
    const removed = this.gridState.removeObject(objectId);
    
    if (removed) {
      // Remove GridObject
      const gridObject = this.objects.get(objectId);
      if (gridObject) {
        gridObject.destroy();
        this.objects.delete(objectId);
      }
      
      // Clear selection if this object was selected
      if (this.selectedObjects.has(objectId)) {
        this.selectedObjects.delete(objectId);
        this.appState.selectionState.selectedObjectIds = 
          this.appState.selectionState.selectedObjectIds.filter(id => id !== objectId);
      }
      
      this.objectLayer.draw();
      console.log(`✅ Object ${objectId} removed`);
    }
    
    return removed;
  }

  public moveObject(objectId: string, newPosition: GridPosition): boolean {
    const gridObject = this.objects.get(objectId);
    if (!gridObject) {
      console.warn(`Object not found: ${objectId}`);
      return false;
    }

    // Try to move in grid state
    const moved = this.gridState.moveObject(objectId, newPosition);
    
    if (moved) {
      // Update GridObject position
      gridObject.moveTo(newPosition);
      console.log(`Object ${objectId} moved to (${newPosition.x}, ${newPosition.y})`);
    }
    
    return moved;
  }

  public canMoveObject(objectId: string, newPosition: GridPosition): boolean {
    const gridObject = this.objects.get(objectId);
    if (!gridObject) return false;
    
    return this.gridState.canPlaceObject(
      newPosition, 
      gridObject.template.size, 
      gridObject.template.defaultZIndex, 
      objectId
    );
  }

  public setTool(tool: ToolMode): void {
    this.appState.currentTool = tool;
    
    // Update object draggability based on tool
    const isDraggable = tool === ToolMode.MOVE;
    this.objects.forEach(gridObject => {
      gridObject.setDraggable(isDraggable);
    });
    
    console.log(`Tool changed to: ${tool}`);
  }

  public toggleGrid(): void {
    this.gridRenderer.toggleGrid();
    this.appState.showGrid = this.gridRenderer.getConfig().showGrid;
    console.log(`Grid visibility: ${this.appState.showGrid}`);
  }

  public clearAll(): void {
    // Clear all GridObjects
    this.objects.forEach(gridObject => {
      gridObject.destroy();
    });
    this.objects.clear();
    
    // Clear grid state
    this.gridState.clearAll();
    
    // Clear UI elements
    this.uiLayer.destroyChildren();
    this.uiLayer.draw();
    this.objectLayer.draw();
    
    // Clear selection
    this.selectedObjects.clear();
    this.appState.selectionState.selectedObjectIds = [];
    
    console.log('All objects cleared');
  }

  // Test objects - now using the same GridObject system
  private addTestObjects(): void {
    // Create and add test templates
    const templates = [
      {
        id: 'test-character',
        name: 'Test Character',
        type: ObjectType.CHARACTER,
        size: { width: 1, height: 1 },
        imageUrl: '',
        defaultZIndex: ZLayer.CHARACTERS,
        tags: ['test', 'character']
      },
      {
        id: 'ogre-brute',
        name: 'Ogre Brute',
        type: ObjectType.CHARACTER,
        size: { width: 2, height: 2 },
        imageUrl: '/assets/characters/ogre-brute.png',
        defaultZIndex: ZLayer.CHARACTERS,
        tags: ['character', 'ogre', 'large', 'hostile']
      },
      {
        id: 'test-terrain',
        name: 'Test Terrain',
        type: ObjectType.TERRAIN,
        size: { width: 1, height: 1 },
        imageUrl: '',
        defaultZIndex: ZLayer.TERRAIN,
        tags: ['test', 'terrain']
      }
    ];

    // Add templates to our collection
    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Place test objects using the same system as PlaceTool
    this.placeObjectFromTemplate(templates[0], { x: 2, y: 2 });
    this.placeObjectFromTemplate(templates[1], { x: 5, y: 4 }); // This is the ogre
    this.placeObjectFromTemplate(templates[2], { x: 8, y: 6 });
    this.placeObjectFromTemplate(templates[0], { x: 10, y: 8 });

    console.log('✅ Test objects added using GridObject system');
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

  public getTileSize(): number {
    return this.gridConfig.tileSize;
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

  public debugObjectLayer(): void {
    console.log(`Found ${this.objects.size} objects:`);
    this.objects.forEach((gridObject, id) => {
      const pos = gridObject.getPosition();
      console.log(`  ${id} (${gridObject.template.name}) at (${pos.x}, ${pos.y})`);
    });
  }

  // Cleanup
  public destroy(): void {
    this.clearAll();
    this.gridRenderer.destroy();
    this.gridState.destroy();
    this.stage.destroy();
    this.templates.clear();
    console.log('GridMaster destroyed');
  }
}