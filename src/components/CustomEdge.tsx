import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

const EDGE_COLORS = {
  success: '#10B981',
  fail: '#EF4444',
  error: '#EF4444',
  default: '#6B7280',
};

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = EDGE_COLORS[data?.condition as keyof typeof EDGE_COLORS] || EDGE_COLORS.default;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium shadow-sm"
            style={{ color: edgeColor }}
          >
            {data?.label || ''}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
