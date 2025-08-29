/**
 * Local group-aware layout system
 * 
 * This module extends the standard layout system to support visual grouping
 * of nodes based on connected components that share the same groupName field.
 * Unlike global grouping, nodes are only grouped if they are directly connected
 * to other nodes with the same groupName, creating localized visual groups.
 */

import type { FlowNode, FlowEdge } from '../types';
import { getLayoutedElements as standardLayout } from './layout';

export interface GroupLayoutOptions {
  groupSpacing: number;           // Horizontal spacing between groups
  groupPadding: number;          // Padding around each group
  maintainDependencyFlow: boolean; // Whether to respect dependencies across groups
}

interface GroupCluster {
  groupName: string;
  nodes: FlowNode[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

const DEFAULT_GROUP_OPTIONS: GroupLayoutOptions = {
  groupSpacing: 500,
  groupPadding: 120,
  maintainDependencyFlow: true,
};

/**
 * Finds local groups - connected components of nodes with the same groupName
 * Returns a Map where keys are unique group identifiers and values are arrays of connected nodes
 */
function findLocalGroups(nodes: FlowNode[], edges: FlowEdge[]): Map<string, FlowNode[]> {
  const localGroups = new Map<string, FlowNode[]>();
  const visited = new Set<string>();
  let groupCounter = 0;
  
  // Build adjacency map for nodes with groupName
  const adjacencyMap = new Map<string, Set<string>>();
  nodes.forEach(node => {
    adjacencyMap.set(node.id, new Set());
  });
  
  // Add edges between nodes that have groupName
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      adjacencyMap.get(edge.source)?.add(edge.target);
      adjacencyMap.get(edge.target)?.add(edge.source); // bidirectional for component detection
    }
  });
  
  // Find connected components with same groupName
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    
    const groupName = node.data.groupName!;
    const component = findConnectedComponent(node, nodes, adjacencyMap, visited, groupName);
    
    if (component.length > 0) {
      const groupId = `${groupName}_${groupCounter++}`;
      localGroups.set(groupId, component);
    }
  }
  
  return localGroups;
}

/**
 * Finds all nodes in the same connected component with the same groupName
 */
function findConnectedComponent(
  startNode: FlowNode,
  allNodes: FlowNode[],
  adjacencyMap: Map<string, Set<string>>,
  visited: Set<string>,
  targetGroupName: string
): FlowNode[] {
  const component: FlowNode[] = [];
  const stack = [startNode];
  
  while (stack.length > 0) {
    const currentNode = stack.pop()!;
    
    if (visited.has(currentNode.id)) {
      continue;
    }
    
    if (currentNode.data.groupName !== targetGroupName) {
      continue;
    }
    
    visited.add(currentNode.id);
    component.push(currentNode);
    
    // Add connected nodes with same groupName
    const neighbors = adjacencyMap.get(currentNode.id) || new Set();
    
    for (const neighborId of neighbors) {
      const neighborNode = allNodes.find(n => n.id === neighborId);
      if (neighborNode && 
          !visited.has(neighborId) && 
          neighborNode.data.groupName === targetGroupName) {
        stack.push(neighborNode);
      }
    }
  }
  
  return component;
}

/**
 * Applies group-aware layout to nodes
 */
