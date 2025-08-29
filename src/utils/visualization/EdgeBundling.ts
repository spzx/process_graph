/**
 * Edge Bundling System
 * 
 * This system reduces visual complexity in dense graphs by bundling similar edges
 * together. It provides multiple bundling strategies including:
 * - Force-directed edge bundling (FDEB)
 * - Hierarchical edge bundling
 * - Simple proximity-based bundling
 * - Multi-level bundling for complex graphs
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';

/**
 * Edge bundling configuration
 */
export interface EdgeBundlingConfig {
  /** Bundling strategy to use */
  strategy: 'force-directed' | 'hierarchical' | 'proximity' | 'multi-level' | 'adaptive';
  
  /** Whether to enable bundling */
  enabled: boolean;
  
  /** Bundling strength (0-1) */
  strength: number;
  
  /** Minimum edges required to form a bundle */
  minBundleSize: number;
  
  /** Maximum bundle width */
  maxBundleWidth: number;
  
  /** Bundle path smoothness */
  smoothness: number;
  
  /** Performance settings */
  performance: {
    /** Maximum edges to process at once */
    maxEdgesPerBatch: number;
    
    /** Use web workers for heavy computation */
    useWebWorkers: boolean;
    
    /** Subdivision iterations for smooth paths */
    subdivisionIterations: number;
  };
  
  /** Visual settings */
  visual: {
    /** Bundle color strategy */
    colorStrategy: 'gradient' | 'uniform' | 'weight-based';
    
    /** Show control points for debugging */
    showControlPoints: boolean;
    
    /** Bundle opacity */
    opacity: number;
    
    /** Animation duration for bundle formation */
    animationDuration: number;
  };
}

/**
 * Bundle path information
 */
export interface BundlePath {
  /** Unique bundle ID */
  id: string;
  
  /** Edges included in this bundle */
  edgeIds: string[];
  
  /** Control points defining the bundle path */
  controlPoints: Point[];
  
  /** Bundle metadata */
  metadata: {
    /** Bundle weight (sum of edge weights) */
    weight: number;
    
    /** Bundle direction */
    direction: 'bidirectional' | 'unidirectional';
    
    /** Source and target regions */
    sourceRegion: string;
    targetRegion: string;
    
    /** Bundle characteristics */
    characteristics: string[];
  };
}

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Edge bundling result
 */
export interface EdgeBundlingResult {
  /** Original edges that were processed */
  originalEdges: FlowEdge[];
  
  /** Generated bundle paths */
  bundles: BundlePath[];
  
  /** Edges that were not bundled */
  unbundledEdges: FlowEdge[];
  
  /** Performance metrics */
  performance: {
    processingTime: number;
    bundlingEfficiency: number; // percentage of edges bundled
    visualComplexityReduction: number; // 0-1 scale
  };
  
  /** Bundling statistics */
  statistics: {
    totalBundles: number;
    averageBundleSize: number;
    maxBundleSize: number;
    compressionRatio: number;
  };
}

/**
 * Main Edge Bundling System
 */
export class EdgeBundlingSystem {
  private config: EdgeBundlingConfig;
  private bundleCache: Map<string, BundlePath[]> = new Map();
  
