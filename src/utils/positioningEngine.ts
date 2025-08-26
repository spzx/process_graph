/**
 * PositioningEngine - Precise coordinate calculation for dependency-aware layout
 * 
 * This class calculates exact pixel coordinates for nodes based on their layer
 * assignments, applying spacing rules, alignment strategies, and optimization
 * techniques to create visually appealing and functionally correct layouts.
 */

import { LayerAssignment } from './layeringEngine';
import { DependencyGraph } from './dependencyAnalyzer';
import { FlowNode } from '../types';

export interface Position {
  x: number;
  y: number;
}

export interface PositioningOptions {
  layerSpacing: number; // Horizontal distance between layers
  nodeSpacing: number; // Vertical distance between nodes in same layer
  basePosition: Position; // Starting coordinates
  nodeSize: {
    width: number;
    height: {
      default: number;
      orderChange: number;
    };
  };
  alignment: 'top' | 'center' | 'bottom'; // Layer alignment strategy
  minimizeEdgeCrossings: boolean; // Whether to optimize for edge crossings
}

export interface PositionedNodes {
  nodes: Map<string, Position>;
  boundingBox: BoundingBox;
  metrics: PositioningMetrics;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PositioningMetrics {
  totalWidth: number;
  totalHeight: number;
  layerWidths: Map<number, number>; // layer -> pixel width
  layerHeights: Map<number, number>; // layer -> pixel height
  edgeCrossings: number; // Estimated edge crossings
  spacingUtilization: number; // 0-1, how well space is used
}

export interface PositioningResult {
  positions: PositionedNodes;
  optimizations: PositioningOptimization[];
  warnings: PositioningWarning[];
  recommendations: string[];
}

export interface PositioningOptimization {
  type: 'alignment' | 'spacing' | 'crossings' | 'centering';
  description: string;
  nodesAffected: string[];
  improvement: number; // Quantified improvement
}

export interface PositioningWarning {
  type: 'overlap' | 'spacing' | 'bounds' | 'performance';
  message: string;
  nodeIds: string[];
  severity: 'low' | 'medium' | 'high';
}

export class PositioningEngine {
  private debugMode: boolean;
  private options: PositioningOptions;

  constructor(options: Partial<PositioningOptions> = {}, debugMode = false) {
    this.debugMode = debugMode;
    this.options = {
      layerSpacing: 350,
      nodeSpacing: 250,
      basePosition: { x: 50, y: 50 },
      nodeSize: {
        width: 280,
        height: {
          default: 220,
          orderChange: 240
        }
      },
      alignment: 'top',
      minimizeEdgeCrossings: true,
      ...options
    };
  }

  /**
   * Main method to calculate precise coordinates for all nodes
   */
  public positionNodes(
    assignment: LayerAssignment,
    graph: DependencyGraph
  ): PositioningResult {
    this.log('📐 Starting precise node positioning...');

    // Step 1: Calculate base layer positions
    const layerPositions = this.calculateLayerPositions(assignment);

    // Step 2: Position nodes within each layer
    const nodePositions = this.positionNodesInLayers(assignment, graph, layerPositions);

    // Step 3: Apply alignment and optimization
    const optimizedPositions = this.applyAlignment(nodePositions, assignment);

    // Step 4: Minimize edge crossings if requested
    const finalPositions = this.options.minimizeEdgeCrossings
      ? this.minimizeEdgeCrossings(optimizedPositions, assignment, graph)
      : optimizedPositions;

    // Step 5: Calculate metrics and bounding box
    const boundingBox = this.calculateBoundingBox(finalPositions);
    const metrics = this.calculatePositioningMetrics(finalPositions, assignment, boundingBox);

    const positionedNodes: PositionedNodes = {
      nodes: finalPositions,
      boundingBox,
      metrics
    };

    // Step 6: Generate optimizations, warnings, and recommendations
    const optimizations = this.identifyOptimizations(nodePositions, finalPositions);
    const warnings = this.generateWarnings(positionedNodes, assignment);
    const recommendations = this.generateRecommendations(positionedNodes, warnings);

    this.log('✅ Node positioning complete');
    this.logPositioningStatistics(positionedNodes);

    return {
      positions: positionedNodes,
      optimizations,
      warnings,
      recommendations
    };
  }

