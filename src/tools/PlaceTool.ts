// src/tools/PlaceTool.ts
// Handles all object placement logic including templates, validation, and property management

import { 
  GridPosition, 
  ObjectSize, 
  GridObjectTemplate, 
  GridObjectInstance, 
  ObjectType, 
  ZLayer,
  getDefaultZIndex
} from '../types';
import { GridState } from '../grid/GridState';
import { GridRenderer } from '../grid/GridRenderer';

// Enhanced object properties for placement
export interface PlacementProperties {
  weight: number;        // Affects stacking ability (1-10 scale)
  stackable: boolean;    // Can other objects be placed on top
  climbable: boolean;    // Characters can move over this object
  moveable: boolean;     // Can be moved after placement
  solid: boolean;        // Blocks movement/placement
  passable: boolean;     // Objects can move through
  anchor: boolean;       // Cannot be moved or removed
}

// Default property sets for different object types
const DEFAULT_PROPERTIES: Record<ObjectType, PlacementProperties> = {
  [ObjectType.CHARACTER]: {
    weight: 5,
    stackable: false,
    climbable: false,
    moveable: true,
    solid: true,
    passable: false,
    anchor: false
  },
  [ObjectType.TERRAIN]: {
    weight: 10,
    stackable: true,
    climbable: true,
    moveable: false,
    solid: true,
    passable: false,
    anchor: true
  },
  [ObjectType.PROP]: {
    weight: 3,
    stackable: true,
    climbable: false,
    moveable: true,
    solid: true,
    passable: false,
    anchor: false
  },
  [ObjectType.VEHICLE]: {
    weight: 8,
    stackable: false,
    climbable: true,
    moveable: true,
    solid: true,
    passable: false,
    anchor: false
  },
  [ObjectType.EFFECT]: {
    weight: 0,
    stackable: false,
    climbable: false,
    moveable: false,
    solid: false,
    passable: true,
    anchor: false
  },
  [ObjectType.SPELL]: {
    weight: 0,
    stackable: false,
    climbable: false,
    moveable: false,
    solid: false,
    passable: true,
    anchor: false
  }
};

// Size-based weight modifiers
const SIZE_WEIGHT_MULTIPLIERS: Record<string, number> = {
  '1x1': 1.0,
  '1x2': 1.3,
  '2x1': 1.3,
  '2x2': 1.8,
  '2x3': 2.2,
  '3x2': 2.2,
  '3x3': 2.8,
  '4x4': 4.0
};

