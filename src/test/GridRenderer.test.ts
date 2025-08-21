// src/grid/GridRenderer.test.ts
import { describe, it, expect } from 'vitest';
import { GridRenderer } from './GridRenderer';

describe('GridRenderer', () => {
  it('calculates correct grid positions', () => {
    const renderer = new GridRenderer(32); // 32px tiles
    
    const gridPos = renderer.pixelToGrid(64, 96);
    expect(gridPos).toEqual({ x: 2, y: 3 });
  });
  
  it('snaps coordinates to grid', () => {
    const renderer = new GridRenderer(32);
    
    const snapped = renderer.snapToGrid(67, 99);
    expect(snapped).toEqual({ x: 64, y: 96 });
  });
});