  /**
   * Calculates X coordinates for each layer
   */
  private calculateLayerPositions(assignment: LayerAssignment): Map<number, number> {
    const layerPositions = new Map<number, number>();
    
    for (let layer = 0; layer <= assignment.maxLayer; layer++) {
      const x = this.options.basePosition.x + (layer * this.options.layerSpacing);
      layerPositions.set(layer, x);
      this.log(`📍 Layer ${layer}: X = ${x}`);
    }

    return layerPositions;
  }

  /**
   * Positions nodes within their assigned layers
   */
  private positionNodesInLayers(
    assignment: LayerAssignment,
    graph: DependencyGraph,
    layerPositions: Map<number, number>
  ): Map<string, Position> {
    const positions = new Map<string, Position>();

    assignment.layers.forEach((nodeIds, layerIndex) => {
      if (nodeIds.length === 0) return;

      const layerX = layerPositions.get(layerIndex) || 0;
      const sortedNodes = this.sortNodesForPositioning(nodeIds, graph);

      this.log(`📋 Positioning ${sortedNodes.length} nodes in layer ${layerIndex}`);

      sortedNodes.forEach((nodeId, nodeIndex) => {
        const y = this.calculateNodeYPosition(nodeId, nodeIndex, graph);
        
        positions.set(nodeId, { x: layerX, y });
        
        this.log(`  📍 ${nodeId}: (${layerX}, ${y})`);
      });
    });

    return positions;
  }

  /**
   * Sorts nodes within a layer for optimal positioning
   */
  private sortNodesForPositioning(nodeIds: string[], graph: DependencyGraph): string[] {
    return [...nodeIds].sort((a, b) => {
      const nodeA = graph.nodes.get(a);
      const nodeB = graph.nodes.get(b);

      // Start nodes first
      if (nodeA?.data.nodeType === 'start' && nodeB?.data.nodeType !== 'start') return -1;
      if (nodeB?.data.nodeType === 'start' && nodeA?.data.nodeType !== 'start') return 1;

      // End nodes last
      if (nodeA?.data.nodeType === 'end' && nodeB?.data.nodeType !== 'end') return 1;
      if (nodeB?.data.nodeType === 'end' && nodeA?.data.nodeType !== 'end') return -1;

      // Group by node type for better visual organization
      const typeOrder = { start: 0, action: 1, wait: 2, end: 3 };
      const typeA = nodeA?.data.nodeType || 'action';
      const typeB = nodeB?.data.nodeType || 'action';
      
      if (typeOrder[typeA] !== typeOrder[typeB]) {
        return typeOrder[typeA] - typeOrder[typeB];
      }

      // Sort by incoming edge count (nodes with more dependencies higher)
      const incomingA = graph.incomingEdges.get(a)?.size || 0;
      const incomingB = graph.incomingEdges.get(b)?.size || 0;
      
      if (incomingA !== incomingB) {
        return incomingB - incomingA; // More dependencies = higher position
      }

      // Sort by node ID for consistency
      return a.localeCompare(b);
    });
  }

  /**
   * Calculates Y position for a specific node
   */
  private calculateNodeYPosition(
    nodeId: string,
    nodeIndex: number,
    graph: DependencyGraph
  ): number {
    const baseY = this.options.basePosition.y;
    const spacing = this.options.nodeSpacing;
    
    return baseY + (nodeIndex * spacing);
  }

