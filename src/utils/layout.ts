// src/utils/layout.ts

import ELK from 'elkjs/lib/elk.bundled.js';
import type { FlowNode, FlowEdge } from '../types';

const elk = new ELK();

// These dimensions are still correct based on your CustomNode
const nodeWidth = 280;
const nodeHeight = 220;

export const getLayoutedElements = async (nodes: FlowNode[], edges: FlowEdge[]): Promise<FlowNode[]> => {
  const elkNodes = nodes.map(node => ({
    id: node.id,
    width: nodeWidth,
    height: nodeHeight,
  }));

  const elkEdges = edges.map(edge => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN', // Keep this as 'DOWN' for a top-to-bottom flow

      // --- INCREASE THESE VALUES FOR MORE SPACING ---
      // Horizontal spacing between nodes in the same layer
      'elk.spacing.nodeNode': '120', // Increased from 80
      // Vertical spacing between different layers
      'elk.layered.spacing.nodeNodeBetweenLayers': '150', // Increased from 100
      // ---------------------------------------------

      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const layoutedGraph = await elk.layout(graph);

    const layoutedNodes = nodes.map(node => {
      const elkNode = layoutedGraph.children?.find(n => n.id === node.id);
      if (elkNode) {
        node.position = { x: elkNode.x || 0, y: elkNode.y || 0 };
      }
      return node;
    });

    return layoutedNodes;
  } catch (e) {
    console.error('ELK layout error:', e);
    return nodes; // Fallback to original nodes
  }
};