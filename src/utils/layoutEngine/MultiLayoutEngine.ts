/**
 * Multi-Algorithm Layout Engine - Main Coordinator
 * 
 * This class serves as the central coordinator for the advanced layout system,
 * managing multiple layout algorithms and automatically selecting the best
 * algorithm based on graph characteristics.
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import {
  LayoutAlgorithm,
  GraphMetrics,
  LayoutResult,
  LayoutConfig,
  AlgorithmSelectionCriteria,
  AlgorithmSelectionResult,
  LayoutError,
  LayoutErrorType,
  PerformanceMetrics
} from './types';

/**
 * Configuration for the multi-algorithm layout engine
 */
export interface MultiLayoutEngineConfig {
  /** Default algorithm to use */
  defaultAlgorithm?: string;
  
  /** Whether to enable automatic algorithm selection */
  autoSelection: boolean;
  
  /** Performance constraints */
  performance: {
    maxExecutionTime: number; // milliseconds
    maxMemoryUsage: number;   // MB
  };
  
  /** Quality requirements */
  quality: {
    minOverallScore: number;  // 0-100
    prioritizeSpeed: boolean;
  };
  
  /** Debug configuration */
  debug: {
    enabled: boolean;
    logPerformance: boolean;
    keepIntermediateResults: boolean;
  };
}

/**
 * Main layout engine that manages multiple algorithms
 */
export class MultiLayoutEngine {
  private algorithms: Map<string, LayoutAlgorithm> = new Map();
  private config: MultiLayoutEngineConfig;
  private performanceHistory: PerformanceMetrics[] = [];

  constructor(config: Partial<MultiLayoutEngineConfig> = {}) {
    this.config = {
      autoSelection: true,
      performance: {
        maxExecutionTime: 10000, // 10 seconds
        maxMemoryUsage: 512      // 512 MB
      },
      quality: {
        minOverallScore: 70,
        prioritizeSpeed: false
      },
      debug: {
        enabled: false,
        logPerformance: false,
        keepIntermediateResults: false
      },
      ...config
    };
  }

  // ==========================================================================
  // ALGORITHM MANAGEMENT
  // ==========================================================================

  /**
   * Register a new layout algorithm
   */
  registerAlgorithm(algorithm: LayoutAlgorithm): void {
    this.algorithms.set(algorithm.name, algorithm);
    this.log(`Registered algorithm: ${algorithm.name} (${algorithm.displayName})`);
  }

  /**
   * Unregister an algorithm
   */
  unregisterAlgorithm(name: string): void {
    if (this.algorithms.delete(name)) {
      this.log(`Unregistered algorithm: ${name}`);
    }
  }

  /**
   * Get all registered algorithms
   */
  getAlgorithms(): LayoutAlgorithm[] {
    return Array.from(this.algorithms.values());
  }

  /**
   * Get algorithm by name
   */
  getAlgorithm(name: string): LayoutAlgorithm | undefined {
    return this.algorithms.get(name);
  }

  // ==========================================================================
  // GRAPH ANALYSIS
  // ==========================================================================

  /**
   * Analyze graph to extract metrics for algorithm selection
   */
  analyzeGraph(nodes: FlowNode[], edges: FlowEdge[]): GraphMetrics {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    
    // Calculate basic metrics
    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    
    // Group analysis
    const groups = new Map<string, number>();
    nodes.forEach(node => {
      const groupName = (node.data as any)?.groupName;
      if (groupName) {
        groups.set(groupName, (groups.get(groupName) || 0) + 1);
      }
    });
    
    const groupSizes = Array.from(groups.values());
    const groupCount = groups.size;
    const maxGroupSize = groupSizes.length > 0 ? Math.max(...groupSizes) : 0;
    const avgGroupSize = groupSizes.length > 0 ? 
      groupSizes.reduce((sum, size) => sum + size, 0) / groupSizes.length : 0;

    // Connectivity analysis
    const nodeConnectivity = new Map<string, number>();
    edges.forEach(edge => {
      nodeConnectivity.set(edge.source, (nodeConnectivity.get(edge.source) || 0) + 1);
      nodeConnectivity.set(edge.target, (nodeConnectivity.get(edge.target) || 0) + 1);
    });
    
    const connectivityValues = Array.from(nodeConnectivity.values());
    const averageConnectivity = connectivityValues.length > 0 ? 
      connectivityValues.reduce((sum, val) => sum + val, 0) / connectivityValues.length : 0;
    const maxConnectivity = connectivityValues.length > 0 ? Math.max(...connectivityValues) : 0;

    // Cycle detection (simplified)
    const hasCircularDependencies = this.detectCycles(nodes, edges);

    // Calculate diameter and clustering coefficient (simplified estimates)
    const diameter = this.estimateDiameter(nodes, edges);
    const clusteringCoefficient = this.calculateClusteringCoefficient(nodes, edges);

    return {
      nodeCount,
      edgeCount,
      density,
      groupCount,
      maxGroupSize,
      avgGroupSize,
      hasCircularDependencies,
      averageConnectivity,
      maxConnectivity,
      diameter,
      clusteringCoefficient,
      isDirected: true, // Assuming directed graphs for now
      stronglyConnectedComponents: 1 // Simplified
    };
  }

