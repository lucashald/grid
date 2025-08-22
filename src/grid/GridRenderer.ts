// src/grid/GridRenderer.ts
// Complete grid system - handles ALL grid-related functionality including rendering,
// coordinate math, responsive sizing, validation, and configuration management

import Konva from 'konva';
import { GridConfig, GridPosition, PixelPosition, ObjectSize } from '../types';

// Responsive configuration presets
interface ResponsivePreset {
  maxWidth: number;
  tileSize: number;
  minGridSize: { width: number; height: number };
  maxGridSize: { width: number; height: number };
}

const RESPONSIVE_PRESETS: ResponsivePreset[] = [
  { 
    maxWidth: 480, 
    tileSize: 28, 
    minGridSize: { width: 8, height: 6 },
    maxGridSize: { width: 15, height: 12 }
  },
  { 
    maxWidth: 768, 
    tileSize: 32, 
    minGridSize: { width: 10, height: 8 },
    maxGridSize: { width: 20, height: 15 }
  },
  { 
    maxWidth: 1024, 
    tileSize: 40, 
    minGridSize: { width: 15, height: 12 },
    maxGridSize: { width: 25, height: 20 }
  },
  { 
    maxWidth: 1440, 
    tileSize: 48, 
    minGridSize: { width: 20, height: 15 },
    maxGridSize: { width: 30, height: 25 }
  },
  { 
    maxWidth: 1920, 
    tileSize: 56, 
    minGridSize: { width: 25, height: 20 },
    maxGridSize: { width: 35, height: 30 }
  },
  { 
    maxWidth: Infinity, 
    tileSize: 64, 
    minGridSize: { width: 30, height: 25 },
    maxGridSize: { width: 50, height: 40 }
  }
];

const SIDEBAR_WIDTH_RATIO = 0.25; // 25% of screen width
const MIN_SIDEBAR_WIDTH = 300;
const MAX_SIDEBAR_WIDTH = 400;

export class GridRenderer {
  private gridLayer: Konva.Layer;
  private backgroundLayer: Konva.Layer;
  private config: GridConfig;
  private stage: Konva.Stage;
  private container: HTMLElement;

  constructor(stage: Konva.Stage, initialConfig?: Partial<GridConfig>) {
    this.stage = stage;
    this.container = stage.container();
    
    // Calculate responsive configuration
    this.config = this.calculateResponsiveConfig(initialConfig);
    
    // Create layers
    this.backgroundLayer = new Konva.Layer();
    this.gridLayer = new Konva.Layer();
    
    // Add layers to stage
    this.stage.add(this.backgroundLayer);
    this.stage.add(this.gridLayer);
    
    // Set up responsive resize handling
    this.setupResizeHandling();
    
    console.log('✅ GridRenderer initialized with responsive sizing');
    console.log(`   Grid: ${this.config.width}x${this.config.height} tiles`);
    console.log(`   Tile size: ${this.config.tileSize}px`);
    console.log(`   Canvas: ${this.getCanvasWidth()}x${this.getCanvasHeight()}px`);
  }

  // =============================================
  // RESPONSIVE CONFIGURATION SYSTEM
  // =============================================

