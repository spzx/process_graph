import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Node,
  Edge,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { GraphNode, FlowNode, FlowEdge } from '../types';
import dagre from 'dagre';

interface GraphVisualizationProps {
  data: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
  selectedNodeId?: string;
  highlightOrderChangeField?: string;
  highlightOrderChangeValue?: string | null; // New prop for specific value highlighting
  searchedNodeIds: string[]; // New prop for searched nodes
  isSearchActive: boolean; // New prop to indicate if search is active
  highlightedPathToStartNodeIds: Set<string> | null; // New prop for path highlighting
}

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const EDGE_COLORS = {
  success: '#10B981',
  fail: '#EF4444',
  error: '#EF4444',
  default: '#6B7280',
  some_other: '#F59E0B',
  new_result: '#3B82F6',
};

// Dagre layout function
const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 100, // Reduced vertical spacing
    nodesep: 70, // Reduced horizontal spacing
    marginx: 30,  // Horizontal margin
    marginy: 30,  // Vertical margin
  });

  nodes.forEach((node) => {
    // Estimate node height based on whether it has order changes
    // These are approximate values; you might need to fine-tune them
    const nodeHeight = node.data.isOrderChangeNode ? 200 : 100; 
    dagreGraph.setNode(node.id, { width: 250, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';

    node.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    };

    return node;
  });

  return { nodes, edges };
};

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ 
  data, 
  onNodeSelect, 
  selectedNodeId,
  highlightOrderChangeField = 'none', // Default to 'none'
  highlightOrderChangeValue = null, // Destructure new prop
  searchedNodeIds, // Destructure new prop
  isSearchActive, // Destructure new prop
  highlightedPathToStartNodeIds, // Destructure new prop
}) => {
  const { fitView, setCenter, getNodes } = useReactFlow();
  const [hasInitialCentered, setHasInitialCentered] = useState(false); // State to track initial centering

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data.length) return { initialNodes: [], initialEdges: [] };

    const nodes: FlowNode[] = data.map((node) => {
      const isOrderChangeNode = highlightOrderChangeField !== 'none' && node.orderChanges?.some(
        (change) => {
          if (Object.keys(change.set).includes(highlightOrderChangeField)) {
            // If a specific value is selected, check if the change matches that value
            if (highlightOrderChangeValue) {
              return change.set[highlightOrderChangeField] === highlightOrderChangeValue;
            }
            return true; // Otherwise, just check if the field exists
          }
          return false;
        }
      );

      const isSearchedMatch = searchedNodeIds.includes(node.nodeId);
      const isPathToStartNode = highlightedPathToStartNodeIds ? highlightedPathToStartNodeIds.has(node.nodeId) : false;
      const isPathHighlightActive = !!highlightedPathToStartNodeIds;

      return {
        id: node.nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: node.nodeId,
          shortDescription: node.shortDescription,
          description: node.description,
          nextNodes: node.nextNodes,
          isSelected: node.nodeId === selectedNodeId,
          isOrderChangeNode: isOrderChangeNode,
          orderChanges: node.orderChanges,
          highlightOrderChangeField: highlightOrderChangeField,
          highlightOrderChangeValue: highlightOrderChangeValue, // Pass new prop to CustomNode
          nodeType: node.type, // Pass the new type field
          isSearchedMatch: isSearchedMatch, // Pass search match status
          isSearchActive: isSearchActive, // Pass search active status
          isPathToStartNode: isPathToStartNode, // Pass path highlight status
          isPathHighlightActive: isPathHighlightActive, // Pass if path highlight is active
        },
      };
    });

    const edges: FlowEdge[] = [];
    data.forEach((node) => {
      node.nextNodes.forEach((nextNode) => {
        // Handle the new data structure with 'on', 'to', and 'description' fields
        if (nextNode.on && nextNode.to) {
          const condition = nextNode.on;
          const target = nextNode.to;
          
          if (data.some(n => n.nodeId === target)) {
            const edgeColor = EDGE_COLORS[condition as keyof typeof EDGE_COLORS] || EDGE_COLORS.default;
            
            // Determine if edge is part of the highlighted path
            const isEdgeInPath = highlightedPathToStartNodeIds 
              ? (highlightedPathToStartNodeIds.has(node.nodeId) && highlightedPathToStartNodeIds.has(target))
              : false;
            const isPathHighlightActive = !!highlightedPathToStartNodeIds;

            edges.push({
              id: `${node.nodeId}-${target}-${condition}`,
              source: node.nodeId,
              target,
              type: 'custom',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: isPathHighlightActive && !isEdgeInPath ? '#D1D5DB' : edgeColor, // Grey out edges not in path
              },
              style: {
                stroke: isPathHighlightActive && !isEdgeInPath ? '#D1D5DB' : edgeColor, // Grey out edges not in path
                strokeWidth: isPathHighlightActive && isEdgeInPath ? 3 : 2, // Thicker stroke for path edges
                opacity: isPathHighlightActive && !isEdgeInPath ? 0.5 : 1, // Reduce opacity for non-path edges
              },
              data: {
                label: condition,
                condition,
                isPathToStartEdge: isEdgeInPath, // Pass path highlight status for edges
                isPathHighlightActive: isPathHighlightActive, // Pass if path highlight is active
              },
            });
          }
        } else {
          // Fallback to the old structure for backward compatibility
          Object.entries(nextNode).forEach(([condition, target]) => {
            if (data.some(n => n.nodeId === target)) {
              const edgeColor = EDGE_COLORS[condition as keyof typeof EDGE_COLORS] || EDGE_COLORS.default;
              
              // Determine if edge is part of the highlighted path
              const isEdgeInPath = highlightedPathToStartNodeIds 
                ? (highlightedPathToStartNodeIds.has(node.nodeId) && highlightedPathToStartNodeIds.has(target))
                : false;
              const isPathHighlightActive = !!highlightedPathToStartNodeIds;

              edges.push({
                id: `${node.nodeId}-${target}-${condition}`,
                source: node.nodeId,
                target,
                type: 'custom',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: isPathHighlightActive && !isEdgeInPath ? '#D1D5DB' : edgeColor, // Grey out edges not in path
                },
                style: {
                  stroke: isPathHighlightActive && !isEdgeInPath ? '#D1D5DB' : edgeColor, // Grey out edges not in path
                  strokeWidth: isPathHighlightActive && isEdgeInPath ? 3 : 2, // Thicker stroke for path edges
                  opacity: isPathHighlightActive && !isEdgeInPath ? 0.5 : 1, // Reduce opacity for non-path edges
                },
                data: {
                  label: condition,
                  condition,
                  isPathToStartEdge: isEdgeInPath, // Pass path highlight status for edges
                  isPathHighlightActive: isPathHighlightActive, // Pass if path highlight is active
                },
              });
            }
          });
        }
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'TB');

    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [data, selectedNodeId, highlightOrderChangeField, highlightOrderChangeValue, searchedNodeIds, isSearchActive, highlightedPathToStartNodeIds]); // Add new props to dependencies

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const originalNode = data.find(n => n.nodeId === node.id);
    if (originalNode) {
      onNodeSelect(originalNode);
    }
  }, [data, onNodeSelect]);

  // Effect to update nodes and edges when initial data changes and handle initial centering
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    if (initialNodes.length > 0) {
      // Always fit view initially to get a good overview
      fitView({ duration: 800, padding: 0.05 }); 

      // Only center on start node once per file upload
      if (!hasInitialCentered) {
        const startNode = data.find(node => node.type === 'start');
        if (startNode) {
          const flowStartNode = initialNodes.find(n => n.id === startNode.nodeId);
          if (flowStartNode) {
            const x = flowStartNode.position.x + (flowStartNode.width || 250) / 2;
            const y = flowStartNode.position.y + (flowStartNode.height || 100) / 2;
            // Zoom out more (e.g., 0.2) for initial centering
            setCenter(x, y, 0.2, { duration: 800 }); 
            setHasInitialCentered(true); // Mark as centered
          }
        }
      }
    } else {
      // Reset initial centered state when graph data is cleared
      setHasInitialCentered(false);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView, data, hasInitialCentered, setCenter]);

  // Effect to center the selected node when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      const nodeToCenter = getNodes().find(n => n.id === selectedNodeId);
      if (nodeToCenter) {
        // Calculate center of the node
        const x = nodeToCenter.position.x + (nodeToCenter.width || 250) / 2; // Use default width if not available
        const y = nodeToCenter.position.y + (nodeToCenter.height || 100) / 2; // Use default height if not available
        setCenter(x, y, 0.2, { duration: 300 }); // Zoom out more for selected node (minimum zoom)
      }
    }
  }, [selectedNodeId, getNodes, setCenter]);


  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Upload a JSON file to visualize the graph</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        className="bg-gray-50"
        defaultEdgeOptions={{
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        }}
      >
        <Background color="#e5e7eb" size={1} />
        <Controls className="!bg-white !border !border-gray-200 !shadow-lg !rounded-lg" />
        <MiniMap
          className="!bg-white !border !border-gray-200 !shadow-lg !rounded-lg"
          nodeColor={(node) => {
            // Path highlight takes precedence for greying out
            if (node.data?.isPathHighlightActive && !node.data?.isPathToStartNode) return '#D1D5DB'; // Grey out non-path nodes
            
            // Use a distinct color for searched nodes
            if (node.data?.isSearchActive && node.data?.isSearchedMatch) return '#FFD700'; // Gold for searched nodes
            if (node.data?.isSelected) return '#EF4444';
            if (node.data?.isOrderChangeNode) return '#A855F7';
            if (node.data?.isPathToStartNode) return '#4F46E5'; // Indigo for path nodes
            
            // New node type colors for minimap
            switch (node.data?.nodeType) {
              case 'start': return '#22C55E'; // Green for start
              case 'end': return '#10B981'; // Green for end
              case 'wait': return '#F59E0B'; // Amber for wait
              case 'action': return '#3B82F6'; // Blue for action
              default: return '#3B82F6';
            }
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
      </ReactFlow>
    </div>
  );
};
