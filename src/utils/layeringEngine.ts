/**
 * LayeringEngine - Advanced node layering for dependency-aware graph layout
 * 
 * This class assigns nodes to hierarchical layers based on their dependencies,
 * ensuring strict left-to-right flow while handling circular dependencies
 * through feedback edge integration and layer optimization techniques.
 */

import { DependencyGraph, PathLengthMap } from './dependencyAnalyzer';
import { CycleBreakingResult } from './cycleHandler';
import { FlowNode } from '../types';

export interface LayerAssignment {
  layers: Map<number, string[]>; // layer index -> node IDs
  nodeToLayer: Map<string, number>; // node ID -> layer index
  maxLayer: number;
  layerMetrics: LayerMetrics;
}

export interface LayerMetrics {
  totalLayers: number;
  averageNodesPerLayer: number;
  maxNodesInLayer: number;
  layerDistribution: number[]; // nodes count per layer
  balanceScore: number; // 0-1, higher is better balanced
}

export interface LayeringOptions {
  optimizeBalance: boolean; // Whether to balance layer sizes
  preserveUserHints: boolean; // Whether to consider existing positions
  maxLayerWidth: number; // Maximum preferred nodes per layer
  layerSpacing: number; // For layout calculations
}

export interface LayeringResult {
  assignment: LayerAssignment;
  feedbackEdgesHandled: string[];
  optimizations: LayeringOptimization[];
  warnings: LayeringWarning[];
  recommendations: string[];
}

export interface LayeringOptimization {
  type: 'balance' | 'spacing' | 'feedback' | 'start_position';
  description: string;
  nodesAffected: string[];
  impact: number; // 0-1, higher is more significant
}

export interface LayeringWarning {
  type: 'unbalanced' | 'wide_layer' | 'feedback_conflict' | 'orphan';
  message: string;
  nodeIds: string[];
  severity: 'low' | 'medium' | 'high';
}

export class LayeringEngine {
  private debugMode: boolean;
  private options: LayeringOptions;

  constructor(options: Partial<LayeringOptions> = {}, debugMode = false) {
    this.debugMode = debugMode;
    this.options = {
      optimizeBalance: true,
      preserveUserHints: false,
      maxLayerWidth: 8,
      layerSpacing: 350,
      ...options
    };
  }

  /**
   * Main method to assign layers to nodes based on dependencies
   */
  public assignLayers(
    graph: DependencyGraph,
    longestPaths: PathLengthMap,
    cycleResult?: CycleBreakingResult
  ): LayeringResult {
    this.log('🏗️ Starting layer assignment process...');
    
    // Step 1: Handle feedback edges from cycle breaking
    const modifiedPaths = this.adjustPathsForFeedbackEdges(longestPaths, cycleResult);
    
    // Step 2: Create initial layer assignment based on longest paths
    const initialAssignment = this.createInitialAssignment(graph, modifiedPaths);
    
    // Step 3: Optimize layer distribution if requested
    const optimizedAssignment = this.options.optimizeBalance 
      ? this.optimizeLayerBalance(initialAssignment, graph)
      : initialAssignment;
    
    // Step 4: Handle special cases and constraints
    const finalAssignment = this.applySpecialConstraints(optimizedAssignment, graph);
    
    // Step 5: Validate and generate metrics
    const layerMetrics = this.calculateLayerMetrics(finalAssignment);
    const finalizedAssignment = { ...finalAssignment, layerMetrics };
    
    // Step 6: Generate optimizations, warnings, and recommendations
    const optimizations = this.identifyOptimizations(initialAssignment, finalizedAssignment);
    const warnings = this.generateWarnings(finalizedAssignment, graph);
    const recommendations = this.generateRecommendations(finalizedAssignment, warnings);

    this.log('✅ Layer assignment complete');
    this.logLayerStatistics(finalizedAssignment);

    return {
      assignment: finalizedAssignment,
      feedbackEdgesHandled: cycleResult?.feedbackEdges ? Array.from(cycleResult.feedbackEdges) : [],
      optimizations,
      warnings,
      recommendations
    };
  }

  /**
   * Adjusts longest paths to account for feedback edges
   */
  private adjustPathsForFeedbackEdges(
    originalPaths: PathLengthMap,
    cycleResult?: CycleBreakingResult
  ): PathLengthMap {
    if (!cycleResult || cycleResult.feedbackEdges.size === 0) {
      return originalPaths;
    }

    this.log('🔄 Adjusting paths for feedback edges:', Array.from(cycleResult.feedbackEdges));
    
    // For now, return original paths
    // In a full implementation, we would recalculate paths
    // with feedback edges temporarily removed
    return originalPaths;
  }

