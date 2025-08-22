// src/ui/EventManager.ts
// Handles all canvas events and user interactions

import Konva from 'konva';
import { GridRenderer } from '../grid/GridRenderer';
import { GridState } from '../grid/GridState';
import { 
  GridPosition, 
  ToolMode, 
  AppState, 
  DragState,
  GridEvent,
  ZLayer 
} from '../types';

export interface EventManagerCallbacks {
  onToolAction: (tool: ToolMode, position: GridPosition, target?: any) => void;
  onObjectSelected: (objectId: string) => void;
  onObjectDeselected: () => void;
  onObjectMoved: (objectId: string, oldPosition: GridPosition, newPosition: GridPosition) => boolean;
  onDragStart: (objectId: string, position: GridPosition) => void;
  onDragEnd: (objectId: string, position: GridPosition, success: boolean) => void;
}

export class EventManager {
  private stage: Konva.Stage;
  private gridRenderer: GridRenderer;
  private gridState: GridState;
  private appState: AppState;
  private callbacks: EventManagerCallbacks;
  
  private isDragging = false;
  private dragTarget: Konva.Node | null = null;
  private dragStartPosition: GridPosition | null = null;
  private dragObjectId: string | null = null;

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

    this.setupEventHandlers();
    console.log('✅ EventManager initialized');
  }

  private setupEventHandlers(): void {
    // Canvas click events
    this.stage.on('click tap', (e) => this.handleStageClick(e));
    this.stage.on('contextmenu', (e) => this.handleStageRightClick(e));
    
    // Mouse events for hover feedback
    this.stage.on('mousemove', (e) => this.handleMouseMove(e));
    this.stage.on('mouseenter', () => this.handleMouseEnter());
    this.stage.on('mouseleave', () => this.handleMouseLeave());

    console.log('✅ Event handlers registered');
  }

  private handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const gridPos = this.gridRenderer.pixelToGrid(pos);
    
    // Check if we clicked on an object
    const target = e.target;
    const isBackground = target === this.stage || target.getLayer() === this.gridRenderer.getBackgroundLayer() || target.getLayer() === this.gridRenderer.getGridLayer();
    
    if (isBackground) {
      // Clicked on empty space
      this.handleEmptySpaceClick(gridPos);
    } else {
      // Clicked on an object
      this.handleObjectClick(target, gridPos);
    }
  }

  private handleEmptySpaceClick(gridPos: GridPosition): void {
    console.log(`Empty space clicked: (${gridPos.x}, ${gridPos.y})`);
    
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        this.callbacks.onToolAction(ToolMode.PLACE, gridPos);
        break;
        
      case ToolMode.SELECT:
        // Deselect all when clicking empty space
        this.callbacks.onObjectDeselected();
        break;
        
      case ToolMode.DELETE:
        console.log('Nothing to delete at empty space');
        break;
        
      case ToolMode.MOVE:
        console.log('Move tool: click empty space');
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
        console.log('Place tool: clicked existing object');
        break;
        
      case ToolMode.SELECT:
        this.callbacks.onObjectSelected(objectId);
        break;
        
      case ToolMode.DELETE:
        this.callbacks.onToolAction(ToolMode.DELETE, gridPos, objectId);
        break;
        
      case ToolMode.MOVE:
        console.log(`Move tool: selected ${objectId}`);
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
    } else {
      console.log(`Objects at position (${objects.length}):`);
      objects.forEach((obj, index) => {
        console.log(`  ${index + 1}. ${obj.objectId} (${obj.objectType}) z:${obj.zIndex}`);
      });
    }

    // Could show context menu here in the future
    this.showContextInfo(gridPos, objects);
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
    
    // Could emit to a proper event system here
    console.log('Context info:', event);
  }

  private handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const gridPos = this.gridRenderer.pixelToGrid(pos);
    
    // Update cursor based on tool and hover target
    this.updateCursor(e.target, gridPos);
    
    // Show grid coordinates (could be displayed in UI)
    this.updateGridCoordinateDisplay(gridPos);
  }

  private updateCursor(target: Konva.Node, gridPos: GridPosition): void {
    const container = this.stage.container();
    
    const isBackground = target === this.stage || 
                        target.getLayer() === this.gridRenderer.getBackgroundLayer() || 
                        target.getLayer() === this.gridRenderer.getGridLayer();
    
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        // Check if placement is valid
        const canPlace = this.gridState.canPlaceObject(gridPos, { width: 1, height: 1 }, ZLayer.CHARACTERS);
        container.style.cursor = canPlace ? 'crosshair' : 'not-allowed';
        break;
        
      case ToolMode.SELECT:
        container.style.cursor = isBackground ? 'default' : 'pointer';
        break;
        
      case ToolMode.DELETE:
        container.style.cursor = isBackground ? 'default' : 'pointer';
        break;
        
      case ToolMode.MOVE:
        container.style.cursor = isBackground ? 'default' : 'grab';
        break;
        
      default:
        container.style.cursor = 'default';
    }
  }

  private updateGridCoordinateDisplay(gridPos: GridPosition): void {
    // Emit event for coordinate display update
    const event: GridEvent = {
      type: 'coordinateUpdate',
      data: { position: gridPos },
      timestamp: new Date()
    };
    
    // For now, just update window title or console
    if (this.gridRenderer.isValidGridPosition(gridPos)) {
      document.title = `Grid Master - (${gridPos.x}, ${gridPos.y})`;
    }
  }

  private handleMouseEnter(): void {
    // Mouse entered canvas
    this.updateCursor(this.stage, { x: 0, y: 0 });
  }

  private handleMouseLeave(): void {
    // Mouse left canvas
    const container = this.stage.container();
    container.style.cursor = 'default';
    document.title = 'Grid Master';
  }

  // Drag handling methods
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
      // Snap to grid
      const snappedPixelPos = this.gridRenderer.gridToPixel(newGridPos);
      konvaObject.x(snappedPixelPos.x);
      konvaObject.y(snappedPixelPos.y);
      console.log(`Drag success: ${objectId} moved to (${newGridPos.x}, ${newGridPos.y})`);
    } else {
      // Revert to original position
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
      // Reset to original color (this should come from object data)
      rect.strokeWidth(2);
      // Would need to store original color somewhere
    }
  }

  // Tool management
  public setTool(tool: ToolMode): void {
    this.appState.currentTool = tool;
    
    // Update object draggability based on tool
    this.updateObjectInteractivity();
    
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

  // Public methods
  public getCurrentGridPosition(): GridPosition | null {
    const pos = this.stage.getPointerPosition();
    return pos ? this.gridRenderer.pixelToGrid(pos) : null;
  }

  public isValidPlacement(position: GridPosition, width: number, height: number): boolean {
    return this.gridState.canPlaceObject(position, { width, height }, ZLayer.CHARACTERS);
  }

  // Cleanup
  public destroy(): void {
    // Remove all event listeners
    this.stage.off('click tap');
    this.stage.off('contextmenu');
    this.stage.off('mousemove');
    this.stage.off('mouseenter');
    this.stage.off('mouseleave');
    
    console.log('✅ EventManager destroyed');
  }
}