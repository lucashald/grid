// src/grid/GridState.ts
// Manages grid state: tile occupation, collision detection, z-index management
// ALL GRID MATH REMOVED - Now uses GridRenderer for validation and calculations

import { GridPosition, ObjectSize, GridObjectInstance, ZLayer } from '../types';
import { GridRenderer } from './GridRenderer';

interface OccupationInfo {
  objectId: string;
  zIndex: number;
  objectType: string;
}

export class GridState {
  private occupiedTiles: Map<string, OccupationInfo[]> = new Map();
  private objectPositions: Map<string, GridPosition> = new Map();
  private objectSizes: Map<string, ObjectSize> = new Map();
  private gridRenderer: GridRenderer;

  constructor(gridRenderer: GridRenderer) {
    this.gridRenderer = gridRenderer;
    const dimensions = gridRenderer.getDimensions();
    console.log(`✅ GridState initialized (${dimensions.width}x${dimensions.height})`);
  }

  /**
   * Convert grid position to string key for Map storage
   */
  private positionToKey(position: GridPosition): string {
    return `${position.x},${position.y}`;
  }

  /**
   * Convert string key back to grid position
   */
  private keyToPosition(key: string): GridPosition {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }

  /**
   * Check if a position is within grid bounds - USES GRIDRENDERER
   */
  public isValidPosition(position: GridPosition): boolean {
    return this.gridRenderer.isValidGridPosition(position);
  }

  /**
   * Check if an area (position + size) fits within grid bounds - USES GRIDRENDERER
   */
  public isValidArea(position: GridPosition, size: ObjectSize): boolean {
    return this.gridRenderer.isValidObjectArea(position, size);
  }

  /**
   * Get all positions that would be occupied by an object - USES GRIDRENDERER
   */
  public getOccupiedPositions(position: GridPosition, size: ObjectSize): GridPosition[] {
    return this.gridRenderer.getOccupiedPositionsForObject(position, size);
  }

  /**
   * Check if a tile is occupied by any object
   */
  public isTileOccupied(position: GridPosition): boolean {
    const key = this.positionToKey(position);
    const occupation = this.occupiedTiles.get(key);
    return occupation !== undefined && occupation.length > 0;
  }

  /**
   * Check if a tile is occupied by objects at a specific z-layer or below
   */
  public isTileOccupiedAtLayer(position: GridPosition, maxZIndex: number): boolean {
    const key = this.positionToKey(position);
    const occupation = this.occupiedTiles.get(key);
    
    if (!occupation) return false;
    
    return occupation.some(info => info.zIndex <= maxZIndex);
  }

