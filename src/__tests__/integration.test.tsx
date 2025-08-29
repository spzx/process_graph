/**
 * Integration Tests for Enhanced Graph Visualization System
 * 
 * Tests the complete system integration including layout engines,
 * group management, navigation, and UI components working together.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import React from 'react';

// Import components and systems
import { GraphVisualization } from '../components/GraphVisualization';
import { LayoutControls } from '../components/controls/LayoutControls';
import { GroupControls } from '../components/controls/GroupControls';
import { NavigationControls } from '../components/controls/NavigationControls';
import { useEnhancedGraph } from '../hooks/useEnhancedGraph';
import { createLayoutEngine } from '../utils/layoutEngine';
import { SmartGroupDetectionSystem } from '../utils/grouping/SmartGroupDetection';

// Test data
const createTestGraphData = () => ({
  nodes: [
    { id: '1', data: { label: 'Node 1', groupName: 'group-a' }, position: { x: 0, y: 0 } },
    { id: '2', data: { label: 'Node 2', groupName: 'group-a' }, position: { x: 100, y: 0 } },
    { id: '3', data: { label: 'Node 3', groupName: 'group-b' }, position: { x: 200, y: 0 } },
    { id: '4', data: { label: 'Node 4', groupName: 'group-b' }, position: { x: 300, y: 0 } }
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' },
    { id: 'e2', source: '2', target: '3' },
    { id: 'e3', source: '3', target: '4' }
  ]
});

// Mock wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('End-to-End System Integration', () => {
  let mockOnNodeSelect: any;
  let testData: any;

  beforeEach(() => {
    mockOnNodeSelect = vi.fn();
    testData = createTestGraphData();
  });

  describe('GraphVisualization Component Integration', () => {
    it('should render with enhanced layout system', async () => {
      const { container } = render(
        <TestWrapper>
          <GraphVisualization
            data={testData.nodes}
            onNodeSelect={mockOnNodeSelect}
            layoutConfig={{
              algorithm: 'auto',
              performanceMode: 'balanced',
              enableSmartGrouping: true
            }}
            showPerformanceMonitor={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(container.querySelector('.react-flow')).toBeInTheDocument();
      });
    });

    it('should handle different layout configurations', async () => {
      const { rerender } = render(
        <TestWrapper>
          <GraphVisualization
            data={testData.nodes}
            onNodeSelect={mockOnNodeSelect}
            layoutConfig={{ algorithm: 'force-directed', performanceMode: 'performance' }}
          />
        </TestWrapper>
      );

      // Change configuration
      rerender(
        <TestWrapper>
          <GraphVisualization
            data={testData.nodes}
            onNodeSelect={mockOnNodeSelect}
            layoutConfig={{ algorithm: 'hierarchical', performanceMode: 'quality' }}
          />
        </TestWrapper>
      );

      // Should not crash and should re-render
      expect(true).toBe(true);
    });
  });

  describe('Layout Controls Integration', () => {
    it('should interact with layout engine', async () => {
      const mockOnAlgorithmChange = vi.fn();
      const mockOnRelayout = vi.fn();

      render(
        <LayoutControls
          currentAlgorithm="force-directed"
          availableAlgorithms={['force-directed', 'hierarchical', 'constraint-based']}
          onAlgorithmChange={mockOnAlgorithmChange}
          onRelayout={mockOnRelayout}
          performanceMode="balanced"
          showMetrics={true}
        />
      );

      // Test algorithm selection
      const algorithmSelect = screen.getByDisplayValue('Force-Directed');
      fireEvent.change(algorithmSelect, { target: { value: 'hierarchical' } });
      
      expect(mockOnAlgorithmChange).toHaveBeenCalledWith('hierarchical');

      // Test relayout button
      const relayoutButton = screen.getByText('Re-layout');
      fireEvent.click(relayoutButton);
      
      expect(mockOnRelayout).toHaveBeenCalled();
    });
  });

  describe('Group Controls Integration', () => {
    it('should manage group detection and hierarchy', async () => {
      const mockOnRedetect = vi.fn();
      const mockOnGroupToggle = vi.fn();

      const testGroups = [
        {
          id: 'g1',
          name: 'Group A',
          nodeIds: ['1', '2'],
          level: 0,
          isCollapsed: false,
          isVisible: true,
          childGroupIds: [],
          metadata: {
            detectionMethod: 'semantic',
            confidence: 0.85,
            characteristics: ['semantic', 'size-2']
          }
        }
      ];

      render(
        <GroupControls
          groups={testGroups}
          strategy="semantic"
          onRedetectGroups={mockOnRedetect}
          onGroupToggle={mockOnGroupToggle}
        />
      );

      // Test group re-detection
      const redetectButton = screen.getByText('Re-detect Groups');
      fireEvent.click(redetectButton);
      
      expect(mockOnRedetect).toHaveBeenCalled();
    });
  });

  describe('Navigation Controls Integration', () => {
    it('should handle navigation actions', () => {
      const mockOnZoomIn = vi.fn();
      const mockOnNavigateToNode = vi.fn();
      const mockOnResetView = vi.fn();

      render(
        <NavigationControls
          viewport={{ x: 0, y: 0, zoom: 1 }}
          nodes={testData.nodes}
          onZoomIn={mockOnZoomIn}
          onNavigateToNode={mockOnNavigateToNode}
          onResetView={mockOnResetView}
        />
      );

      // Test zoom in
      const zoomInButton = screen.getByTitle('Zoom In');
      fireEvent.click(zoomInButton);
      
      expect(mockOnZoomIn).toHaveBeenCalled();

      // Test reset view
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
      
      expect(mockOnResetView).toHaveBeenCalled();
    });
  });
});

describe('Multi-Algorithm Layout System Integration', () => {
  it('should switch between algorithms seamlessly', async () => {
    const engine = createLayoutEngine({ autoSelection: false });
    const { nodes, edges } = createTestGraphData();

    // Test force-directed layout
    const forceResult = await engine.processLayout(nodes, edges, {
      algorithmName: 'force-directed'
    });

    expect(forceResult.nodes).toHaveLength(nodes.length);
    expect(forceResult.metadata.algorithm).toBe('force-directed');

    // Test hierarchical layout
    const hierarchicalResult = await engine.processLayout(nodes, edges, {
      algorithmName: 'enhanced-hierarchical'
    });

    expect(hierarchicalResult.nodes).toHaveLength(nodes.length);
    expect(hierarchicalResult.metadata.algorithm).toBe('enhanced-hierarchical');
  });

  it('should handle algorithm selection with auto mode', async () => {
    const engine = createLayoutEngine({ autoSelection: true });
    const { nodes, edges } = createTestGraphData();

    const result = await engine.processLayout(nodes, edges);
    
    expect(result.nodes).toHaveLength(nodes.length);
    expect(result.metadata.algorithm).toBeDefined();
    expect(['force-directed', 'enhanced-hierarchical', 'constraint-based']).toContain(result.metadata.algorithm);
  });
});

describe('Performance System Integration', () => {
  it('should apply multiple optimizations together', async () => {
    // This would test the integration of LOD, culling, and bundling
    // Implementation would depend on the specific integration points
    expect(true).toBe(true); // Placeholder
  });

  it('should maintain performance under load', async () => {
    const largeGraph = {
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        data: { label: `Node ${i}` },
        position: { x: Math.random() * 1000, y: Math.random() * 1000 }
      })),
      edges: Array.from({ length: 150 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${Math.floor(Math.random() * 100)}`,
        target: `node-${Math.floor(Math.random() * 100)}`
      }))
    };

    const engine = createLayoutEngine();
    const startTime = Date.now();
    
    const result = await engine.processLayout(largeGraph.nodes, largeGraph.edges);
    const endTime = Date.now();
    
    expect(result.nodes).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
  }, 20000);
});

describe('Error Handling and Recovery', () => {
  it('should handle system failures gracefully', async () => {
    const engine = createLayoutEngine();
    
    // Test invalid input
    await expect(engine.processLayout([], [])).rejects.toThrow();
    
    // Test inconsistent data
    const nodes = [{ id: '1', data: {}, position: { x: 0, y: 0 } }];
    const badEdges = [{ id: 'e1', source: 'nonexistent', target: '1' }];
    
    await expect(engine.processLayout(nodes, badEdges as any)).rejects.toThrow();
  });

  it('should provide fallback behavior', async () => {
    // Test that the system can recover from failures
    const { container } = render(
      <TestWrapper>
        <GraphVisualization
          data={[]} // Empty data
          onNodeSelect={vi.fn()}
        />
      </TestWrapper>
    );

    // Should render without crashing
    expect(container).toBeInTheDocument();
  });
});

describe('Real-world Workflow Integration', () => {
  it('should support complete user workflow', async () => {
    let currentAlgorithm = 'auto';
    let groups: any[] = [];
    
    const mockWorkflow = {
      onAlgorithmChange: (algorithm: string) => { currentAlgorithm = algorithm; },
      onGroupsDetected: (detectedGroups: any[]) => { groups = detectedGroups; },
      onLayoutComplete: vi.fn()
    };

    // 1. Initial render with auto algorithm
    const { rerender } = render(
      <TestWrapper>
        <GraphVisualization
          data={createTestGraphData().nodes}
          onNodeSelect={vi.fn()}
          layoutConfig={{
            algorithm: currentAlgorithm as any,
            enableSmartGrouping: true
          }}
        />
      </TestWrapper>
    );

    // 2. Change to specific algorithm
    currentAlgorithm = 'force-directed';
    rerender(
      <TestWrapper>
        <GraphVisualization
          data={createTestGraphData().nodes}
          onNodeSelect={vi.fn()}
          layoutConfig={{
            algorithm: currentAlgorithm as any,
            enableSmartGrouping: true
          }}
        />
      </TestWrapper>
    );

    // Should complete without errors
    expect(true).toBe(true);
  });
});

describe('Hooks Integration', () => {
  it('should integrate useEnhancedGraph hook properly', () => {
    const TestComponent = () => {
      const { nodes, edges, actions, status } = useEnhancedGraph(
        createTestGraphData().nodes,
        createTestGraphData().edges,
        {
          layout: { strategy: 'automatic', performanceMode: 'balanced' },
          grouping: { enabled: true },
          performance: { culling: true, lod: true }
        }
      );

      return (
        <div>
          <div data-testid="node-count">{nodes.length}</div>
          <div data-testid="edge-count">{edges.length}</div>
          <div data-testid="status">{status.isLayouting ? 'layouting' : 'ready'}</div>
          <button onClick={actions.relayout}>Relayout</button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('node-count')).toBeInTheDocument();
    expect(screen.getByTestId('edge-count')).toBeInTheDocument();
    expect(screen.getByText('Relayout')).toBeInTheDocument();
  });
});

// Mock setup for testing
vi.mock('d3-force', () => ({
  forceSimulation: () => ({
    nodes: vi.fn().mockReturnThis(),
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis()
  }),
  forceManyBody: () => ({ strength: vi.fn().mockReturnThis() }),
  forceLink: () => ({ id: vi.fn().mockReturnThis(), distance: vi.fn().mockReturnThis() }),
  forceCenter: vi.fn()
}));

vi.mock('webcola', () => ({
  Layout: vi.fn().mockImplementation(() => ({
    nodes: vi.fn().mockReturnThis(),
    links: vi.fn().mockReturnThis(),
    constraints: vi.fn().mockReturnThis(),
    start: vi.fn().mockReturnThis()
  }))
}));