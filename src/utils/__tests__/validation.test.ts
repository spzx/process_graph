/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateNode,
  validateGraph,
  findOrphanNodes,
  findDeadEndNodes,
  detectCircularDependencies,
  generateGraphStats,
  safeValidateGraph,
} from '../validation';
import { GraphNode } from '../../types';

describe('validation', () => {
  describe('validateNode', () => {
    it('should validate a correct node', () => {
      const validNode: GraphNode = {
        nodeId: 'test-node',
        description: 'Test description',
        shortDescription: 'Test',
        nextNodes: [
          { on: 'YES', to: 'next-node', description: 'Go to next' },
        ],
      };
      
      const errors = validateNode(validNode, 0);
      expect(errors).toHaveLength(0);
    });

    it('should detect empty nodeId', () => {
      const invalidNode = {
        nodeId: '',
        description: 'Test description',
        shortDescription: 'Test',
        nextNodes: [],
      };
      
      const errors = validateNode(invalidNode, 0);
      expect(errors.some(error => error.includes('nodeId cannot be empty'))).toBe(true);
    });

    it('should detect empty descriptions', () => {
      const invalidNode = {
        nodeId: 'test',
        description: '',
        shortDescription: '',
        nextNodes: [],
      };
      
      const errors = validateNode(invalidNode, 0);
      expect(errors.some(error => error.includes('shortDescription cannot be empty'))).toBe(true);
      expect(errors.some(error => error.includes('description cannot be empty'))).toBe(true);
    });

    it('should detect invalid node type', () => {
      const invalidNode = {
        nodeId: 'test',
        description: 'Test',
        shortDescription: 'Test',
        nextNodes: [],
        type: 'invalid' as any,
      };
      
      const errors = validateNode(invalidNode, 0);
      expect(errors.some(error => error.includes('invalid node type'))).toBe(true);
    });

    it('should validate nextNodes structure', () => {
      const nodeWithEmptyNextNode = {
        nodeId: 'test',
        description: 'Test',
        shortDescription: 'Test',
        nextNodes: [{ on: '', to: 'target', description: 'Test' }],
      };
      
      const errors = validateNode(nodeWithEmptyNextNode, 0);
      expect(errors.some(error => error.includes('nextNode[0].on cannot be empty'))).toBe(true);
    });
  });

  describe('validateGraph', () => {
    it('should validate a correct graph', () => {
      const validGraph: GraphNode[] = [
        {
          nodeId: 'start',
          description: 'Start node',
          shortDescription: 'Start',
          nextNodes: [{ on: 'BEGIN', to: 'end', description: 'Go to end' }],
          type: 'start',
        },
        {
          nodeId: 'end',
          description: 'End node',
          shortDescription: 'End',
          nextNodes: [],
          type: 'end',
        },
      ];
      
      const result = validateGraph(validGraph);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty graph', () => {
      const result = validateGraph([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Graph cannot be empty');
    });

    it('should detect non-array input', () => {
      const result = validateGraph('not an array' as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Graph data must be an array');
    });

    it('should detect duplicate node IDs', () => {
      const graphWithDuplicates: GraphNode[] = [
        {
          nodeId: 'duplicate',
          description: 'First node',
          shortDescription: 'First',
          nextNodes: [],
        },
        {
          nodeId: 'duplicate',
          description: 'Second node',
          shortDescription: 'Second',
          nextNodes: [],
        },
      ];
      
      const result = validateGraph(graphWithDuplicates);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Duplicate node IDs'))).toBe(true);
    });

    it('should detect missing target nodes', () => {
      const graphWithMissingTarget: GraphNode[] = [
        {
          nodeId: 'source',
          description: 'Source node',
          shortDescription: 'Source',
          nextNodes: [{ on: 'GO', to: 'nonexistent', description: 'Go to missing' }],
        },
      ];
      
      const result = validateGraph(graphWithMissingTarget);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Target nodes not found'))).toBe(true);
    });

    it('should generate warnings for missing start/end nodes', () => {
      const graphWithoutStartEnd: GraphNode[] = [
        {
          nodeId: 'middle',
          description: 'Middle node',
          shortDescription: 'Middle',
          nextNodes: [],
          type: 'action',
        },
      ];
      
      const result = validateGraph(graphWithoutStartEnd);
      expect(result.warnings.some(warning => warning.includes('No start node found'))).toBe(true);
      expect(result.warnings.some(warning => warning.includes('No end nodes found'))).toBe(true);
    });
  });

  describe('findOrphanNodes', () => {
    it('should find nodes with no incoming edges', () => {
      const graph: GraphNode[] = [
        {
          nodeId: 'orphan',
          description: 'Orphan node',
          shortDescription: 'Orphan',
          nextNodes: [],
        },
        {
          nodeId: 'source',
          description: 'Source node',
          shortDescription: 'Source',
          nextNodes: [{ on: 'GO', to: 'target', description: 'Go to target' }],
        },
        {
          nodeId: 'target',
          description: 'Target node',
          shortDescription: 'Target',
          nextNodes: [],
        },
      ];
      
      const orphans = findOrphanNodes(graph);
      expect(orphans).toContain('orphan');
      expect(orphans).toContain('source');
      expect(orphans).not.toContain('target');
    });
  });

  describe('findDeadEndNodes', () => {
    it('should find nodes with no outgoing edges', () => {
      const graph: GraphNode[] = [
        {
          nodeId: 'source',
          description: 'Source node',
          shortDescription: 'Source',
          nextNodes: [{ on: 'GO', to: 'target', description: 'Go to target' }],
        },
        {
          nodeId: 'target',
          description: 'Target node',
          shortDescription: 'Target',
          nextNodes: [],
        },
        {
          nodeId: 'deadend',
          description: 'Dead end node',
          shortDescription: 'Dead end',
          nextNodes: [],
        },
      ];
      
      const deadEnds = findDeadEndNodes(graph);
      expect(deadEnds).toContain('target');
      expect(deadEnds).toContain('deadend');
      expect(deadEnds).not.toContain('source');
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const graphWithCycle: GraphNode[] = [
        {
          nodeId: 'a',
          description: 'Node A',
          shortDescription: 'A',
          nextNodes: [{ on: 'GO', to: 'b', description: 'Go to B' }],
        },
        {
          nodeId: 'b',
          description: 'Node B',
          shortDescription: 'B',
          nextNodes: [{ on: 'GO', to: 'c', description: 'Go to C' }],
        },
        {
          nodeId: 'c',
          description: 'Node C',
          shortDescription: 'C',
          nextNodes: [{ on: 'GO', to: 'a', description: 'Go back to A' }],
        },
      ];
      
      const cycles = detectCircularDependencies(graphWithCycle);
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('a');
      expect(cycles[0]).toContain('b');
      expect(cycles[0]).toContain('c');
    });

    it('should return empty array for acyclic graph', () => {
      const acyclicGraph: GraphNode[] = [
        {
          nodeId: 'a',
          description: 'Node A',
          shortDescription: 'A',
          nextNodes: [{ on: 'GO', to: 'b', description: 'Go to B' }],
        },
        {
          nodeId: 'b',
          description: 'Node B',
          shortDescription: 'B',
          nextNodes: [],
        },
      ];
      
      const cycles = detectCircularDependencies(acyclicGraph);
      expect(cycles).toHaveLength(0);
    });
  });

  describe('generateGraphStats', () => {
    it('should generate correct statistics', () => {
      const graph: GraphNode[] = [
        {
          nodeId: 'start',
          description: 'Start node',
          shortDescription: 'Start',
          nextNodes: [{ on: 'GO', to: 'middle', description: 'Go to middle' }],
          type: 'start',
        },
        {
          nodeId: 'middle',
          description: 'Middle node',
          shortDescription: 'Middle',
          nextNodes: [{ on: 'GO', to: 'end', description: 'Go to end' }],
          type: 'action',
        },
        {
          nodeId: 'end',
          description: 'End node',
          shortDescription: 'End',
          nextNodes: [],
          type: 'end',
        },
      ];
      
      const stats = generateGraphStats(graph);
      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.nodeTypes.start).toBe(1);
      expect(stats.nodeTypes.action).toBe(1);
      expect(stats.nodeTypes.end).toBe(1);
      expect(stats.nodeTypes.wait).toBe(0);
    });
  });

  describe('safeValidateGraph', () => {
    it('should handle validation errors gracefully', () => {
      const malformedData = { not: 'an array' };
      const result = safeValidateGraph(malformedData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle thrown errors', () => {
      // Test with data that might cause unexpected errors
      const problematicData = [
        {
          get nodeId() {
            throw new Error('Property access error');
          },
        },
      ];
      
      const result = safeValidateGraph(problematicData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Validation error'))).toBe(true);
    });
  });
});