/**
 * Custom hooks for graph visualization logic
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import { GraphNode, FlowNode, FlowEdge } from '../types';
import { 
  getLayoutedElements, 
  shouldHighlightForOrderChange, 
  safeCreateEdges,
  calculateNodeCenter,
  findStartNode
} from '../utils/graphUtils';
import { ANIMATION_CONFIG } from '../constants/graphVisualization';

/**
 * Hook for processing graph nodes into ReactFlow nodes
 */
export const useGraphNodes = (
  data: GraphNode[],
  selectedNodeId?: string,
  highlightOrderChangeField: string = 'none',
  highlightOrderChangeValue?: string | null,
  searchedNodeIds: string[] = [],
  isSearchActive: boolean = false,
  highlightedPathToStartNodeIds: Set<string> | null = null
): FlowNode[] => {
  return useMemo(() => {
    if (!data.length) return [];

    return data.map((node): FlowNode => {
      const isOrderChangeNode = shouldHighlightForOrderChange(
        node, 
        highlightOrderChangeField, 
        highlightOrderChangeValue
      );

      const isSearchedMatch = searchedNodeIds.includes(node.nodeId);
      const isPathToStartNode = highlightedPathToStartNodeIds?.has(node.nodeId) ?? false;
      const isPathHighlightActive = !!highlightedPathToStartNodeIds;

      return {
        id: node.nodeId,
        type: 'custom',
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          label: node.nodeId,
          shortDescription: node.shortDescription,
          description: node.description,
          businessPurpose: node.businessPurpose,
          nextNodes: node.nextNodes,
          isSelected: node.nodeId === selectedNodeId,
          isOrderChangeNode,
          orderChanges: node.orderChanges,
          highlightOrderChangeField,
          highlightOrderChangeValue,
          nodeType: node.type,
          isSearchedMatch,
          isSearchActive,
          isPathToStartNode,
          isPathHighlightActive,
          businessRules: node.businessRules,
          dependencies: node.dependencies,
          configurationFlags: node.configurationFlags,
          edgeCases: node.edgeCases,
        },
      };
    });
  }, [
    data, 
    selectedNodeId, 
    highlightOrderChangeField, 
    highlightOrderChangeValue, 
    searchedNodeIds, 
    isSearchActive, 
    highlightedPathToStartNodeIds
  ]);
};

/**
 * Hook for processing graph edges
 */
export const useGraphEdges = (
  data: GraphNode[],
  highlightedPathToStartNodeIds: Set<string> | null = null
): FlowEdge[] => {
  return useMemo(() => {
    if (!data.length) return [];
    return safeCreateEdges(data, highlightedPathToStartNodeIds);
  }, [data, highlightedPathToStartNodeIds]);
};

/**
 * Hook for applying layout to nodes and edges
 */
export const useGraphLayout = (
  nodes: FlowNode[],
  edges: FlowEdge[],
  layoutDirection: string = 'TB'
): { layoutedNodes: FlowNode[]; layoutedEdges: FlowEdge[] } => {
  return useMemo(() => {
    if (!nodes.length) return { layoutedNodes: [], layoutedEdges: [] };
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes, 
      edges, 
      layoutDirection
    );
    
    return { layoutedNodes, layoutedEdges };
  }, [nodes, edges, layoutDirection]);
};

/**
 * Hook for handling view centering and navigation
 */
