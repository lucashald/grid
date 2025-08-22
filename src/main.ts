// src/main.ts
// Grid Master Application with Single Object Management System

import { GridMaster } from './GridMaster';
import { EventManager, EventManagerCallbacks } from './ui/EventManager';
import { Sidebar, SidebarCallbacks } from './ui/Sidebar';
import { PlaceTool } from './tools/PlaceTool';
import { ToolMode, GridPosition, ObjectSize, ObjectType, GridObjectInstance } from './types';

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
      // PlaceTool callbacks - create GridObject for visual representation
      onObjectPlaced: (instance: GridObjectInstance) => {
        const template = this.eventManager.getPlaceTool().getTemplate(instance.templateId);
        if (template) {
          // Create a GridObject for this placed instance (but don't place in GridState again)
          const gridObject = this.createGridObjectForInstance(instance, template);
          if (gridObject) {
            this.showStatus(`Placed: ${template.name}`, 'success');
          } else {
            this.showStatus(`Failed to create visual: ${template.name}`, 'error');
          }
        }
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

  // Status display method - delegates to sidebar
  private showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.sidebar) {
      switch (type) {
        case 'success':
          this.sidebar.showSuccess(message);
          break;
        case 'error':
          this.sidebar.showError(message);
          break;
        case 'info':
        default:
          this.sidebar.showInfo(message);
          break;
      }
    }
    console.log(`📢 Status (${type}): ${message}`);
  }

  // File upload handling
  private handleFileUpload(files: FileList): void {
    console.log(`📁 Processing ${files.length} files...`);
    
    Array.from(files).forEach((file, index) => {
      console.log(`📄 File ${index + 1}: ${file.name} (${this.formatFileSize(file.size)})`);
      
      // Create a mock character template from uploaded file
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        if (imageUrl) {
          this.addCustomCharacterFromUpload(file.name, imageUrl);
        }
      };
      reader.readAsDataURL(file);
    });
    
    this.showStatus(`${files.length} file(s) uploaded`, 'success');
  }

  // AI generation handling (mock implementation)
  private handleAIGeneration(prompt: string, size: ObjectSize, type: ObjectType): void {
    console.log(`🤖 AI Generation started:`);
    console.log(`   Prompt: "${prompt}"`);
    console.log(`   Size: ${size.width}x${size.height}`);
    console.log(`   Type: ${type}`);
    
    // Simulate AI generation delay
    setTimeout(() => {
      this.addMockAICharacter(prompt, size, type);
      this.sidebar.enableGenerateButton();
      this.showStatus('AI character generated!', 'success');
    }, 2000 + Math.random() * 1000); // 2-3 second delay
  }

  // Create mock AI character
  private addMockAICharacter(prompt: string, size: ObjectSize, type: ObjectType): void {
    const placeTool = this.eventManager.getPlaceTool();
    const shortPrompt = prompt.substring(0, 20).replace(/[^a-zA-Z0-9\s]/g, '');
    const characterName = shortPrompt || 'AI Character';
    
    const template = {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: characterName,
      type: type,
      size: size,
      imageUrl: '', // No image for mock
      defaultZIndex: this.getDefaultZIndex(type),
      tags: ['ai-generated', type, 'custom'],
      description: `AI generated: ${prompt}`,
      customProperties: {}
    };
    
    placeTool.addTemplate(template);
    // Also add to GridMaster's template system
    this.gridMaster.addTemplate(template);
    this.updateCharacterLibrary();
    console.log(`✅ Added AI character: ${characterName}`);
  }

  // Create character from uploaded file
  private addCustomCharacterFromUpload(filename: string, imageUrl: string): void {
    const placeTool = this.eventManager.getPlaceTool();
    const characterName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    const template = {
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: characterName,
      type: ObjectType.CHARACTER,
      size: { width: 1, height: 1 },
      imageUrl: imageUrl,
      defaultZIndex: this.getDefaultZIndex(ObjectType.CHARACTER),
      tags: ['uploaded', 'character', 'custom'],
      description: `Uploaded: ${filename}`,
      customProperties: {}
    };
    
    placeTool.addTemplate(template);
    // Also add to GridMaster's template system
    this.gridMaster.addTemplate(template);
    this.updateCharacterLibrary();
    console.log(`✅ Added uploaded character: ${characterName}`);
  }

  // Create a GridObject for an instance that's already placed in GridState
  private createGridObjectForInstance(instance: GridObjectInstance, template: GridObjectTemplate): any {
    // Import the GridObject class (we'll need to expose it from GridMaster)
    // For now, let's manually create the visual and add it to GridMaster's tracking
    return this.gridMaster.addExistingObject(instance, template);
  }

  // Helper method for getting default z-index
  private getDefaultZIndex(type: ObjectType): number {
    const zIndexMap = {
      [ObjectType.TERRAIN]: 0,
      [ObjectType.VEHICLE]: 100,
      [ObjectType.PROP]: 200,
      [ObjectType.EFFECT]: 300,
      [ObjectType.CHARACTER]: 400,
      [ObjectType.SPELL]: 500
    };
    return zIndexMap[type] || 200;
  }

  // Format file size for display
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        // Handle placement directly through GridMaster instead of PlaceTool
        const selectedTemplate = this.eventManager.getPlaceTool().getSelectedTemplate();
        if (selectedTemplate) {
          const success = this.gridMaster.placeObjectFromTemplate(selectedTemplate, position);
          if (success) {
            this.showStatus(`Placed: ${selectedTemplate.name}`, 'success');
          } else {
            this.showStatus(`Cannot place: collision or invalid position`, 'error');
          }
        } else {
          this.showStatus('No template selected', 'error');
        }
        break;
        
      case ToolMode.SELECT:
        console.log(`Select action at (${position.x}, ${position.y})`);
        break;
        
      case ToolMode.DELETE:
        if (target) {
          console.log(`Delete action: ${target} at (${position.x}, ${position.y})`);
          // Use GridMaster's removeObject method instead of our own
          const success = this.gridMaster.removeObject(target);
          if (success) {
            this.showStatus('Object deleted', 'success');
          } else {
            this.showStatus('Failed to delete object', 'error');
          }
        } else {
          this.showStatus(`Nothing to delete`, 'info');
        }
        break;
        
      case ToolMode.MOVE:
        console.log(`Move action at (${position.x}, ${position.y})`);
        break;
    }
  }

  // Public API methods
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

  public debugObjectLayer(): void {
    this.gridMaster.debugObjectLayer();
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