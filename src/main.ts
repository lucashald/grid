// src/main.ts
// Grid Master Application with PlaceTool Integration

import { GridMaster } from './GridMaster';
import { EventManager, EventManagerCallbacks } from './ui/EventManager';
import { Sidebar, SidebarCallbacks } from './ui/Sidebar';
import { PlaceTool } from './tools/PlaceTool';
import { ToolMode, GridPosition, ObjectSize, ObjectType, GridObjectInstance } from './types';
import Konva from 'konva';

console.log('🎮 Grid Master starting...');

class EnhancedGridMasterApp {
  private gridMaster: GridMaster;
  private eventManager: EventManager;
  private sidebar: Sidebar;

  constructor() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  private initialize(): void {
    try {
      // Initialize GridMaster
      this.gridMaster = new GridMaster('game-canvas', {
        tileSize: 48,
        width: Math.floor(800 / 48),
        height: Math.floor(600 / 48),
        showGrid: true,
        gridColor: '#404040',
        backgroundColor: '#1e1e1e'
      });

      // Initialize UI components
      this.setupEventManager();
      this.setupSidebar();

      console.log('✅ Enhanced GridMaster application ready');
    } catch (error) {
      console.error('❌ Failed to initialize GridMaster:', error);
    }
  }

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
        return true; // Allow move - GridMaster handles collision detection
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
        const template = this.eventManager.getPlaceTool().getTemplate(instance.templateId);
        this.showStatus(`Placed: ${template?.name || instance.templateId}`, 'success');
      },
      onPlacementFailed: (reason: string, position: GridPosition) => {
        this.showStatus(`Cannot place: ${reason}`, 'error');
        console.warn(`Placement failed at (${position.x},${position.y}): ${reason}`);
      },
      onTemplateSelected: (templateId: string) => {
        const template = this.eventManager.getPlaceTool().getTemplate(templateId);
        this.showStatus(`Selected: ${template?.name || templateId}`, 'info');
      }
    };

    this.eventManager = new EventManager(
      this.gridMaster.getStage(),
      (this.gridMaster as any).gridRenderer, // Access via type assertion
      (this.gridMaster as any).gridState,
      this.gridMaster.getAppState(),
      callbacks
    );
  }

  private setupSidebar(): void {
    const callbacks: SidebarCallbacks = {
      onToolChanged: (tool: ToolMode) => {
        console.log(`🔧 Main: Tool change requested: ${tool}`);
        this.gridMaster.setTool(tool);
        this.eventManager.setTool(tool);
        this.updateObjectInteractivity(); // Add this line
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

  // Create visual representation of placed objects
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
      draggable: false, // Will be enabled based on tool
      name: 'game-object'
    });

    // Store object data for later reference
    group.setAttr('objectId', instance.id);
    group.setAttr('templateId', instance.templateId);
    group.setAttr('gridPosition', instance.position);

    // Try to load image, fallback to colored rectangle
    this.loadObjectImage(template.imageUrl, template, group, () => {
      objectLayer.add(group);
      
      // Set z-index AFTER adding to layer (Konva needs parent first)
      const childIndex = Math.min(instance.zIndex, objectLayer.children.length - 1);
      group.zIndex(childIndex);
      
      objectLayer.draw();
      
      // Setup drag handlers
      this.eventManager.setupObjectDragHandlers(group, instance.id);
      
      // Update draggability based on current tool
      this.updateObjectInteractivity();
      
      console.log(`✅ Visual object created: ${template.name} at z-index ${childIndex}`);
    });
  }

  private updateObjectInteractivity(): void {
    const stage = this.gridMaster.getStage();
    const objectLayer = stage.findOne('.object-layer') as Konva.Layer;
    if (!objectLayer) return;
    
    const currentTool = this.sidebar.getCurrentTool();
    const objects = objectLayer.find('.game-object');
    
    objects.forEach(obj => {
      const isDraggable = currentTool === ToolMode.MOVE;
      obj.draggable(isDraggable);
    });
    
    console.log(`Updated ${objects.length} objects for tool: ${currentTool}`);
  }

  // Image loading with fallback
  private loadObjectImage(
    imageUrl: string, 
    template: any, 
    group: Konva.Group, 
    onComplete: () => void
  ): void {
    if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('/assets'))) {
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

    // Add name label for larger objects
    if (template.size.width > 1 || template.size.height > 1) {
      const nameLabel = new Konva.Text({
        x: 4,
        y: 18,
        text: template.name.substring(0, 8), // Truncate long names
        fontSize: 10,
        fontFamily: 'Arial',
        fill: 'white',
        listening: false
      });
      group.add(nameLabel);
    }

    group.add(rect);
    group.add(label);
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  // Update character library with filtered templates
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
    setTimeout(() => this.setupCharacterLibraryHandlers(), 100);
  }

  // Setup character library click handlers
  private setupCharacterLibraryHandlers(): void {
    // Remove existing handlers by cloning elements
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
            
            // Switch to place tool if not already selected
            if (this.sidebar.getCurrentTool() !== ToolMode.PLACE) {
              this.sidebar.setToolFromExternal(ToolMode.PLACE);
              this.gridMaster.setTool(ToolMode.PLACE);
              this.eventManager.setTool(ToolMode.PLACE);
            }
          }
        }
      });
    });
  }

  private handleToolAction(tool: ToolMode, position: GridPosition, target?: any): void {
    switch (tool) {
      case ToolMode.PLACE:
        console.log(`Place action handled by PlaceTool`);
        break;
        
      case ToolMode.SELECT:
        console.log(`Select action at (${position.x}, ${position.y})`);
        break;
        
      case ToolMode.DELETE:
        if (target) {
          console.log(`Delete action: ${target} at (${position.x}, ${position.y})`);
          this.deleteObject(target);
        } else {
          this.showStatus(`Nothing to delete`, 'info');
        }
        break;
        
      case ToolMode.MOVE:
        console.log(`Move action at (${position.x}, ${position.y})`);
        break;
    }
  }

  private deleteObject(objectId: string): void {
    const stage = this.gridMaster.getStage();
    const objectLayer = stage.findOne('.object-layer') as Konva.Layer;
    
    if (!objectLayer) {
      console.warn('No object layer found');
      this.showStatus('No objects to delete', 'error');
      return;
    }

    // Find the Konva object
    const konvaObject = objectLayer.findOne(`[objectId="${objectId}"]`) as Konva.Group;
    
    if (!konvaObject) {
      console.warn(`Konva object not found: ${objectId}`);
      this.showStatus('Object not found', 'error');
      return;
    }

    // Get object position for grid state cleanup
    const gridPosition = konvaObject.getAttr('gridPosition') as GridPosition;
    
    // Remove from grid state first
    const gridStateRemoved = (this.gridMaster as any).gridState.removeObject(objectId);
    
    if (!gridStateRemoved) {
      console.warn(`Failed to remove from grid state: ${objectId}`);
    }

    // Remove visual object
    konvaObject.destroy();
    objectLayer.draw();
    
    console.log(`✅ Deleted object: ${objectId} at (${gridPosition?.x}, ${gridPosition?.y})`);
    this.showStatus('Object deleted', 'success');
  }

  public debugObjectLayer(): void {
    const stage = this.gridMaster.getStage();
    const objectLayer = stage.findOne('.object-layer') as Konva.Layer;
    
    if (!objectLayer) {
      console.log('No object layer found');
      return;
    }
    
    const objects = objectLayer.find('.game-object');
    console.log(`Found ${objects.length} objects in layer:`);
    
    objects.forEach((obj, index) => {
      const objectId = obj.getAttr('objectId');
      const templateId = obj.getAttr('templateId');
      const position = obj.getAttr('gridPosition');
      console.log(`  ${index}: ${objectId} (${templateId}) at (${position?.x}, ${position?.y})`);
    });
  }

  // Create visual representation of placed objects
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
      draggable: false, // Will be enabled based on tool
      name: 'game-object'
    });

    // Store object data for later reference
    group.setAttr('objectId', instance.id);
    group.setAttr('templateId', instance.templateId);
    group.setAttr('gridPosition', instance.position);

    // Try to load image, fallback to colored rectangle
    this.loadObjectImage(template.imageUrl, template, group, () => {
      objectLayer.add(group);
      
      // Set z-index AFTER adding to layer (Konva needs parent first)
      const childIndex = Math.min(instance.zIndex, objectLayer.children.length - 1);
      group.zIndex(childIndex);
      
      objectLayer.draw();
      
      // Setup drag handlers
      this.eventManager.setupObjectDragHandlers(group, instance.id);
      
      // Update draggability based on current tool
      this.updateObjectInteractivity();
      
      console.log(`✅ Visual object created: ${template.name} at z-index ${childIndex}`);
    });
  }

  // Image loading with fallback
  private loadObjectImage(
    imageUrl: string, 
    template: any, 
    group: Konva.Group, 
    onComplete: () => void
  ): void {
    if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('/assets'))) {
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

    // Add name label for larger objects
    if (template.size.width > 1 || template.size.height > 1) {
      const nameLabel = new Konva.Text({
        x: 4,
        y: 18,
        text: template.name.substring(0, 8), // Truncate long names
        fontSize: 10,
        fontFamily: 'Arial',
        fill: 'white',
        listening: false
      });
      group.add(nameLabel);
    }

    group.add(rect);
    group.add(label);
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  // Update character library with filtered templates
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
    setTimeout(() => this.setupCharacterLibraryHandlers(), 100);
  }

  // Setup character library click handlers
  private setupCharacterLibraryHandlers(): void {
    // Remove existing handlers by cloning elements
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
            
            // Switch to place tool if not already selected
            if (this.sidebar.getCurrentTool() !== ToolMode.PLACE) {
              this.sidebar.setToolFromExternal(ToolMode.PLACE);
              this.gridMaster.setTool(ToolMode.PLACE);
              this.eventManager.setTool(ToolMode.PLACE);
            }
          }
        }
      });
    });
  }

  private handleToolAction(tool: ToolMode, position: GridPosition, target?: any): void {
    switch (tool) {
      case ToolMode.PLACE:
        console.log(`Place action handled by PlaceTool`);
        break;
        
      case ToolMode.SELECT:
        console.log(`Select action at (${position.x}, ${position.y})`);
        break;
        
      case ToolMode.DELETE:
        if (target) {
          console.log(`Delete action: ${target} at (${position.x}, ${position.y})`);
          this.deleteObject(target);
        } else {
          this.showStatus(`Nothing to delete`, 'info');
        }
        break;
        
      case ToolMode.MOVE:
        console.log(`Move action at (${position.x}, ${position.y})`);
        break;
    }
  }

  private deleteObject(objectId: string): void {
    const stage = this.gridMaster.getStage();
    const objectLayer = stage.findOne('.object-layer') as Konva.Layer;
    
    if (!objectLayer) {
      console.warn('No object layer found');
      this.showStatus('No objects to delete', 'error');
      return;
    }

    // Find the Konva object
    const konvaObject = objectLayer.findOne(`[objectId="${objectId}"]`) as Konva.Group;
    
    if (!konvaObject) {
      console.warn(`Konva object not found: ${objectId}`);
      this.showStatus('Object not found', 'error');
      return;
    }

    // Get object position for grid state cleanup
    const gridPosition = konvaObject.getAttr('gridPosition') as GridPosition;
    
    // Remove from grid state first
    const gridStateRemoved = (this.gridMaster as any).gridState.removeObject(objectId);
    
    if (!gridStateRemoved) {
      console.warn(`Failed to remove from grid state: ${objectId}`);
    }

    // Remove visual object
    konvaObject.destroy();
    objectLayer.draw();
    
    console.log(`✅ Deleted object: ${objectId} at (${gridPosition?.x}, ${gridPosition?.y})`);
    this.showStatus('Object deleted', 'success');
  }

  public debugObjectLayer(): void {
    const stage = this.gridMaster.getStage();
    const objectLayer = stage.findOne('.object-layer') as Konva.Layer;
    
    if (!objectLayer) {
      console.log('No object layer found');
      return;
    }
    
    const objects = objectLayer.find('.game-object');
    console.log(`Found ${objects.length} objects in layer:`);
    
    objects.forEach((obj, index) => {
      const objectId = obj.getAttr('objectId');
      const templateId = obj.getAttr('templateId');
      const position = obj.getAttr('gridPosition');
      console.log(`  ${index}: ${objectId} (${templateId}) at (${position?.x}, ${position?.y})`);
    });
  }

  // Public API
  public getGridMaster(): GridMaster {
    return this.gridMaster;
  }

  public getPlaceTool(): PlaceTool {
    return this.eventManager.getPlaceTool();
  }

  public showGridStats(): void {
    const stats = this.gridMaster.getGridStats();
    console.log('📊 Grid Statistics:', stats);
    this.showStatus(`${stats.totalObjects} objects, ${stats.occupiedTiles} tiles`, 'info');
  }

  public showHelp(): void {
    this.sidebar.showKeyboardShortcuts();
  }

  public destroy(): void {
    this.eventManager?.destroy();
    this.sidebar?.destroy();
    this.gridMaster?.destroy();
    console.log('🧹 Application destroyed');
  }
}

// Initialize the application
const app = new EnhancedGridMasterApp();

// Global access for debugging
(window as any).gridApp = app;

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'i':
        e.preventDefault();
        app.showGridStats();
        break;
      case '/':
        e.preventDefault();
        app.showHelp();
        break;
    }
  }
});

export { EnhancedGridMasterApp };