// src/ui/Sidebar.ts
// Manages all sidebar UI controls and interactions

import { ToolMode, ObjectSize, ObjectType, UploadResult } from '../types';

export interface SidebarCallbacks {
  onToolChanged: (tool: ToolMode) => void;
  onSizeChanged: (size: ObjectSize) => void;
  onFileUpload: (files: FileList) => void;
  onAIGenerate: (prompt: string, size: ObjectSize, type: ObjectType) => void;
  onGridToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onClearAll: () => void;
}

export class Sidebar {
  private callbacks: SidebarCallbacks;
  private currentTool: ToolMode = ToolMode.PLACE;
  private currentSize: ObjectSize = { width: 1, height: 1 };
  private currentType: ObjectType = ObjectType.CHARACTER;
  private isCollapsed = false;

  constructor(callbacks: SidebarCallbacks) {
    this.callbacks = callbacks;
    this.setupEventHandlers();
    console.log('✅ Sidebar initialized');
  }

  private setupEventHandlers(): void {
    this.setupToolButtons();
    this.setupSizeSelector();
    this.setupFileUpload();
    this.setupAIGeneration();
    this.setupGridControls();
    this.setupSidebarToggle();
    console.log('✅ Sidebar event handlers setup');
  }

  private setupToolButtons(): void {
    const toolButtons = document.querySelectorAll('[data-tool]');
    
    toolButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tool = (e.target as HTMLElement).getAttribute('data-tool') as ToolMode;
        if (tool && this.isValidTool(tool)) {
          this.setTool(tool);
        }
      });
    });

    // Set initial active tool
    this.updateToolButtons();
  }

  private isValidTool(tool: string): tool is ToolMode {
    return Object.values(ToolMode).includes(tool as ToolMode);
  }

  private setTool(tool: ToolMode): void {
    this.currentTool = tool;
    this.updateToolButtons();
    this.callbacks.onToolChanged(tool);
    console.log(`🔧 Tool changed to: ${tool}`);
  }

  private updateToolButtons(): void {
    const toolButtons = document.querySelectorAll('[data-tool]');
    
    toolButtons.forEach(button => {
      const tool = button.getAttribute('data-tool');
      if (tool === this.currentTool) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  private setupSizeSelector(): void {
    const sizeButtons = document.querySelectorAll('.size-option');
    
    sizeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const sizeStr = (e.target as HTMLElement).getAttribute('data-size');
        if (sizeStr) {
          const size = this.parseSizeString(sizeStr);
          if (size) {
            this.setSize(size);
          }
        }
      });
    });

    // Set initial selection
    this.updateSizeSelection();
  }

  private parseSizeString(sizeStr: string): ObjectSize | null {
    const match = sizeStr.match(/^(\d+)x(\d+)$/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10)
      };
    }
    return null;
  }

  private setSize(size: ObjectSize): void {
    this.currentSize = size;
    this.updateSizeSelection();
    this.callbacks.onSizeChanged(size);
    console.log(`📏 Size changed to: ${size.width}x${size.height}`);
  }

  private updateSizeSelection(): void {
    const sizeButtons = document.querySelectorAll('.size-option');
    const currentSizeStr = `${this.currentSize.width}x${this.currentSize.height}`;
    
    sizeButtons.forEach(button => {
      const size = button.getAttribute('data-size');
      if (size === currentSizeStr) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });
  }

  private setupFileUpload(): void {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    if (!uploadArea || !fileInput) {
      console.warn('Upload elements not found');
      return;
    }

    // Click to upload
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // File selection via input
    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFileUpload(files);
      }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      // Only remove dragover if we're actually leaving the upload area
      if (!uploadArea.contains(e.relatedTarget as Node)) {
        uploadArea.classList.remove('dragover');
      }
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFileUpload(files);
      }
    });
  }

  private handleFileUpload(files: FileList): void {
    console.log(`📁 Files selected: ${files.length}`);
    
    // Validate files
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

    Array.from(files).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        this.showStatus(`Unsupported file type: ${file.name}`, 'error');
        return;
      }
      
      if (file.size > maxSize) {
        this.showStatus(`File too large: ${file.name} (max 10MB)`, 'error');
        return;
      }
      
      validFiles.push(file);
      console.log(`📄 Valid file: ${file.name} (${this.formatFileSize(file.size)})`);
    });

    if (validFiles.length > 0) {
      const fileList = new FileList();
      // Unfortunately, FileList is read-only, so we pass the array
      this.callbacks.onFileUpload(files);
      this.showStatus(`${validFiles.length} file(s) uploaded successfully`, 'success');
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private setupAIGeneration(): void {
    const generateBtn = document.getElementById('generate-btn');
    const promptInput = document.getElementById('ai-prompt') as HTMLTextAreaElement;

    if (!generateBtn || !promptInput) {
      console.warn('AI generation elements not found');
      return;
    }

    // Generate button click
    generateBtn.addEventListener('click', () => {
      this.handleAIGeneration();
    });

    // Enter key in prompt (with Ctrl/Cmd for newline)
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.handleAIGeneration();
      }
    });

    // Character counter (optional enhancement)
    promptInput.addEventListener('input', () => {
      this.updatePromptCounter(promptInput.value.length);
    });
  }

  private handleAIGeneration(): void {
    const promptInput = document.getElementById('ai-prompt') as HTMLTextAreaElement;
    const prompt = promptInput?.value.trim();
    
    if (!prompt) {
      this.showStatus('Please enter a description first', 'error');
      return;
    }

    if (prompt.length < 3) {
      this.showStatus('Description too short (minimum 3 characters)', 'error');
      return;
    }

    console.log(`🤖 AI Generation requested:`);
    console.log(`   Prompt: "${prompt}"`);
    console.log(`   Size: ${this.currentSize.width}x${this.currentSize.height}`);
    console.log(`   Type: ${this.currentType}`);
    
    // Disable button during generation
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
      generateBtn.classList.add('loading');
      generateBtn.setAttribute('disabled', 'true');
      
      // Reset after timeout (simulated)
      setTimeout(() => {
        generateBtn.classList.remove('loading');
        generateBtn.removeAttribute('disabled');
      }, 3000);
    }
    
    this.callbacks.onAIGenerate(prompt, this.currentSize, this.currentType);
    this.showStatus('AI generation started...', 'info');
  }

  private updatePromptCounter(length: number): void {
    // Could add a character counter display
    const maxLength = 500;
    if (length > maxLength) {
      this.showStatus(`Prompt too long (${length}/${maxLength} characters)`, 'error');
    }
  }

  private setupGridControls(): void {
    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetBtn = document.getElementById('reset-view');
    const clearBtn = document.getElementById('clear-all');

    zoomInBtn?.addEventListener('click', () => {
      console.log('🔍 Zoom in clicked');
      this.callbacks.onZoomIn();
    });

    zoomOutBtn?.addEventListener('click', () => {
      console.log('🔍 Zoom out clicked');
      this.callbacks.onZoomOut();
    });

    resetBtn?.addEventListener('click', () => {
      console.log('🔄 Reset view clicked');
      this.callbacks.onResetView();
    });

    clearBtn?.addEventListener('click', () => {
      // Confirmation dialog
      if (confirm('Are you sure you want to clear all objects? This cannot be undone.')) {
        console.log('🗑️ Clear all confirmed');
        this.callbacks.onClearAll();
        this.showStatus('All objects cleared', 'info');
      }
    });

    // Grid toggle (could add a dedicated button)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.callbacks.onGridToggle();
      }
    });
  }

  private setupSidebarToggle(): void {
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    
    if (!toggleBtn || !sidebar) {
      console.warn('Sidebar toggle elements not found');
      return;
    }

    toggleBtn.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Keyboard shortcut (Tab key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && e.ctrlKey) {
        e.preventDefault();
        this.toggleSidebar();
      }
    });
  }

  private toggleSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    this.isCollapsed = !this.isCollapsed;
    
    if (this.isCollapsed) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
    
    console.log(`📱 Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`);
  }

  private showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const statusIndicator = document.getElementById('status-indicator');
    
    if (statusIndicator) {
      statusIndicator.textContent = message;
      statusIndicator.className = `status-indicator ${type}`;
      statusIndicator.style.display = 'block';
      
      // Auto-hide after delay based on type
      const delay = type === 'error' ? 5000 : 3000;
      setTimeout(() => {
        statusIndicator.style.display = 'none';
      }, delay);
    }
    
    console.log(`📢 Status (${type}): ${message}`);
  }

  // Public methods for external control
  public setToolFromExternal(tool: ToolMode): void {
    this.currentTool = tool;
    this.updateToolButtons();
  }

  public setSizeFromExternal(size: ObjectSize): void {
    this.currentSize = size;
    this.updateSizeSelection();
  }

  public getCurrentTool(): ToolMode {
    return this.currentTool;
  }

  public getCurrentSize(): ObjectSize {
    return this.currentSize;
  }

  public getCurrentType(): ObjectType {
    return this.currentType;
  }

  public setType(type: ObjectType): void {
    this.currentType = type;
    console.log(`🎭 Object type changed to: ${type}`);
  }

  public updateCharacterLibrary(characters: Array<{ id: string; name: string; imageUrl: string; type: ObjectType }>): void {
    const libraryGrid = document.getElementById('character-library');
    if (!libraryGrid) return;

    // Clear existing thumbnails
    libraryGrid.innerHTML = '';

    // Add character thumbnails
    characters.forEach(character => {
      const thumb = document.createElement('div');
      thumb.className = 'character-thumb';
      thumb.setAttribute('data-character-id', character.id);
      thumb.setAttribute('title', character.name);

      if (character.imageUrl) {
        const img = document.createElement('img');
        img.src = character.imageUrl;
        img.alt = character.name;
        img.onerror = () => {
          // Fallback to text if image fails to load
          thumb.innerHTML = character.type.charAt(0).toUpperCase();
        };
        thumb.appendChild(img);
      } else {
        // Text fallback
        thumb.textContent = character.type.charAt(0).toUpperCase();
      }

      // Click to select character for placement
      thumb.addEventListener('click', () => {
        this.selectCharacterForPlacement(character);
      });

      libraryGrid.appendChild(thumb);
    });

    // Fill remaining slots with empty placeholders
    const maxSlots = 12;
    const currentCount = characters.length;
    for (let i = currentCount; i < maxSlots; i++) {
      const emptyThumb = document.createElement('div');
      emptyThumb.className = 'character-thumb';
      emptyThumb.textContent = 'Empty';
      libraryGrid.appendChild(emptyThumb);
    }
  }

  private selectCharacterForPlacement(character: { id: string; name: string; type: ObjectType }): void {
    // Switch to place tool
    this.setTool(ToolMode.PLACE);
    
    // Update type
    this.setType(character.type);
    
    // Show selection feedback
    const thumbs = document.querySelectorAll('.character-thumb');
    thumbs.forEach(thumb => thumb.classList.remove('selected'));
    
    const selectedThumb = document.querySelector(`[data-character-id="${character.id}"]`);
    selectedThumb?.classList.add('selected');
    
    this.showStatus(`Selected ${character.name} for placement`, 'info');
    console.log(`Selected character: ${character.name} (${character.type})`);
  }

  public enableGenerateButton(): void {
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
      generateBtn.classList.remove('loading');
      generateBtn.removeAttribute('disabled');
    }
  }

  public disableGenerateButton(): void {
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
      generateBtn.classList.add('loading');
      generateBtn.setAttribute('disabled', 'true');
    }
  }

  public clearPrompt(): void {
    const promptInput = document.getElementById('ai-prompt') as HTMLTextAreaElement;
    if (promptInput) {
      promptInput.value = '';
    }
  }

  public setPrompt(prompt: string): void {
    const promptInput = document.getElementById('ai-prompt') as HTMLTextAreaElement;
    if (promptInput) {
      promptInput.value = prompt;
    }
  }

  // Keyboard shortcuts info
  public showKeyboardShortcuts(): void {
    const shortcuts = [
      'Ctrl/Cmd + G: Toggle grid',
      'Ctrl + Tab: Toggle sidebar',
      'P: Place tool',
      'S: Select tool', 
      'D: Delete tool',
      'M: Move tool',
      'Enter: Generate AI (when prompt focused)',
      'Esc: Clear selection'
    ];

    console.log('⌨️ Keyboard Shortcuts:');
    shortcuts.forEach(shortcut => console.log(`  ${shortcut}`));
  }

  // Tool keyboard shortcuts
  public setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          this.setTool(ToolMode.PLACE);
          break;
        case 's':
          this.setTool(ToolMode.SELECT);
          break;
        case 'd':
          this.setTool(ToolMode.DELETE);
          break;
        case 'm':
          this.setTool(ToolMode.MOVE);
          break;
        case 'escape':
          // Clear selection - would need callback
          console.log('Escape pressed - clear selection');
          break;
        case 'h':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.showKeyboardShortcuts();
          }
          break;
      }
    });

    console.log('⌨️ Keyboard shortcuts enabled (Ctrl/Cmd + H for help)');
  }

  // Responsive handling
  public handleResize(): void {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Auto-collapse on mobile
    if (window.innerWidth <= 768) {
      if (!this.isCollapsed) {
        this.toggleSidebar();
      }
    }
  }

  // Analytics/telemetry (optional)
  public trackAction(action: string, data?: any): void {
    console.log(`📊 Action: ${action}`, data);
    // Could send to analytics service
  }

  // Error handling
  public showError(error: string): void {
    this.showStatus(error, 'error');
  }

  public showSuccess(message: string): void {
    this.showStatus(message, 'success');
  }

  public showInfo(message: string): void {
    this.showStatus(message, 'info');
  }

  // Cleanup
  public destroy(): void {
    // Remove event listeners if needed
    // Most are attached to DOM elements that will be cleaned up automatically
    console.log('✅ Sidebar destroyed');
  }
}