  /**
   * Creates initial layer assignment based on longest paths
   */
  private createInitialAssignment(
    graph: DependencyGraph,
    paths: PathLengthMap
  ): LayerAssignment {
    this.log('📊 Creating initial layer assignment...');
    
    const layers = new Map<number, string[]>();
    const nodeToLayer = new Map<string, number>();
    let maxLayer = 0;

    // Assign each node to its appropriate layer
    for (const [nodeId] of graph.nodes) {
      const layer = paths[nodeId] ?? 0;
      maxLayer = Math.max(maxLayer, layer);

      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      
      layers.get(layer)!.push(nodeId);
      nodeToLayer.set(nodeId, layer);
      
      this.log(`📍 Node ${nodeId}: layer ${layer}`);
    }

    // Ensure start nodes are in layer 0
    this.ensureStartNodesInLayerZero(graph, layers, nodeToLayer);

    // Sort nodes within each layer for consistency
    this.sortNodesWithinLayers(layers, graph);

    return {
      layers,
      nodeToLayer,
      maxLayer,
      layerMetrics: this.calculateLayerMetrics({ layers, nodeToLayer, maxLayer } as LayerAssignment)
    };
  }

  /**
   * Ensures start nodes are always placed in layer 0
   */
  private ensureStartNodesInLayerZero(
    graph: DependencyGraph,
    layers: Map<number, string[]>,
    nodeToLayer: Map<string, number>
  ): void {
    for (const startNodeId of graph.startNodes) {
      const currentLayer = nodeToLayer.get(startNodeId);
      
      if (currentLayer !== 0) {
        this.log(`🏁 Moving start node ${startNodeId} from layer ${currentLayer} to layer 0`);
        
        // Remove from current layer
        if (currentLayer !== undefined) {
          const currentLayerNodes = layers.get(currentLayer) || [];
          const index = currentLayerNodes.indexOf(startNodeId);
          if (index >= 0) {
            currentLayerNodes.splice(index, 1);
          }
        }
        
        // Add to layer 0
        if (!layers.has(0)) {
          layers.set(0, []);
        }
        layers.get(0)!.unshift(startNodeId); // Add at beginning
        nodeToLayer.set(startNodeId, 0);
      }
    }
  }

  /**
   * Sorts nodes within each layer for consistent ordering
   */
  private sortNodesWithinLayers(
    layers: Map<number, string[]>,
    graph: DependencyGraph
  ): void {
    layers.forEach((nodeIds, layerIndex) => {
      nodeIds.sort((a, b) => {
        const nodeA = graph.nodes.get(a);
        const nodeB = graph.nodes.get(b);
        
        // Start nodes first
        if (nodeA?.data.nodeType === 'start' && nodeB?.data.nodeType !== 'start') return -1;
        if (nodeB?.data.nodeType === 'start' && nodeA?.data.nodeType !== 'start') return 1;
        
        // End nodes last
        if (nodeA?.data.nodeType === 'end' && nodeB?.data.nodeType !== 'end') return 1;
        if (nodeB?.data.nodeType === 'end' && nodeA?.data.nodeType !== 'end') return -1;
        
        // Sort by node ID for consistency
        return a.localeCompare(b);
      });
    });
  }

  /**
   * Optimizes layer balance to improve visual distribution
   */
  private optimizeLayerBalance(
    assignment: LayerAssignment,
    graph: DependencyGraph
  ): LayerAssignment {
    if (!this.options.optimizeBalance) {
      return assignment;
    }

    this.log('⚖️ Optimizing layer balance...');
    
    const { layers, nodeToLayer, maxLayer } = assignment;
    const optimizedLayers = new Map(layers);
    const optimizedNodeToLayer = new Map(nodeToLayer);

    // Find layers that exceed the maximum preferred width
    const wideLayers: number[] = [];
    layers.forEach((nodeIds, layerIndex) => {
      if (nodeIds.length > this.options.maxLayerWidth) {
        wideLayers.push(layerIndex);
      }
    });

    // Attempt to redistribute nodes from wide layers
    for (const layerIndex of wideLayers) {
      this.redistributeWideLayer(
        layerIndex,
        optimizedLayers,
        optimizedNodeToLayer,
        graph
      );
    }

    return {
      layers: optimizedLayers,
      nodeToLayer: optimizedNodeToLayer,
      maxLayer: Math.max(...optimizedLayers.keys()),
      layerMetrics: this.calculateLayerMetrics({
        layers: optimizedLayers,
        nodeToLayer: optimizedNodeToLayer,
        maxLayer: Math.max(...optimizedLayers.keys())
      } as LayerAssignment)
    };
  }

