// src/tools/index.ts
// Export all tools for easy importing
export { PlaceTool, DEFAULT_TEMPLATES } from './PlaceTool';
export type { PlaceToolCallbacks, PlacementProperties, PlacementValidation } from './PlaceTool';

// ===================================================================
// Updated src/ui/EventManager.ts (additions/modifications)
// ===================================================================

// Add these imports at the top of EventManager.ts:
import { PlaceTool } from '../tools/PlaceTool';
import { GridObjectInstance } from '../types';

// Add to EventManagerCallbacks interface:
export interface EventManagerCallbacks {
  // ... existing callbacks
  onObjectPlaced: (instance: GridObjectInstance) => void;
  onPlacementFailed: (reason: string, position: GridPosition) => void;
  onTemplateSelected: (templateId: string) => void;
}

// Add to EventManager class:
export class EventManager {
  // ... existing properties
  private placeTool: PlaceTool;

  constructor(
    stage: Konva.Stage,
    gridRenderer: GridRenderer,
    gridState: GridState,
    appState: AppState,
    callbacks: EventManagerCallbacks
  ) {
    // ... existing constructor code
    
    // Initialize PlaceTool
    this.placeTool = new PlaceTool(
      gridState,
      gridRenderer,
      {
        onObjectPlaced: (instance) => this.callbacks.onObjectPlaced(instance),
        onPlacementFailed: (reason, position) => this.callbacks.onPlacementFailed(reason, position),
        onTemplateSelected: (template) => this.callbacks.onTemplateSelected(template.id)
      }
    );

    console.log('✅ EventManager initialized with PlaceTool');
  }

  // Update handleEmptySpaceClick method:
  private handleEmptySpaceClick(gridPos: GridPosition): void {
    console.log(`Empty space clicked: (${gridPos.x}, ${gridPos.y})`);
    
    switch (this.appState.currentTool) {
      case ToolMode.PLACE:
        // Use PlaceTool for placement
        this.placeTool.attemptPlacement(gridPos);
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

  // Update updateCursor method to use PlaceTool validation:
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
        
      // ... rest of cases remain the same
    }
  }

  // Add PlaceTool management methods:
  public getPlaceTool(): PlaceTool {
    return this.placeTool;
  }

  public selectTemplate(templateId: string): boolean {
    return this.placeTool.selectTemplate(templateId);
  }

  public getSelectedTemplate() {
    return this.placeTool.getSelectedTemplate();
  }

  // Update destroy method:
  public destroy(): void {
    // ... existing cleanup code
    this.placeTool?.destroy();
    console.log('✅ EventManager destroyed');
  }
}

// ===================================================================
// Updated src/main.ts (key modifications)
// ===================================================================

// Add these imports:
import { PlaceTool, DEFAULT_TEMPLATES } from './tools/PlaceTool';
import { GridObjectInstance } from './types';

// Update EnhancedGridMasterApp class:
class EnhancedGridMasterApp {
  private gridMaster: GridMaster;
  private eventManager: EventManager;
  private sidebar: Sidebar;

  // Add method to create visual representation of placed objects
  private createVisualObject(instance: GridObjectInstance): void {
    const template = this.eventManager.getPlaceTool().getTemplate(instance.templateId);
    if (!template) {
      console.error(`Template not found: ${instance.templateId}`);
      return;
    }

    const pixelPos = this.gridMaster.gridToPixel(instance.position);
    const stage = this.gridMaster.getStage();
    
    // Find or create object layer
    let objectLayer = stage.findOne('.object-layer') as Konva.Layer;
    if (!objectLayer) {
      objectLayer = new Konva.Layer({ name: 'object-layer' });
      stage.add(objectLayer);
    }

    // Create Konva group for the object
    const group = new Konva.Group({
      x: pixelPos.x,
      y: pixelPos.y,
      draggable: true,
      name: 'game-object'
    });

    // Try to load image, fallback to colored rectangle
    this.loadObjectImage(template.imageUrl, template, group, () => {
      objectLayer.add(group);
      objectLayer.draw();
      
      // Setup drag handlers
      this.eventManager.setupObjectDragHandlers(group, instance.id);
      
      // Set z-index
      group.zIndex(instance.zIndex);
      
      console.log(`✅ Visual object created: ${template.name}`);
    });
  }

  // Image loading with fallback
  private loadObjectImage(
    imageUrl: string, 
    template: any, 
    group: Konva.Group, 
    onComplete: () => void
  ): void {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      // Create fallback colored rectangle
      this.createFallbackVisual(template, group);
      onComplete();
      return;
    }

