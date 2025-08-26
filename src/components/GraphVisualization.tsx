/**
 * GraphVisualization Component - Final Corrected Version
 *
 * This component displays graph data using React Flow and includes several key fixes:
 * 1.  Uses `useNodesState` and `useEdgesState` for robust state management, preventing race conditions.
 * 2.  Separates data synchronization and UI effects (like initial centering) into distinct `useEffect`
 *     hooks with correct dependencies, resolving stale state issues that prevented rendering.
 * 3.  Explicitly passes props to `<ReactFlow>` to avoid console warnings about unrecognized attributes.
 * 4.  Preserves user-dragged node positions across data refreshes for a better user experience.
 */
import React, { useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
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
  useMinimapNodeColor,
} from '../hooks/useGraphVisualization';
import { useLargeGraphOptimization, useAdaptivePerformanceSettings } from '../hooks/useLargeGraphOptimization';
import { safeValidateGraph } from '../utils/validation';
import {
  ERROR_MESSAGES,
  ACCESSIBILITY_LABELS,
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
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.8 });
  const [isLargeGraph, setIsLargeGraph] = useState(false);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setIsLargeGraph(data.length > 100);
  }, [data.length]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

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

  const {
    nodes: processedNodes,
    edges: processedEdges,
    navigation,
    hasData,
  } = useGraphState(
    data,
    selectedNodeId,
    highlightOrderChangeField,
    highlightOrderChangeValue,
    searchedNodeIds,
    isSearchActive,
    highlightedPathToStartNodeIds,
  );

  const optimizedGraph = useLargeGraphOptimization({
    nodes: processedNodes,
    edges: processedEdges,
    viewport,
    isLargeGraph,
  });
  
  const adaptiveSettings = useAdaptivePerformanceSettings(data.length);

  const finalNodes = isLargeGraph ? optimizedGraph.visibleNodes : processedNodes;
  const finalEdges = isLargeGraph ? optimizedGraph.visibleEdges : processedEdges;

  // EFFECT 1: Synchronize processed data with React Flow's internal state.
  // This hook's only job is to update the graph when the source data changes.
  useEffect(() => {
    // Using a functional update (`(currentNodes) => ...`) ensures we always have the latest
    // state to compare against, avoiding stale state issues without adding `flowNodes`
    // to the dependency array, which would cause an infinite loop.
    setFlowNodes((currentFlowNodes) => {
      const positionMap = new Map(currentFlowNodes.map(n => [n.id, n.position]));
      return finalNodes.map(newNode => ({
        ...newNode,
        position: positionMap.get(newNode.id) || newNode.position,
      }));
    });
    setFlowEdges(finalEdges);
  }, [finalNodes, finalEdges, setFlowNodes, setFlowEdges]);

  // EFFECT 2: Handle the initial view centering.
  // This hook runs *after* the nodes are successfully loaded into the state.
  useEffect(() => {
    if (flowNodes.length > 0 && !hasInitialCentered) {
      try {
        navigation.centerOnStart();
        setHasInitialCentered(true);
      } catch (error) {
        console.warn('Error during initial centering:', error);
        onError?.(error as Error, 'navigation');
      }
    } else if (data.length === 0) {
      // Reset the flag if the data is cleared, so it can center again on new data.
      setHasInitialCentered(false);
    }
  }, [flowNodes.length, hasInitialCentered, navigation, data.length, onError]);

  // Event handlers and other effects
  const handleNodeClick = useNodeClick(data, onNodeSelect);
  const getMinimapNodeColor = useMinimapNodeColor();

  useEffect(() => {
    if (selectedNodeId) {
      try {
        navigation.centerOnSelected();
      } catch (error) {
        console.warn('Error centering on selected node:', error);
        onError?.(error as Error, 'node-selection');
      }
    }
  }, [selectedNodeId, navigation, onError]);

  // Render logic (error states, loading, etc.)
  if (validationError) {
    return (
      <div className="h-full flex items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-lg" role="alert">
        <div className="text-center p-6">
          <h3 className="font-semibold mb-2">Graph Validation Error</h3>
          <p className="text-sm">{validationError}</p>
        </div>
      </div>
    );
  }

  if (!hasData && data.length > 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500" role="status">
        <p>Processing graph data...</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500" role="status">
        <p>{ERROR_MESSAGES.NO_DATA}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative" role="application" aria-label={ACCESSIBILITY_LABELS.graphContainer}>
      {/* Debug overlay - can be removed in production */}
      <div className="absolute top-2 left-2 bg-yellow-100 border border-yellow-400 p-2 text-xs z-50 rounded shadow-lg">
        <div>Prop data: {data.length}</div>
        <div>Processed nodes: {processedNodes.length}</div>
        <div>React Flow nodes (rendered): {flowNodes.length}</div>
        <div>hasData: {hasData.toString()}</div>
      </div>
      
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onMove={(_, viewport) => setViewport(viewport)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        className="bg-gray-50"
        attributionPosition="bottom-left"
        // Performance & Usability
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={viewport}
        onlyRenderVisibleElements
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        fitViewOptions={{ padding: 0.1 }}
        deleteKeyCode={null}
        
        // FIX: Apply adaptive settings explicitly to avoid passing unknown props to the DOM.
        zoomOnScroll={adaptiveSettings.zoomOnScroll}
        zoomOnPinch={adaptiveSettings.zoomOnPinch}
        panOnDrag={adaptiveSettings.panOnDrag}
        selectNodesOnDrag={adaptiveSettings.selectNodesOnDrag}
        elevateNodesOnSelect={adaptiveSettings.elevateNodesOnSelect}
      >
        <Background color="#e5e7eb" size={1} aria-label={ACCESSIBILITY_LABELS.background} />
        <Controls className="!bg-white !border !border-gray-200 !shadow-lg !rounded-lg" aria-label={ACCESSIBILITY_LABELS.controls} />
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