export const useGraphNavigation = (
  initialNodes: FlowNode[],
  data: GraphNode[],
  selectedNodeId?: string
) => {
  const { fitView, setCenter, getNodes } = useReactFlow();
  const hasInitialized = useRef(false);
  const lastSelectedNodeId = useRef<string | undefined>();

  // Center on initial load - only once
  const centerOnStart = useCallback(() => {
    if (!initialNodes.length || hasInitialized.current) return;

    // Mark as initialized to prevent repeated calls
    hasInitialized.current = true;

    // Always fit view initially for overview
    fitView({ 
      duration: ANIMATION_CONFIG.fitView.duration, 
      padding: ANIMATION_CONFIG.fitView.padding 
    });

    // Optional: Center on start node after a short delay to allow fitView to complete
    setTimeout(() => {
      const startNode = findStartNode(data);
      if (startNode) {
        const flowStartNode = initialNodes.find(n => n.id === startNode.nodeId);
        if (flowStartNode) {
          const center = calculateNodeCenter(flowStartNode);
          setCenter(
            center.x, 
            center.y, 
            ANIMATION_CONFIG.initialCenter.zoom, 
            { duration: ANIMATION_CONFIG.initialCenter.duration }
          );
        }
      }
    }, ANIMATION_CONFIG.fitView.duration + 100); // Wait for fitView to complete
  }, [initialNodes, data, fitView, setCenter]);

  // Center on selected node - only when selection actually changes
  const centerOnSelected = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === lastSelectedNodeId.current) return;
    
    lastSelectedNodeId.current = selectedNodeId;

    const nodeToCenter = getNodes().find((n: any) => n.id === selectedNodeId);
    if (nodeToCenter) {
      const center = calculateNodeCenter(nodeToCenter);
      setCenter(
        center.x, 
        center.y, 
        ANIMATION_CONFIG.centerNode.zoom, 
        { duration: ANIMATION_CONFIG.centerNode.duration }
      );
    }
  }, [selectedNodeId, getNodes, setCenter]);

  // Reset initialization flag when data changes completely
  useEffect(() => {
    if (data.length === 0) {
      hasInitialized.current = false;
      lastSelectedNodeId.current = undefined;
    }
  }, [data]);

  return { centerOnStart, centerOnSelected };
};

/**
 * Hook for managing graph state and initialization
 */
export const useGraphState = (
  data: GraphNode[],
  selectedNodeId?: string,
  highlightOrderChangeField: string = 'none',
  highlightOrderChangeValue?: string | null,
  searchedNodeIds: string[] = [],
  isSearchActive: boolean = false,
  highlightedPathToStartNodeIds: Set<string> | null = null
) => {
  // Process nodes
  const nodes = useGraphNodes(
    data,
    selectedNodeId,
    highlightOrderChangeField,
    highlightOrderChangeValue,
    searchedNodeIds,
    isSearchActive,
    highlightedPathToStartNodeIds
  );

  // Process edges
  const edges = useGraphEdges(data, highlightedPathToStartNodeIds);

  // Apply layout
  const { layoutedNodes, layoutedEdges } = useGraphLayout(nodes, edges);

  // Navigation helpers
  const navigation = useGraphNavigation(layoutedNodes, data, selectedNodeId);

  return {
    nodes: layoutedNodes,
    edges: layoutedEdges,
    navigation,
    hasData: data.length > 0,
  };
};

/**
 * Hook for node click handling
 */
export const useNodeClick = (
  data: GraphNode[],
  onNodeSelect: (node: GraphNode) => void
) => {
  return useCallback((event: React.MouseEvent, node: any) => {
    const originalNode = data.find(n => n.nodeId === node.id);
    if (originalNode) {
      onNodeSelect(originalNode);
    }
  }, [data, onNodeSelect]);
};

/**
 * Hook for minimap node coloring
 */
export const useMinimapNodeColor = () => {
  return useCallback((node: any) => {
    // Path highlight takes precedence for greying out
    if (node.data?.isPathHighlightActive && !node.data?.isPathToStartNode) {
      return '#D1D5DB'; // Grey out non-path nodes
    }
    
    // Use a distinct color for searched nodes
    if (node.data?.isSearchActive && node.data?.isSearchedMatch) {
      return '#FFD700'; // Gold for searched nodes
    }
    
    if (node.data?.isSelected) return '#EF4444';
    if (node.data?.isOrderChangeNode) return '#A855F7';
    if (node.data?.isPathToStartNode) return '#4F46E5'; // Indigo for path nodes
    
    // Node type colors for minimap
    switch (node.data?.nodeType) {
      case 'start': return '#22C55E'; // Green for start
      case 'end': return '#10B981'; // Green for end
      case 'wait': return '#F59E0B'; // Amber for wait
      case 'action': return '#3B82F6'; // Blue for action
      default: return '#3B82F6';
    }
  }, []);
};