  // ==========================================================================
  // ALGORITHM SELECTION
  // ==========================================================================

  /**
   * Select the best algorithm for the given graph
   */
  selectAlgorithm(
    nodes: FlowNode[], 
    edges: FlowEdge[], 
    criteria?: Partial<AlgorithmSelectionCriteria>
  ): AlgorithmSelectionResult {
    const metrics = this.analyzeGraph(nodes, edges);
    
    const fullCriteria: AlgorithmSelectionCriteria = {
      metrics,
      preferences: {
        prioritizeSpeed: this.config.quality.prioritizeSpeed,
        ...criteria?.preferences
      },
      constraints: {
        maxExecutionTime: this.config.performance.maxExecutionTime,
        maxMemoryUsage: this.config.performance.maxMemoryUsage,
        ...criteria?.constraints
      }
    };

    // Evaluate all algorithms
    const algorithmScores: Array<{
      algorithm: LayoutAlgorithm;
      suitabilityScore: number;
      canHandle: boolean;
      reason: string;
    }> = [];

    this.algorithms.forEach(algorithm => {
      const canHandle = algorithm.canHandle(metrics);
      const suitabilityScore = canHandle ? algorithm.suitability(metrics) : 0;
      
      let reason = '';
      if (!canHandle) {
        reason = 'Algorithm cannot handle this graph type';
      } else if (suitabilityScore < 0.3) {
        reason = 'Low suitability score for this graph';
      } else {
        reason = 'Good match for graph characteristics';
      }

      algorithmScores.push({
        algorithm,
        suitabilityScore,
        canHandle,
        reason
      });
    });

    // Sort by suitability score
    algorithmScores.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    if (algorithmScores.length === 0 || algorithmScores[0].suitabilityScore === 0) {
      throw new LayoutException('No suitable algorithm found for this graph', 'UNSUPPORTED_GRAPH');
    }

    const selectedScore = algorithmScores[0];
    const alternatives = algorithmScores.slice(1, 4); // Top 3 alternatives

    return {
      algorithm: selectedScore.algorithm,
      confidence: selectedScore.suitabilityScore,
      reasoning: [
        `Selected ${selectedScore.algorithm.displayName}`,
        `Suitability score: ${(selectedScore.suitabilityScore * 100).toFixed(1)}%`,
        `Graph has ${metrics.nodeCount} nodes, ${metrics.edgeCount} edges`,
        `Density: ${(metrics.density * 100).toFixed(1)}%`
      ],
      alternatives: alternatives.map(alt => ({
        algorithm: alt.algorithm,
        suitabilityScore: alt.suitabilityScore,
        reason: alt.reason
      }))
    };
  }

  // ==========================================================================
  // LAYOUT PROCESSING
  // ==========================================================================

