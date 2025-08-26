/**
 * Enhanced GraphVisualization component with improved architecture
 * Features: Better error handling, performance optimization, accessibility
 */

import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { GraphNode } from '../types';
import { 
  useGraphState, 
  useNodeClick, 
  useMinimapNodeColor 
} from '../hooks/useGraphVisualization';
import { safeValidateGraph } from '../utils/validation';
import { 
  ERROR_MESSAGES, 
  ACCESSIBILITY_LABELS 
} from '../constants/graphVisualization';

// Component configuration
const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

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
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasInitialCentered, setHasInitialCentered] = useState(false);

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

  // Process graph data using custom hooks
  const { nodes, edges, navigation, hasData, onUserMoveNodes } = useGraphState(
    data,
    selectedNodeId,
    highlightOrderChangeField,
    highlightOrderChangeValue,
    searchedNodeIds,
    isSearchActive,
    highlightedPathToStartNodeIds
  );

  // React Flow state management
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Enhanced onNodesChange to track user movements
  const handleNodesChange = useCallback((changes: any[]) => {
    // Check if any change is a position change (user dragging)
    const hasPositionChange = changes.some(change => 
      change.type === 'position' && change.dragging === false
    );
    
    if (hasPositionChange) {
      onUserMoveNodes();
    }
    
    onNodesChange(changes);
  }, [onNodesChange, onUserMoveNodes]);

  // Event handlers
  const handleNodeClick = useNodeClick(data, onNodeSelect);
  const getMinimapNodeColor = useMinimapNodeColor();

  // Update flow state when processed data changes
  useEffect(() => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
    
    // Handle initial centering only when we first get data
    if (nodes.length > 0 && !hasInitialCentered) {
      try {
        navigation.centerOnStart();
        setHasInitialCentered(true);
      } catch (error) {
        console.warn('Error during initial navigation:', error);
        onError?.(error as Error, 'navigation');
      }
    } else if (nodes.length === 0) {
      setHasInitialCentered(false);
    }
  }, [nodes, edges, navigation, hasInitialCentered, onError]);

  // Handle selected node centering
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
      className="h-full w-full"
      role="application"
      aria-label={ACCESSIBILITY_LABELS.graphContainer}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
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
    </div>
  );
};

