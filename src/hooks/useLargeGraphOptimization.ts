/**
 * Performance optimization hook for large graphs
 * Implements viewport-based culling and reduced processing for graphs with 100+ nodes
 */

import { useMemo, useCallback, useRef } from 'react';
import { FlowNode, FlowEdge } from '../types';
import { Viewport } from 'reactflow';

interface UseLargeGraphOptimizationProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
  isLargeGraph: boolean;
}

interface OptimizedGraphData {
  visibleNodes: FlowNode[];
  visibleEdges: FlowEdge[];
  culledNodeCount: number;
  culledEdgeCount: number;
}

export const useLargeGraphOptimization = ({
  nodes,
  edges,
  viewport,
  isLargeGraph,
}: UseLargeGraphOptimizationProps): OptimizedGraphData => {
  const lastViewportRef = useRef(viewport);
  const optimizationCacheRef = useRef<OptimizedGraphData | null>(null);

  // Viewport bounds calculation
  const viewportBounds = useMemo(() => {
    const { x, y, zoom } = viewport;
    const buffer = 500 / zoom; // Buffer area around viewport
    
    return {
      left: -x / zoom - buffer,
      right: (-x + window.innerWidth) / zoom + buffer,
      top: -y / zoom - buffer,
      bottom: (-y + window.innerHeight) / zoom + buffer,
    };
  }, [viewport]);

  // Check if viewport has changed significantly
  const hasSignificantViewportChange = useCallback(() => {
    const last = lastViewportRef.current;
    const current = viewport;
    
    const deltaX = Math.abs(current.x - last.x);
    const deltaY = Math.abs(current.y - last.y);
    const deltaZoom = Math.abs(current.zoom - last.zoom);
    
    // Threshold for considering viewport change significant
    return deltaX > 50 || deltaY > 50 || deltaZoom > 0.1;
  }, [viewport]);

  // Optimized node and edge filtering
  const optimizedData = useMemo(() => {
    // Use cache if viewport hasn't changed significantly
    if (!isLargeGraph || (!hasSignificantViewportChange() && optimizationCacheRef.current)) {
      return optimizationCacheRef.current || { visibleNodes: nodes, visibleEdges: edges, culledNodeCount: 0, culledEdgeCount: 0 };
    }

    if (!isLargeGraph) {
      return { visibleNodes: nodes, visibleEdges: edges, culledNodeCount: 0, culledEdgeCount: 0 };
    }

    // Filter visible nodes based on viewport
    const visibleNodes = nodes.filter(node => {
      const nodeRight = node.position.x + (node.width || 200);
      const nodeBottom = node.position.y + (node.height || 100);
      
      return !(
        nodeRight < viewportBounds.left ||
        node.position.x > viewportBounds.right ||
        nodeBottom < viewportBounds.top ||
        node.position.y > viewportBounds.bottom
      );
    });

    // Create a Set of visible node IDs for edge filtering
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));

    // Filter edges - only include if both source and target are visible
    const visibleEdges = edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    const result = {
      visibleNodes,
      visibleEdges,
      culledNodeCount: nodes.length - visibleNodes.length,
      culledEdgeCount: edges.length - visibleEdges.length,
    };

    // Cache the result
    optimizationCacheRef.current = result;
    lastViewportRef.current = viewport;

    return result;
  }, [nodes, edges, viewportBounds, isLargeGraph, hasSignificantViewportChange]);

  return optimizedData;
};

/**
 * Hook for adaptive performance settings based on graph size
 */
export const useAdaptivePerformanceSettings = (nodeCount: number) => {
  return useMemo(() => {
    if (nodeCount > 200) {
      return {
        renderInterval: 32, // ~30 FPS
        throttleDelay: 300,
        enableViewportCulling: true,
        simplifiedRendering: true,
        disableAnimations: true,
      };
    } else if (nodeCount > 100) {
      return {
        renderInterval: 16, // ~60 FPS
        throttleDelay: 200,
        enableViewportCulling: true,
        simplifiedRendering: true,
        disableAnimations: false,
      };
    } else {
      return {
        renderInterval: 16, // ~60 FPS
        throttleDelay: 100,
        enableViewportCulling: false,
        simplifiedRendering: false,
        disableAnimations: false,
      };
    }
  }, [nodeCount]);
};