  /**
   * Applies alignment strategy to node positions
   */
  private applyAlignment(
    positions: Map<string, Position>,
    assignment: LayerAssignment
  ): Map<string, Position> {
    if (this.options.alignment === 'top') {
      return positions; // Already top-aligned
    }

    this.log(`🎯 Applying ${this.options.alignment} alignment...`);

    const alignedPositions = new Map(positions);

    if (this.options.alignment === 'center') {
      // Center-align nodes within each layer
      assignment.layers.forEach((nodeIds, layerIndex) => {
        if (nodeIds.length <= 1) return;

        const layerPositions = nodeIds.map(id => positions.get(id)!);
        const minY = Math.min(...layerPositions.map(p => p.y));
        const maxY = Math.max(...layerPositions.map(p => p.y));
        const centerOffset = (maxY - minY) / 2;

        nodeIds.forEach(nodeId => {
          const currentPos = positions.get(nodeId)!;
          alignedPositions.set(nodeId, {
            x: currentPos.x,
            y: currentPos.y - centerOffset
          });
        });
      });
    }

    return alignedPositions;
  }

  /**
   * Optimizes node positions to minimize edge crossings
   */
  private minimizeEdgeCrossings(
    positions: Map<string, Position>,
    assignment: LayerAssignment,
    graph: DependencyGraph
  ): Map<string, Position> {
    this.log('🔀 Optimizing for edge crossing minimization...');

    // This is a simplified implementation
    // A full implementation would use sophisticated algorithms like
    // the barycentric method or median heuristic
    
    const optimizedPositions = new Map(positions);
    let improvementMade = true;
    let iterations = 0;
    const maxIterations = 5;

    while (improvementMade && iterations < maxIterations) {
      improvementMade = false;
      iterations++;

      assignment.layers.forEach((nodeIds, layerIndex) => {
        if (nodeIds.length <= 2) return;

        // Try to improve ordering within this layer
        const improvement = this.optimizeLayerOrdering(
          nodeIds,
          layerIndex,
          optimizedPositions,
          graph
        );

        if (improvement.improved) {
          improvementMade = true;
          // Apply the new ordering
          improvement.newPositions.forEach((pos, nodeId) => {
            optimizedPositions.set(nodeId, pos);
          });
        }
      });
    }

    this.log(`🔀 Edge crossing optimization complete after ${iterations} iterations`);
    return optimizedPositions;
  }

  /**
   * Optimizes the ordering of nodes within a single layer
   */
  private optimizeLayerOrdering(
    nodeIds: string[],
    layerIndex: number,
    positions: Map<string, Position>,
    graph: DependencyGraph
  ): { improved: boolean; newPositions: Map<string, Position> } {
    // Calculate median positions of connected nodes in adjacent layers
    const medianPositions = new Map<string, number>();

    nodeIds.forEach(nodeId => {
      const connectedPositions: number[] = [];

      // Check incoming edges (previous layer)
      const incoming = graph.incomingEdges.get(nodeId) || new Set();
      incoming.forEach(sourceId => {
        const sourcePos = positions.get(sourceId);
        if (sourcePos) connectedPositions.push(sourcePos.y);
      });

      // Check outgoing edges (next layer)
      const outgoing = graph.outgoingEdges.get(nodeId) || new Set();
      outgoing.forEach(targetId => {
        const targetPos = positions.get(targetId);
        if (targetPos) connectedPositions.push(targetPos.y);
      });

      if (connectedPositions.length > 0) {
        connectedPositions.sort((a, b) => a - b);
        const median = connectedPositions.length % 2 === 0
          ? (connectedPositions[connectedPositions.length / 2 - 1] + connectedPositions[connectedPositions.length / 2]) / 2
          : connectedPositions[Math.floor(connectedPositions.length / 2)];
        
        medianPositions.set(nodeId, median);
      }
    });

    // Sort nodes by their median connected positions
    const sortedByMedian = [...nodeIds].sort((a, b) => {
      const medianA = medianPositions.get(a) ?? positions.get(a)?.y ?? 0;
      const medianB = medianPositions.get(b) ?? positions.get(b)?.y ?? 0;
      return medianA - medianB;
    });

    // Check if this ordering is different from current
    const currentOrdering = [...nodeIds].sort((a, b) => {
      const posA = positions.get(a)?.y ?? 0;
      const posB = positions.get(b)?.y ?? 0;
      return posA - posB;
    });

    const orderingChanged = !sortedByMedian.every((nodeId, index) => 
      nodeId === currentOrdering[index]
    );

    if (!orderingChanged) {
      return { improved: false, newPositions: new Map() };
    }

    // Create new positions based on optimized ordering
    const newPositions = new Map<string, Position>();
    const layerX = positions.get(nodeIds[0])?.x ?? 0;

    sortedByMedian.forEach((nodeId, index) => {
      const y = this.options.basePosition.y + (index * this.options.nodeSpacing);
      newPositions.set(nodeId, { x: layerX, y });
    });

    return { improved: true, newPositions };
  }

