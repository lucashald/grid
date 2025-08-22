// src/EventManager.ts
// Manages events and interactions for the grid editor

import Konva from 'konva';
import { AppState, GridConfig, GridPosition, PixelPosition, DEFAULT_APP_STATE, DEFAULT_GRID_CONFIG, ToolMode } from './types';
import { GridRenderer } from './grid/GridRenderer';
import { GridState } from './grid/GridState';

export class EventManager {
  private stage: Konva.Stage;
  private gridRenderer: GridRenderer;
  private gridState: GridState;
  private appState: AppState;
  private callbacks: any;

  constructor(stage: Konva.Stage, gridRenderer: GridRenderer, gridState: GridState, appState: AppState, callbacks: any) {
    this.stage = stage;
    this.gridRenderer = gridRenderer;
    this.gridState = gridState;
    this.appState = appState;
    this.callbacks = callbacks;

    this.setupEventHandlers();
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
        // Use main app's tool action handler
        this.callbacks.onToolAction(ToolMode.PLACE, gridPos);
        break;
        
      case ToolMode.SELECT:
        this.callbacks.onSelectNone();
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
        this.callbacks.onSelectObject(objectId);
        break;
        
      case ToolMode.DELETE:
        this.callbacks.onDeleteObject(objectId);
        break;
        
      case ToolMode.MOVE:
        this.callbacks.onSelectObject(objectId);
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
}