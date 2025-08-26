/**
 * Utility functions for graph visualization operations
 */

import dagre from 'dagre';
import { MarkerType } from 'reactflow';
import { GraphNode, FlowNode, FlowEdge } from '../types';
import { EDGE_COLORS, LAYOUT_CONFIG, VISUAL_CONFIG, EdgeColorKey } from '../constants/graphVisualization';

/**
 * Calculates possible order statuses for each node based on actual execution paths.
 * 
 * This implementation uses a correct and efficient fixed-point iteration algorithm.
 * It iteratively processes nodes, propagating status sets forward and correctly merging them at
 * junction points. This approach correctly handles complex flows with multiple paths and cycles 
 * (wait loops) by continuing to process nodes until their status sets stabilize. This ensures an 
 * accurate calculation of all possible statuses an order could have upon arriving at any given node.
 * 
 * @param data - An array of all nodes in the workflow graph.
 * @returns A Map where keys are node IDs and values are a Set of possible order status strings.
 */
export const calculatePossibleOrderStatuses = (data: GraphNode[]): Map<string, Set<string>> => {
  if (!data || data.length === 0) {
    return new Map();
  }

  const nodeStatusMap = new Map<string, Set<string>>();
  const predecessorList = new Map<string, Array<{ sourceId: string; condition: string }>>();
  const successorList = new Map<string, string[]>();

  // 1. Initialize data structures
  for (const node of data) {
    nodeStatusMap.set(node.nodeId, new Set<string>());
    predecessorList.set(node.nodeId, []);
    successorList.set(node.nodeId, []);
  }

  // 2. Build predecessor and successor lists for graph traversal
  for (const sourceNode of data) {
    for (const nextNode of sourceNode.nextNodes) {
        const handleEdge = (targetId: string, condition: string) => {
            if (data.some(n => n.nodeId === targetId)) { // Ensure target exists
                predecessorList.get(targetId)!.push({ sourceId: sourceNode.nodeId, condition });
                successorList.get(sourceNode.nodeId)!.push(targetId);
            }
        };

        if (isNewNodeStructure(nextNode)) {
            handleEdge(nextNode.to, nextNode.on);
        } else { // Handle legacy and wait structures
            for (const [condition, target] of Object.entries(nextNode as Record<string, string>)) {
                if (target) {
                    handleEdge(target, condition);
                }
            }
        }
    }
  }

  // 3. Initialize a worklist with all nodes. The algorithm will iterate until no changes occur.
  const worklist: string[] = data.map(node => node.nodeId);

  // 4. Fixed-point iteration using the worklist
  while (worklist.length > 0) {
    const currentNodeId = worklist.shift()!;
    const currentNode = data.find(n => n.nodeId === currentNodeId)!;
    
    // Calculate the new set of statuses for the current node by looking at its predecessors
    const newStatuses = new Set<string>();
    const predecessors = predecessorList.get(currentNodeId) || [];

    if (predecessors.length === 0) {
      // Start nodes have no predecessors. Check if this node sets its own initial status.
      const initialStatusChanges = (currentNode.orderChanges || []).filter(
        change => change.set && change.set['order.status']
      );
      
      for (const change of initialStatusChanges) {
        const statusValue = change.set['order.status'];
        if (Array.isArray(statusValue)) {
          statusValue.forEach(s => newStatuses.add(s));
        } else if (typeof statusValue === 'string') {
          newStatuses.add(statusValue);
        }
      }
    } else {
        for (const { sourceId, condition } of predecessors) {
            const sourceNode = data.find(n => n.nodeId === sourceId)!;
            const statusesAtSource = nodeStatusMap.get(sourceId)!;

            const statusChangesOnPath = (sourceNode.orderChanges || []).filter(
                change => change.on === condition && change.set && change.set['order.status']
            );

            if (statusChangesOnPath.length > 0) {
                // This edge OVERWRITES the status. The statuses from the source node are ignored on this path.
                for (const change of statusChangesOnPath) {
                    const statusValue = change.set['order.status'];
                    if (Array.isArray(statusValue)) {
                        statusValue.forEach(s => newStatuses.add(s));
                    } else if (typeof statusValue === 'string') {
                        newStatuses.add(statusValue);
                    }
                }
            } else {
                // This edge PROPAGATES the statuses from the source node.
                for (const status of statusesAtSource) {
                    newStatuses.add(status);
                }
            }
        }
    }
    
    // Compare the newly computed set with the existing set for the node
    const currentStatuses = nodeStatusMap.get(currentNodeId)!;
    if (newStatuses.size !== currentStatuses.size || ![...newStatuses].every(s => currentStatuses.has(s))) {
        // The status set has changed (grown). Update it.
        nodeStatusMap.set(currentNodeId, newStatuses);

        // Since this node's status changed, all its successors need to be re-evaluated.
        // Add successors to the worklist if they aren't already there.
        const successors = successorList.get(currentNodeId) || [];
        for (const successorId of successors) {
            if (!worklist.includes(successorId)) {
                worklist.push(successorId);
            }
        }
    }
  }
  
  return nodeStatusMap;
};

/**
 * Gets formatted display text for possible order statuses
 */
export const formatOrderStatuses = (statuses: Set<string>): string => {
  if (!statuses || statuses.size === 0) {
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
      // Handle legacy and wait structures
      for (const [condition, target] of Object.entries(nextNode as Record<string, string>)) {
        if (target) { // Ensure target is not null/undefined
            edge = createEdgeFromLegacyStructure(node.nodeId, condition, target, data, highlightedPathToStartNodeIds);
            if (edge) edges.push(edge);
        }
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
    const field = change.set[highlightOrderChangeField];
    if (field === undefined) {
      return false;
    }

    // If a specific value is selected, check if the change matches that value
    if (highlightOrderChangeValue) {
        if (Array.isArray(field)) {
            return field.includes(highlightOrderChangeValue);
        }
        return field === highlightOrderChangeValue;
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