  /**
   * Calculates the bounding box of all positioned nodes
   */
  private calculateBoundingBox(positions: Map<string, Position>): BoundingBox {
    if (positions.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    }

    const xCoords = Array.from(positions.values()).map(p => p.x);
    const yCoords = Array.from(positions.values()).map(p => p.y);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords) + this.options.nodeSize.width;
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords) + this.options.nodeSize.height.default;

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calculates comprehensive positioning metrics
   */
  private calculatePositioningMetrics(
    positions: Map<string, Position>,
    assignment: LayerAssignment,
    boundingBox: BoundingBox
  ): PositioningMetrics {
    const layerWidths = new Map<number, number>();
    const layerHeights = new Map<number, number>();

    // Calculate dimensions for each layer
    assignment.layers.forEach((nodeIds, layerIndex) => {
      if (nodeIds.length === 0) {
        layerWidths.set(layerIndex, 0);
        layerHeights.set(layerIndex, 0);
        return;
      }

      const layerPositions = nodeIds.map(id => positions.get(id)!);
      const minY = Math.min(...layerPositions.map(p => p.y));
      const maxY = Math.max(...layerPositions.map(p => p.y));

      layerWidths.set(layerIndex, this.options.nodeSize.width);
      layerHeights.set(layerIndex, maxY - minY + this.options.nodeSize.height.default);
    });

    // Estimate edge crossings (simplified)
    const edgeCrossings = this.estimateEdgeCrossings(positions, assignment);

    // Calculate space utilization
    const usedWidth = assignment.maxLayer * this.options.layerSpacing + this.options.nodeSize.width;
    const usedHeight = assignment.layerMetrics.maxNodesInLayer * this.options.nodeSpacing;
    const spacingUtilization = (usedWidth * usedHeight) / (boundingBox.width * boundingBox.height);

    return {
      totalWidth: boundingBox.width,
      totalHeight: boundingBox.height,
      layerWidths,
      layerHeights,
      edgeCrossings,
      spacingUtilization: Math.min(1, spacingUtilization)
    };
  }

  /**
   * Estimates the number of edge crossings (simplified algorithm)
   */
  private estimateEdgeCrossings(
    positions: Map<string, Position>,
    assignment: LayerAssignment
  ): number {
    // This is a simplified estimation
    // A full implementation would check all edge pairs for intersections
    let crossings = 0;

    assignment.layers.forEach((nodeIds, layerIndex) => {
      if (layerIndex === assignment.maxLayer) return;

      const nextLayerNodes = assignment.layers.get(layerIndex + 1) || [];
      if (nextLayerNodes.length <= 1) return;

      // Simplified: assume some crossings based on layer size
      const potential = nodeIds.length * nextLayerNodes.length;
      crossings += Math.floor(potential * 0.1); // Rough estimate
    });

    return crossings;
  }