  /**
   * Calculate optimal grid configuration based on current viewport
   */
  public calculateResponsiveConfig(overrides?: Partial<GridConfig>): GridConfig {
    const viewport = this.getViewportDimensions();
    const availableSpace = this.getAvailableCanvasSpace(viewport);
    const preset = this.selectResponsivePreset(viewport.width);
    
    // Calculate optimal grid dimensions
    const maxTilesWidth = Math.floor(availableSpace.width / preset.tileSize);
    const maxTilesHeight = Math.floor(availableSpace.height / preset.tileSize);
    
    // Clamp to preset limits
    const gridWidth = Math.max(
      preset.minGridSize.width,
      Math.min(preset.maxGridSize.width, maxTilesWidth)
    );
    
    const gridHeight = Math.max(
      preset.minGridSize.height,
      Math.min(preset.maxGridSize.height, maxTilesHeight)
    );

    // Create responsive configuration
    const responsiveConfig: GridConfig = {
      tileSize: preset.tileSize,
      width: gridWidth,
      height: gridHeight,
      showGrid: true,
      gridColor: '#404040',
      backgroundColor: '#1e1e1e',
      ...overrides
    };

    console.log(`📱 Responsive config calculated:`);
    console.log(`   Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`   Available canvas: ${availableSpace.width}x${availableSpace.height}`);
    console.log(`   Preset: ${preset.tileSize}px tiles`);
    console.log(`   Final grid: ${gridWidth}x${gridHeight} tiles`);

    return responsiveConfig;
  }

  /**
   * Get current viewport dimensions
   */
  private getViewportDimensions(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  /**
   * Calculate available space for canvas after accounting for UI elements
   */
  private getAvailableCanvasSpace(viewport: { width: number; height: number }): { width: number; height: number } {
    // Calculate sidebar width
    const sidebarWidth = this.calculateSidebarWidth(viewport.width);
    
    // Account for mobile behavior (sidebar collapses)
    const isMobile = viewport.width <= 768;
    const effectiveSidebarWidth = isMobile ? 0 : sidebarWidth;
    
    // Reserve some space for potential scrollbars and padding
    const padding = 20;
    
    return {
      width: viewport.width - effectiveSidebarWidth - padding,
      height: viewport.height - padding
    };
  }

  /**
   * Calculate sidebar width based on viewport
   */
  private calculateSidebarWidth(viewportWidth: number): number {
    const calculatedWidth = viewportWidth * SIDEBAR_WIDTH_RATIO;
    return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, calculatedWidth));
  }

  /**
   * Select appropriate responsive preset for viewport width
   */
  private selectResponsivePreset(viewportWidth: number): ResponsivePreset {
    return RESPONSIVE_PRESETS.find(preset => viewportWidth <= preset.maxWidth) || RESPONSIVE_PRESETS[RESPONSIVE_PRESETS.length - 1];
  }

  /**
   * Set up automatic resize handling
   */
  private setupResizeHandling(): void {
    let resizeTimeout: number;
    
    window.addEventListener('resize', () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.handleViewportResize();
      }, 250);
    });
  }

  /**
   * Handle viewport resize
   */
  private handleViewportResize(): void {
    console.log('📱 Viewport resize detected, recalculating grid...');
    
    const oldConfig = { ...this.config };
    const newConfig = this.calculateResponsiveConfig({
      showGrid: oldConfig.showGrid,
      gridColor: oldConfig.gridColor,
      backgroundColor: oldConfig.backgroundColor
    });
    
    // Check if significant changes occurred
    const significantChange = 
      Math.abs(newConfig.tileSize - oldConfig.tileSize) > 2 ||
      Math.abs(newConfig.width - oldConfig.width) > 2 ||
      Math.abs(newConfig.height - oldConfig.height) > 2;
    
    if (significantChange) {
      console.log(`📱 Significant grid change detected, updating...`);
      console.log(`   Old: ${oldConfig.width}x${oldConfig.height} @ ${oldConfig.tileSize}px`);
      console.log(`   New: ${newConfig.width}x${newConfig.height} @ ${newConfig.tileSize}px`);
      
      this.updateConfig(newConfig);
      
      // Dispatch custom event for other components to handle
      this.dispatchGridResizeEvent(oldConfig, newConfig);
    }
  }

  /**
   * Dispatch custom resize event
   */
  private dispatchGridResizeEvent(oldConfig: GridConfig, newConfig: GridConfig): void {
    const event = new CustomEvent('gridResize', {
      detail: { oldConfig, newConfig }
    });
    window.dispatchEvent(event);
  }

  // =============================================
  // COORDINATE SYSTEM & MATH
  // =============================================

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
   * Calculate the distance between two grid positions
   */
  public getGridDistance(pos1: GridPosition, pos2: GridPosition): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate Manhattan distance between two grid positions
   */
  public getManhattanDistance(pos1: GridPosition, pos2: GridPosition): number {
    return Math.abs(pos2.x - pos1.x) + Math.abs(pos2.y - pos1.y);
  }

  /**
   * Get all grid positions within a certain radius
   */
  public getPositionsInRadius(center: GridPosition, radius: number): GridPosition[] {
    const positions: GridPosition[] = [];
    
    const minX = Math.max(0, center.x - radius);
    const maxX = Math.min(this.config.width - 1, center.x + radius);
    const minY = Math.max(0, center.y - radius);
    const maxY = Math.min(this.config.height - 1, center.y + radius);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const distance = this.getGridDistance(center, { x, y });
        if (distance <= radius) {
          positions.push({ x, y });
        }
      }
    }
    
    return positions;
  }

  /**
   * Get all grid positions in a rectangular area
   */
  public getPositionsInRectangle(topLeft: GridPosition, bottomRight: GridPosition): GridPosition[] {
    const positions: GridPosition[] = [];
    
    const minX = Math.max(0, Math.min(topLeft.x, bottomRight.x));
    const maxX = Math.min(this.config.width - 1, Math.max(topLeft.x, bottomRight.x));
    const minY = Math.max(0, Math.min(topLeft.y, bottomRight.y));
    const maxY = Math.min(this.config.height - 1, Math.max(topLeft.y, bottomRight.y));
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        positions.push({ x, y });
      }
    }
    
    return positions;
  }

  // =============================================
  // VALIDATION SYSTEM
  // =============================================

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
   * Check if a grid area with ObjectSize fits within bounds
   */
  public isValidObjectArea(position: GridPosition, size: ObjectSize): boolean {
    return this.isValidGridArea(position, size.width, size.height);
  }

  /**
   * Get all grid positions occupied by an object at given position and size
   */
  public getOccupiedPositions(position: GridPosition, width: number, height: number): GridPosition[] {
    const positions: GridPosition[] = [];
    
    for (let x = position.x; x < position.x + width; x++) {
      for (let y = position.y; y < position.y + height; y++) {
        if (this.isValidGridPosition({ x, y })) {
          positions.push({ x, y });
        }
      }
    }
    
    return positions;
  }

  /**
   * Get occupied positions for an object with ObjectSize
   */
  public getOccupiedPositionsForObject(position: GridPosition, size: ObjectSize): GridPosition[] {
    return this.getOccupiedPositions(position, size.width, size.height);
  }

  /**
   * Get bounding box for a set of positions
   */
  public getBoundingBox(positions: GridPosition[]): { topLeft: GridPosition; bottomRight: GridPosition } | null {
    if (positions.length === 0) return null;
    
    let minX = positions[0].x;
    let maxX = positions[0].x;
    let minY = positions[0].y;
    let maxY = positions[0].y;
    
    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }
    
    return {
      topLeft: { x: minX, y: minY },
      bottomRight: { x: maxX, y: maxY }
    };
  }

  /**
   * Find the nearest valid position for placement
   */
  public findNearestValidPosition(
    target: GridPosition, 
    size: ObjectSize, 
    maxSearchRadius: number = 10,
    validator?: (pos: GridPosition) => boolean
  ): GridPosition | null {
    // Check target position first
    if (this.isValidObjectArea(target, size) && (!validator || validator(target))) {
      return target;
    }
    
    // Search in expanding squares
    for (let radius = 1; radius <= maxSearchRadius; radius++) {
      const candidates: GridPosition[] = [];
      
      // Generate positions in square perimeter
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check perimeter (not already checked positions)
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const candidate = { x: target.x + dx, y: target.y + dy };
            if (this.isValidObjectArea(candidate, size) && (!validator || validator(candidate))) {
              candidates.push(candidate);
            }
          }
        }
      }
      
      if (candidates.length > 0) {
        // Return closest candidate
        return candidates.reduce((closest, current) => {
          const closestDist = this.getGridDistance(target, closest);
          const currentDist = this.getGridDistance(target, current);
          return currentDist < closestDist ? current : closest;
        });
      }
    }
    
    return null;
  }

  // =============================================
  // RENDERING SYSTEM
  // =============================================

  /**
   * Initialize the complete grid rendering
   */
  public initialize(): void {
    this.updateStageSize();
    this.drawBackground();
    if (this.config.showGrid) {
      this.drawGrid();
    }
    console.log('✅ Grid rendering complete');
  }

  /**
   * Update stage size to match current configuration
   */
  private updateStageSize(): void {
    const canvasWidth = this.getCanvasWidth();
    const canvasHeight = this.getCanvasHeight();
    
    this.stage.width(canvasWidth);
    this.stage.height(canvasHeight);
    
    // Update container size if needed
    this.container.style.width = `${canvasWidth}px`;
    this.container.style.height = `${canvasHeight}px`;
  }

  /**
   * Draw the background layer
   */
  private drawBackground(): void {
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
  }

  /**
   * Draw the grid lines
   */
  public drawGrid(): void {
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
          listening: false,
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

  // =============================================
  // CONFIGURATION MANAGEMENT
  // =============================================

  /**
   * Update the grid configuration
   */
  public updateConfig(newConfig: Partial<GridConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Update stage size if dimensions changed
    if (newConfig.width !== undefined || newConfig.height !== undefined || newConfig.tileSize !== undefined) {
      this.updateStageSize();
    }
    
    // Re-render everything
    this.initialize();
    
    console.log('✅ Grid configuration updated');
    console.log(`   From: ${oldConfig.width}x${oldConfig.height} @ ${oldConfig.tileSize}px`);
    console.log(`   To: ${this.config.width}x${this.config.height} @ ${this.config.tileSize}px`);
  }

  /**
   * Force recalculation and update for current viewport
   */
  public updateForCurrentViewport(): void {
    const newConfig = this.calculateResponsiveConfig({
      showGrid: this.config.showGrid,
      gridColor: this.config.gridColor,
      backgroundColor: this.config.backgroundColor
    });
    
    this.updateConfig(newConfig);
  }

  // =============================================
  // GETTERS & UTILITY METHODS
  // =============================================

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
    return { ...this.config };
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
   * Get current responsive preset being used
   */
  public getCurrentPreset(): ResponsivePreset {
    const viewport = this.getViewportDimensions();
    return this.selectResponsivePreset(viewport.width);
  }

  /**
   * Get detailed grid information for debugging
   */
  public getGridInfo(): {
    config: GridConfig;
    preset: ResponsivePreset;
    viewport: { width: number; height: number };
    availableSpace: { width: number; height: number };
    canvasSize: { width: number; height: number };
  } {
    const viewport = this.getViewportDimensions();
    const availableSpace = this.getAvailableCanvasSpace(viewport);
    
    return {
      config: this.getConfig(),
      preset: this.getCurrentPreset(),
      viewport,
      availableSpace,
      canvasSize: {
        width: this.getCanvasWidth(),
        height: this.getCanvasHeight()
      }
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

  // =============================================
  // CLEANUP
  // =============================================

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    // Remove resize listener
    window.removeEventListener('resize', this.handleViewportResize);
    
    // Destroy layers
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