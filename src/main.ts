// src/main.ts
// Grid Master Application with Enhanced UI Components

import { GridMaster } from './GridMaster';
import { EventManager, EventManagerCallbacks } from './ui/EventManager';
import { Sidebar, SidebarCallbacks } from './ui/Sidebar';
import { ToolMode, GridPosition, ObjectSize, ObjectType } from './types';

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
        this.gridMaster.setTool(tool);
        this.eventManager.setTool(tool);
        this.showStatus(`Tool: ${tool}`, 'info');
      },
      onSizeChanged: (size: ObjectSize) => {
        console.log(`📏 Size changed to ${size.width}x${size.height}`);
        this.showStatus(`Size: ${size.width}x${size.height}`, 'info');
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
    
    // Setup keyboard shortcuts
    this.sidebar.setupKeyboardShortcuts();
    
    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => {
      this.sidebar.handleResize();
    });
  }

  private handleToolAction(tool: ToolMode, position: GridPosition, target?: any): void {
    switch (tool) {
      case ToolMode.PLACE:
        console.log(`Place action at (${position.x}, ${position.y})`);
        this.showStatus(`Place at (${position.x}, ${position.y})`, 'info');
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

  private handleFileUpload(files: FileList): void {
    console.log(`📁 Processing ${files.length} file(s)`);
    
    let successCount = 0;
    Array.from(files).forEach((file, index) => {
      if (this.isValidImageFile(file)) {
        this.processImageFile(file);
        successCount++;
      } else {
        this.showStatus(`Invalid file: ${file.name}`, 'error');
      }
    });

    if (successCount > 0) {
      this.showStatus(`Processing ${successCount} image(s)...`, 'info');
    }
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  private processImageFile(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      console.log(`📷 Image loaded: ${file.name}`);
      
      this.showStatus(`Uploaded: ${file.name}`, 'success');
      this.addUploadedCharacterToLibrary(file.name, imageUrl);
    };
    
    reader.onerror = () => {
      this.showStatus(`Failed to load: ${file.name}`, 'error');
    };
    
    reader.readAsDataURL(file);
  }

  private addUploadedCharacterToLibrary(name: string, imageUrl: string): void {
    console.log(`Adding ${name} to character library`);
    
    const characters = [
      { 
        id: `upload-${Date.now()}`, 
        name: name.replace(/\.[^/.]+$/, ""), 
        imageUrl, 
        type: ObjectType.CHARACTER 
      }
    ];
    
    this.sidebar.updateCharacterLibrary(characters);
  }

  private handleAIGeneration(prompt: string, size: ObjectSize, type: ObjectType): void {
    console.log(`🤖 AI Generation:`);
    console.log(`   "${prompt}" (${size.width}x${size.height}, ${type})`);
    
    this.sidebar.disableGenerateButton();
    this.simulateAIGeneration(prompt, size, type);
  }

  private simulateAIGeneration(prompt: string, size: ObjectSize, type: ObjectType): void {
    this.showStatus('Generating with AI...', 'info');
    
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      
      if (success) {
        const generatedName = this.generateCharacterName(prompt);
        console.log(`✅ Generated: ${generatedName}`);
        this.showStatus(`Generated: ${generatedName}`, 'success');
        
        const characters = [
          { 
            id: `ai-${Date.now()}`, 
            name: generatedName, 
            imageUrl: '', // Will show colored rectangle
            type: type 
          }
        ];
        this.sidebar.updateCharacterLibrary(characters);
        this.sidebar.clearPrompt();
      } else {
        console.log(`❌ Generation failed`);
        this.showStatus('AI generation failed - try again', 'error');
      }
      
      this.sidebar.enableGenerateButton();
    }, 1500 + Math.random() * 2000); // 1.5-3.5 second delay
  }

  private generateCharacterName(prompt: string): string {
    const words = prompt.toLowerCase().split(' ');
    const descriptors = ['Mighty', 'Brave', 'Ancient', 'Swift', 'Noble', 'Fierce', 'Wise', 'Dark'];
    const types = ['Warrior', 'Mage', 'Archer', 'Knight', 'Wizard', 'Guardian', 'Ranger', 'Paladin'];
    
    let descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
    let characterType = types[Math.floor(Math.random() * types.length)];
    
    // Extract keywords from prompt
    if (words.includes('dragon')) characterType = 'Dragon';
    if (words.includes('orc')) characterType = 'Orc';
    if (words.includes('elf')) characterType = 'Elf';
    if (words.includes('knight')) characterType = 'Knight';
    if (words.includes('wizard') || words.includes('mage')) characterType = 'Wizard';
    
    if (words.includes('dark') || words.includes('evil')) descriptor = 'Dark';
    if (words.includes('brave') || words.includes('heroic')) descriptor = 'Brave';
    if (words.includes('ancient') || words.includes('old')) descriptor = 'Ancient';
    
    return `${descriptor} ${characterType}`;
  }

  private showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const statusIndicator = document.getElementById('status-indicator');
    if (statusIndicator) {
      statusIndicator.textContent = message;
      statusIndicator.className = `status-indicator ${type}`;
      statusIndicator.style.display = 'block';
      
      const delay = type === 'error' ? 4000 : 2500;
      setTimeout(() => {
        statusIndicator.style.display = 'none';
      }, delay);
    }
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
  }

  // Public API
  public getGridMaster(): GridMaster {
    return this.gridMaster;
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