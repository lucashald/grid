// src/types.ts
// Grid Master - Core Type Definitions

// Basic grid position
export interface GridPosition {
  x: number;
  y: number;
}

// Object dimensions in grid tiles
export interface ObjectSize {
  width: number;
  height: number;
}

// Pixel coordinates for canvas
export interface PixelPosition {
  x: number;
  y: number;
}

// Grid configuration
export interface GridConfig {
  tileSize: number;
  width: number;  // in tiles
  height: number; // in tiles
  showGrid: boolean;
  gridColor: string;
  backgroundColor: string;
}

// Object types for categorization
export enum ObjectType {
  CHARACTER = 'character',
  TERRAIN = 'terrain',
  SPELL = 'spell',
  EFFECT = 'effect',
  PROP = 'prop',
  VEHICLE = 'vehicle'
}

// Z-index layers (lower values render behind higher values)
export enum ZLayer {
  TERRAIN = 0,      // Floor tiles, pits - bottom layer
  VEHICLES = 100,   // Boulders, carts, mounts - can have things on top
  PROPS = 200,      // Furniture, rocks - can stack on vehicles
  EFFECTS = 300,    // Spell areas, magic circles - above physical objects
  CHARACTERS = 400, // Player characters, NPCs - on top of most things
  PROJECTILES = 500,// Flying spells, arrows - above characters
  UI = 1000         // Selection indicators, health bars - always on top
}

// Template for creating grid objects
export interface GridObjectTemplate {
  id: string;
  name: string;
  type: ObjectType;
  size: ObjectSize;
  imageUrl: string;
  defaultZIndex: number;
  tags: string[];
  description?: string;
  customProperties?: Record<string, any>;
}

// Instance of a placed object on the grid
export interface GridObjectInstance {
  id: string;
  templateId: string;
  position: GridPosition;
  zIndex: number;
  rotation?: number;
  opacity?: number;
  customData?: Record<string, any>;
  createdAt: Date;
}

// Tool modes for user interaction
export enum ToolMode {
  PLACE = 'place',
  SELECT = 'select',
  DELETE = 'delete',
  MOVE = 'move'
}

// Drag state information
export interface DragState {
  isDragging: boolean;
  objectId: string | null;
  startPosition: GridPosition | null;
  currentPosition: GridPosition | null;
  originalPosition: GridPosition | null;
}

// Selection state
export interface SelectionState {
  selectedObjectIds: string[];
  isMultiSelect: boolean;
}

// AI generation request
export interface AIGenerationRequest {
  prompt: string;
  size: ObjectSize;
  type: ObjectType;
  style?: string;
}

// File upload result
export interface UploadResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  filename?: string;
}

// Grid bounds for collision detection
export interface GridBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Event types for custom events
export interface GridEvent {
  type: string;
  data: any;
  timestamp: Date;
}

// Application state
export interface AppState {
  gridConfig: GridConfig;
  currentTool: ToolMode;
  dragState: DragState;
  selectionState: SelectionState;
  showGrid: boolean;
  snapToGrid: boolean;
}

// Utility type for creating new objects
export type CreateObjectTemplate = Omit<GridObjectTemplate, 'id'>;
export type CreateObjectInstance = Omit<GridObjectInstance, 'id' | 'createdAt'>;

// Default configurations
export const DEFAULT_GRID_CONFIG: GridConfig = {
  tileSize: 48,
  width: 20,
  height: 15,
  showGrid: true,
  gridColor: '#404040',
  backgroundColor: '#1e1e1e'
};

export const DEFAULT_APP_STATE: AppState = {
  gridConfig: DEFAULT_GRID_CONFIG,
  currentTool: ToolMode.PLACE,
  dragState: {
    isDragging: false,
    objectId: null,
    startPosition: null,
    currentPosition: null,
    originalPosition: null
  },
  selectionState: {
    selectedObjectIds: [],
    isMultiSelect: false
  },
  showGrid: true,
  snapToGrid: true
};

// Helper function to get default z-index for object type
export function getDefaultZIndex(type: ObjectType): number {
  switch (type) {
    case ObjectType.TERRAIN:
      return ZLayer.TERRAIN;
    case ObjectType.VEHICLE:
      return ZLayer.VEHICLES;
    case ObjectType.PROP:
      return ZLayer.PROPS;
    case ObjectType.EFFECT:
      return ZLayer.EFFECTS;
    case ObjectType.CHARACTER:
      return ZLayer.CHARACTERS;
    case ObjectType.SPELL:
      return ZLayer.PROJECTILES;
    default:
      return ZLayer.PROPS;
  }
}