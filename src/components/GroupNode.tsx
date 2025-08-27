/**
 * GroupNode Component - Custom React Flow node for rendering group backgrounds
 * 
 * This component creates group background nodes that integrate properly with
 * React Flow's coordinate system and viewport transformations.
 */
import React from 'react';
import { NodeProps } from 'reactflow';
import { GroupNodeData } from '../types';

export const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ data }) => {
  return (
    <div
      style={{
        background: data.color,
        border: `3px dashed ${data.borderColor}`,
        borderRadius: '16px',
        padding: '0',
        pointerEvents: 'none',
        position: 'relative',
        minWidth: '100%',
        minHeight: '100%',
      }}
    >
      {/* Group label */}
      <div
        style={{
          position: 'absolute',
          left: '16px',
          top: '16px',
          fontSize: '16px',
          fontWeight: '700',
          color: data.borderColor,
          fontFamily: 'Inter, system-ui, sans-serif',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: `2px solid ${data.borderColor}`,
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 10,
        }}
      >
        {data.groupName} ({data.nodeCount})
      </div>
    </div>
  );
};