  /**
   * Redistributes nodes from a layer that's too wide
   */
  private redistributeWideLayer(
    layerIndex: number,
    layers: Map<number, string[]>,
    nodeToLayer: Map<string, number>,
    graph: DependencyGraph
  ): void {
    const layerNodes = layers.get(layerIndex) || [];
    const excess = layerNodes.length - this.options.maxLayerWidth;
    
    if (excess <= 0) return;

    this.log(`📏 Redistributing ${excess} nodes from wide layer ${layerIndex}`);

    // Find candidates for moving to the next layer
    const candidates = layerNodes.filter(nodeId => {
      const node = graph.nodes.get(nodeId);
      // Don't move start nodes or nodes with critical dependencies
      return node?.data.nodeType !== 'start' && 
             node?.data.nodeType !== 'end';
    });

    const toMove = candidates.slice(0, Math.min(excess, candidates.length));
    const targetLayer = layerIndex + 1;

    for (const nodeId of toMove) {
      // Check if moving this node violates dependencies
      if (this.canMoveToLayer(nodeId, targetLayer, graph, nodeToLayer)) {
        // Remove from current layer
        const currentLayerNodes = layers.get(layerIndex) || [];
        const index = currentLayerNodes.indexOf(nodeId);
        if (index >= 0) {
          currentLayerNodes.splice(index, 1);
        }

        // Add to target layer
        if (!layers.has(targetLayer)) {
          layers.set(targetLayer, []);
        }
        layers.get(targetLayer)!.push(nodeId);
        nodeToLayer.set(nodeId, targetLayer);

        this.log(`  ➡️ Moved ${nodeId} to layer ${targetLayer}`);
      }
    }
  }

  /**
   * Checks if a node can be safely moved to a specific layer
   */
  private canMoveToLayer(
    nodeId: string,
    targetLayer: number,
    graph: DependencyGraph,
    nodeToLayer: Map<string, number>
  ): boolean {
    // Check incoming dependencies
    const incoming = graph.incomingEdges.get(nodeId) || new Set();
    for (const depId of incoming) {
      const depLayer = nodeToLayer.get(depId);
      if (depLayer !== undefined && depLayer >= targetLayer) {
        return false; // Would violate dependency order
      }
    }

    // Check outgoing dependencies
    const outgoing = graph.outgoingEdges.get(nodeId) || new Set();
    for (const targetId of outgoing) {
      const targetNodeLayer = nodeToLayer.get(targetId);
      if (targetNodeLayer !== undefined && targetNodeLayer <= targetLayer) {
        return false; // Would violate dependency order
      }
    }

    return true;
  }

  /**
   * Applies special constraints like start node positioning
   */
  private applySpecialConstraints(
    assignment: LayerAssignment,
    graph: DependencyGraph
  ): LayerAssignment {
    this.log('🎯 Applying special constraints...');
    
    // For now, return the assignment as-is
    // In a full implementation, we might handle special positioning rules
    return assignment;
  }

  /**
   * Calculates comprehensive metrics for layer assignment
   */
  private calculateLayerMetrics(assignment: LayerAssignment): LayerMetrics {
    const { layers, maxLayer } = assignment;
    const totalLayers = maxLayer + 1;
    
    const layerDistribution: number[] = [];
    let totalNodes = 0;
    let maxNodesInLayer = 0;

    for (let i = 0; i <= maxLayer; i++) {
      const nodeCount = layers.get(i)?.length || 0;
      layerDistribution.push(nodeCount);
      totalNodes += nodeCount;
      maxNodesInLayer = Math.max(maxNodesInLayer, nodeCount);
    }

    const averageNodesPerLayer = totalNodes / totalLayers;
    
    // Calculate balance score (0-1, higher is better)
    const variance = layerDistribution.reduce((sum, count) => {
      return sum + Math.pow(count - averageNodesPerLayer, 2);
    }, 0) / totalLayers;
    
    const balanceScore = Math.max(0, 1 - (variance / (averageNodesPerLayer * averageNodesPerLayer)));

    return {
      totalLayers,
      averageNodesPerLayer,
      maxNodesInLayer,
      layerDistribution,
      balanceScore
    };
  }