// Default character templates with enhanced properties
export const DEFAULT_TEMPLATES: GridObjectTemplate[] = [
  // 1x1 Characters
  {
    id: 'human-warrior',
    name: 'Human Warrior',
    type: ObjectType.CHARACTER,
    size: { width: 1, height: 1 },
    imageUrl: '/assets/characters/human-warrior.png',
    defaultZIndex: ZLayer.CHARACTERS,
    tags: ['character', 'human', 'warrior', 'melee'],
    description: 'A brave human warrior with sword and shield',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.CHARACTER],
      weight: 5 
    }
  },
  {
    id: 'elf-archer',
    name: 'Elf Archer',
    type: ObjectType.CHARACTER,
    size: { width: 1, height: 1 },
    imageUrl: '/assets/characters/elf-archer.png',
    defaultZIndex: ZLayer.CHARACTERS,
    tags: ['character', 'elf', 'archer', 'ranged'],
    description: 'An agile elf archer with keen eyes',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.CHARACTER],
      weight: 4 
    }
  },
  {
    id: 'dwarf-cleric',
    name: 'Dwarf Cleric',
    type: ObjectType.CHARACTER,
    size: { width: 1, height: 1 },
    imageUrl: '/assets/characters/dwarf-cleric.png',
    defaultZIndex: ZLayer.CHARACTERS,
    tags: ['character', 'dwarf', 'cleric', 'healer'],
    description: 'A stalwart dwarf cleric with divine magic',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.CHARACTER],
      weight: 6 
    }
  },
  {
    id: 'orc-berserker',
    name: 'Orc Berserker',
    type: ObjectType.CHARACTER,
    size: { width: 1, height: 1 },
    imageUrl: '/assets/characters/orc-berserker.png',
    defaultZIndex: ZLayer.CHARACTERS,
    tags: ['character', 'orc', 'berserker', 'hostile'],
    description: 'A fierce orc berserker in battle rage',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.CHARACTER],
      weight: 7 
    }
  },
  
  // 2x2 Large Creatures
  {
    id: 'ogre-brute',
    name: 'Ogre Brute',
    type: ObjectType.CHARACTER,
    size: { width: 2, height: 2 },
    imageUrl: '/assets/characters/ogre-brute.png',
    defaultZIndex: ZLayer.CHARACTERS,
    tags: ['character', 'ogre', 'large', 'hostile'],
    description: 'A massive ogre with crushing strength',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.CHARACTER],
      weight: 12,
      stackable: true // Large creatures can have small things on them
    }
  },
  {
    id: 'young-dragon',
    name: 'Young Dragon',
    type: ObjectType.CHARACTER,
    size: { width: 2, height: 2 },
    imageUrl: '/assets/characters/young-dragon.png',
    defaultZIndex: ZLayer.CHARACTERS,
    tags: ['character', 'dragon', 'large', 'boss'],
    description: 'A young but dangerous dragon',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.CHARACTER],
      weight: 15,
      stackable: true
    }
  },
  
  // Vehicles
  {
    id: 'war-cart',
    name: 'War Cart',
    type: ObjectType.VEHICLE,
    size: { width: 2, height: 1 },
    imageUrl: '/assets/vehicles/war-cart.png',
    defaultZIndex: ZLayer.VEHICLES,
    tags: ['vehicle', 'cart', 'transport'],
    description: 'A sturdy cart for transporting goods',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.VEHICLE],
      weight: 10,
      climbable: true
    }
  },
  
  // Terrain Features
  {
    id: 'stone-pillar',
    name: 'Stone Pillar',
    type: ObjectType.TERRAIN,
    size: { width: 1, height: 1 },
    imageUrl: '/assets/terrain/stone-pillar.png',
    defaultZIndex: ZLayer.TERRAIN,
    tags: ['terrain', 'stone', 'pillar', 'obstacle'],
    description: 'A solid stone pillar',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.TERRAIN],
      weight: 15
    }
  },
  {
    id: 'large-boulder',
    name: 'Large Boulder',
    type: ObjectType.TERRAIN,
    size: { width: 2, height: 2 },
    imageUrl: '/assets/terrain/large-boulder.png',
    defaultZIndex: ZLayer.TERRAIN,
    tags: ['terrain', 'boulder', 'rock', 'large'],
    description: 'A massive boulder blocking the path',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.TERRAIN],
      weight: 20,
      climbable: true
    }
  },
  
  // Props
  {
    id: 'wooden-crate',
    name: 'Wooden Crate',
    type: ObjectType.PROP,
    size: { width: 1, height: 1 },
    imageUrl: '/assets/props/wooden-crate.png',
    defaultZIndex: ZLayer.PROPS,
    tags: ['prop', 'crate', 'storage', 'moveable'],
    description: 'A wooden storage crate',
    customProperties: { 
      ...DEFAULT_PROPERTIES[ObjectType.PROP],
      weight: 3,
      climbable: true
    }
  }
];

// Placement validation result
export interface PlacementValidation {
  canPlace: boolean;
  reason?: string;
  suggestedPosition?: GridPosition;
  warnings: string[];
}

export interface PlaceToolCallbacks {
  onObjectPlaced: (instance: GridObjectInstance) => void;
  onPlacementFailed: (reason: string, position: GridPosition) => void;
  onTemplateSelected: (template: GridObjectTemplate) => void;
}

export class PlaceTool {
  private gridState: GridState;
  private gridRenderer: GridRenderer;
  private callbacks: PlaceToolCallbacks;
  
