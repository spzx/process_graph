import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Network, ChevronRight, GitCommit, CheckCircle, Clock, Play, ArrowRightCircle, Waypoints } from 'lucide-react';
import { OrderChange, FlowNodeData, NodeType } from '../types';
import { NODE_TYPE_COLORS, VISUAL_CONFIG } from '../constants/graphVisualization';

export const CustomNode = React.memo<NodeProps<FlowNodeData>>(({ data, selected }) => {
  const isHighlighted = data.isSelected;
  const isOrderChange = data.isOrderChangeNode;
  const { 
    orderChanges, 
    highlightOrderChangeField, 
    highlightOrderChangeValue, 
    nodeType, 
    isSearchedMatch, 
    isSearchActive,
    isPathToStartNode,
    isPathHighlightActive,
  } = data;

  // Performance optimization: determine if we should show simplified view
  const isLargeGraphMode = useMemo(() => {
    // Check if we have many sibling nodes (indicating a large graph)
    return document.querySelectorAll('[data-id]').length > 100;
  }, []);

  // Filter order changes to display only those relevant to the selected field and value
  const filteredOrderChanges = useMemo(() => {
    // Skip expensive processing for large graphs unless this node is specifically highlighted
    if (isLargeGraphMode && !isHighlighted && !isOrderChange) return [];
    
    if (!orderChanges || !highlightOrderChangeField || highlightOrderChangeField === 'none') return [];
    
    const filtered = orderChanges.map((change: any) => {
      const filteredSet: Record<string, string> = {};
      for (const key in change.set) {
        if (key === highlightOrderChangeField) {
          // If a specific value is selected, only include if it matches
          if (highlightOrderChangeValue && change.set[key] !== highlightOrderChangeValue) {
            continue;
          }
          filteredSet[key] = change.set[key];
        }
      }
      // Only return the change if it contains the filtered field (and value if specified)
      return Object.keys(filteredSet).length > 0 ? { ...change, set: filteredSet } : null;
    }).filter(Boolean) as OrderChange[]; // Filter out nulls and assert type

    return filtered;
  }, [orderChanges, highlightOrderChangeField, highlightOrderChangeValue, isLargeGraphMode, isHighlighted, isOrderChange]);

  // Determine base classes
  let nodeClasses = 'relative rounded-lg shadow-lg border-2 transition-all duration-200 min-w-[200px] max-w-[300px]';
  let iconBgClasses = 'p-1 rounded';
  let iconClasses = 'w-4 h-4';
  let NodeIcon = Network; // Default icon

  // Get node type configuration
  const nodeTypeConfig = (data.nodeType && data.nodeType in NODE_TYPE_COLORS) 
    ? NODE_TYPE_COLORS[data.nodeType as keyof typeof NODE_TYPE_COLORS] 
    : NODE_TYPE_COLORS.default;

  // Path highlight takes precedence for greying out
  if (isPathHighlightActive && !isPathToStartNode) {
    nodeClasses += ` ${VISUAL_CONFIG.highlight.colors.dimmed} border-gray-200 opacity-50 grayscale`;
    iconBgClasses += ' bg-gray-200';
    iconClasses += ' text-gray-500';
  } else if (isSearchActive && !isSearchedMatch) {
    // Grey out non-matching nodes when search is active
    nodeClasses += ` ${VISUAL_CONFIG.highlight.colors.dimmed} border-gray-200 opacity-50 grayscale`;
    iconBgClasses += ' bg-gray-200';
    iconClasses += ' text-gray-500';
  } else if (isHighlighted) {
    nodeClasses += ' bg-red-50 border-red-500 shadow-xl ring-2 ring-red-200';
    iconBgClasses += ' bg-red-100';
    iconClasses += ' text-red-600';
  } else if (isPathToStartNode) {
    nodeClasses += ' bg-indigo-50 border-indigo-600 shadow-xl ring-2 ring-indigo-200';
    iconBgClasses += ' bg-indigo-100';
    iconClasses += ' text-indigo-700';
    NodeIcon = Waypoints; // Icon for path nodes
  } else if (isOrderChange) {
    // Make purple more prominent
    nodeClasses += ' bg-purple-100 border-purple-600 shadow-md ring-2 ring-purple-400';
    iconBgClasses += ' bg-purple-200';
    iconClasses += ' text-purple-700';
    NodeIcon = GitCommit; // Use GitCommit icon for order change nodes
  } else if (selected) { // ReactFlow's internal selection
    nodeClasses += ' bg-blue-50 border-blue-500 shadow-xl ring-2 ring-blue-200';
    iconBgClasses += ' bg-blue-100';
    iconClasses += ' text-blue-600';
  } else {
    // Apply node type styling using constants
    nodeClasses += ` ${nodeTypeConfig.background} ${nodeTypeConfig.border} ${nodeTypeConfig.hover} hover:shadow-xl`;
    iconBgClasses += ` ${nodeTypeConfig.iconBg}`;
    iconClasses += ` ${nodeTypeConfig.iconColor}`;
    
    // Set appropriate icon based on node type
    switch (data.nodeType) {
      case 'start':
        NodeIcon = ArrowRightCircle;
        break;
      case 'end':
        NodeIcon = CheckCircle;
        break;
      case 'wait':
        NodeIcon = Clock;
        break;
      case 'action':
        NodeIcon = Play;
        break;
      default:
        NodeIcon = Network;
        break;
    }
  }
  
  return (
    <div className={nodeClasses}>
      <Handle
        type="target"
        position={Position.Top}
        className={`!bg-gray-400 !border-2 !border-white !w-${VISUAL_CONFIG.node.handle.width / 4} !h-${VISUAL_CONFIG.node.handle.height / 4}`}
        aria-label="Input connection point"
      />

      {isOrderChange && (
        <div className="absolute -top-2 -right-2 flex items-center space-x-1 bg-purple-600 p-1 pr-2 rounded-full shadow-md z-10">
          <GitCommit className="w-4 h-4 text-white" />
          {filteredOrderChanges && filteredOrderChanges.length > 0 && (
            <span className="text-white text-xs font-bold">{filteredOrderChanges.length}</span>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className={iconBgClasses}>
            <NodeIcon className={iconClasses} />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm truncate">{data.label}</h3>
        </div>

        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{data.shortDescription}</p>

        {/* Show detailed content only for important nodes in large graphs */}
        {(!isLargeGraphMode || isHighlighted || isOrderChange || isPathToStartNode) && (
          <>
            {data.possibleOrderStatuses && data.possibleOrderStatuses.length > 0 && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-1 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs font-medium text-blue-800">Possible Order Status:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.possibleOrderStatuses.slice(0, isLargeGraphMode ? 3 : 10).map((status: string, index: number) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200"
                    >
                      {status}
                    </span>
                  ))}
                  {isLargeGraphMode && data.possibleOrderStatuses.length > 3 && (
                    <span className="text-xs text-blue-600">+{data.possibleOrderStatuses.length - 3} more</span>
                  )}
                </div>
              </div>
            )}

            {isOrderChange && filteredOrderChanges && filteredOrderChanges.length > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-200">
                <h4 className="text-xs font-semibold text-purple-700 mb-1">Order Changes:</h4>
                <div className="space-y-1">
                  {filteredOrderChanges.slice(0, isLargeGraphMode ? 2 : 5).map((change, index) => (
                    <div key={index} className="text-xs text-purple-800 bg-purple-50 px-2 py-1 rounded">
                      {Object.entries(change.set).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span className="ml-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {isLargeGraphMode && filteredOrderChanges.length > 2 && (
                    <div className="text-xs text-purple-600">+{filteredOrderChanges.length - 2} more changes</div>
                  )}
                </div>
              </div>
            )}

            {data.nextNodes && data.nextNodes.length > 0 && (
              <div className="flex items-center text-xs text-gray-500 mt-3">
                <ChevronRight className="w-3 h-3 mr-1" />
                <span>{data.nextNodes.length} connection{data.nextNodes.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!bg-blue-500 !border-2 !border-white !w-${VISUAL_CONFIG.node.handle.width / 4} !h-${VISUAL_CONFIG.node.handle.height / 4}`}
        aria-label="Output connection point"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
