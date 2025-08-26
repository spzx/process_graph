/**
 * Utility functions for graph visualization operations
 */

import dagre from 'dagre';
import { MarkerType } from 'reactflow';
import { GraphNode, FlowNode, FlowEdge } from '../types';
import { EDGE_COLORS, LAYOUT_CONFIG, VISUAL_CONFIG, EdgeColorKey } from '../constants/graphVisualization';

/**
 * Calculates possible order statuses for each node based on incoming transitions
 */
export const calculatePossibleOrderStatuses = (data: GraphNode[]): Map<string, Set<string>> => {
  const nodeStatusMap = new Map<string, Set<string>>();
  
  // Initialize all nodes with empty status sets
  data.forEach(node => {
    nodeStatusMap.set(node.nodeId, new Set<string>());
  });

  // Type for incoming transitions
  type IncomingTransition = {
    sourceNodeId: string;
    condition: string;
    orderChanges?: any[];
  };

  // Build a map of incoming transitions for each node
  const incomingTransitions = new Map<string, IncomingTransition[]>();
  
  data.forEach(sourceNode => {
    sourceNode.nextNodes.forEach(nextNode => {
      let targetId: string;
      let condition: string;
      
      if (typeof nextNode.on === 'string' && typeof nextNode.to === 'string') {
        // New structure
        condition = nextNode.on;
        targetId = nextNode.to;
      } else {
        // Legacy structure
        const entries = Object.entries(nextNode as Record<string, string>);
        if (entries.length > 0) {
          [condition, targetId] = entries[0];
        } else {
          return;
        }
      }

      if (!incomingTransitions.has(targetId)) {
        incomingTransitions.set(targetId, []);
      }
      
      incomingTransitions.get(targetId)!.push({
        sourceNodeId: sourceNode.nodeId,
        condition,
        orderChanges: sourceNode.orderChanges
      });
    });
  });

  // Function to recursively calculate statuses using DFS with cycle detection
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  const calculateNodeStatuses = (nodeId: string): Set<string> => {
    if (visiting.has(nodeId)) {
      // Cycle detected, return current known statuses
      return nodeStatusMap.get(nodeId) || new Set();
    }
    
    if (visited.has(nodeId)) {
      return nodeStatusMap.get(nodeId) || new Set();
    }

    visiting.add(nodeId);
    const nodeStatuses = nodeStatusMap.get(nodeId) || new Set<string>();
    
    const incoming = incomingTransitions.get(nodeId) || [];
    
    for (const transition of incoming) {
      const sourceStatuses = calculateNodeStatuses(transition.sourceNodeId);
      
      // Find matching order changes for this transition condition
      const matchingOrderChanges = transition.orderChanges?.filter(change => 
        change.on === transition.condition
      ) || [];
      
      // Look for order changes that modify order.status
      const statusChangingOrderChanges = matchingOrderChanges.filter(change => 
        change.set && change.set['order.status']
      );
      
      if (statusChangingOrderChanges.length > 0) {
        // Add statuses from order changes that modify order.status
        statusChangingOrderChanges.forEach(change => {
          const statusValue = change.set['order.status'];
          if (Array.isArray(statusValue)) {
            statusValue.forEach(status => nodeStatuses.add(status));
          } else if (typeof statusValue === 'string') {
            // Handle comma-separated values or single values
            const statuses = statusValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
            statuses.forEach(status => nodeStatuses.add(status));
          } else {
            nodeStatuses.add(String(statusValue));
          }
        });
      } else {
        // No order changes that modify order.status, inherit from source node
        sourceStatuses.forEach(status => nodeStatuses.add(status));
      }
    }
    
    // If no incoming transitions, check if this node is a start node with initial statuses
    if (incoming.length === 0) {
      const node = data.find(n => n.nodeId === nodeId);
      if (node?.orderChanges) {
        // Check if any order changes set initial order.status
        const initialStatusChanges = node.orderChanges.filter(change => 
          change.set && change.set['order.status']
        );
        
        if (initialStatusChanges.length > 0) {
          initialStatusChanges.forEach(change => {
            const statusValue = change.set['order.status'];
            if (Array.isArray(statusValue)) {
              statusValue.forEach(status => nodeStatuses.add(status));
            } else if (typeof statusValue === 'string') {
              const statuses = statusValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
              statuses.forEach(status => nodeStatuses.add(status));
            } else {
              nodeStatuses.add(String(statusValue));
            }
          });
        }
      }
    }
    
    visiting.delete(nodeId);
    visited.add(nodeId);
    
    return nodeStatuses;
  };
  
  // Calculate statuses for all nodes
  data.forEach(node => {
    calculateNodeStatuses(node.nodeId);
  });
  
  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Order Status Calculation Results:');
    nodeStatusMap.forEach((statuses, nodeId) => {
      if (statuses.size > 0) {
        console.log(`  ${nodeId}: ${Array.from(statuses).join(', ')}`);
      }
    });
  }
  
  return nodeStatusMap;
};

