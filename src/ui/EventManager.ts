// src/ui/EventManager.ts
// Complete event management system integrated with new GridRenderer

import Konva from 'konva';
import { GridRenderer } from '../grid/GridRenderer';
import { GridState } from '../grid/GridState';
import { PlaceTool } from '../tools/PlaceTool';
import { 
  GridPosition, 
  ToolMode, 
  AppState, 
  DragState,
  GridEvent,
  ZLayer,
  GridObjectInstance
} from '../types';

export interface EventManagerCallbacks {
  onToolAction: (tool: ToolMode, position: GridPosition, target?: any) => void;
  onObjectSelected: (objectId: string) => void;
  onObjectDeselected: () => void;
  onObjectMoved: (objectId: string, oldPosition: GridPosition, newPosition: GridPosition) => boolean;
  onDragStart: (objectId: string, position: GridPosition) => void;
  onDragEnd: (objectId: string, position: GridPosition, success: boolean) => void;
  onObjectPlaced: (instance: GridObjectInstance) => void;
  onPlacementFailed: (reason: string, position: GridPosition) => void;
  onTemplateSelected: (templateId: string) => void;
}

export class EventManager {
  private stage: Konva.Stage;
  private gridRenderer: GridRenderer;
  private gridState: GridState;
  private appState: AppState;
  private callbacks: EventManagerCallbacks;
  private placeTool: PlaceTool;
  
  private isDragging = false;
  private dragTarget: Konva.Node | null = null;
  private dragStartPosition: GridPosition | null = null;
  private dragObjectId: string | null = null;
  private lastMousePosition: GridPosition | null = null;

  constructor(
    stage: Konva.Stage,
    gridRenderer: GridRenderer,
    gridState: GridState,
    appState: AppState,
    callbacks: EventManagerCallbacks
  ) {
    this.stage = stage;
    this.gridRenderer = gridRenderer;
    this.gridState = gridState;
    this.appState = appState;
    this.callbacks = callbacks;

    // Initialize PlaceTool with GridRenderer integration
    this.placeTool = new PlaceTool(
      gridState,
      gridRenderer,
      {
        onObjectPlaced: (instance) => this.callbacks.onObjectPlaced(instance),
        onPlacementFailed: (reason, position) => this.callbacks.onPlacementFailed(reason, position),
        onTemplateSelected: (template) => this.callbacks.onTemplateSelected(template.id)
      }
    );

    this.setupEventHandlers();
    this.setupGridStatusDisplay();
    console.log('✅ EventManager initialized with GridRenderer integration');
  }

  private setupEventHandlers(): void {
    // Canvas click events
    this.stage.on('click tap', (e) => this.handleStageClick(e));
    this.stage.on('contextmenu', (e) => this.handleStageRightClick(e));
    
    // Mouse events for hover feedback and coordinate display
    this.stage.on('mousemove', (e) => this.handleMouseMove(e));
    this.stage.on('mouseenter', () => this.handleMouseEnter());
    this.stage.on('mouseleave', () => this.handleMouseLeave());

    // Touch events for mobile support
    this.stage.on('touchstart', (e) => this.handleTouchStart(e));
    this.stage.on('touchend', (e) => this.handleTouchEnd(e));

    // Keyboard events
    this.setupKeyboardHandlers();

    console.log('✅ Event handlers registered with responsive grid support');
  }

