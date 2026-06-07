import { describe, it, expect } from 'vitest';
import { inferComplexity } from '../../src/engine/inference';
import { ExtractedLoop } from '../../src/parser/astUtils';

describe('Complexity Inference Engine', () => {
  
  it('should return O(1) for empty loops', () => {
    const result = inferComplexity([]);
    expect(result.complexity).toBe('O(1)');
    expect(result.confidence).toBe('high');
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('should return O(n) for a single linear loop', () => {
    const loops: ExtractedLoop[] = [{
      type: 'for',
      startLine: 1,
      endLine: 3,
      classification: 'linear',
      confidence: 'high',
      childLoops: []
    }];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('O(n)');
    expect(result.confidence).toBe('high');
  });

  it('should return O(log n) for a single logarithmic loop', () => {
    const loops: ExtractedLoop[] = [{
      type: 'for',
      startLine: 1,
      endLine: 3,
      classification: 'logarithmic',
      confidence: 'high',
      childLoops: []
    }];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('O(log n)');
    expect(result.confidence).toBe('high');
  });

  it('should return O(n²) for nested linear loops', () => {
    const loops: ExtractedLoop[] = [{
      type: 'for',
      startLine: 1,
      endLine: 5,
      classification: 'linear',
      confidence: 'high',
      childLoops: [{
        type: 'for',
        startLine: 2,
        endLine: 4,
        classification: 'linear',
        confidence: 'high',
        childLoops: []
      }]
    }];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('O(n²)');
    expect(result.confidence).toBe('high');
  });

  it('should return O(n³) for three nested linear loops', () => {
    const loops: ExtractedLoop[] = [{
      type: 'for',
      startLine: 1,
      endLine: 7,
      classification: 'linear',
      confidence: 'high',
      childLoops: [{
        type: 'for',
        startLine: 2,
        endLine: 6,
        classification: 'linear',
        confidence: 'high',
        childLoops: [{
          type: 'for',
          startLine: 3,
          endLine: 5,
          classification: 'linear',
          confidence: 'high',
          childLoops: []
        }]
      }]
    }];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('O(n³)');
    expect(result.confidence).toBe('high');
  });

  it('should return O(n log n) for a linear loop containing a logarithmic loop', () => {
    const loops: ExtractedLoop[] = [{
      type: 'for',
      startLine: 1,
      endLine: 5,
      classification: 'linear',
      confidence: 'high',
      childLoops: [{
        type: 'for',
        startLine: 2,
        endLine: 4,
        classification: 'logarithmic',
        confidence: 'high',
        childLoops: []
      }]
    }];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('O(n log n)');
  });

  it('should return O(n) for sequential linear loops', () => {
    const loops: ExtractedLoop[] = [
      {
        type: 'for',
        startLine: 1,
        endLine: 3,
        classification: 'linear',
        confidence: 'high',
        childLoops: []
      },
      {
        type: 'for',
        startLine: 4,
        endLine: 6,
        classification: 'linear',
        confidence: 'high',
        childLoops: []
      }
    ];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('O(n)');
  });

  it('should ignore constant loops when dominated', () => {
    const loops: ExtractedLoop[] = [
      {
        type: 'for',
        startLine: 1,
        endLine: 3,
        classification: 'constant',
        confidence: 'high',
        childLoops: []
      },
      {
        type: 'for',
        startLine: 4,
        endLine: 6,
        classification: 'linear',
        confidence: 'high',
        childLoops: []
      }
    ];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('O(n)');
  });

  it('should merge confidence correctly (high + medium = medium)', () => {
    const loops: ExtractedLoop[] = [
      {
        type: 'for',
        startLine: 1,
        endLine: 3,
        classification: 'linear',
        confidence: 'high',
        childLoops: []
      },
      {
        type: 'for',
        startLine: 4,
        endLine: 6,
        classification: 'linear',
        confidence: 'medium',
        childLoops: []
      }
    ];
    const result = inferComplexity(loops);
    expect(result.confidence).toBe('medium');
  });

  it('should merge confidence correctly (high + low = low)', () => {
    const loops: ExtractedLoop[] = [{
      type: 'for',
      startLine: 1,
      endLine: 5,
      classification: 'linear',
      confidence: 'high',
      childLoops: [{
        type: 'for',
        startLine: 2,
        endLine: 4,
        classification: 'unknown',
        confidence: 'low',
        childLoops: []
      }]
    }];
    const result = inferComplexity(loops);
    expect(result.complexity).toBe('Unknown');
    expect(result.confidence).toBe('low');
  });

  it('should generate explanations correctly', () => {
    const loops: ExtractedLoop[] = [{
      type: 'for',
      startLine: 1,
      endLine: 5,
      classification: 'linear',
      confidence: 'high',
      childLoops: [{
        type: 'for',
        startLine: 2,
        endLine: 4,
        classification: 'linear',
        confidence: 'high',
        childLoops: []
      }]
    }];
    const result = inferComplexity(loops);
    expect(result.explanation.length).toBeGreaterThan(0);
    const text = result.explanation.join(' ');
    expect(text).toContain('Loop at line 2 classified as linear');
    expect(text).toContain('Loop at line 3 classified as linear');
    expect(text).toContain('multiply to produce O(n²)');
  });
});