/**
 * Gets formatted display text for possible order statuses
 */
export const formatOrderStatuses = (statuses: Set<string>): string => {
  if (statuses.size === 0) {
    return '';
  }
  
  const statusArray = Array.from(statuses).sort();
  
  if (statusArray.length === 1) {
    return statusArray[0];
  }
  
  if (statusArray.length <= 3) {
    return statusArray.join(' | ');
  }
  
  return `${statusArray.slice(0, 2).join(' | ')} +${statusArray.length - 2} more`;
};

/**
 * Validates if a node has the new data structure with 'on', 'to', 'description' fields
 */
export const isNewNodeStructure = (nextNode: any): nextNode is { on: string; to: string; description: string } => {
  return nextNode && typeof nextNode.on === 'string' && typeof nextNode.to === 'string';
};

/**
 * Validates if a target node exists in the graph data
 */
export const doesTargetExist = (data: GraphNode[], targetId: string): boolean => {
  return data.some(node => node.nodeId === targetId);
};

/**
 * Gets the appropriate edge color based on condition
 */
export const getEdgeColor = (condition: string): string => {
  const normalizedCondition = condition.toLowerCase() as EdgeColorKey;
  return EDGE_COLORS[normalizedCondition] || EDGE_COLORS.default;
};

/**
 * Creates edge styling based on path highlighting state
 */
export const createEdgeStyle = (
  isPathHighlightActive: boolean,
  isEdgeInPath: boolean,
  edgeColor: string
) => ({
  stroke: isPathHighlightActive && !isEdgeInPath ? VISUAL_CONFIG.highlight.colors.dimmed : edgeColor,
  strokeWidth: isPathHighlightActive && isEdgeInPath 
    ? VISUAL_CONFIG.edge.strokeWidth.highlighted 
    : VISUAL_CONFIG.edge.strokeWidth.default,
  opacity: isPathHighlightActive && !isEdgeInPath 
    ? VISUAL_CONFIG.edge.opacity.dimmed 
    : VISUAL_CONFIG.edge.opacity.default,
});

/**
 * Creates edge marker configuration
 */
export const createEdgeMarker = (
  isPathHighlightActive: boolean,
  isEdgeInPath: boolean,
  edgeColor: string
) => ({
  type: MarkerType.ArrowClosed,
  width: VISUAL_CONFIG.edge.marker.width,
  height: VISUAL_CONFIG.edge.marker.height,
  color: isPathHighlightActive && !isEdgeInPath ? VISUAL_CONFIG.highlight.colors.dimmed : edgeColor,
});

/**
 * Processes a single edge from new data structure
 */
export const createEdgeFromNewStructure = (
  sourceNodeId: string,
  nextNode: { on: string; to: string; description: string },
  data: GraphNode[],
  highlightedPathToStartNodeIds: Set<string> | null
): FlowEdge | null => {
  const { on: condition, to: target } = nextNode;
  
  if (!doesTargetExist(data, target)) {
    console.warn(`Target node "${target}" not found in graph data`);
    return null;
  }

  const edgeColor = getEdgeColor(condition);
  const isEdgeInPath = highlightedPathToStartNodeIds 
    ? (highlightedPathToStartNodeIds.has(sourceNodeId) && highlightedPathToStartNodeIds.has(target))
    : false;
  const isPathHighlightActive = !!highlightedPathToStartNodeIds;

  return {
    id: `${sourceNodeId}-${target}-${condition}`,
    source: sourceNodeId,
    target,
    type: 'custom',
    markerEnd: createEdgeMarker(isPathHighlightActive, isEdgeInPath, edgeColor),
    style: createEdgeStyle(isPathHighlightActive, isEdgeInPath, edgeColor),
    data: {
      label: condition,
      condition,
      isPathToStartEdge: isEdgeInPath,
      isPathHighlightActive: isPathHighlightActive,
    },
  };
};

/**
 * Processes a single edge from legacy data structure
 */