  constructor(config?: Partial<EdgeBundlingConfig>) {
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Bundle edges to reduce visual complexity
   */
  async bundleEdges(
    edges: FlowEdge[],
    nodes: FlowNode[]
  ): Promise<EdgeBundlingResult> {
    if (!this.config.enabled || edges.length < this.config.minBundleSize) {
      return this.createEmptyResult(edges);
    }

    const startTime = performance.now();
    
    try {
      // Create cache key for this specific graph configuration
      const cacheKey = this.generateCacheKey(edges, nodes);
      
      // Check cache first
      if (this.bundleCache.has(cacheKey)) {
        const cachedBundles = this.bundleCache.get(cacheKey)!;
        return this.createResultFromBundles(edges, cachedBundles, startTime);
      }

      // Preprocess edges and nodes
      const { processedEdges, nodePositions } = this.preprocessGraph(edges, nodes);
      
      // Apply selected bundling strategy
      let bundles: BundlePath[] = [];
      
      switch (this.config.strategy) {
        case 'force-directed':
          bundles = await this.forceDirectedBundling(processedEdges, nodePositions);
          break;
          
        case 'hierarchical':
          bundles = await this.hierarchicalBundling(processedEdges, nodePositions);
          break;
          
        case 'proximity':
          bundles = await this.proximityBundling(processedEdges, nodePositions);
          break;
          
        case 'multi-level':
          bundles = await this.multiLevelBundling(processedEdges, nodePositions);
          break;
          
        case 'adaptive':
          bundles = await this.adaptiveBundling(processedEdges, nodePositions);
          break;
          
        default:
          bundles = await this.proximityBundling(processedEdges, nodePositions);
      }

      // Post-process bundles
      const optimizedBundles = this.optimizeBundles(bundles, processedEdges);
      
      // Cache results
      this.bundleCache.set(cacheKey, optimizedBundles);
      
      return this.createResultFromBundles(edges, optimizedBundles, startTime);
      
    } catch (error) {
      console.error('Edge bundling failed:', error);
      return this.createEmptyResult(edges);
    }
  }

  // ==========================================================================
  // BUNDLING STRATEGIES
  // ==========================================================================

  /**
   * Force-directed edge bundling (FDEB)
   */
  private async forceDirectedBundling(
    edges: ProcessedEdge[],
    nodePositions: Map<string, Point>
  ): Promise<BundlePath[]> {
    const bundles: BundlePath[] = [];
    const edgeGroups = this.groupEdgesByProximity(edges, nodePositions);
    
    for (const [groupId, groupEdges] of edgeGroups) {
      if (groupEdges.length >= this.config.minBundleSize) {
        const bundlePath = await this.computeForceDirectedPath(groupEdges, nodePositions);
        
        bundles.push({
          id: `fdeb-${groupId}`,
          edgeIds: groupEdges.map(e => e.id),
          controlPoints: bundlePath,
          metadata: {
            weight: groupEdges.reduce((sum, e) => sum + (e.weight || 1), 0),
            direction: this.determineGroupDirection(groupEdges),
            sourceRegion: this.determineSourceRegion(groupEdges, nodePositions),
            targetRegion: this.determineTargetRegion(groupEdges, nodePositions),
            characteristics: ['force-directed', `size-${groupEdges.length}`]
          }
        });
      }
    }
    
    return bundles;
  }

  /**
   * Hierarchical edge bundling
   */
  private async hierarchicalBundling(
    edges: ProcessedEdge[],
    nodePositions: Map<string, Point>
  ): Promise<BundlePath[]> {
    const bundles: BundlePath[] = [];
    
    // Create hierarchical structure based on node groupings
    const hierarchy = this.buildEdgeHierarchy(edges, nodePositions);
    
    for (const [level, levelEdges] of hierarchy) {
      const levelBundles = this.createHierarchicalBundles(levelEdges, nodePositions, level);
      bundles.push(...levelBundles);
    }
    
    return bundles;
  }

  /**
   * Simple proximity-based bundling
   */
  private async proximityBundling(
    edges: ProcessedEdge[],
    nodePositions: Map<string, Point>
  ): Promise<BundlePath[]> {
    const bundles: BundlePath[] = [];
    const processed = new Set<string>();
    
    for (const edge of edges) {
      if (processed.has(edge.id)) continue;
      
      const nearbyEdges = this.findNearbyEdges(edge, edges, nodePositions);
      
      if (nearbyEdges.length >= this.config.minBundleSize) {
        const bundlePath = this.computeProximityPath(nearbyEdges, nodePositions);
        
        bundles.push({
          id: `proximity-${bundles.length}`,
          edgeIds: nearbyEdges.map(e => e.id),
          controlPoints: bundlePath,
          metadata: {
            weight: nearbyEdges.reduce((sum, e) => sum + (e.weight || 1), 0),
            direction: this.determineGroupDirection(nearbyEdges),
            sourceRegion: this.determineSourceRegion(nearbyEdges, nodePositions),
            targetRegion: this.determineTargetRegion(nearbyEdges, nodePositions),
            characteristics: ['proximity-based', `size-${nearbyEdges.length}`]
          }
        });
        
        // Mark edges as processed
        nearbyEdges.forEach(e => processed.add(e.id));
      }
    }
    
    return bundles;
  }

  /**
   * Multi-level bundling for complex graphs
   */
  private async multiLevelBundling(
    edges: ProcessedEdge[],
    nodePositions: Map<string, Point>
  ): Promise<BundlePath[]> {
    // First level: proximity-based bundling
    const proximityBundles = await this.proximityBundling(edges, nodePositions);
    
    // Second level: bundle the bundles based on similarity
    const metaBundles = this.bundleSimilarPaths(proximityBundles);
    
    return [...proximityBundles, ...metaBundles];
  }

  /**
   * Adaptive bundling that chooses strategy based on graph characteristics
   */
  private async adaptiveBundling(
    edges: ProcessedEdge[],
    nodePositions: Map<string, Point>
  ): Promise<BundlePath[]> {
    const edgeCount = edges.length;
    const nodeCount = nodePositions.size;
    const density = edgeCount / (nodeCount * (nodeCount - 1));
    
    // Choose strategy based on graph characteristics
    if (density > 0.5) {
      // High density - use force-directed for better organization
      return this.forceDirectedBundling(edges, nodePositions);
    } else if (nodeCount > 100) {
      // Large graph - use hierarchical for efficiency
      return this.hierarchicalBundling(edges, nodePositions);
    } else {
      // Default to proximity for moderate complexity
      return this.proximityBundling(edges, nodePositions);
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Preprocess edges and extract node positions
   */
  private preprocessGraph(
    edges: FlowEdge[], 
    nodes: FlowNode[]
  ): { processedEdges: ProcessedEdge[]; nodePositions: Map<string, Point> } {
    const nodePositions = new Map<string, Point>();
    
    // Extract node positions
    nodes.forEach(node => {
      nodePositions.set(node.id, {
        x: node.position?.x || 0,
        y: node.position?.y || 0
      });
    });
    
    // Process edges
    const processedEdges: ProcessedEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: (edge.data as any)?.weight || 1,
      sourcePosition: nodePositions.get(edge.source) || { x: 0, y: 0 },
      targetPosition: nodePositions.get(edge.target) || { x: 0, y: 0 }
    }));
    
    return { processedEdges, nodePositions };
  }