    const imageObj = new Image();
    imageObj.onload = () => {
      const image = new Konva.Image({
        x: 1,
        y: 1,
        image: imageObj,
        width: template.size.width * 48 - 2, // Assuming 48px tiles
        height: template.size.height * 48 - 2,
      });
      group.add(image);
      onComplete();
    };
    
    imageObj.onerror = () => {
      console.warn(`Failed to load image: ${imageUrl}, using fallback`);
      this.createFallbackVisual(template, group);
      onComplete();
    };
    
    imageObj.src = imageUrl;
  }

  // Create colored rectangle fallback
  private createFallbackVisual(template: any, group: Konva.Group): void {
    const colors = {
      character: '#4CAF50',
      terrain: '#8D6E63',
      vehicle: '#FF5722',
      prop: '#2196F3',
      effect: '#9C27B0',
      spell: '#E91E63'
    };

    const color = colors[template.type as keyof typeof colors] || '#666666';
    
    const rect = new Konva.Rect({
      x: 1,
      y: 1,
      width: template.size.width * 48 - 2,
      height: template.size.height * 48 - 2,
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
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening - you might want to use a proper color library
    return color.replace('#', '#').replace(/[0-9A-F]/gi, (match) => {
      const val = parseInt(match, 16);
      const darkened = Math.max(0, Math.floor(val * (1 - amount)));
      return darkened.toString(16).padStart(1, '0');
    });
  }

  // Update setupEventManager method:
  private setupEventManager(): void {
    const callbacks: EventManagerCallbacks = {
      onToolAction: (tool: ToolMode, position: GridPosition, target?: any) => {
        this.handleToolAction(tool, position, target);
      },
      onObjectSelected: (objectId: string) => {
        console.log(`🎯 Object selected: ${objectId}`);
        this.showStatus(`Selected: ${objectId}`, 'info');
      },
      onObjectDeselected: () => {
        console.log('🎯 Selection cleared');
        this.showStatus('Selection cleared', 'info');
      },
      onObjectMoved: (objectId: string, oldPos: GridPosition, newPos: GridPosition) => {
        console.log(`📦 Object ${objectId} moved from (${oldPos.x},${oldPos.y}) to (${newPos.x},${newPos.y})`);
        return true;
      },
      onDragStart: (objectId: string, position: GridPosition) => {
        console.log(`🚀 Drag started: ${objectId} at (${position.x},${position.y})`);
      },
      onDragEnd: (objectId: string, position: GridPosition, success: boolean) => {
        const status = success ? 'successful' : 'failed';
        console.log(`🏁 Drag ended: ${objectId} at (${position.x},${position.y}) - ${status}`);
        this.showStatus(`Move ${status}`, success ? 'success' : 'error');
      },
      // New PlaceTool callbacks:
      onObjectPlaced: (instance: GridObjectInstance) => {
        this.createVisualObject(instance);
        this.showStatus(`Placed: ${instance.templateId}`, 'success');
      },
      onPlacementFailed: (reason: string, position: GridPosition) => {
        this.showStatus(`Cannot place: ${reason}`, 'error');
        console.warn(`Placement failed at (${position.x},${position.y}): ${reason}`);
      },
      onTemplateSelected: (templateId: string) => {
        this.showStatus(`Template: ${templateId}`, 'info');
      }
    };

    this.eventManager = new EventManager(
      this.gridMaster.getStage(),
      (this.gridMaster as any).gridRenderer,
      (this.gridMaster as any).gridState,
      this.gridMaster.getAppState(),
      callbacks
    );
  }

  // Update setupSidebar method to populate character library:
  private setupSidebar(): void {
    const callbacks: SidebarCallbacks = {
      onToolChanged: (tool: ToolMode) => {
        this.gridMaster.setTool(tool);
        this.eventManager.setTool(tool);
        this.showStatus(`Tool: ${tool}`, 'info');
      },
      onSizeChanged: (size: ObjectSize) => {
        console.log(`📏 Size changed to ${size.width}x${size.height}`);
        this.showStatus(`Size: ${size.width}x${size.height}`, 'info');
        // Update character library to show matching sizes
        this.updateCharacterLibrary();
      },
      onFileUpload: (files: FileList) => {
        this.handleFileUpload(files);
      },
      onAIGenerate: (prompt: string, size: ObjectSize, type: ObjectType) => {
        this.handleAIGeneration(prompt, size, type);
      },
      onGridToggle: () => {
        this.gridMaster.toggleGrid();
        const isVisible = this.gridMaster.getGridConfig().showGrid;
        this.showStatus(`Grid ${isVisible ? 'shown' : 'hidden'}`, 'info');
      },
      onZoomIn: () => {
        console.log('🔍 Zoom in (coming soon)');
        this.showStatus('Zoom in - coming soon!', 'info');
      },
      onZoomOut: () => {
        console.log('🔍 Zoom out (coming soon)');
        this.showStatus('Zoom out - coming soon!', 'info');
      },
      onResetView: () => {
        console.log('🔄 Reset view (coming soon)');
        this.showStatus('Reset view - coming soon!', 'info');
      },
      onClearAll: () => {
        this.gridMaster.clearAll();
        this.showStatus('All objects cleared', 'success');
      }
    };

    this.sidebar = new Sidebar(callbacks);
    
    // Populate character library with default templates
    this.updateCharacterLibrary();
    
    // Setup keyboard shortcuts
    this.sidebar.setupKeyboardShortcuts();
    
    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => {
      this.sidebar.handleResize();
    });
  }

  // New method to update character library
  private updateCharacterLibrary(): void {
    const placeTool = this.eventManager.getPlaceTool();
    const currentSize = this.sidebar.getCurrentSize();
    
    // Get templates matching current size, or all if 1x1
    const filter = currentSize.width === 1 && currentSize.height === 1 
      ? undefined 
      : { size: currentSize };
    
    const templates = placeTool.getAvailableTemplates(filter);
    
    const characters = templates.map(template => ({
      id: template.id,
      name: template.name,
      imageUrl: template.imageUrl,
      type: template.type
    }));
    
    this.sidebar.updateCharacterLibrary(characters);
    
    // Setup click handlers for character selection
    this.setupCharacterLibraryHandlers();
  }

  // Setup character library click handlers
  private setupCharacterLibraryHandlers(): void {
    // Remove existing handlers
    document.querySelectorAll('.character-thumb[data-character-id]').forEach(thumb => {
      const newThumb = thumb.cloneNode(true);
      thumb.parentNode?.replaceChild(newThumb, thumb);
    });
    
    // Add new handlers
    document.querySelectorAll('.character-thumb[data-character-id]').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        const characterId = (e.currentTarget as HTMLElement).getAttribute('data-character-id');
        if (characterId) {
          const success = this.eventManager.selectTemplate(characterId);
          if (success) {
            // Update visual selection
            document.querySelectorAll('.character-thumb').forEach(t => t.classList.remove('selected'));
            thumb.classList.add('selected');
          }
        }
      });
    });
  }

  // Update handleToolAction to remove old placement logic
  private handleToolAction(tool: ToolMode, position: GridPosition, target?: any): void {
    switch (tool) {
      case ToolMode.PLACE:
        // PlaceTool now handles placement automatically
        console.log(`Place action handled by PlaceTool`);
        break;
        
      case ToolMode.SELECT:
        console.log(`Select action at (${position.x}, ${position.y})`);
        break;
        
      case ToolMode.DELETE:
        if (target) {
          console.log(`Delete action: ${target} at (${position.x}, ${position.y})`);
          this.showStatus(`Deleted object`, 'success');
        } else {
          this.showStatus(`Nothing to delete`, 'info');
        }
        break;
        
      case ToolMode.MOVE:
        console.log(`Move action at (${position.x}, ${position.y})`);
        break;
    }
  }

  // Add public method to get PlaceTool for debugging
  public getPlaceTool(): PlaceTool {
    return this.eventManager.getPlaceTool();
  }

  // ... rest of existing methods remain the same
}

// ===================================================================
// CSS additions for index.html (add to existing styles)
// ===================================================================

/*
Add these styles to the existing CSS in index.html:

.character-thumb.selected {
  border-color: var(--accent-color) !important;
  background: rgba(76, 175, 80, 0.1);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
}

.character-thumb[data-character-id] {
  cursor: pointer;
  transition: all 0.2s ease;
}

.character-thumb[data-character-id]:hover {
  border-color: var(--accent-color);
  transform: scale(1.05);
}

/* Placement feedback */
.status-indicator.placement-info {
  background: rgba(76, 175, 80, 0.9);
  color: white;
}

.status-indicator.placement-error {
  background: rgba(244, 67, 54, 0.9);
  color: white;
}
*/