/**
 * Modern dependency-aware graph layout system
 * 
 * This module provides the main interface for the new GraphLayoutManager system,
 * replacing the previous ElkJS/custom hybrid approach with a unified,
 * dependency-first layout engine that ensures proper left-to-right flow.
 */

import type { FlowNode, FlowEdge } from '../types';
import { GraphLayoutManager, LayoutOptions } from './graphLayoutManager';

// Global layout manager instance
let layoutManager: GraphLayoutManager | null = null;

/**
 * Gets or creates the layout manager instance
 */
function getLayoutManager(options?: Partial<LayoutOptions>): GraphLayoutManager {
  if (!layoutManager || options) {
    layoutManager = new GraphLayoutManager({
      debugMode: true, // Enable debug logging
      optimization: 'balanced',
      cycleHandling: 'break',
      positioning: {
        layerSpacing: 450,
        nodeSpacing: 350,
        basePosition: { x: 50, y: 50 },
        nodeSize: {
          width: 280,
          height: {
            default: 220,
            orderChange: 240
          }
        },
        alignment: 'top',
        minimizeEdgeCrossings: true
      },
      ...options
    });
  }
  return layoutManager;
}

/**
 * Main layout function - processes nodes and returns positioned elements
 * 
 * This function maintains backward compatibility with the existing interface
 * while providing the full power of the new dependency-aware layout system.
 */
export const getLayoutedElements = async (
  nodes: FlowNode[], 
  edges: FlowEdge[],
  options?: Partial<LayoutOptions>
): Promise<FlowNode[]> => {
  console.log('🚀 Starting new dependency-aware layout system with', nodes.length, 'nodes');
  
  if (nodes.length === 0) {
    return nodes;
  }

  try {
    // Get layout manager instance
    const manager = getLayoutManager(options);
    
    // Process the graph
    const result = await manager.processGraph(nodes, options);
    
    // Log summary
    console.log('✅ Layout processing complete:');
    console.log(`  Quality Score: ${(result.metadata.quality.overallScore * 100).toFixed(1)}%`);
    console.log(`  Processing Time: ${result.performance.totalTime.toFixed(1)}ms`);
    console.log(`  Layout Dimensions: ${result.metadata.layoutDimensions.width.toFixed(0)}x${result.metadata.layoutDimensions.height.toFixed(0)}`);
    console.log(`  Cycles Detected: ${result.metadata.cyclesDetected}`);
    console.log(`  Cycles Broken: ${result.metadata.cyclesBroken}`);
    
    // Log recommendations
    if (result.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      result.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    // Log warnings
    if (result.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    return result.nodes;
    
  } catch (error) {
    console.error('🚨 Layout processing failed:', error);
    
    // Fallback to a simple left-to-right positioning
    console.log('🔄 Falling back to simple positioning...');
    return fallbackPositioning(nodes);
  }
};

/**
 * Fallback positioning function in case the main layout system fails
 */
function fallbackPositioning(nodes: FlowNode[]): FlowNode[] {
  console.log('📐 Applying fallback positioning for', nodes.length, 'nodes');
  
  // Simple left-to-right positioning based on node index
  const layerSpacing = 450;
  const nodeSpacing = 350;
  const baseX = 50;
  const baseY = 50;
  
  // Find start node and put it first (with null checks)
  const startNode = nodes.find(node => node.data && 'nodeType' in node.data && node.data.nodeType === 'start');
  const otherNodes = nodes.filter(node => !node.data || !('nodeType' in node.data) || node.data.nodeType !== 'start');
  const orderedNodes = startNode ? [startNode, ...otherNodes] : nodes;
  
  return orderedNodes.map((node, index) => ({
    ...node,
    position: {
      x: baseX + (index * layerSpacing),
      y: baseY
    },
    // Ensure data exists
    data: node.data || { label: 'Unknown', shortDescription: 'Unknown', description: 'Unknown node', nodeType: 'action', nextNodes: [] }
  }));
}

/**
 * Validates a graph without performing layout
 */
export const validateGraphStructure = (nodes: FlowNode[]): boolean => {
  try {
    const manager = getLayoutManager();
    const validation = manager.validateGraph(nodes);
    
    console.log('🔍 Graph validation result:');
    console.log(`  Valid: ${validation.isValid}`);
    console.log(`  Score: ${(validation.score * 100).toFixed(1)}%`);
    console.log(`  Errors: ${validation.errors.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);
    
    return validation.isValid;
  } catch (error) {
    console.error('🚨 Graph validation failed:', error);
    return false;
  }
};

/**
 * Gets layout recommendations for a graph
 */
export const getLayoutRecommendations = async (nodes: FlowNode[]): Promise<string[]> => {
  try {
    const manager = getLayoutManager();
    const result = await manager.processGraph(nodes);
    return result.recommendations;
  } catch (error) {
    console.error('🚨 Failed to get recommendations:', error);
    return ['Unable to generate recommendations due to processing error'];
  }
};

/**
 * Configuration options for layout behavior
 */
export const LayoutConfig = {
  // High-quality layout with edge crossing minimization
  QUALITY: {
    optimization: 'quality' as const,
    positioning: {
      minimizeEdgeCrossings: true,
      alignment: 'center' as const
    },
    layering: {
      optimizeBalance: true,
      maxLayerWidth: 6
    }
  },
  
  // Fast layout for large graphs
  PERFORMANCE: {
    optimization: 'speed' as const,
    positioning: {
      minimizeEdgeCrossings: false,
      alignment: 'top' as const
    },
    layering: {
      optimizeBalance: false,
      maxLayerWidth: 10
    }
  },
  
  // Balanced approach (default)
  BALANCED: {
    optimization: 'balanced' as const,
    positioning: {
      minimizeEdgeCrossings: true,
      alignment: 'top' as const
    },
    layering: {
      optimizeBalance: true,
      maxLayerWidth: 8
    }
  }
} as const;

// Re-export types for convenience
export type { LayoutOptions } from './graphLayoutManager';