  /**
   * Group edges by spatial proximity
   */
  private groupEdgesByProximity(
    edges: ProcessedEdge[],
    nodePositions: Map<string, Point>
  ): Map<string, ProcessedEdge[]> {
    const groups = new Map<string, ProcessedEdge[]>();
    const processed = new Set<string>();
    let groupId = 0;
    
    for (const edge of edges) {
      if (processed.has(edge.id)) continue;
      
      const groupKey = `group-${groupId++}`;
      const groupEdges = [edge];
      processed.add(edge.id);
      
      // Find nearby edges
      for (const otherEdge of edges) {
        if (processed.has(otherEdge.id)) continue;
        
        if (this.areEdgesNear(edge, otherEdge, nodePositions)) {
          groupEdges.push(otherEdge);
          processed.add(otherEdge.id);
        }
      }
      
      groups.set(groupKey, groupEdges);
    }
    
    return groups;
  }

  /**
   * Check if two edges are spatially close
   */
  private areEdgesNear(
    edge1: ProcessedEdge,
    edge2: ProcessedEdge,
    nodePositions: Map<string, Point>
  ): boolean {
    const threshold = 100; // Distance threshold
    
    const dist1 = this.pointDistance(edge1.sourcePosition, edge2.sourcePosition);
    const dist2 = this.pointDistance(edge1.targetPosition, edge2.targetPosition);
    
    return (dist1 < threshold && dist2 < threshold) ||
           (this.pointDistance(edge1.sourcePosition, edge2.targetPosition) < threshold &&
            this.pointDistance(edge1.targetPosition, edge2.sourcePosition) < threshold);
  }