  // Current placement state
  private selectedTemplate: GridObjectTemplate | null = null;
  private previewMode = false;
  private availableTemplates: Map<string, GridObjectTemplate> = new Map();

  constructor(
    gridState: GridState,
    gridRenderer: GridRenderer,
    callbacks: PlaceToolCallbacks
  ) {
    this.gridState = gridState;
    this.gridRenderer = gridRenderer;
    this.callbacks = callbacks;
    
    this.loadDefaultTemplates();
    console.log('✅ PlaceTool initialized with', this.availableTemplates.size, 'templates');
  }

  /**
   * Load default character templates
   */
  private loadDefaultTemplates(): void {
    DEFAULT_TEMPLATES.forEach(template => {
      this.availableTemplates.set(template.id, template);
    });
  }

  /**
   * Get all available templates, optionally filtered by criteria
   */
  public getAvailableTemplates(filter?: {
    type?: ObjectType;
    size?: ObjectSize;
    tags?: string[];
    maxWeight?: number;
  }): GridObjectTemplate[] {
    let templates = Array.from(this.availableTemplates.values());
    
    if (filter) {
      if (filter.type) {
        templates = templates.filter(t => t.type === filter.type);
      }
      if (filter.size) {
        templates = templates.filter(t => 
          t.size.width === filter.size!.width && 
          t.size.height === filter.size!.height
        );
      }
      if (filter.tags) {
        templates = templates.filter(t => 
          filter.tags!.some(tag => t.tags.includes(tag))
        );
      }
      if (filter.maxWeight) {
        templates = templates.filter(t => 
          this.getObjectWeight(t) <= filter.maxWeight!
        );
      }
    }
    
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Select a template for placement
   */
  public selectTemplate(templateId: string): boolean {
    const template = this.availableTemplates.get(templateId);
    if (!template) {
      console.warn(`Template not found: ${templateId}`);
      return false;
    }
    
    this.selectedTemplate = template;
    this.callbacks.onTemplateSelected(template);
    console.log(`Template selected: ${template.name} (${template.size.width}x${template.size.height})`);
    return true;
  }

  /**
   * Get currently selected template
   */
  public getSelectedTemplate(): GridObjectTemplate | null {
    return this.selectedTemplate;
  }

  /**
   * Calculate object weight including size modifiers
   */
  private getObjectWeight(template: GridObjectTemplate): number {
    const baseWeight = (template.customProperties as PlacementProperties)?.weight || 
                      DEFAULT_PROPERTIES[template.type].weight;
    
    const sizeKey = `${template.size.width}x${template.size.height}`;
    const sizeMultiplier = SIZE_WEIGHT_MULTIPLIERS[sizeKey] || 1.0;
    
    return Math.round(baseWeight * sizeMultiplier);
  }

  /**
   * Get object placement properties
   */
  private getPlacementProperties(template: GridObjectTemplate): PlacementProperties {
    return {
      ...DEFAULT_PROPERTIES[template.type],
      ...(template.customProperties as Partial<PlacementProperties> || {})
    };
  }

  /**
   * Validate if an object can be placed at a position
   */
  public validatePlacement(
    position: GridPosition, 
    template?: GridObjectTemplate
  ): PlacementValidation {
    const targetTemplate = template || this.selectedTemplate;
    
    if (!targetTemplate) {
      return {
        canPlace: false,
        reason: 'No template selected',
        warnings: []
      };
    }

    const warnings: string[] = [];
    
    // Check grid bounds
    if (!this.gridRenderer.isValidGridArea(position, targetTemplate.size.width, targetTemplate.size.height)) {
      return {
        canPlace: false,
        reason: 'Object would extend beyond grid boundaries',
        suggestedPosition: this.findNearestValidPosition(position, targetTemplate.size),
        warnings
      };
    }

    // Check basic collision
    if (!this.gridState.canPlaceObject(position, targetTemplate.size, targetTemplate.defaultZIndex)) {
      // Check if it's a stacking situation
      const stackingValidation = this.validateStacking(position, targetTemplate);
      if (stackingValidation.canPlace) {
        return stackingValidation;
      }
      
      return {
        canPlace: false,
        reason: 'Position occupied by conflicting object',
        suggestedPosition: this.findNearestValidPosition(position, targetTemplate.size),
        warnings
      };
    }

    // Check weight-based stacking rules
    const stackingValidation = this.validateStacking(position, targetTemplate);
    if (!stackingValidation.canPlace && stackingValidation.reason) {
      return stackingValidation;
    }

    // Add any warnings
    if (stackingValidation.warnings.length > 0) {
      warnings.push(...stackingValidation.warnings);
    }

    return {
      canPlace: true,
      warnings
    };
  }

  /**
   * Validate stacking rules based on object weight and properties
   */
  private validateStacking(position: GridPosition, template: GridObjectTemplate): PlacementValidation {
    const newWeight = this.getObjectWeight(template);
    const newProps = this.getPlacementProperties(template);
    const warnings: string[] = [];

    // Get all positions this object would occupy
    const occupiedPositions = this.gridRenderer.getOccupiedPositions(position, template.size.width, template.size.height);
    
    for (const pos of occupiedPositions) {
      const existingObjects = this.gridState.getAllObjectsAtPosition(pos);
      
      for (const existing of existingObjects) {
        // Skip effects and projectiles (they don't participate in stacking)
        if (existing.zIndex === ZLayer.EFFECTS || existing.zIndex === ZLayer.PROJECTILES) {
          continue;
        }

        // Get existing object properties (we'd need to store these in GridState)
        // For now, use type-based defaults
        const existingType = this.getObjectTypeFromZIndex(existing.zIndex);
        const existingProps = DEFAULT_PROPERTIES[existingType];
        
        // Estimate existing object weight (we'd need actual data in production)
        const existingWeight = existingProps.weight;

        // Stacking rules
        if (template.type === ObjectType.CHARACTER) {
          // Characters generally can't stack
          if (existing.zIndex === ZLayer.CHARACTERS) {
            return {
              canPlace: false,
              reason: 'Characters cannot share the same space',
              warnings: []
            };
          }
          
          // Characters can stand on climbable objects
          if (existing.zIndex === ZLayer.TERRAIN || existing.zIndex === ZLayer.VEHICLES) {
            if (existingProps.climbable) {
              warnings.push(`Character will be standing on ${existing.objectType}`);
            } else {
              return {
                canPlace: false,
                reason: `Cannot climb on ${existing.objectType}`,
                warnings: []
              };
            }
          }
        } else {
          // Object stacking rules
          if (!existingProps.stackable) {
            return {
              canPlace: false,
              reason: `Cannot place objects on ${existing.objectType}`,
              warnings: []
            };
          }
          
          // Weight-based stacking
          if (newWeight > existingWeight * 2) {
            return {
              canPlace: false,
              reason: `Object too heavy to place on ${existing.objectType} (${newWeight} > ${existingWeight * 2})`,
              warnings: []
            };
          }
          
          if (newWeight > existingWeight) {
            warnings.push(`Heavy object on lighter base (${newWeight} vs ${existingWeight})`);
          }
        }
      }
    }

    return {
      canPlace: true,
      warnings
    };
  }

  /**
   * Helper to get object type from z-index (temporary until we store full object data)
   */
  private getObjectTypeFromZIndex(zIndex: number): ObjectType {
    switch (zIndex) {
      case ZLayer.TERRAIN: return ObjectType.TERRAIN;
      case ZLayer.VEHICLES: return ObjectType.VEHICLE;
      case ZLayer.PROPS: return ObjectType.PROP;
      case ZLayer.CHARACTERS: return ObjectType.CHARACTER;
      case ZLayer.EFFECTS: return ObjectType.EFFECT;
      case ZLayer.PROJECTILES: return ObjectType.SPELL;
      default: return ObjectType.PROP;
    }
  }

  /**
   * Find the nearest valid position for placement
   */
  private findNearestValidPosition(position: GridPosition, size: ObjectSize): GridPosition | undefined {
    const maxSearch = 5; // Search in 5-tile radius
    
    for (let radius = 1; radius <= maxSearch; radius++) {
      // Check positions in expanding square around target
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue; // Only check perimeter
          
          const testPos = { x: position.x + dx, y: position.y + dy };
          
          if (this.gridRenderer.isValidGridArea(testPos, size.width, size.height) &&
              this.gridState.canPlaceObject(testPos, size, ZLayer.CHARACTERS)) {
            return testPos;
          }
        }
      }
    }
    
