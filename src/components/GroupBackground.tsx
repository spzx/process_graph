/**
 * GroupBackground Component - Creates group background nodes for node grouping
 * 
 * This component creates FlowNode objects that represent group backgrounds.
 * These nodes integrate properly with React Flow's coordinate system.
 */
import React, { useMemo } from 'react';
import { FlowNode, GroupNodeData } from '../types';

interface GroupBackgroundProps {
  nodes: FlowNode[];
}

// Predefined colors for groups (cycling through them)
const GROUP_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.8)' }, // Blue
  { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.8)' }, // Green
  { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.8)' }, // Yellow
  { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.8)' },  // Red
  { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.8)' }, // Purple
  { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.8)' }, // Pink
  { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.8)' },  // Cyan
  { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.8)' },  // Emerald
];

export const createGroupNodes = (nodes: FlowNode[]): FlowNode[] => {
  // Group nodes by their actual groupName (which now includes local group IDs)
  const groupMap = new Map<string, FlowNode[]>();
  
  nodes.forEach(node => {
    const groupName = node.data.groupName;
    if (groupName) {
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(node);
    }
  });



  // Create group nodes
  const groupNodes: FlowNode[] = [];
  let colorIndex = 0;

  groupMap.forEach((groupNodes_inner, groupName) => {
    if (groupNodes_inner.length === 0) return;

    // Extract original group name for display (remove local group counter)
    const displayGroupName = groupName.includes('_') && /.*_\d+$/.test(groupName) 
      ? groupName.substring(0, groupName.lastIndexOf('_'))
      : groupName;
      


    // Calculate group bounds with increased padding for better edge visibility
    const padding = 80;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    groupNodes_inner.forEach(node => {
      const nodeWidth = node.width || 280;
      const nodeHeight = node.height || 220;
      
      minX = Math.min(minX, node.position.x - padding);
      maxX = Math.max(maxX, node.position.x + nodeWidth + padding);
      minY = Math.min(minY, node.position.y - padding - 40);
      maxY = Math.max(maxY, node.position.y + nodeHeight + padding);
    });

    const bounds = {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };



    const colors = GROUP_COLORS[colorIndex % GROUP_COLORS.length];
    
    // Create a group background node
    const groupNode: FlowNode = {
      id: `group-${groupName}`,
      type: 'group',
      position: { x: bounds.minX, y: bounds.minY },
      style: {
        width: bounds.width,
        height: bounds.height,
        zIndex: -1, // Behind regular nodes
      },
      data: {
        groupName: displayGroupName,
        nodeCount: groupNodes_inner.length,
        color: colors.bg,
        borderColor: colors.border,
        label: displayGroupName,
        shortDescription: `Group: ${displayGroupName}`,
        description: `Local group containing ${groupNodes_inner.length} connected nodes`,
        nextNodes: [],
      } as GroupNodeData,
      selectable: false,
      draggable: false,
    };

    groupNodes.push(groupNode);
    colorIndex++;
  });


  return groupNodes;
};

// This component is no longer used - keeping for compatibility
export const GroupBackground: React.FC<GroupBackgroundProps> = ({ nodes }) => {
  return null;
};