  /**
   * Identifies optimizations applied during positioning
   */
  private identifyOptimizations(
    initial: Map<string, Position>,
    final: Map<string, Position>
  ): PositioningOptimization[] {
    const optimizations: PositioningOptimization[] = [];

    // Check for alignment optimizations
    const movedNodes: string[] = [];
    initial.forEach((initialPos, nodeId) => {
      const finalPos = final.get(nodeId);
      if (finalPos && (initialPos.x !== finalPos.x || initialPos.y !== finalPos.y)) {
        movedNodes.push(nodeId);
      }
    });

    if (movedNodes.length > 0) {
      optimizations.push({
        type: 'alignment',
        description: `Applied ${this.options.alignment} alignment to ${movedNodes.length} nodes`,
        nodesAffected: movedNodes,
        improvement: movedNodes.length / initial.size
      });
    }

    return optimizations;
  }

  /**
   * Generates warnings about positioning issues
   */
  private generateWarnings(
    positionedNodes: PositionedNodes,
    assignment: LayerAssignment
  ): PositioningWarning[] {
    const warnings: PositioningWarning[] = [];

    // Check for potential overlaps
    const positions = Array.from(positionedNodes.nodes.values());
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const distance = Math.sqrt(
          Math.pow(positions[i].x - positions[j].x, 2) +
          Math.pow(positions[i].y - positions[j].y, 2)
        );

        if (distance < this.options.nodeSpacing * 0.8) {
          warnings.push({
            type: 'spacing',
            message: `Nodes at (${positions[i].x}, ${positions[i].y}) and (${positions[j].x}, ${positions[j].y}) may be too close`,
            nodeIds: [],
            severity: 'medium'
          });
          break; // Only report first potential issue
        }
      }
    }

    // Check for performance concerns
    if (positionedNodes.nodes.size > 200) {
      warnings.push({
        type: 'performance',
        message: `Large graph with ${positionedNodes.nodes.size} nodes may impact rendering performance`,
        nodeIds: [],
        severity: 'low'
      });
    }

    return warnings;
  }

  /**
   * Generates recommendations for positioning improvements
   */
  private generateRecommendations(
    positionedNodes: PositionedNodes,
    warnings: PositioningWarning[]
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`✅ Positioned ${positionedNodes.nodes.size} nodes in ${positionedNodes.boundingBox.width.toFixed(0)}x${positionedNodes.boundingBox.height.toFixed(0)} area`);

    if (positionedNodes.metrics.spacingUtilization > 0.8) {
      recommendations.push('🎯 Excellent space utilization achieved');
    } else if (positionedNodes.metrics.spacingUtilization > 0.6) {
      recommendations.push('👍 Good space utilization achieved');
    } else {
      recommendations.push('💡 Consider adjusting spacing parameters for better space utilization');
    }

    if (positionedNodes.metrics.edgeCrossings === 0) {
      recommendations.push('🎯 No edge crossings detected - optimal layout');
    } else if (positionedNodes.metrics.edgeCrossings < 5) {
      recommendations.push('👍 Minimal edge crossings - good layout quality');
    } else {
      recommendations.push('⚠️ Consider enabling edge crossing minimization for better readability');
    }

    const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
    if (highSeverityWarnings.length > 0) {
      recommendations.push('🚨 Address high-severity positioning warnings');
    }

    return recommendations;
  }

  /**
   * Logs positioning statistics for debugging
   */
  private logPositioningStatistics(positionedNodes: PositionedNodes): void {
    this.log('📊 Positioning Statistics:');
    this.log(`  Total dimensions: ${positionedNodes.boundingBox.width.toFixed(0)}x${positionedNodes.boundingBox.height.toFixed(0)}`);
    this.log(`  Space utilization: ${(positionedNodes.metrics.spacingUtilization * 100).toFixed(1)}%`);
    this.log(`  Estimated edge crossings: ${positionedNodes.metrics.edgeCrossings}`);
    this.log(`  Nodes positioned: ${positionedNodes.nodes.size}`);

    if (this.debugMode) {
      this.log('📍 Node positions:');
      positionedNodes.nodes.forEach((position, nodeId) => {
        this.log(`  ${nodeId}: (${position.x}, ${position.y})`);
      });
    }
  }

  /**
   * Utility method for conditional logging
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[PositioningEngine]', ...args);
    }
  }
}