    return undefined;
  }

  /**
   * Attempt to place the currently selected template at a position
   */
  public attemptPlacement(position: GridPosition): boolean {
    if (!this.selectedTemplate) {
      this.callbacks.onPlacementFailed('No template selected', position);
      return false;
    }

    const validation = this.validatePlacement(position);
    
    if (!validation.canPlace) {
      this.callbacks.onPlacementFailed(validation.reason || 'Placement failed', position);
      return false;
    }

    // Create object instance
    const instance: GridObjectInstance = {
      id: this.generateObjectId(this.selectedTemplate),
      templateId: this.selectedTemplate.id,
      position: position,
      zIndex: this.selectedTemplate.defaultZIndex,
      rotation: 0,
      opacity: 1.0,
      customData: {
        ...this.getPlacementProperties(this.selectedTemplate),
        weight: this.getObjectWeight(this.selectedTemplate)
      },
      createdAt: new Date()
    };

    // Place in grid state
    const placed = this.gridState.placeObject(
      instance.id,
      position,
      this.selectedTemplate.size,
      this.selectedTemplate.defaultZIndex,
      this.selectedTemplate.type
    );

    if (!placed) {
      this.callbacks.onPlacementFailed('Failed to place in grid state', position);
      return false;
    }

    // Notify success
    this.callbacks.onObjectPlaced(instance);
    
    // Log any warnings
    if (validation.warnings.length > 0) {
      console.warn('Placement warnings:', validation.warnings);
    }

    console.log(`✅ Placed ${this.selectedTemplate.name} at (${position.x}, ${position.y})`);
    return true;
  }

  /**
   * Generate unique object ID
   */
  private generateObjectId(template: GridObjectTemplate): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${template.id}-${timestamp}-${random}`;
  }

  /**
   * Add a custom template
   */
  public addTemplate(template: GridObjectTemplate): void {
    this.availableTemplates.set(template.id, template);
    console.log(`Added custom template: ${template.name}`);
  }

  /**
   * Remove a template
   */
  public removeTemplate(templateId: string): boolean {
    const removed = this.availableTemplates.delete(templateId);
    if (removed && this.selectedTemplate?.id === templateId) {
      this.selectedTemplate = null;
    }
    return removed;
  }

  /**
   * Get template by ID
   */
  public getTemplate(templateId: string): GridObjectTemplate | undefined {
    return this.availableTemplates.get(templateId);
  }

  /**
   * Toggle preview mode
   */
  public setPreviewMode(enabled: boolean): void {
    this.previewMode = enabled;
  }

  /**
   * Check if position is valid for current template
   */
  public isValidPosition(position: GridPosition): boolean {
    if (!this.selectedTemplate) return false;
    return this.validatePlacement(position).canPlace;
  }

  /**
   * Get placement properties for UI display
   */
  public getPlacementInfo(template?: GridObjectTemplate): {
    weight: number;
    properties: PlacementProperties;
    conflicts: string[];
  } {
    const targetTemplate = template || this.selectedTemplate;
    if (!targetTemplate) {
      return {
        weight: 0,
        properties: DEFAULT_PROPERTIES[ObjectType.PROP],
        conflicts: ['No template selected']
      };
    }

    return {
      weight: this.getObjectWeight(targetTemplate),
      properties: this.getPlacementProperties(targetTemplate),
      conflicts: [] // Could add conflict detection here
    };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.selectedTemplate = null;
    this.availableTemplates.clear();
    console.log('✅ PlaceTool destroyed');
  }
}