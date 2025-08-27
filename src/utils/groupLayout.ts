/**
 * Group-aware layout system
 * 
 * This module extends the standard layout system to support visual grouping
 * of nodes based on the groupName field, while maintaining dependency flow
 * within each group and proper spacing between groups.
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
  groupSpacing: 400,
  groupPadding: 80,
  maintainDependencyFlow: true,
};

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
  
  // Group nodes by groupName
  const groupMap = new Map<string, FlowNode[]>();
  groupedNodes.forEach(node => {
    const groupName = node.data.groupName!;
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, []);
    }
    groupMap.get(groupName)!.push(node);
  });
  
  console.log(`🏗️ Found ${groupMap.size} groups:`, Array.from(groupMap.keys()));
  
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
    
    // Calculate current group bounds
    const bounds = calculateGroupBounds(layoutedGroupNodes, opts.groupPadding);
    
    // Adjust positions to start from currentX
    const adjustedNodes = layoutedGroupNodes.map(node => ({
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