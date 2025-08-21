// Simple working main.ts

import Konva from 'konva';

console.log('🎮 Grid Master starting...');

class SimpleGrid {
  private stage: Konva.Stage;
  private layer: Konva.Layer;

  constructor() {
    const container = document.getElementById('game-canvas')!;
    
    this.stage = new Konva.Stage({
      container: container,
      width: 800,
      height: 600,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.drawGrid();
    this.addTestCharacters();
    this.setupEvents();

    console.log('✅ Simple grid ready');
  }

  private drawGrid() {
    // Background
    const bg = new Konva.Rect({
      width: 800,
      height: 600,
      fill: '#1e1e1e',
    });
    this.layer.add(bg);

    // Grid lines
    const tileSize = 48;
    for (let i = 0; i <= 800; i += tileSize) {
      const line = new Konva.Line({
        points: [i, 0, i, 600],
        stroke: '#404040',
        strokeWidth: 1,
      });
      this.layer.add(line);
    }

    for (let i = 0; i <= 600; i += tileSize) {
      const line = new Konva.Line({
        points: [0, i, 800, i],
        stroke: '#404040',
        strokeWidth: 1,
      });
      this.layer.add(line);
    }

    console.log('✅ Grid drawn');
  }

  private addTestCharacters() {
    // Simple 1x1 character
    const char1 = new Konva.Rect({
      x: 50,
      y: 50,
      width: 46,
      height: 46,
      fill: '#4CAF50',
      stroke: '#45a049',
      strokeWidth: 2,
      draggable: true,
    });

    // Simple 2x2 character
    const char2 = new Konva.Rect({
      x: 150,
      y: 100,
      width: 94, // 2 tiles
      height: 94,
      fill: '#FF5722',
      stroke: '#E64A19',
      strokeWidth: 2,
      draggable: true,
    });

    // Add snap-to-grid behavior
    [char1, char2].forEach(char => {
      char.on('dragend', () => {
        const x = Math.round(char.x() / 48) * 48 + 1;
        const y = Math.round(char.y() / 48) * 48 + 1;
        char.x(x);
        char.y(y);
      });
    });

    this.layer.add(char1);
    this.layer.add(char2);

    console.log('✅ Test characters added');
  }

  private setupEvents() {
    this.stage.on('click', (e) => {
      const pos = this.stage.getPointerPosition();
      if (pos) {
        const gridX = Math.floor(pos.x / 48);
        const gridY = Math.floor(pos.y / 48);
        console.log(`Clicked grid: (${gridX}, ${gridY})`);
      }
    });

    console.log('✅ Events setup');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    try {
      new SimpleGrid();
    } catch (error) {
      console.error('Failed:', error);
    }
  }, 100);
});