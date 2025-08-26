/**
 * Enhanced GraphVisualization component with improved architecture
 * Features: Better error handling, performance optimization, accessibility
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  useReactFlow,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { PerformanceMonitor } from './PerformanceMonitor';
import { GraphNode } from '../types';
import type { FlowNode, FlowEdge } from '../types';
import { 
  useGraphState, 
  useNodeClick, 
  useMinimapNodeColor 
} from '../hooks/useGraphVisualization';
import { useLargeGraphOptimization, useAdaptivePerformanceSettings } from '../hooks/useLargeGraphOptimization';
import { safeValidateGraph } from '../utils/validation';
import { 
  ERROR_MESSAGES, 
  ACCESSIBILITY_LABELS 
} from '../constants/graphVisualization';

interface GraphVisualizationProps {
  data: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
  selectedNodeId?: string;
  highlightOrderChangeField?: string;
  highlightOrderChangeValue?: string | null;
  searchedNodeIds?: string[];
  isSearchActive?: boolean;
  highlightedPathToStartNodeIds?: Set<string> | null;
  onError?: (error: Error, context: string) => void;
  showPerformanceMonitor?: boolean;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  data,
  onNodeSelect,
  selectedNodeId,
  highlightOrderChangeField = 'none',
  highlightOrderChangeValue = null,
  searchedNodeIds = [],
  isSearchActive = false,
  highlightedPathToStartNodeIds = null,
  onError,
  showPerformanceMonitor = process.env.NODE_ENV === 'development',
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasInitialCentered, setHasInitialCentered] = useState(false);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.8 });
  const [isLargeGraph, setIsLargeGraph] = useState(false);
  
  // Performance optimization: detect large graphs
  useEffect(() => {
    // Temporarily disable large graph mode for debugging
    setIsLargeGraph(false); // data.length > 100
  }, [data.length]);

  // Memoize node and edge types to prevent recreation
  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    custom: CustomEdge,
  }), []);

  // Validate data on changes
  useEffect(() => {
    if (data.length > 0) {
      const validation = safeValidateGraph(data);
      if (!validation.isValid) {
        const errorMessage = validation.errors[0] || 'Invalid graph data';
        setValidationError(errorMessage);
        onError?.(new Error(errorMessage), 'data-validation');
        return;
      }
      setValidationError(null);
    }
  }, [data, onError]);

  // React Flow state management - temporarily bypass useNodesState for debugging
  // const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  // const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  
  // Direct state management for debugging
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  
  // Dummy handlers for now
  const onNodesChange = useCallback((changes: any[]) => {
    console.log('⚠️ onNodesChange called but temporarily disabled for debugging');
  }, []);
  
  const onEdgesChange = useCallback((changes: any[]) => {
    console.log('⚠️ onEdgesChange called but temporarily disabled for debugging');
  }, []);

  // Process graph data using custom hooks (pass current flow nodes for position preservation)
  const { nodes, edges, navigation, hasData, onUserMoveNodes } = useGraphState(
    data,
    selectedNodeId,
    highlightOrderChangeField,
    highlightOrderChangeValue,
    searchedNodeIds,
    isSearchActive,
    highlightedPathToStartNodeIds,
    flowNodes // Pass current flow nodes for position preservation
  );

  // Debug logging
  useEffect(() => {
    console.log('📥 GraphVisualization received data:', data.length, 'nodes');
    console.log('🔄 Processed nodes:', nodes.length, 'edges:', edges.length);
    console.log('✅ hasData:', hasData);
    if (data.length > 0 && !hasData) {
      console.error('❌ CRITICAL: data exists but hasData is false!');
    }
  }, [data.length, nodes.length, edges.length, hasData]);

  // Large graph optimizations
  const optimizedGraph = useLargeGraphOptimization({
    nodes,
    edges,
    viewport,
    isLargeGraph,
  });

  // Adaptive performance settings
  const performanceSettings = useAdaptivePerformanceSettings(data.length);

  // Use optimized nodes and edges for large graphs
  const finalNodes = isLargeGraph ? optimizedGraph.visibleNodes : nodes;
  const finalEdges = isLargeGraph ? optimizedGraph.visibleEdges : edges;
  
  // Debug logging for optimization
  useEffect(() => {
    console.log('isLargeGraph:', isLargeGraph, 'originalNodes:', nodes.length, 'finalNodes:', finalNodes.length);
    if (isLargeGraph) {
      console.log('Viewport culling:', optimizedGraph.culledNodeCount, 'nodes culled');
    }
  }, [isLargeGraph, nodes.length, finalNodes.length, optimizedGraph]);

  // Enhanced onNodesChange to track user movements with throttling
  const handleNodesChange = useCallback((changes: any[]) => {
    console.log('🔄 handleNodesChange called with changes:', changes.length, changes);
    
    // Always apply the changes immediately for smooth dragging
    onNodesChange(changes);
    
    // Check if any change is a position change (user dragging) - throttled
    const hasPositionChange = changes.some(change => 
      change.type === 'position' && change.dragging === false
    );
    
    if (hasPositionChange) {
      // Use a ref to throttle the onUserMoveNodes call
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      
      throttleTimeoutRef.current = setTimeout(() => {
        onUserMoveNodes();
      }, performanceSettings.throttleDelay);
    }
  }, [onNodesChange, onUserMoveNodes, performanceSettings.throttleDelay]);

  // Viewport change handler for performance optimization
  const handleViewportChange = useCallback((event: MouseEvent | TouchEvent | null, newViewport: Viewport) => {
    setViewport(newViewport);
  }, []);

  // Event handlers
  const handleNodeClick = useNodeClick(data, onNodeSelect);
  const getMinimapNodeColor = useMinimapNodeColor();

  // Update flow state when processed data changes
  useEffect(() => {
    console.log('🔄 Setting flow state - nodes:', finalNodes.length, 'edges:', finalEdges.length);
    
    // Set the flow state immediately
    setFlowNodes(finalNodes);
    setFlowEdges(finalEdges);
    
    // Debug immediately after setting (in same render cycle)
    console.log('🚀 Flow state updated - flowNodes will be:', finalNodes.length, 'flowEdges will be:', finalEdges.length);
    
    // Handle initial centering only when we first get data
    if (finalNodes.length > 0 && !hasInitialCentered) {
      try {
        console.log('🎯 Attempting to center on start node');
        // Temporarily disable automatic navigation for debugging
        // navigation.centerOnStart();
        console.log('⚠️ Navigation disabled for debugging');
        setHasInitialCentered(true);
        console.log('✅ Successfully centered on start');
      } catch (error) {
        console.warn('❌ Error during initial navigation:', error);
        onError?.(error as Error, 'navigation');
      }
    } else if (finalNodes.length === 0) {
      console.log('🔄 No nodes, resetting hasInitialCentered');
      setHasInitialCentered(false);
    }
  }, [finalNodes, finalEdges, navigation, hasInitialCentered, onError]);
  
  // Debug the actual flow state after it's been set
  useEffect(() => {
    console.log('🚀 ReactFlow actual state - flowNodes:', flowNodes.length, 'flowEdges:', flowEdges.length);
    if (flowNodes.length > 0) {
      console.log('✅ flowNodes sample:', flowNodes[0]);
    }
  }, [flowNodes, flowEdges]);

  // Handle selected node centering
  useEffect(() => {
    if (selectedNodeId) {
      try {
        console.log('🎯 Selected node centering disabled for debugging:', selectedNodeId);
        // navigation.centerOnSelected();
      } catch (error) {
        console.warn('Error centering on selected node:', error);
        onError?.(error as Error, 'node-selection');
      }
    }
  }, [selectedNodeId, navigation, onError]);

  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  // Error states
  if (validationError) {
    return (
      <div 
        className="h-full flex items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-lg"
        role="alert"
        aria-live="polite"
      >
        <div className="text-center p-6">
          <h3 className="font-semibold mb-2">Graph Validation Error</h3>
          <p className="text-sm">{validationError}</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div 
        className="h-full flex items-center justify-center text-gray-500"
        role="status"
        aria-live="polite"
      >
        <p>{ERROR_MESSAGES.NO_DATA}</p>
      </div>
    );
  }

  return (
    <div 
      className="h-full w-full relative"
      role="application"
      aria-label={ACCESSIBILITY_LABELS.graphContainer}
    >
      {/* Debug overlay to show data status */}
      <div className="absolute top-2 left-2 bg-yellow-100 border border-yellow-400 p-2 text-xs z-50 rounded">
        <div>Original data: {data.length} nodes</div>
        <div>Final nodes: {finalNodes.length}</div>
        <div>Flow nodes: {flowNodes.length}</div>
        <div>hasData: {hasData ? 'true' : 'false'}</div>
      </div>
      
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onMove={handleViewportChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        className="bg-gray-50"
        attributionPosition="bottom-left"
        // Accessibility improvements
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        // Performance optimizations
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        // Performance settings for better node dragging
        onlyRenderVisibleElements={true}
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        disableKeyboardA11y={false}
        // Reduce re-renders during interaction
        selectNodesOnDrag={!isLargeGraph}
        panOnDrag={isLargeGraph ? [1] : [1, 2]} // More restrictive panning for large graphs
        deleteKeyCode={null} // Disable delete key to prevent accidental deletions
        // Additional performance optimizations for large graphs
        proOptions={{
          hideAttribution: true,
        }}
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
        }}
        // Aggressive performance settings for 100+ nodes
        snapToGrid={false}
        snapGrid={[1, 1]}
        nodeOrigin={[0.5, 0.5]}
        // Reduce render quality for better performance
        translateExtent={[[-5000, -5000], [5000, 5000]]}
        nodeExtent={[[-5000, -5000], [5000, 5000]]}
        // Disable expensive features for large graphs
        zoomOnScroll={flowNodes.length < 100}
        zoomOnPinch={flowNodes.length < 100}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        // Optimize interaction handling
        panOnScroll={false}
        selectionOnDrag={false}
        multiSelectionKeyCode={null}
      >
        <Background 
          color="#e5e7eb" 
          size={1} 
          aria-label={ACCESSIBILITY_LABELS.background}
        />
        
        <Controls 
          className="!bg-white !border !border-gray-200 !shadow-lg !rounded-lg"
          aria-label={ACCESSIBILITY_LABELS.controls}
        />
        
        <MiniMap
          className="!bg-white !border !border-gray-200 !shadow-lg !rounded-lg"
          nodeColor={getMinimapNodeColor}
          maskColor="rgba(255, 255, 255, 0.8)"
          aria-label={ACCESSIBILITY_LABELS.minimap}
        />
      </ReactFlow>
      
      <PerformanceMonitor
        nodeCount={flowNodes.length}
        edgeCount={flowEdges.length}
        enabled={showPerformanceMonitor}
      />
    </div>
  );
};