  /**
   * Calculate distance between two points
   */
  private pointDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Compute force-directed bundle path
   */
  private async computeForceDirectedPath(
    edges: ProcessedEdge[],
    nodePositions: Map<string, Point>
  ): Promise<Point[]> {
    // Simplified FDEB implementation
    const controlPoints: Point[] = [];
    
    // Calculate midpoint of all edge midpoints
    const midpoints = edges.map(edge => ({
      x: (edge.sourcePosition.x + edge.targetPosition.x) / 2,
      y: (edge.sourcePosition.y + edge.targetPosition.y) / 2
    }));
    
    const bundleCenter = {
      x: midpoints.reduce((sum, p) => sum + p.x, 0) / midpoints.length,
      y: midpoints.reduce((sum, p) => sum + p.y, 0) / midpoints.length
    };
    
    // Create smooth path through bundle center
    const sourceCenter = this.calculateCentroid(edges.map(e => e.sourcePosition));
    const targetCenter = this.calculateCentroid(edges.map(e => e.targetPosition));
    
    // Generate control points for smooth curve
    controlPoints.push(sourceCenter);
    controlPoints.push(bundleCenter);
    controlPoints.push(targetCenter);
    
    return this.smoothPath(controlPoints);
  }

  /**
   * Calculate centroid of points
   */
  private calculateCentroid(points: Point[]): Point {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length
    };
  }

  /**
   * Smooth path using subdivision
   */
  private smoothPath(controlPoints: Point[]): Point[] {
    let smoothedPoints = [...controlPoints];
    
    for (let i = 0; i < this.config.performance.subdivisionIterations; i++) {
      smoothedPoints = this.subdividePoints(smoothedPoints);
    }
    
    return smoothedPoints;
  }

  /**
   * Subdivide points for smoother curves
   */
  private subdividePoints(points: Point[]): Point[] {
    const subdivided: Point[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      subdivided.push(points[i]);
      
      // Add midpoint
      subdivided.push({
        x: (points[i].x + points[i + 1].x) / 2,
        y: (points[i].y + points[i + 1].y) / 2
      });
    }
    
    subdivided.push(points[points.length - 1]);
    return subdivided;
  }

  // ==========================================================================
  // CONFIGURATION AND UTILITIES
  // ==========================================================================

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<EdgeBundlingConfig>): EdgeBundlingConfig {
    return {
      strategy: 'adaptive',
      enabled: true,
      strength: 0.7,
      minBundleSize: 3,
      maxBundleWidth: 20,
      smoothness: 0.8,
      performance: {
        maxEdgesPerBatch: 1000,
        useWebWorkers: false,
        subdivisionIterations: 2
      },
      visual: {
        colorStrategy: 'gradient',
        showControlPoints: false,
        opacity: 0.8,
        animationDuration: 300
      },
      ...config
    };
  }

  /**
   * Generate cache key for bundling results
   */
  private generateCacheKey(edges: FlowEdge[], nodes: FlowNode[]): string {
    const edgeKey = edges.map(e => `${e.source}-${e.target}`).sort().join(',');
    const nodeKey = nodes.map(n => `${n.id}:${n.position?.x || 0},${n.position?.y || 0}`).sort().join(',');
    return `${edgeKey}|${nodeKey}|${JSON.stringify(this.config)}`;
  }

  /**
   * Create empty result when bundling is not applicable
   */
  private createEmptyResult(edges: FlowEdge[]): EdgeBundlingResult {
    return {
      originalEdges: edges,
      bundles: [],
      unbundledEdges: edges,
      performance: {
        processingTime: 0,
        bundlingEfficiency: 0,
        visualComplexityReduction: 0
      },
      statistics: {
        totalBundles: 0,
        averageBundleSize: 0,
        maxBundleSize: 0,
        compressionRatio: 0
      }
    };
  }

  /**
   * Create result from generated bundles
   */
  private createResultFromBundles(
    originalEdges: FlowEdge[],
    bundles: BundlePath[],
    startTime: number
  ): EdgeBundlingResult {
    const bundledEdgeIds = new Set(bundles.flatMap(b => b.edgeIds));
    const unbundledEdges = originalEdges.filter(e => !bundledEdgeIds.has(e.id));
    
    const bundleSizes = bundles.map(b => b.edgeIds.length);
    const totalBundledEdges = bundleSizes.reduce((sum, size) => sum + size, 0);
    
    return {
      originalEdges,
      bundles,
      unbundledEdges,
      performance: {
        processingTime: performance.now() - startTime,
        bundlingEfficiency: totalBundledEdges / originalEdges.length,
        visualComplexityReduction: bundles.length > 0 ? 
          (totalBundledEdges - bundles.length) / totalBundledEdges : 0
      },
      statistics: {
        totalBundles: bundles.length,
        averageBundleSize: bundles.length > 0 ? totalBundledEdges / bundles.length : 0,
        maxBundleSize: bundles.length > 0 ? Math.max(...bundleSizes) : 0,
        compressionRatio: bundles.length > 0 ? bundles.length / totalBundledEdges : 0
      }
    };
  }

  // Placeholder implementations for complex methods
  private findNearbyEdges(edge: ProcessedEdge, allEdges: ProcessedEdge[], nodePositions: Map<string, Point>): ProcessedEdge[] {
    return allEdges.filter(e => e.id !== edge.id && this.areEdgesNear(edge, e, nodePositions));
  }

  private computeProximityPath(edges: ProcessedEdge[], nodePositions: Map<string, Point>): Point[] {
    return this.computeForceDirectedPath(edges, nodePositions);
  }

  private buildEdgeHierarchy(edges: ProcessedEdge[], nodePositions: Map<string, Point>): Map<number, ProcessedEdge[]> {
    const hierarchy = new Map<number, ProcessedEdge[]>();
    hierarchy.set(0, edges); // Single level for now
    return hierarchy;
  }

  private createHierarchicalBundles(edges: ProcessedEdge[], nodePositions: Map<string, Point>, level: number): BundlePath[] {
    return []; // Placeholder
  }

  private bundleSimilarPaths(bundles: BundlePath[]): BundlePath[] {
    return []; // Placeholder
  }

  private optimizeBundles(bundles: BundlePath[], edges: ProcessedEdge[]): BundlePath[] {
    return bundles; // No optimization for now
  }

  private determineGroupDirection(edges: ProcessedEdge[]): 'bidirectional' | 'unidirectional' {
    return 'unidirectional'; // Simplified
  }

  private determineSourceRegion(edges: ProcessedEdge[], nodePositions: Map<string, Point>): string {
    return 'source-region';
  }

  private determineTargetRegion(edges: ProcessedEdge[], nodePositions: Map<string, Point>): string {
    return 'target-region';
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EdgeBundlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.bundleCache.clear(); // Clear cache when config changes
  }

  /**
   * Clear bundle cache
   */
  clearCache(): void {
    this.bundleCache.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): EdgeBundlingConfig {
    return { ...this.config };
  }
}

/**
 * Processed edge with position information
 */
interface ProcessedEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  sourcePosition: Point;
  targetPosition: Point;
}

/**
 * Convenience function to create edge bundling system
 */
export function createEdgeBundlingSystem(config?: Partial<EdgeBundlingConfig>): EdgeBundlingSystem {
  return new EdgeBundlingSystem(config);
}

/**
 * Default configurations for different use cases
 */
export const EDGE_BUNDLING_PRESETS = {
  HIGH_QUALITY: {
    strategy: 'force-directed' as const,
    strength: 0.9,
    minBundleSize: 2,
    smoothness: 0.9,
    performance: {
      subdivisionIterations: 4
    }
  },
  
  PERFORMANCE: {
    strategy: 'proximity' as const,
    strength: 0.6,
    minBundleSize: 5,
    smoothness: 0.5,
    performance: {
      subdivisionIterations: 1,
      maxEdgesPerBatch: 500
    }
  },
  
  BALANCED: {
    strategy: 'adaptive' as const,
    strength: 0.7,
    minBundleSize: 3,
    smoothness: 0.7,
    performance: {
      subdivisionIterations: 2
    }
  }
} as const;