  private setupGridStatusDisplay(): void {
    // Show grid status indicator if it exists
    const gridStatus = document.getElementById('grid-status');
    if (gridStatus) {
      gridStatus.style.display = 'block';
      this.updateGridInfoDisplay();
    }
  }

  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Grid-specific shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'g':
            e.preventDefault();
            this.toggleGridStatusDisplay();
            break;
          case 'r':
            e.preventDefault();
            this.forceGridResize();
            break;
        }
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'escape':
          this.callbacks.onObjectDeselected();
          break;
      }
    });
  }

  private handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const gridPos = this.gridRenderer.pixelToGrid(pos);
    
    // Check if we clicked on an object
    const target = e.target;
    const isBackground = target === this.stage || 
                        target.getLayer() === this.gridRenderer.getBackgroundLayer() || 
                        target.getLayer() === this.gridRenderer.getGridLayer();
    
    if (isBackground) {
      // Clicked on empty space
      this.handleEmptySpaceClick(gridPos);
    } else {
      // Clicked on an object
      this.handleObjectClick(target, gridPos);
    }

    // Update last mouse position
    this.lastMousePosition = gridPos;
  }

  private handleEmptySpaceClick(gridPos: GridPosition): void {
    console.log(`Empty space clicked: (${gridPos.x}, ${gridPos.y})`);
    
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        // Use PlaceTool for placement
        const success = this.placeTool.attemptPlacement(gridPos);
        if (success) {
          console.log(`✅ Object placed at (${gridPos.x}, ${gridPos.y})`);
        } else {
          console.log(`❌ Placement failed at (${gridPos.x}, ${gridPos.y})`);
        }
        break;
        
      case ToolMode.SELECT:
        // Deselect all when clicking empty space
        this.callbacks.onObjectDeselected();
        break;
        
      case ToolMode.DELETE:
        console.log('Delete tool: nothing to delete at empty space');
        break;
        
      case ToolMode.MOVE:
        console.log('Move tool: clicked empty space');
        this.callbacks.onObjectDeselected();
        break;
    }
  }

  private handleObjectClick(target: Konva.Node, gridPos: GridPosition): void {
    // Find the object ID from the clicked target
    const objectId = this.findObjectIdFromTarget(target);
    
    if (!objectId) {
      console.log('Could not identify clicked object');
      return;
    }

    console.log(`Object clicked: ${objectId} at (${gridPos.x}, ${gridPos.y})`);
    
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        console.log('Place tool: clicked existing object - no action');
        // Could show object info or suggest switching to select tool
        this.showObjectInfo(objectId, gridPos);
        break;
        
      case ToolMode.SELECT:
        this.callbacks.onObjectSelected(objectId);
        break;
        
      case ToolMode.DELETE:
        console.log(`Delete tool: attempting to delete ${objectId}`);
        this.callbacks.onToolAction(ToolMode.DELETE, gridPos, objectId);
        break;
        
      case ToolMode.MOVE:
        console.log(`Move tool: selected ${objectId} for moving`);
        this.callbacks.onObjectSelected(objectId);
        break;
    }
  }

  private findObjectIdFromTarget(target: Konva.Node): string | null {
    // Look for object ID in the target or its parents
    let current: Konva.Node | null = target;
    
    while (current) {
      if (current.attrs && current.attrs.objectId) {
        return current.attrs.objectId;
      }
      current = current.getParent();
    }
    
    return null;
  }

  private handleStageRightClick(e: Konva.KonvaEventObject<MouseEvent>): void {
    e.evt.preventDefault();
    
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const gridPos = this.gridRenderer.pixelToGrid(pos);
    const objects = this.gridState.getAllObjectsAtPosition(gridPos);
    
    console.log(`Right-click at (${gridPos.x}, ${gridPos.y})`);
    
    if (objects.length === 0) {
      console.log('No objects at this position');
      
      // Show placement info if in place mode
      if (this.appState.currentTool === ToolMode.PLACE) {
        const selectedTemplate = this.placeTool.getSelectedTemplate();
        if (selectedTemplate) {
          const validation = this.placeTool.validatePlacement(gridPos);
          console.log('Placement validation:', validation);
          this.showPlacementInfo(gridPos, validation);
        } else {
          console.log('No template selected for placement');
        }
      }
    } else {
      console.log(`Objects at position (${objects.length}):`);
      objects.forEach((obj, index) => {
        console.log(`  ${index + 1}. ${obj.objectId} (${obj.objectType}) z:${obj.zIndex}`);
      });
    }

    // Show context info
    this.showContextInfo(gridPos, objects);
  }

  private handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const gridPos = this.gridRenderer.pixelToGrid(pos);
    
    // Update cursor based on tool and hover target
    this.updateCursor(e.target, gridPos);
    
    // Show grid coordinates and info
    this.updateGridCoordinateDisplay(gridPos);
    
    // Update last mouse position
    this.lastMousePosition = gridPos;
  }

  private handleMouseEnter(): void {
    // Mouse entered canvas
    this.updateCursor(this.stage, { x: 0, y: 0 });
    
    // Show grid status if hidden
    const gridStatus = document.getElementById('grid-status');
    if (gridStatus && gridStatus.style.display === 'none') {
      gridStatus.style.display = 'block';
    }
  }

  private handleMouseLeave(): void {
    // Mouse left canvas
    const container = this.stage.container();
    container.style.cursor = 'default';
    document.title = 'Grid Master';
    this.lastMousePosition = null;
  }

  private handleTouchStart(e: Konva.KonvaEventObject<TouchEvent>): void {
    // Handle touch as click for mobile
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const gridPos = this.gridRenderer.pixelToGrid(pos);
    console.log(`Touch start at grid (${gridPos.x}, ${gridPos.y})`);
    
    // Update coordinate display for touch
    this.updateGridCoordinateDisplay(gridPos);
  }

  private handleTouchEnd(e: Konva.KonvaEventObject<TouchEvent>): void {
    // Handle touch end
    console.log('Touch ended');
  }

  private updateCursor(target: Konva.Node, gridPos: GridPosition): void {
    const container = this.stage.container();
    
    const isBackground = target === this.stage || 
                        target.getLayer() === this.gridRenderer.getBackgroundLayer() || 
                        target.getLayer() === this.gridRenderer.getGridLayer();
    
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        // Use PlaceTool to check if placement is valid
        const canPlace = this.placeTool.isValidPosition(gridPos);
        container.style.cursor = canPlace ? 'crosshair' : 'not-allowed';
        break;
        
      case ToolMode.SELECT:
        container.style.cursor = isBackground ? 'default' : 'pointer';
        break;
        
      case ToolMode.DELETE:
        container.style.cursor = isBackground ? 'default' : 'pointer';
        break;
        
      case ToolMode.MOVE:
        if (this.isDragging) {
          container.style.cursor = 'grabbing';
        } else {
          container.style.cursor = isBackground ? 'default' : 'grab';
        }
        break;
        
      default:
        container.style.cursor = 'default';
    }
  }

  private updateGridCoordinateDisplay(gridPos: GridPosition): void {
    // Update grid info display
    const gridInfoEl = document.getElementById('grid-info-text');
    if (gridInfoEl && this.gridRenderer.isValidGridPosition(gridPos)) {
      const dimensions = this.gridRenderer.getDimensions();
      const preset = this.gridRenderer.getCurrentPreset();
      gridInfoEl.textContent = `(${gridPos.x},${gridPos.y}) | ${dimensions.width}×${dimensions.height} @ ${dimensions.tileSize}px | Preset: ${preset.maxWidth > 9999 ? 'XL' : preset.maxWidth + 'px'}`;
    }
    
    // Update window title
    if (this.gridRenderer.isValidGridPosition(gridPos)) {
      document.title = `Grid Master - (${gridPos.x}, ${gridPos.y})`;
    }
    
    // Emit coordinate update event
    const event: GridEvent = {
      type: 'coordinateUpdate',
      data: { position: gridPos },
      timestamp: new Date()
    };
  }

  private updateGridInfoDisplay(): void {
    const gridInfoEl = document.getElementById('grid-info-text');
    if (gridInfoEl) {
      const dimensions = this.gridRenderer.getDimensions();
      const preset = this.gridRenderer.getCurrentPreset();
      gridInfoEl.textContent = `Grid: ${dimensions.width}×${dimensions.height} @ ${dimensions.tileSize}px | Preset: ${preset.maxWidth > 9999 ? 'XL' : preset.maxWidth + 'px'}`;
    }
  }

  private showContextInfo(position: GridPosition, objects: any[]): void {
    // Create a temporary info display
    const infoText = objects.length === 0 
      ? `Empty tile (${position.x}, ${position.y})`
      : `${objects.length} object(s) at (${position.x}, ${position.y})`;
    
    // Dispatch custom event for UI to handle
    const event: GridEvent = {
      type: 'contextInfo',
      data: { position, objects, message: infoText },
      timestamp: new Date()
    };
    
    console.log('Context info:', event);
  }

  private showObjectInfo(objectId: string, position: GridPosition): void {
    console.log(`📋 Object Info: ${objectId} at (${position.x}, ${position.y})`);
    
    // Get object details from grid state
    const objectPos = this.gridState.getObjectPosition(objectId);
    const objectSize = this.gridState.getObjectSize(objectId);
    
    if (objectPos && objectSize) {
      console.log(`   Position: (${objectPos.x}, ${objectPos.y})`);
      console.log(`   Size: ${objectSize.width}×${objectSize.height}`);
      
      // Get all occupied positions
      const occupiedPositions = this.gridRenderer.getOccupiedPositionsForObject(objectPos, objectSize);
      console.log(`   Occupies ${occupiedPositions.length} tiles:`, occupiedPositions);
    }
  }

  private showPlacementInfo(position: GridPosition, validation: any): void {
    console.log(`📋 Placement Info for (${position.x}, ${position.y}):`);
    console.log(`   Can place: ${validation.canPlace}`);
    if (!validation.canPlace && validation.reason) {
      console.log(`   Reason: ${validation.reason}`);
    }
    if (validation.suggestedPosition) {
      console.log(`   Suggested: (${validation.suggestedPosition.x}, ${validation.suggestedPosition.y})`);
    }
    if (validation.warnings && validation.warnings.length > 0) {
      console.log(`   Warnings:`, validation.warnings);
    }
  }

  private toggleGridStatusDisplay(): void {
    const gridStatus = document.getElementById('grid-status');
    if (gridStatus) {
      const isVisible = gridStatus.style.display !== 'none';
      gridStatus.style.display = isVisible ? 'none' : 'block';
      console.log(`Grid status display ${isVisible ? 'hidden' : 'shown'}`);
    }
  }

  private forceGridResize(): void {
    console.log('🔄 Forcing grid resize...');
    this.gridRenderer.updateForCurrentViewport();
    this.updateGridInfoDisplay();
  }

  // Drag handling methods for object movement
  public setupObjectDragHandlers(konvaObject: Konva.Group, objectId: string): void {
    konvaObject.attrs.objectId = objectId; // Store object ID for identification
    
    konvaObject.on('dragstart', () => {
      this.handleDragStart(konvaObject, objectId);
    });

    konvaObject.on('dragmove', () => {
      this.handleDragMove(konvaObject, objectId);
    });

    konvaObject.on('dragend', () => {
      this.handleDragEnd(konvaObject, objectId);
    });

    // Update cursor on hover
    konvaObject.on('mouseenter', () => {
      if (this.appState.currentTool === ToolMode.MOVE || konvaObject.draggable()) {
        const container = this.stage.container();
        container.style.cursor = 'grab';
      }
    });

    konvaObject.on('mouseleave', () => {
      if (!this.isDragging) {
        const container = this.stage.container();
        container.style.cursor = 'default';
      }
    });
  }

  private handleDragStart(konvaObject: Konva.Group, objectId: string): void {
    this.isDragging = true;
    this.dragTarget = konvaObject;
    this.dragObjectId = objectId;
    
    const currentPos = this.gridRenderer.pixelToGrid({ x: konvaObject.x(), y: konvaObject.y() });
    this.dragStartPosition = currentPos;
    
    // Update cursor
    const container = this.stage.container();
    container.style.cursor = 'grabbing';
    
    console.log(`Drag start: ${objectId} from (${currentPos.x}, ${currentPos.y})`);
    this.callbacks.onDragStart(objectId, currentPos);
  }

  private handleDragMove(konvaObject: Konva.Group, objectId: string): void {
    if (!this.isDragging) return;
    
    const newPixelPos = { x: konvaObject.x(), y: konvaObject.y() };
    const newGridPos = this.gridRenderer.pixelToGrid(newPixelPos);
    
    // Get object size for collision checking
    const objectSize = this.gridState.getObjectSize(objectId);
    if (!objectSize) return;
    
    // Check if new position is valid
    const canMove = this.gridState.canPlaceObject(newGridPos, objectSize, ZLayer.CHARACTERS, objectId);
    
    // Visual feedback
    this.updateDragFeedback(konvaObject, canMove);
    
    // Update coordinate display during drag
    this.updateGridCoordinateDisplay(newGridPos);
  }

  private updateDragFeedback(konvaObject: Konva.Group, isValid: boolean): void {
    // Find the main shape in the group to update its appearance
    const shapes = konvaObject.find('Rect');
    if (shapes.length > 0) {
      const rect = shapes[0] as Konva.Rect;
      rect.stroke(isValid ? '#4CAF50' : '#F44336');
      rect.strokeWidth(isValid ? 2 : 3);
    }
  }

  private handleDragEnd(konvaObject: Konva.Group, objectId: string): void {
    if (!this.isDragging || !this.dragStartPosition) return;
    
    const newPixelPos = { x: konvaObject.x(), y: konvaObject.y() };
    const newGridPos = this.gridRenderer.pixelToGrid(newPixelPos);
    
    // Try to move object
    const success = this.callbacks.onObjectMoved(objectId, this.dragStartPosition, newGridPos);
    
    if (success) {
      // Snap to grid using GridRenderer
      const snappedPixelPos = this.gridRenderer.gridToPixel(newGridPos);
      konvaObject.x(snappedPixelPos.x);
      konvaObject.y(snappedPixelPos.y);
      console.log(`Drag success: ${objectId} moved to (${newGridPos.x}, ${newGridPos.y})`);
    } else {
      // Revert to original position using GridRenderer
      const originalPixelPos = this.gridRenderer.gridToPixel(this.dragStartPosition);
      konvaObject.x(originalPixelPos.x);
      konvaObject.y(originalPixelPos.y);
      console.log(`Drag failed: ${objectId} reverted to (${this.dragStartPosition.x}, ${this.dragStartPosition.y})`);
    }
    
    // Reset visual feedback
    this.resetDragFeedback(konvaObject);
    
    // Update cursor
    const container = this.stage.container();
    container.style.cursor = 'default';
    
    // Cleanup drag state
    this.isDragging = false;
    this.dragTarget = null;
    this.dragObjectId = null;
    this.dragStartPosition = null;
    
    this.callbacks.onDragEnd(objectId, newGridPos, success);
  }

  private resetDragFeedback(konvaObject: Konva.Group): void {
    // Reset visual feedback to normal appearance
    const shapes = konvaObject.find('Rect');
    if (shapes.length > 0) {
      const rect = shapes[0] as Konva.Rect;
      rect.strokeWidth(2);
      // Reset to default stroke color (could be stored in object data)
      rect.stroke('#333333');
    }
  }

  // Tool management
  public setTool(tool: ToolMode): void {
    this.appState.currentTool = tool;
    
    // Update object draggability based on tool
    this.updateObjectInteractivity();
    
    // Update cursor for current mouse position
    if (this.lastMousePosition) {
      this.updateCursor(this.stage, this.lastMousePosition);
    }
    
    console.log(`EventManager: Tool changed to ${tool}`);
  }

  private updateObjectInteractivity(): void {
    // Enable/disable dragging based on current tool
    const objectLayer = this.stage.find('.object-layer')[0];
    if (!objectLayer) return;
    
    const objects = objectLayer.find('Group');
    objects.forEach(obj => {
      const isDraggable = this.appState.currentTool === ToolMode.MOVE;
      obj.draggable(isDraggable);
    });
  }

  // PlaceTool management methods
  public getPlaceTool(): PlaceTool {
    return this.placeTool;
  }

  public selectTemplate(templateId: string): boolean {
    const success = this.placeTool.selectTemplate(templateId);
    if (success) {
      // Update cursor for current mouse position
      if (this.lastMousePosition) {
        this.updateCursor(this.stage, this.lastMousePosition);
      }
    }
    return success;
  }

  public getSelectedTemplate() {
    return this.placeTool.getSelectedTemplate();
  }

  // Public utility methods
  public getCurrentGridPosition(): GridPosition | null {
    const pos = this.stage.getPointerPosition();
    return pos ? this.gridRenderer.pixelToGrid(pos) : null;
  }

  public isValidPlacement(position: GridPosition, width: number, height: number): boolean {
    return this.gridState.canPlaceObject(position, { width, height }, ZLayer.CHARACTERS);
  }

  public getGridInfo(): any {
    return this.gridRenderer.getGridInfo();
  }

  public debugEventState(): void {
    console.log('🔍 EventManager Debug Info:');
    console.log(`   Current tool: ${this.appState.currentTool}`);
    console.log(`   Is dragging: ${this.isDragging}`);
    console.log(`   Last mouse position:`, this.lastMousePosition);
    console.log(`   Selected template:`, this.placeTool.getSelectedTemplate()?.name || 'None');
    console.log(`   Grid info:`, this.gridRenderer.getGridInfo());
  }

  // Cleanup
  public destroy(): void {
    // Remove all event listeners
    this.stage.off('click tap');
    this.stage.off('contextmenu');
    this.stage.off('mousemove');
    this.stage.off('mouseenter');
    this.stage.off('mouseleave');
    this.stage.off('touchstart');
    this.stage.off('touchend');
    
    // Remove keyboard listeners
    document.removeEventListener('keydown', this.setupKeyboardHandlers);
    
    // Destroy PlaceTool
    this.placeTool?.destroy();
    
    console.log('✅ EventManager destroyed');
  }
}