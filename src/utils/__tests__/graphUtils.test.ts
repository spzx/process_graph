/**
 * Unit tests for graph utility functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isNewNodeStructure,
  doesTargetExist,
  getEdgeColor,
  createEdgeFromNewStructure,
  createEdgeFromLegacyStructure,
  createEdgesForNode,
  shouldHighlightForOrderChange,
  calculateNodeCenter,
  findStartNode,
  safeCreateEdges,
} from '../graphUtils';
import { GraphNode } from '../../types';

describe('graphUtils', () => {
  describe('isNewNodeStructure', () => {
    it('should return true for new structure with on, to, description', () => {
      const nextNode = { on: 'YES', to: 'targetNode', description: 'Test description' };
      expect(isNewNodeStructure(nextNode)).toBe(true);
    });

    it('should return false for legacy structure', () => {
      const nextNode = { YES: 'targetNode' };
      expect(isNewNodeStructure(nextNode)).toBe(false);
    });

    it('should return false for invalid structure', () => {
      const nextNode = { on: 'YES' }; // missing 'to'
      expect(isNewNodeStructure(nextNode)).toBe(false);
    });
  });

  describe('doesTargetExist', () => {
    const testData: GraphNode[] = [
      {
        nodeId: 'node1',
        description: 'Test node 1',
        shortDescription: 'Node 1',
        nextNodes: [],
      },
      {
        nodeId: 'node2',
        description: 'Test node 2',
        shortDescription: 'Node 2',
        nextNodes: [],
      },
    ];

    it('should return true if target exists', () => {
      expect(doesTargetExist(testData, 'node1')).toBe(true);
      expect(doesTargetExist(testData, 'node2')).toBe(true);
    });

    it('should return false if target does not exist', () => {
      expect(doesTargetExist(testData, 'nonexistent')).toBe(false);
    });
  });

  describe('getEdgeColor', () => {
    it('should return correct color for known conditions', () => {
      expect(getEdgeColor('success')).toBe('#10B981');
      expect(getEdgeColor('fail')).toBe('#EF4444');
      expect(getEdgeColor('yes')).toBe('#10B981');
      expect(getEdgeColor('no')).toBe('#EF4444');
    });

    it('should return default color for unknown conditions', () => {
      expect(getEdgeColor('unknown')).toBe('#6B7280');
    });

    it('should handle case insensitive conditions', () => {
      expect(getEdgeColor('SUCCESS')).toBe('#10B981');
      expect(getEdgeColor('YES')).toBe('#10B981');
    });
  });

  describe('createEdgeFromNewStructure', () => {
    const testData: GraphNode[] = [
      {
        nodeId: 'source',
        description: 'Source node',
        shortDescription: 'Source',
        nextNodes: [],
      },
      {
        nodeId: 'target',
        description: 'Target node',
        shortDescription: 'Target',
        nextNodes: [],
      },
    ];

    it('should create valid edge for existing target', () => {
      const nextNode = { on: 'YES', to: 'target', description: 'Test edge' };
      const edge = createEdgeFromNewStructure('source', nextNode, testData, null);
      
      expect(edge).toBeTruthy();
      expect(edge?.source).toBe('source');
      expect(edge?.target).toBe('target');
      expect(edge?.data.label).toBe('YES');
      expect(edge?.data.condition).toBe('YES');
    });

    it('should return null for non-existent target', () => {
      const nextNode = { on: 'YES', to: 'nonexistent', description: 'Test edge' };
      const edge = createEdgeFromNewStructure('source', nextNode, testData, null);
      
      expect(edge).toBeNull();
    });

    it('should handle path highlighting', () => {
      const nextNode = { on: 'YES', to: 'target', description: 'Test edge' };
      const pathNodes = new Set(['source', 'target']);
      const edge = createEdgeFromNewStructure('source', nextNode, testData, pathNodes);
      
      expect(edge?.data.isPathToStartEdge).toBe(true);
      expect(edge?.data.isPathHighlightActive).toBe(true);
    });
  });

  describe('shouldHighlightForOrderChange', () => {
    const testNode: GraphNode = {
      nodeId: 'test',
      description: 'Test node',
      shortDescription: 'Test',
      nextNodes: [],
      orderChanges: [
        {
          on: 'condition1',
          set: { field1: 'value1', field2: 'value2' },
        },
        {
          on: 'condition2',
          set: { field1: 'value3', field3: 'value4' },
        },
      ],
    };

    it('should return false for none field', () => {
      const result = shouldHighlightForOrderChange(testNode, 'none');
      expect(result).toBe(false);
    });

    it('should return true when field exists in order changes', () => {
      const result = shouldHighlightForOrderChange(testNode, 'field1');
      expect(result).toBe(true);
    });

    it('should return false when field does not exist', () => {
      const result = shouldHighlightForOrderChange(testNode, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should match specific value when provided', () => {
      const result = shouldHighlightForOrderChange(testNode, 'field1', 'value1');
      expect(result).toBe(true);
    });

    it('should not match different value', () => {
      const result = shouldHighlightForOrderChange(testNode, 'field1', 'wrongvalue');
      expect(result).toBe(false);
    });
  });

  describe('calculateNodeCenter', () => {
    it('should calculate center correctly with default dimensions', () => {
      const node = { position: { x: 100, y: 200 } };
      const center = calculateNodeCenter(node);
      
      expect(center.x).toBe(225); // 100 + 250/2
      expect(center.y).toBe(250); // 200 + 100/2
    });

    it('should calculate center correctly with custom dimensions', () => {
      const node = { position: { x: 50, y: 100 }, width: 300, height: 150 };
      const center = calculateNodeCenter(node);
      
      expect(center.x).toBe(200); // 50 + 300/2
      expect(center.y).toBe(175); // 100 + 150/2
    });
  });

  describe('findStartNode', () => {
    const testData: GraphNode[] = [
      {
        nodeId: 'node1',
        description: 'Node 1',
        shortDescription: 'Node 1',
        nextNodes: [],
        type: 'action',
      },
      {
        nodeId: 'startNode',
        description: 'Start Node',
        shortDescription: 'Start',
        nextNodes: [],
        type: 'start',
      },
      {
        nodeId: 'node3',
        description: 'Node 3',
        shortDescription: 'Node 3',
        nextNodes: [],
        type: 'end',
      },
    ];

    it('should find the start node', () => {
      const startNode = findStartNode(testData);
      expect(startNode?.nodeId).toBe('startNode');
      expect(startNode?.type).toBe('start');
    });

    it('should return undefined if no start node exists', () => {
      const dataWithoutStart = testData.filter(node => node.type !== 'start');
      const startNode = findStartNode(dataWithoutStart);
      expect(startNode).toBeUndefined();
    });
  });

  describe('safeCreateEdges', () => {
    const testData: GraphNode[] = [
      {
        nodeId: 'node1',
        description: 'Node 1',
        shortDescription: 'Node 1',
        nextNodes: [
          { on: 'YES', to: 'node2', description: 'Go to node 2' },
        ],
      },
      {
        nodeId: 'node2',
        description: 'Node 2',
        shortDescription: 'Node 2',
        nextNodes: [],
      },
    ];

    it('should create edges successfully', () => {
      const edges = safeCreateEdges(testData, null);
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('node1');
      expect(edges[0].target).toBe('node2');
    });

    it('should return empty array on error', () => {
      // Test with malformed data that might cause errors
      const malformedData = [
        {
          nodeId: null as any,
          description: 'Bad node',
          shortDescription: 'Bad',
          nextNodes: [null as any],
        },
      ];
      
      const edges = safeCreateEdges(malformedData, null);
      expect(edges).toEqual([]);
    });
  });
});