/**
 * Utility functions for graph visualization operations
 */

import dagre from 'dagre';
import { MarkerType } from 'reactflow';
import { GraphNode, FlowNode, FlowEdge } from '../types';
import { EDGE_COLORS, LAYOUT_CONFIG, VISUAL_CONFIG, EdgeColorKey } from '../constants/graphVisualization';

/**
 * Calculates possible order statuses for each node based on actual execution paths
 * This implementation properly traces paths and excludes statuses from wait loops or divergent paths
 */
export const calculatePossibleOrderStatuses = (data: GraphNode[]): Map<string, Set<string>> => {
  const nodeStatusMap = new Map<string, Set<string>>();
  
  // Initialize all nodes with empty status sets
  data.forEach(node => {
    nodeStatusMap.set(node.nodeId, new Set<string>());
  });

  // Build adjacency list for forward traversal
  const adjacencyList = new Map<string, Array<{targetId: string; condition: string}>>();
  
  data.forEach(node => {
    adjacencyList.set(node.nodeId, []);
  });

  // Populate adjacency list from nextNodes
  data.forEach(sourceNode => {
    sourceNode.nextNodes.forEach(nextNode => {
      let targetId: string;
      let condition: string;
      
      if (typeof nextNode.on === 'string' && typeof nextNode.to === 'string') {
        condition = nextNode.on;
        targetId = nextNode.to;
      } else {
        const entries = Object.entries(nextNode as Record<string, string>);
        if (entries.length > 0) {
          [condition, targetId] = entries[0];
        } else {
          return;
        }
      }

      const connections = adjacencyList.get(sourceNode.nodeId) || [];
      connections.push({targetId, condition});
      adjacencyList.set(sourceNode.nodeId, connections);
    });
  });

  /**
   * Traces all valid execution paths to a target node
   * Returns the possible statuses when reaching that node
   */
  const tracePathsToNode = (targetNodeId: string): Set<string> => {
    const possibleStatuses = new Set<string>();
    
    // Quick timeout check
    const startTime = Date.now();
    const TIMEOUT_MS = 2000; // 2 seconds per node
    
    // Find start nodes (nodes with no incoming edges)
    const hasIncomingEdge = new Set<string>();
    data.forEach(node => {
      const connections = adjacencyList.get(node.nodeId) || [];
      connections.forEach(conn => hasIncomingEdge.add(conn.targetId));
    });
    
    const startNodes = data.filter(node => !hasIncomingEdge.has(node.nodeId));
    const entryPoints = startNodes.length > 0 ? startNodes : [data[0]]; // Use first node if no clear entry
    
    // Simple BFS with limited depth
    const queue: Array<{nodeId: string; pathStatuses: Set<string>; depth: number; visited: Set<string>}> = [];
    const MAX_DEPTH = 15;
    
    // Initialize queue with entry points
    entryPoints.forEach(entryNode => {
      if (!entryNode) return;
      
      const initialStatuses = new Set<string>();
      
      // Get initial statuses from entry node
      if (entryNode.orderChanges) {
        entryNode.orderChanges.forEach(change => {
          if (change.set && change.set['order.status']) {
            const statusValue = change.set['order.status'];
            if (typeof statusValue === 'string') {
              initialStatuses.add(statusValue);
            }
          }
        });
      }
      
      if (entryNode.nodeId === targetNodeId) {
        initialStatuses.forEach(status => possibleStatuses.add(status));
      } else {
        queue.push({
          nodeId: entryNode.nodeId,
          pathStatuses: initialStatuses,
          depth: 0,
          visited: new Set([entryNode.nodeId])
        });
      }
    });
    
    // BFS traversal
    while (queue.length > 0) {
      // Timeout check
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.warn(`Timeout reached for node ${targetNodeId}`);
        break;
      }
      
      const {nodeId, pathStatuses, depth, visited} = queue.shift()!;
      
      if (depth > MAX_DEPTH) {
        continue;
      }
      
      const currentNode = data.find(n => n.nodeId === nodeId);
      if (!currentNode) continue;
      
      // Process outgoing edges
      const connections = adjacencyList.get(nodeId) || [];
      connections.forEach(({targetId, condition}) => {
        // Avoid cycles
        if (visited.has(targetId)) {
          return;
        }
        
        let nextStatuses = new Set(pathStatuses);
        
        // Check for order status changes
        if (currentNode.orderChanges) {
          const statusChanges = currentNode.orderChanges.filter(change => 
            change.on === condition && change.set && change.set['order.status']
          );
          
          if (statusChanges.length > 0) {
            nextStatuses.clear();
            statusChanges.forEach(change => {
              const statusValue = change.set['order.status'];
              if (typeof statusValue === 'string') {
                nextStatuses.add(statusValue);
              }
            });
          }
        }
        
        if (targetId === targetNodeId) {
          nextStatuses.forEach(status => possibleStatuses.add(status));
        } else {
          const newVisited = new Set(visited);
          newVisited.add(targetId);
          queue.push({
            nodeId: targetId,
            pathStatuses: nextStatuses,
            depth: depth + 1,
            visited: newVisited
          });
        }
      });
    }
    
    return possibleStatuses;
  };

  // Calculate statuses for all nodes with timeout
  const globalStartTime = Date.now();
  const GLOBAL_TIMEOUT_MS = 10000; // 10 seconds total
  
  console.log(`Calculating order statuses for ${data.length} nodes...`);
  
  for (let i = 0; i < data.length; i++) {
    const node = data[i];
    
    // Check global timeout
    if (Date.now() - globalStartTime > GLOBAL_TIMEOUT_MS) {
      console.warn('Global timeout reached, stopping calculation');
      break;
    }
    
    // Progress logging for large datasets
    if (i % 20 === 0 && i > 0) {
      console.log(`Progress: ${i}/${data.length} nodes processed`);
    }
    
    try {
      const statuses = tracePathsToNode(node.nodeId);
      nodeStatusMap.set(node.nodeId, statuses);
    } catch (error) {
      console.warn(`Error processing node ${node.nodeId}:`, error);
      // Continue with empty status set
    }
  }
  
  console.log('Order Status Calculation completed');

  // Debug logging
  console.log('Order Status Calculation Results (Rewritten):');
  nodeStatusMap.forEach((statuses, nodeId) => {
    if (statuses.size > 0) {
      console.log(`  ${nodeId}: ${Array.from(statuses).join(', ')}`);
    }
  });

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