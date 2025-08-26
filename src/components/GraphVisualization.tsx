/**
 * GraphVisualization Component - Modern Dependency-Aware Layout System
 *
 * This version uses the advanced GraphLayoutManager system for superior node placement
 * that ensures proper left-to-right dependency flow. It replaces the previous ElkJS/custom
 * hybrid approach with a unified, dependency-first layout engine that handles circular
 * dependencies and provides comprehensive layout validation.
 */
import React, { useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { GroupNode } from './GroupNode';
import { createGroupNodes } from './GroupBackground';
import { PerformanceMonitor } from './PerformanceMonitor';
import { GraphNode } from '../types';
import {
  useGraphState,
  useNodeClick,
  useMinimapNodeColor,
} from '../hooks/useGraphVisualization';
import { useAdaptivePerformanceSettings } from '../hooks/useLargeGraphOptimization';
import { safeValidateGraph } from '../utils/validation';
import { getLayoutedElements } from '../utils/layout'; // Modern dependency-aware layout system
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

// Internal component that renders the graph and uses hooks requiring ReactFlowProvider context.
const GraphLayoutWrapper: React.FC<GraphVisualizationProps> = (props) => {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const [isLaidOut, setIsLaidOut] = useState(false);
  const { fitView } = useReactFlow();

  const {
    nodes: processedNodes,
    edges: processedEdges,
  } = useGraphState(
    props.data,
    props.selectedNodeId,
    props.highlightOrderChangeField,
    props.highlightOrderChangeValue,
    props.searchedNodeIds,
    props.isSearchActive,
    props.highlightedPathToStartNodeIds,
  );

  // This useEffect handles the asynchronous layout calculation from the new GraphLayoutManager.
  useEffect(() => {
    // Only run the layout if there are nodes to process.
    if (processedNodes.length > 0) {
      // getLayoutedElements now uses the GraphLayoutManager system and returns a Promise.
      getLayoutedElements(processedNodes, processedEdges).then(layoutedNodes => {
        // Create group background nodes and combine with regular nodes
        const groupNodes = createGroupNodes(layoutedNodes);
        const allNodes = [...groupNodes, ...layoutedNodes];
        
        console.log('🎯 Combined nodes: ', allNodes.length, '(', groupNodes.length, 'groups +', layoutedNodes.length, 'regular)');
        
        setFlowNodes(allNodes);
        setFlowEdges(processedEdges);
        // Set a flag to true to trigger the fitView effect once nodes are in state.
        setIsLaidOut(true);
      }).catch(error => {
        console.error("Layout calculation failed:", error);
        // Fallback to un-layouted nodes if layout system fails
        setFlowNodes(processedNodes);
        setFlowEdges(processedEdges);
      });
    } else {
      // Clear the graph if the data is empty.
      setFlowNodes([]);
      setFlowEdges([]);
      setIsLaidOut(false);
    }
  }, [processedNodes, processedEdges, setFlowNodes, setFlowEdges]);

  // This effect runs once after the initial layout is complete to fit the graph into view.
  useEffect(() => {
    if (isLaidOut) {
      // A small timeout allows React Flow to render the nodes before we try to fit them.
      const timer = setTimeout(() => {
        fitView({ padding: 0.1, duration: 300 });
      }, 100);
      
      // Reset the flag to prevent re-fitting on subsequent re-renders.
      setIsLaidOut(false); 
      return () => clearTimeout(timer);
    }
  }, [isLaidOut, fitView]);
  
  // Memoize event handlers and other props to optimize performance.
  const handleNodeClick = useNodeClick(props.data, props.onNodeSelect);
  const getMinimapNodeColor = useMinimapNodeColor();
  const nodeTypes = useMemo(() => ({ custom: CustomNode, group: GroupNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  return (
    <div className="h-full w-full relative" role="application">
        <div className="absolute top-2 left-2 bg-blue-100 border border-blue-400 p-2 text-xs z-50 rounded shadow-lg">
            <div>📊 Graph Data: {props.data.length} nodes</div>
            <div>🎯 Rendered: {flowNodes.length} positioned</div>
            <div>🔧 Layout: New dependency-aware system</div>
        </div>
        
        <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            className="bg-gray-50"
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            deleteKeyCode={null}
            // Performance settings based on graph size
            onlyRenderVisibleElements={flowNodes.length > 100}
            elevateNodesOnSelect={false}
            elevateEdgesOnSelect={false}
            selectNodesOnDrag={flowNodes.length < 100}
            panOnDrag={flowNodes.length > 100 ? [1] : [1, 2]}
            zoomOnScroll={flowNodes.length < 100}
            zoomOnPinch={flowNodes.length < 100}
        >
            <Background color="#e5e7eb" size={1} />
            <Controls />
            <MiniMap nodeColor={getMinimapNodeColor} />
        </ReactFlow>
        <PerformanceMonitor
            nodeCount={flowNodes.length}
            edgeCount={flowEdges.length}
            enabled={props.showPerformanceMonitor}
        />
    </div>
  );
};

// Main export component that handles validation and provides the ReactFlowProvider.
export const GraphVisualization: React.FC<GraphVisualizationProps> = (props) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (props.data.length > 0) {
      const validation = safeValidateGraph(props.data);
      if (!validation.isValid) {
        const errorMessage = validation.errors[0] || 'Invalid graph data';
        setValidationError(errorMessage);
        props.onError?.(new Error(errorMessage), 'data-validation');
        return;
      }
      setValidationError(null);
    }
  }, [props.data, props.onError]);

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

  if (props.data.length === 0) {
     return (
      <div className="h-full flex items-center justify-center text-gray-500" role="status">
        <p>{ERROR_MESSAGES.NO_DATA}</p>
      </div>
    );
  }

  // The ReactFlowProvider is essential for the `useReactFlow` hook (like `fitView`) to work.
  return (
    <ReactFlowProvider>
      <GraphLayoutWrapper {...props} />
    </ReactFlowProvider>
  );
};