export const getGroupedLayoutElements = async (
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: Partial<GroupLayoutOptions> = {}
): Promise<FlowNode[]> => {
  const opts = { ...DEFAULT_GROUP_OPTIONS, ...options };
  
  console.log('🎨 Starting group-aware layout with', nodes.length, 'nodes');
  
  // Separate nodes with and without groups
  const groupedNodes = nodes.filter(node => node.data.groupName);
  const ungroupedNodes = nodes.filter(node => !node.data.groupName);
  
  if (groupedNodes.length === 0) {
    console.log('📝 No grouped nodes found, using standard layout');
    return standardLayout(nodes, edges);
  }
  
  // Group nodes by connected components with same groupName (local grouping)
  const localGroups = findLocalGroups(groupedNodes, edges);
  const groupMap = new Map<string, FlowNode[]>();
  localGroups.forEach((nodes, groupId) => {
    groupMap.set(groupId, nodes);
  });
  

  
  // Determine group order based on dependency flow
  const groupOrder = determineGroupOrder(groupMap, edges, opts.maintainDependencyFlow);
  console.log('📋 Group order determined:', groupOrder);
  
  // Layout each group individually
  const groupClusters: GroupCluster[] = [];
  let currentX = 50; // Starting X position following specification
  
  for (const groupName of groupOrder) {
    const groupNodes = groupMap.get(groupName)!;
    console.log(`🎯 Processing group "${groupName}" with ${groupNodes.length} nodes`);
    
    // Get edges that are internal to this group
    const internalEdges = edges.filter(edge => {
      const sourceNode = groupNodes.find(n => n.id === edge.source);
      const targetNode = groupNodes.find(n => n.id === edge.target);
      return sourceNode && targetNode;
    });
    
    // Apply standard layout to this group
    const layoutedGroupNodes = await standardLayout(groupNodes, internalEdges);
    
    // Mark nodes with their local group ID for proper background grouping
    const markedNodes = layoutedGroupNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        groupName: groupName // Use the local group ID to ensure proper grouping
      }
    }));
    
    // Calculate current group bounds
    const bounds = calculateGroupBounds(markedNodes, opts.groupPadding);
    
    // Adjust positions to start from currentX
    const adjustedNodes = markedNodes.map(node => ({
      ...node,
      position: {
        x: node.position.x - bounds.minX + currentX + opts.groupPadding,
        y: Math.max(node.position.y, 50) // Ensure positive Y following specification
      }
    }));
    
    // Recalculate bounds after adjustment
    const finalBounds = calculateGroupBounds(adjustedNodes, opts.groupPadding);
    
    groupClusters.push({
      groupName,
      nodes: adjustedNodes,
      bounds: finalBounds
    });
    
    // Update X position for next group
    currentX = finalBounds.maxX + opts.groupSpacing;
    
    console.log(`✅ Group "${groupName}" positioned at X=${finalBounds.minX}-${finalBounds.maxX}`);
  }
  
  // Combine all positioned nodes
  const allPositionedNodes = groupClusters.flatMap(cluster => cluster.nodes);
  
  // Handle ungrouped nodes if any
  if (ungroupedNodes.length > 0) {
    console.log(`🔧 Positioning ${ungroupedNodes.length} ungrouped nodes`);
    const ungroupedLayouted = await standardLayout(ungroupedNodes, []);
    
    // Position ungrouped nodes at the end
    const ungroupedAdjusted = ungroupedLayouted.map(node => ({
      ...node,
      position: {
        x: currentX + (node.position.x - 50),
        y: Math.max(node.position.y, 50)
      }
    }));
    
    allPositionedNodes.push(...ungroupedAdjusted);
  }
  
  console.log(`🎉 Group layout complete: ${allPositionedNodes.length} total nodes positioned`);
  return allPositionedNodes;
};

/**
 * Determines the order of groups based on dependency relationships
 */
function determineGroupOrder(
  groupMap: Map<string, FlowNode[]>,
  edges: FlowEdge[],
  maintainDependencyFlow: boolean
): string[] {
  const groups = Array.from(groupMap.keys());
  
  if (!maintainDependencyFlow || groups.length <= 1) {
    return groups;
  }
  
  // Build group dependency graph
  const groupDependencies = new Map<string, Set<string>>();
  groups.forEach(group => groupDependencies.set(group, new Set()));
  
  // Analyze cross-group dependencies
  edges.forEach(edge => {
    const sourceGroup = findNodeGroup(edge.source, groupMap);
    const targetGroup = findNodeGroup(edge.target, groupMap);
    
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      groupDependencies.get(targetGroup)!.add(sourceGroup);
    }
  });
  
  // Topological sort of groups
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: string[] = [];
  
  function visit(group: string) {
    if (visiting.has(group)) {
      // Cycle detected, skip to avoid infinite loop
      return;
    }
    if (visited.has(group)) {
      return;
    }
    
    visiting.add(group);
    
    // Visit dependencies first
    for (const dep of groupDependencies.get(group)!) {
      visit(dep);
    }
    
    visiting.delete(group);
    visited.add(group);
    ordered.push(group);
  }
  
  groups.forEach(visit);
  
  return ordered;
}

/**
 * Finds which group a node belongs to
 */
function findNodeGroup(nodeId: string, groupMap: Map<string, FlowNode[]>): string | null {
  for (const [groupName, nodes] of groupMap) {
    if (nodes.some(node => node.id === nodeId)) {
      return groupName;
    }
  }
  return null;
}

/**
 * Calculates the bounding box for a group of nodes
 */
function calculateGroupBounds(nodes: FlowNode[], padding: number) {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  nodes.forEach(node => {
    const nodeWidth = node.width || 280;
    const nodeHeight = node.height || 220;
    
    minX = Math.min(minX, node.position.x - padding);
    maxX = Math.max(maxX, node.position.x + nodeWidth + padding);
    minY = Math.min(minY, node.position.y - padding);
    maxY = Math.max(maxY, node.position.y + nodeHeight + padding);
  });
  
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}