  /**
   * Check if an area can be placed (no blocking collisions)
   */
  public canPlaceObject(position: GridPosition, size: ObjectSize, zIndex: number, objectId?: string): boolean {
    // Check bounds using GridRenderer
    if (!this.gridRenderer.isValidObjectArea(position, size)) {
      return false;
    }

    // Get all positions this object would occupy using GridRenderer
    const positions = this.gridRenderer.getOccupiedPositionsForObject(position, size);

    // Check each position for conflicts
    for (const pos of positions) {
      const key = this.positionToKey(pos);
      const occupation = this.occupiedTiles.get(key);

      if (occupation) {
        // Check for blocking objects (same z-layer or blocking layers)
        for (const info of occupation) {
          // Skip if this is the same object (for move operations)
          if (objectId && info.objectId === objectId) {
            continue;
          }

          // Check for z-layer conflicts (simplified collision rules)
          if (this.hasZLayerConflict(zIndex, info.zIndex)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Determine if two z-indices conflict (block each other)
   */
  private hasZLayerConflict(zIndex1: number, zIndex2: number): boolean {
    // Characters block other characters
    if (zIndex1 === ZLayer.CHARACTERS && zIndex2 === ZLayer.CHARACTERS) {
      return true;
    }

    // Vehicles block other vehicles
    if (zIndex1 === ZLayer.VEHICLES && zIndex2 === ZLayer.VEHICLES) {
      return true;
    }

    // Props block other props and vehicles
    if (zIndex1 === ZLayer.PROPS && (zIndex2 === ZLayer.PROPS || zIndex2 === ZLayer.VEHICLES)) {
      return true;
    }
    if (zIndex2 === ZLayer.PROPS && zIndex1 === ZLayer.VEHICLES) {
      return true;
    }

    // Terrain blocks everything except effects and projectiles
    if (zIndex1 === ZLayer.TERRAIN && zIndex2 !== ZLayer.EFFECTS && zIndex2 !== ZLayer.PROJECTILES && zIndex2 !== ZLayer.UI) {
      return true;
    }
    if (zIndex2 === ZLayer.TERRAIN && zIndex1 !== ZLayer.EFFECTS && zIndex1 !== ZLayer.PROJECTILES && zIndex1 !== ZLayer.UI) {
      return true;
    }

    // Effects and projectiles don't block anything
    return false;
  }

  /**
   * Place an object on the grid
   */
  public placeObject(objectId: string, position: GridPosition, size: ObjectSize, zIndex: number, objectType: string): boolean {
    if (!this.canPlaceObject(position, size, zIndex, objectId)) {
      return false;
    }

    // Remove object if it already exists (for moves)
    this.removeObject(objectId);

    // Get all positions to occupy using GridRenderer
    const positions = this.gridRenderer.getOccupiedPositionsForObject(position, size);

    // Create occupation info
    const occupationInfo: OccupationInfo = {
      objectId,
      zIndex,
      objectType
    };

    // Mark all positions as occupied
    for (const pos of positions) {
      const key = this.positionToKey(pos);
      const existing = this.occupiedTiles.get(key) || [];
      existing.push(occupationInfo);
      this.occupiedTiles.set(key, existing);
    }

    // Store object metadata
    this.objectPositions.set(objectId, position);
    this.objectSizes.set(objectId, size);

    console.log(`✅ Object ${objectId} placed at (${position.x}, ${position.y})`);
    return true;
  }

  /**
   * Remove an object from the grid
   */
  public removeObject(objectId: string): boolean {
    const position = this.objectPositions.get(objectId);
    const size = this.objectSizes.get(objectId);

    if (!position || !size) {
      return false; // Object not found
    }

    // Get all positions to clear using GridRenderer
    const positions = this.gridRenderer.getOccupiedPositionsForObject(position, size);

    // Remove from all occupied positions
    for (const pos of positions) {
      const key = this.positionToKey(pos);
      const occupation = this.occupiedTiles.get(key);

      if (occupation) {
        const filtered = occupation.filter(info => info.objectId !== objectId);
        if (filtered.length === 0) {
          this.occupiedTiles.delete(key);
        } else {
          this.occupiedTiles.set(key, filtered);
        }
      }
    }

    // Remove object metadata
    this.objectPositions.delete(objectId);
    this.objectSizes.delete(objectId);

    console.log(`✅ Object ${objectId} removed`);
    return true;
  }

  /**
   * Move an object to a new position
   */
  public moveObject(objectId: string, newPosition: GridPosition): boolean {
    const size = this.objectSizes.get(objectId);
    if (!size) {
      return false; // Object not found
    }

    // Get object's current z-index
    const currentPosition = this.objectPositions.get(objectId);
    if (!currentPosition) {
      return false;
    }

    // Find the object's z-index from occupation data
    const key = this.positionToKey(currentPosition);
    const occupation = this.occupiedTiles.get(key);
    const objectInfo = occupation?.find(info => info.objectId === objectId);
    
    if (!objectInfo) {
      return false;
    }

    // Check if new position is valid
    if (!this.canPlaceObject(newPosition, size, objectInfo.zIndex, objectId)) {
      return false;
    }

    // Remove from old position
    this.removeObject(objectId);

    // Place at new position
    return this.placeObject(objectId, newPosition, size, objectInfo.zIndex, objectInfo.objectType);
  }

  /**
   * Get the object at a specific position (top-most if multiple)
   */
  public getObjectAtPosition(position: GridPosition): OccupationInfo | null {
    const key = this.positionToKey(position);
    const occupation = this.occupiedTiles.get(key);

    if (!occupation || occupation.length === 0) {
      return null;
    }

    // Return the highest z-index object
    return occupation.reduce((highest, current) => 
      current.zIndex > highest.zIndex ? current : highest
    );
  }

  /**
   * Get all objects at a specific position
   */
  public getAllObjectsAtPosition(position: GridPosition): OccupationInfo[] {
    const key = this.positionToKey(position);
    return this.occupiedTiles.get(key) || [];
  }

  /**
   * Get an object's current position
   */
  public getObjectPosition(objectId: string): GridPosition | null {
    return this.objectPositions.get(objectId) || null;
  }

  /**
   * Get an object's size
   */
  public getObjectSize(objectId: string): ObjectSize | null {
    return this.objectSizes.get(objectId) || null;
  }

  /**
   * Get all objects within a rectangular area - USES GRIDRENDERER
   */
  public getObjectsInArea(topLeft: GridPosition, bottomRight: GridPosition): OccupationInfo[] {
    const objects = new Map<string, OccupationInfo>();
    
    // Use GridRenderer to get positions in rectangle
    const positions = this.gridRenderer.getPositionsInRectangle(topLeft, bottomRight);
    
    for (const pos of positions) {
      const objectsAtPos = this.getAllObjectsAtPosition(pos);
      for (const obj of objectsAtPos) {
        objects.set(obj.objectId, obj);
      }
    }

    return Array.from(objects.values());
  }

  /**
   * Clear all objects from the grid
   */
  public clearAll(): void {
    this.occupiedTiles.clear();
    this.objectPositions.clear();
    this.objectSizes.clear();
    console.log('✅ Grid state cleared');
  }

  /**
   * Get grid statistics
   */
  public getStats(): {
    totalObjects: number;
    occupiedTiles: number;
    gridSize: { width: number; height: number };
  } {
    const dimensions = this.gridRenderer.getDimensions();
    return {
      totalObjects: this.objectPositions.size,
      occupiedTiles: this.occupiedTiles.size,
      gridSize: { width: dimensions.width, height: dimensions.height }
    };
  }

  /**
   * Update grid dimensions (called when GridRenderer resizes)
   */
  public handleGridResize(newWidth: number, newHeight: number): void {
    // Remove any objects that are now out of bounds
    const objectIds = Array.from(this.objectPositions.keys());
    for (const objectId of objectIds) {
      const position = this.objectPositions.get(objectId);
      const size = this.objectSizes.get(objectId);
      
      if (position && size && !this.gridRenderer.isValidObjectArea(position, size)) {
        this.removeObject(objectId);
        console.log(`⚠️ Object ${objectId} removed (out of bounds after resize)`);
      }
    }
    
    console.log(`✅ GridState updated for new dimensions: ${newWidth}x${newHeight}`);
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    this.clearAll();
    console.log('✅ GridState destroyed');
  }
}