  /**
   * Process graph layout using the best algorithm or specified algorithm
   */
  async processLayout(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options?: {
      algorithmName?: string;
      config?: LayoutConfig;
      selectionCriteria?: Partial<AlgorithmSelectionCriteria>;
    }
  ): Promise<LayoutResult> {
    const startTime = performance.now();

    try {
      // Input validation
      this.validateInput(nodes, edges);

      // Algorithm selection
      let algorithm: LayoutAlgorithm;
      let confidence = 1.0;

      if (options?.algorithmName) {
        const specificAlgorithm = this.algorithms.get(options.algorithmName);
        if (!specificAlgorithm) {
          throw new LayoutException(`Algorithm '${options.algorithmName}' not found`, 'CONFIGURATION_ERROR');
        }
        algorithm = specificAlgorithm;
      } else if (this.config.autoSelection) {
        const selection = this.selectAlgorithm(nodes, edges, options?.selectionCriteria);
        algorithm = selection.algorithm;
        confidence = selection.confidence;
        
        this.log(`Auto-selected algorithm: ${algorithm.displayName} (confidence: ${(confidence * 100).toFixed(1)}%)`);
      } else if (this.config.defaultAlgorithm) {
        const defaultAlg = this.algorithms.get(this.config.defaultAlgorithm);
        if (!defaultAlg) {
          throw new LayoutException(`Default algorithm '${this.config.defaultAlgorithm}' not found`, 'CONFIGURATION_ERROR');
        }
        algorithm = defaultAlg;
      } else {
        throw new LayoutException('No algorithm specified and auto-selection is disabled', 'CONFIGURATION_ERROR');
      }

      // Prepare configuration
      const config = {
        ...algorithm.getDefaultConfig(),
        ...options?.config
      };

      // Execute layout
      this.log(`Executing layout with ${algorithm.displayName}...`);
      const result = await this.executeWithTimeout(
        () => algorithm.calculate(nodes, edges, config),
        this.config.performance.maxExecutionTime
      );

      // Enhance result with engine metadata
      const totalTime = performance.now() - startTime;
      const enhancedResult: LayoutResult = {
        ...result,
        metadata: {
          ...result.metadata,
          algorithm: algorithm.name
        },
        performance: {
          ...result.performance,
          totalTime
        }
      };

      // Store performance history
      this.performanceHistory.push(enhancedResult.performance);
      this.trimPerformanceHistory();

      // Quality validation
      if (enhancedResult.quality.overallScore < this.config.quality.minOverallScore) {
        enhancedResult.warnings.push(
          `Layout quality (${enhancedResult.quality.overallScore}) below minimum threshold (${this.config.quality.minOverallScore})`
        );
      }

      this.log(`Layout completed in ${totalTime.toFixed(2)}ms with quality score ${enhancedResult.quality.overallScore}`);

      return enhancedResult;

    } catch (error) {
      const totalTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Layout failed after ${totalTime.toFixed(2)}ms: ${errorMessage}`);

      if (error instanceof LayoutException) {
        throw error;
      }

      const finalErrorMessage = error instanceof Error ? error.message : String(error);
      throw new LayoutException(
        `Layout processing failed: ${finalErrorMessage}`,
        'ALGORITHM_FAILURE',
        {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          timestamp: Date.now()
        },
        ['Try a different algorithm', 'Check input data validity', 'Reduce graph complexity']
      );
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new LayoutException('Layout execution timed out', 'PERFORMANCE_TIMEOUT'));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Validate input data
   */
  private validateInput(nodes: FlowNode[], edges: FlowEdge[]): void {
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw new LayoutException('Invalid input: nodes and edges must be arrays', 'INVALID_INPUT');
    }

    if (nodes.length === 0) {
      throw new LayoutException('No nodes provided', 'INVALID_INPUT');
    }

    // Check for valid node IDs
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw new LayoutException(`Edge references non-existent node: ${edge.source} -> ${edge.target}`, 'INVALID_INPUT');
      }
    }
  }

  /**
   * Simplified cycle detection
   */
  private detectCycles(nodes: FlowNode[], edges: FlowEdge[]): boolean {
    const graph = new Map<string, string[]>();
    
    // Build adjacency list
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
      const neighbors = graph.get(edge.source) || [];
      neighbors.push(edge.target);
      graph.set(edge.source, neighbors);
    });

    // Simple DFS cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const [nodeId] of graph) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) return true;
      }
    }

    return false;
  }

  /**
   * Estimate graph diameter (simplified)
   */
  private estimateDiameter(nodes: FlowNode[], edges: FlowEdge[]): number {
    // For now, return a simple estimate based on node count
    // In a full implementation, this would use BFS to find longest shortest path
    return Math.ceil(Math.log2(nodes.length + 1));
  }

  /**
   * Calculate clustering coefficient (simplified)
   */
  private calculateClusteringCoefficient(nodes: FlowNode[], edges: FlowEdge[]): number {
    if (nodes.length < 3) return 0;
    
    // Simplified calculation - in reality this requires checking triangle formations
    const edgeCount = edges.length;
    const nodeCount = nodes.length;
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    
    return maxEdges > 0 ? edgeCount / maxEdges : 0;
  }

  /**
   * Trim performance history to prevent memory leaks
   */
  private trimPerformanceHistory(): void {
    const maxHistory = 100;
    if (this.performanceHistory.length > maxHistory) {
      this.performanceHistory = this.performanceHistory.slice(-maxHistory);
    }
  }

  /**
   * Log message if debugging is enabled
   */
  private log(...args: any[]): void {
    if (this.config.debug.enabled) {
      console.log('[MultiLayoutEngine]', ...args);
    }
  }

  // ==========================================================================
  // CONFIGURATION AND ANALYSIS
  // ==========================================================================

  /**
   * Update engine configuration
   */
  updateConfig(newConfig: Partial<MultiLayoutEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (this.performanceHistory.length === 0) {
      return null;
    }

    const times = this.performanceHistory.map(p => p.totalTime);
    const ratings = this.performanceHistory.map(p => p.performanceRating);

    return {
      totalRuns: this.performanceHistory.length,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      recentTrend: this.calculateTrend(times.slice(-10))
    };
  }

  /**
   * Calculate trend in recent performance
   */
  private calculateTrend(values: number[]): 'improving' | 'degrading' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const improvement = (firstAvg - secondAvg) / firstAvg;
    
    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'degrading';
    return 'stable';
  }
}

/**
 * Custom error class for layout-related errors
 */
export class LayoutException extends Error implements LayoutError {
  constructor(
    message: string,
    public type: LayoutErrorType,
    public context: {
      nodeCount: number;
      edgeCount: number;
      timestamp: number;
    } = { nodeCount: 0, edgeCount: 0, timestamp: Date.now() },
    public suggestions: string[] = []
  ) {
    super(message);
    this.name = 'LayoutError';
  }
}