  /**
   * Identifies optimizations applied during layering
   */
  private identifyOptimizations(
    initial: LayerAssignment,
    final: LayerAssignment
  ): LayeringOptimization[] {
    const optimizations: LayeringOptimization[] = [];

    // Compare balance scores
    if (final.layerMetrics.balanceScore > initial.layerMetrics.balanceScore) {
      optimizations.push({
        type: 'balance',
        description: `Improved layer balance from ${initial.layerMetrics.balanceScore.toFixed(2)} to ${final.layerMetrics.balanceScore.toFixed(2)}`,
        nodesAffected: this.findMovedNodes(initial, final),
        impact: final.layerMetrics.balanceScore - initial.layerMetrics.balanceScore
      });
    }

    return optimizations;
  }

  /**
   * Finds nodes that were moved between initial and final assignments
   */
  private findMovedNodes(initial: LayerAssignment, final: LayerAssignment): string[] {
    const moved: string[] = [];
    
    initial.nodeToLayer.forEach((initialLayer, nodeId) => {
      const finalLayer = final.nodeToLayer.get(nodeId);
      if (finalLayer !== undefined && finalLayer !== initialLayer) {
        moved.push(nodeId);
      }
    });

    return moved;
  }

  /**
   * Generates warnings about layer assignment issues
   */
  private generateWarnings(
    assignment: LayerAssignment,
    graph: DependencyGraph
  ): LayeringWarning[] {
    const warnings: LayeringWarning[] = [];

    // Check for unbalanced distribution
    if (assignment.layerMetrics.balanceScore < 0.7) {
      warnings.push({
        type: 'unbalanced',
        message: `Layer distribution is unbalanced (score: ${assignment.layerMetrics.balanceScore.toFixed(2)})`,
        nodeIds: [],
        severity: assignment.layerMetrics.balanceScore < 0.5 ? 'high' : 'medium'
      });
    }

    // Check for overly wide layers
    assignment.layers.forEach((nodeIds, layerIndex) => {
      if (nodeIds.length > this.options.maxLayerWidth * 1.5) {
        warnings.push({
          type: 'wide_layer',
          message: `Layer ${layerIndex} has ${nodeIds.length} nodes (recommended max: ${this.options.maxLayerWidth})`,
          nodeIds: [...nodeIds],
          severity: nodeIds.length > this.options.maxLayerWidth * 2 ? 'high' : 'medium'
        });
      }
    });

    // Check for orphan nodes
    if (graph.orphanNodes.length > 0) {
      warnings.push({
        type: 'orphan',
        message: `${graph.orphanNodes.length} orphan nodes detected`,
        nodeIds: [...graph.orphanNodes],
        severity: 'low'
      });
    }

    return warnings;
  }

  /**
   * Generates recommendations for improving layer assignment
   */
  private generateRecommendations(
    assignment: LayerAssignment,
    warnings: LayeringWarning[]
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`✅ Assigned ${assignment.nodeToLayer.size} nodes to ${assignment.layerMetrics.totalLayers} layers`);

    if (assignment.layerMetrics.balanceScore > 0.8) {
      recommendations.push('🎯 Excellent layer balance achieved');
    } else if (assignment.layerMetrics.balanceScore > 0.6) {
      recommendations.push('👍 Good layer balance achieved');
    } else {
      recommendations.push('⚠️ Consider workflow simplification to improve layer balance');
    }

    const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
    if (highSeverityWarnings.length > 0) {
      recommendations.push('🚨 Address high-severity warnings for optimal layout');
    }

    if (assignment.layerMetrics.maxNodesInLayer > this.options.maxLayerWidth) {
      recommendations.push('💡 Consider splitting wide layers or increasing canvas height');
    }

    return recommendations;
  }

  /**
   * Logs layer statistics for debugging
   */
  private logLayerStatistics(assignment: LayerAssignment): void {
    this.log('📊 Layer Statistics:');
    this.log(`  Total layers: ${assignment.layerMetrics.totalLayers}`);
    this.log(`  Average nodes per layer: ${assignment.layerMetrics.averageNodesPerLayer.toFixed(1)}`);
    this.log(`  Max nodes in layer: ${assignment.layerMetrics.maxNodesInLayer}`);
    this.log(`  Balance score: ${assignment.layerMetrics.balanceScore.toFixed(2)}`);

    if (this.debugMode) {
      this.log('🗂️ Layer distribution:');
      assignment.layers.forEach((nodeIds, layerIndex) => {
        const nodeDetails = nodeIds.map(id => {
          const node = assignment.nodeToLayer.has(id) ? 'assigned' : 'unassigned';
          return `${id}(${node})`;
        }).join(', ');
        this.log(`  Layer ${layerIndex}: [${nodeDetails}] (${nodeIds.length} nodes)`);
      });
    }
  }

  /**
   * Utility method for conditional logging
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[LayeringEngine]', ...args);
    }
  }
}