export const createEdgeFromLegacyStructure = (
  sourceNodeId: string,
  condition: string,
  target: string,
  data: GraphNode[],
  highlightedPathToStartNodeIds: Set<string> | null
): FlowEdge | null => {
  if (!doesTargetExist(data, target)) {
    console.warn(`Target node "${target}" not found in graph data`);
    return null;
  }

  const edgeColor = getEdgeColor(condition);
  const isEdgeInPath = highlightedPathToStartNodeIds 
    ? (highlightedPathToStartNodeIds.has(sourceNodeId) && highlightedPathToStartNodeIds.has(target))
    : false;
  const isPathHighlightActive = !!highlightedPathToStartNodeIds;

  return {
    id: `${sourceNodeId}-${target}-${condition}`,
    source: sourceNodeId,
    target,
    type: 'custom',
    markerEnd: createEdgeMarker(isPathHighlightActive, isEdgeInPath, edgeColor),
    style: createEdgeStyle(isPathHighlightActive, isEdgeInPath, edgeColor),
    data: {
      label: condition,
      condition,
      isPathToStartEdge: isEdgeInPath,
      isPathHighlightActive: isPathHighlightActive,
    },
  };
};

/**
 * Creates all edges for a given node
 */
export const createEdgesForNode = (
  node: GraphNode,
  data: GraphNode[],
  highlightedPathToStartNodeIds: Set<string> | null
): FlowEdge[] => {
  const edges: FlowEdge[] = [];

  for (const nextNode of node.nextNodes) {
    let edge: FlowEdge | null = null;

    if (isNewNodeStructure(nextNode)) {
      edge = createEdgeFromNewStructure(node.nodeId, nextNode, data, highlightedPathToStartNodeIds);
    } else {
      // Handle legacy structure
      for (const [condition, target] of Object.entries(nextNode as Record<string, string>)) {
        edge = createEdgeFromLegacyStructure(node.nodeId, condition, target, data, highlightedPathToStartNodeIds);
        if (edge) edges.push(edge);
      }
      continue; // Skip the edge push below for legacy structure
    }

    if (edge) {
      edges.push(edge);
    }
  }

  return edges;
};

/**
 * Applies dagre layout to nodes and edges
 */
export const getLayoutedElements = (
  nodes: FlowNode[], 
  edges: FlowEdge[], 
  direction: string = LAYOUT_CONFIG.direction
): { nodes: FlowNode[]; edges: FlowEdge[] } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: LAYOUT_CONFIG.nodeSpacing.rankSep,
    nodesep: LAYOUT_CONFIG.nodeSpacing.nodeSep,
    marginx: LAYOUT_CONFIG.nodeSpacing.marginX,
    marginy: LAYOUT_CONFIG.nodeSpacing.marginY,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    const nodeHeight = node.data.isOrderChangeNode 
      ? LAYOUT_CONFIG.nodeSize.height.orderChange 
      : LAYOUT_CONFIG.nodeSize.height.default;
    dagreGraph.setNode(node.id, { 
      width: LAYOUT_CONFIG.nodeSize.width, 
      height: nodeHeight 
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes
  const layoutedNodes: FlowNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: (isHorizontal ? 'left' : 'top') as 'top' | 'bottom' | 'left' | 'right',
      sourcePosition: (isHorizontal ? 'right' : 'bottom') as 'top' | 'bottom' | 'left' | 'right',
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Checks if a node should be highlighted for order changes
 */
export const shouldHighlightForOrderChange = (
  node: GraphNode,
  highlightOrderChangeField: string,
  highlightOrderChangeValue?: string | null
): boolean => {
  if (highlightOrderChangeField === 'none' || !node.orderChanges) {
    return false;
  }

  return node.orderChanges.some((change) => {
    if (!Object.keys(change.set).includes(highlightOrderChangeField)) {
      return false;
    }

    // If a specific value is selected, check if the change matches that value
    if (highlightOrderChangeValue) {
      return change.set[highlightOrderChangeField] === highlightOrderChangeValue;
    }

    return true; // Otherwise, just check if the field exists
  });
};

/**
 * Calculates node center position
 */
export const calculateNodeCenter = (
  node: { position: { x: number; y: number }; width?: number; height?: number },
  defaultWidth: number = LAYOUT_CONFIG.nodeSize.width,
  defaultHeight: number = LAYOUT_CONFIG.nodeSize.height.default
): { x: number; y: number } => {
  return {
    x: node.position.x + (node.width || defaultWidth) / 2,
    y: node.position.y + (node.height || defaultHeight) / 2,
  };
};

/**
 * Finds the start node in the graph data
 */
export const findStartNode = (data: GraphNode[]): GraphNode | undefined => {
  return data.find(node => node.type === 'start');
};

/**
 * Error boundary wrapper for edge creation
 */
export const safeCreateEdges = (
  data: GraphNode[],
  highlightedPathToStartNodeIds: Set<string> | null
): FlowEdge[] => {
  try {
    const edges: FlowEdge[] = [];
    
    for (const node of data) {
      const nodeEdges = createEdgesForNode(node, data, highlightedPathToStartNodeIds);
      edges.push(...nodeEdges);
    }
    
    return edges;
  } catch (error) {
    console.error('Error creating edges:', error);
    return [];
  }
};