// src/grid/GridRenderer.ts
// Handles all grid rendering, coordinate conversion, and visual management

import Konva from 'konva';
import { GridConfig, GridPosition, PixelPosition } from '../types';

export class GridRenderer {
  private gridLayer: Konva.Layer;
  private backgroundLayer: Konva.Layer;
  private config: GridConfig;
  private stage: Konva.Stage;

  constructor(stage: Konva.Stage, config: GridConfig) {
    this.stage = stage;
    this.config = config;
    
    // Create layers
    this.backgroundLayer = new Konva.Layer();
    this.gridLayer = new Konva.Layer();
    
    // Add layers to stage
    this.stage.add(this.backgroundLayer);
    this.stage.add(this.gridLayer);
    
    console.log('✅ GridRenderer initialized');
  }

  /**
   * Initialize the complete grid rendering
   */
  public initialize(): void {
    this.drawBackground();
    if (this.config.showGrid) {
      this.drawGrid();
    }
    console.log('✅ Grid rendering complete');
  }

  /**
   * Draw the background layer
   */
  private drawBackground(): void {
    // Clear existing background
    this.backgroundLayer.destroyChildren();
    
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.getCanvasWidth(),
      height: this.getCanvasHeight(),
      fill: this.config.backgroundColor,
    });
    
    this.backgroundLayer.add(background);
    this.backgroundLayer.draw();
    console.log('✅ Background rendered');
  }

  /**
   * Draw the grid lines
   */
  public drawGrid(): void {
    // Clear existing grid
    this.gridLayer.destroyChildren();
    
    if (!this.config.showGrid) {
      this.gridLayer.draw();
      return;
    }

    const { tileSize, width, height, gridColor } = this.config;
    const canvasWidth = this.getCanvasWidth();
    const canvasHeight = this.getCanvasHeight();
    
    // Draw vertical lines
    for (let i = 0; i <= width; i++) {
      const x = i * tileSize;
      if (x <= canvasWidth) {
        const line = new Konva.Line({
          points: [x, 0, x, canvasHeight],
          stroke: gridColor,
          strokeWidth: 1,
          listening: false, // Grid lines don't need to capture events
        });
        this.gridLayer.add(line);
      }
    }

    // Draw horizontal lines
    for (let i = 0; i <= height; i++) {
      const y = i * tileSize;
      if (y <= canvasHeight) {
        const line = new Konva.Line({
          points: [0, y, canvasWidth, y],
          stroke: gridColor,
          strokeWidth: 1,
          listening: false,
        });
        this.gridLayer.add(line);
      }
    }

    this.gridLayer.draw();
    console.log('✅ Grid lines rendered');
  }

  /**
   * Hide the grid lines
   */
  public hideGrid(): void {
    this.gridLayer.destroyChildren();
    this.gridLayer.draw();
    console.log('✅ Grid lines hidden');
  }

  /**
   * Toggle grid visibility
   */
  public toggleGrid(): void {
    this.config.showGrid = !this.config.showGrid;
    if (this.config.showGrid) {
      this.drawGrid();
    } else {
      this.hideGrid();
    }
    console.log(`✅ Grid visibility: ${this.config.showGrid}`);
  }

  /**
   * Convert pixel coordinates to grid coordinates
   */
  public pixelToGrid(pixel: PixelPosition): GridPosition {
    return {
      x: Math.floor(pixel.x / this.config.tileSize),
      y: Math.floor(pixel.y / this.config.tileSize)
    };
  }

  /**
   * Convert grid coordinates to pixel coordinates (top-left of tile)
   */
  public gridToPixel(grid: GridPosition): PixelPosition {
    return {
      x: grid.x * this.config.tileSize,
      y: grid.y * this.config.tileSize
    };
  }

  /**
   * Convert grid coordinates to centered pixel coordinates
   */
  public gridToPixelCenter(grid: GridPosition): PixelPosition {
    const halfTile = this.config.tileSize / 2;
    return {
      x: grid.x * this.config.tileSize + halfTile,
      y: grid.y * this.config.tileSize + halfTile
    };
  }

  /**
   * Snap pixel coordinates to the nearest grid position
   */
  public snapToGrid(pixel: PixelPosition): PixelPosition {
    const grid = this.pixelToGrid(pixel);
    return this.gridToPixel(grid);
  }

  /**
   * Check if a grid position is within bounds
   */
  public isValidGridPosition(position: GridPosition): boolean {
    return position.x >= 0 && 
           position.x < this.config.width && 
           position.y >= 0 && 
           position.y < this.config.height;
  }

  /**
   * Check if a grid area (position + size) fits within bounds
   */
  public isValidGridArea(position: GridPosition, width: number, height: number): boolean {
    return this.isValidGridPosition(position) &&
           position.x + width <= this.config.width &&
           position.y + height <= this.config.height;
  }

  /**
   * Get all grid positions occupied by an object at given position and size
   */
  public getOccupiedPositions(position: GridPosition, width: number, height: number): GridPosition[] {
    const positions: GridPosition[] = [];
    
    for (let x = position.x; x < position.x + width; x++) {
      for (let y = position.y; y < position.y + height; y++) {
        positions.push({ x, y });
      }
    }
    
    return positions;
  }

  /**
   * Calculate the distance between two grid positions
   */
  public getGridDistance(pos1: GridPosition, pos2: GridPosition): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get all grid positions within a certain radius
   */
  public getPositionsInRadius(center: GridPosition, radius: number): GridPosition[] {
    const positions: GridPosition[] = [];
    
    for (let x = Math.max(0, center.x - radius); x <= Math.min(this.config.width - 1, center.x + radius); x++) {
      for (let y = Math.max(0, center.y - radius); y <= Math.min(this.config.height - 1, center.y + radius); y++) {
        const distance = this.getGridDistance(center, { x, y });
        if (distance <= radius) {
          positions.push({ x, y });
        }
      }
    }
    
    return positions;
  }

  /**
   * Update the grid configuration
   */
  public updateConfig(newConfig: Partial<GridConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update stage size if dimensions changed
    if (newConfig.width !== undefined || newConfig.height !== undefined || newConfig.tileSize !== undefined) {
      this.stage.width(this.getCanvasWidth());
      this.stage.height(this.getCanvasHeight());
    }
    
    // Re-render everything
    this.initialize();
    console.log('✅ Grid configuration updated');
  }

  /**
   * Get the canvas width in pixels
   */
  public getCanvasWidth(): number {
    return this.config.width * this.config.tileSize;
  }

  /**
   * Get the canvas height in pixels
   */
  public getCanvasHeight(): number {
    return this.config.height * this.config.tileSize;
  }

  /**
   * Get the current grid configuration
   */
  public getConfig(): GridConfig {
    return { ...this.config }; // Return copy to prevent mutation
  }

  /**
   * Get grid dimensions
   */
  public getDimensions(): { width: number; height: number; tileSize: number } {
    return {
      width: this.config.width,
      height: this.config.height,
      tileSize: this.config.tileSize
    };
  }

  /**
   * Get the background layer for external access
   */
  public getBackgroundLayer(): Konva.Layer {
    return this.backgroundLayer;
  }

  /**
   * Get the grid layer for external access
   */
  public getGridLayer(): Konva.Layer {
    return this.gridLayer;
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    try {
      if (this.backgroundLayer && typeof this.backgroundLayer.destroy === 'function') {
        this.backgroundLayer.destroy();
      }
      if (this.gridLayer && typeof this.gridLayer.destroy === 'function') {
        this.gridLayer.destroy();
      }
    } catch (error) {
      console.warn('GridRenderer destroy warning:', error);
    }
    console.log('✅ GridRenderer destroyed');
  }
}