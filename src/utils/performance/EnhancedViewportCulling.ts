/**
 * Enhanced Viewport Culling System
 * 
 * This system provides advanced viewport culling with predictive loading,
 * spatial indexing, and adaptive performance optimizations for large graphs.
 */

import { Node as FlowNode, Edge as FlowEdge, Viewport } from 'reactflow';

/**
 * Spatial index for efficient viewport queries
 */
interface SpatialIndex {
  /** Add element to spatial index */
  insert(element: CullableElement): void;
  
  /** Remove element from spatial index */
  remove(elementId: string): void;
  
  /** Query elements in bounds */
  query(bounds: Rectangle): CullableElement[];
  
  /** Update element position */
  update(elementId: string, newBounds: Rectangle): void;
  
  /** Clear all elements */
  clear(): void;
}

/**
 * Element that can be culled
 */
interface CullableElement {
  id: string;
  type: 'node' | 'edge' | 'group';
  bounds: Rectangle;
  priority: number;
  lastVisible: number;
  loadState: 'unloaded' | 'loading' | 'loaded' | 'error';
  data: FlowNode | FlowEdge | any;
}

/**
 * Culling configuration
 */
export interface CullingConfig {
  /** Enable/disable culling */
  enabled: boolean;
  
  /** Viewport buffer settings */
  buffer: {
    /** Buffer multiplier for viewport bounds */
    multiplier: number;
    
    /** Minimum buffer size in pixels */
    minSize: number;
    
    /** Maximum buffer size in pixels */
    maxSize: number;
  };
  
  /** Predictive loading settings */
  predictive: {
    enabled: boolean;
    
    /** Prediction time horizon in milliseconds */
    timeHorizon: number;
    
    /** Movement velocity threshold for prediction */
    velocityThreshold: number;
    
    /** Prediction accuracy factor */
    accuracyFactor: number;
  };
  
  /** Performance thresholds */
  performance: {
    /** Maximum elements to render simultaneously */
    maxRenderElements: number;
    
    /** Target frame rate */
    targetFPS: number;
    
    /** Performance monitoring interval */
    monitoringInterval: number;
  };
  
  /** Adaptive culling settings */
  adaptive: {
    enabled: boolean;
    
    /** Dynamically adjust buffer based on performance */
    dynamicBuffer: boolean;
    
    /** Reduce quality under performance pressure */
    qualityReduction: boolean;
  };
  
  /** Spatial indexing settings */
  spatialIndex: {
    /** Type of spatial index to use */
    type: 'quadtree' | 'rtree' | 'grid';
    
    /** Maximum elements per spatial cell */
    maxElementsPerCell: number;
    
    /** Maximum tree depth */
    maxDepth: number;
  };
}

/**
 * Viewport movement prediction
 */
interface ViewportPrediction {
  /** Predicted viewport bounds */
  predictedBounds: Rectangle;
  
  /** Confidence in prediction (0-1) */
  confidence: number;
  
  /** Prediction timestamp */
  timestamp: number;
  
  /** Movement vector */
  velocity: { dx: number; dy: number };
}

/**
 * Culling operation result
 */
export interface CullingResult {
  /** Elements to render */
  visible: CullableElement[];
  
  /** Elements to load */
  toLoad: CullableElement[];
  
  /** Elements to unload */
  toUnload: CullableElement[];
  
  /** Performance metrics */
  metrics: {
    totalElements: number;
    visibleElements: number;
    culledElements: number;
    cullingRatio: number;
    executionTime: number;
  };
  
  /** Recommendations for performance */
  recommendations: string[];
}

/**
 * Rectangle bounds utility
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Main Enhanced Viewport Culling System
 */
export class EnhancedViewportCulling {
  private config: CullingConfig;
  private spatialIndex: SpatialIndex;
  private elements: Map<string, CullableElement> = new Map();
  private viewportHistory: Viewport[] = [];
  private performanceMonitor: PerformanceMonitor;
  private predictionEngine: PredictionEngine;
  private loadedElements: Set<string> = new Set();
  private isMonitoring = false;
  
  constructor(config?: Partial<CullingConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.spatialIndex = this.createSpatialIndex();
    this.performanceMonitor = new PerformanceMonitor(this.config);
    this.predictionEngine = new PredictionEngine(this.config);
    
    if (this.config.enabled) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Update viewport and perform culling
   */
  updateViewport(
    viewport: Viewport,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): CullingResult {
    const startTime = performance.now();
    
    // Update viewport history for prediction
    this.updateViewportHistory(viewport);
    
    // Update elements in spatial index
    this.updateElements(nodes, edges);
    
    // Calculate culling bounds
    const cullingBounds = this.calculateCullingBounds(viewport);
    
    // Perform spatial query
    const candidateElements = this.spatialIndex.query(cullingBounds);
    
    // Apply visibility filtering
    const visibleElements = this.filterVisibleElements(candidateElements, viewport);
    
    // Predictive loading
    let predictiveElements: CullableElement[] = [];
    if (this.config.predictive.enabled) {
      const prediction = this.predictionEngine.predictViewport(this.viewportHistory);
      if (prediction) {
        predictiveElements = this.getPredictiveElements(prediction);
      }
    }
    
    // Determine load/unload operations
    const { toLoad, toUnload } = this.determineLoadOperations(
      visibleElements,
      predictiveElements
    );
    
    // Apply adaptive optimizations
    if (this.config.adaptive.enabled) {
      this.applyAdaptiveOptimizations(visibleElements.length);
    }
    
    const executionTime = performance.now() - startTime;
    
    return {
      visible: visibleElements,
      toLoad,
      toUnload,
      metrics: {
        totalElements: this.elements.size,
        visibleElements: visibleElements.length,
        culledElements: this.elements.size - visibleElements.length,
        cullingRatio: this.elements.size > 0 ? 
          (this.elements.size - visibleElements.length) / this.elements.size : 0,
        executionTime
      },
      recommendations: this.generateRecommendations(visibleElements.length, executionTime)
    };
  }

  /**
   * Add elements to the culling system
   */
  addElements(nodes: FlowNode[], edges: FlowEdge[]): void {
    // Add nodes
    nodes.forEach(node => {
      const element: CullableElement = {
        id: node.id,
        type: 'node',
        bounds: this.calculateNodeBounds(node),
        priority: this.calculateNodePriority(node),
        lastVisible: 0,
        loadState: 'unloaded',
        data: node
      };
      
      this.elements.set(node.id, element);
      this.spatialIndex.insert(element);
    });
    
    // Add edges
    edges.forEach(edge => {
      const element: CullableElement = {
        id: edge.id || `${edge.source}-${edge.target}`,
        type: 'edge',
        bounds: this.calculateEdgeBounds(edge, nodes),
        priority: this.calculateEdgePriority(edge),
        lastVisible: 0,
        loadState: 'unloaded',
        data: edge
      };
      
      this.elements.set(element.id, element);
      this.spatialIndex.insert(element);
    });
  }

  /**
   * Remove elements from the culling system
   */
  removeElements(elementIds: string[]): void {
    elementIds.forEach(id => {
      this.elements.delete(id);
      this.spatialIndex.remove(id);
      this.loadedElements.delete(id);
    });
  }

  // ==========================================================================
  // VIEWPORT CALCULATIONS
  // ==========================================================================

  /**
   * Calculate culling bounds with buffer
   */
  private calculateCullingBounds(viewport: Viewport): Rectangle {
    const bufferSize = this.calculateDynamicBuffer(viewport);
    
    return {
      x: viewport.x - bufferSize,
      y: viewport.y - bufferSize,
      width: (1 / viewport.zoom) + (bufferSize * 2),
      height: (1 / viewport.zoom) + (bufferSize * 2)
    };
  }

  /**
   * Calculate dynamic buffer size based on viewport and performance
   */
  private calculateDynamicBuffer(viewport: Viewport): number {
    let baseBuffer = this.config.buffer.minSize * this.config.buffer.multiplier;
    
    // Adjust based on zoom level
    const zoomFactor = Math.max(0.5, Math.min(2.0, 1 / viewport.zoom));
    baseBuffer *= zoomFactor;
    
    // Adjust based on performance
    if (this.config.adaptive.dynamicBuffer) {
      const performanceMetrics = this.performanceMonitor.getRecentMetrics();
      if (performanceMetrics.averageFPS < this.config.performance.targetFPS) {
        baseBuffer *= 0.7; // Reduce buffer under performance pressure
      } else if (performanceMetrics.averageFPS > this.config.performance.targetFPS * 1.2) {
        baseBuffer *= 1.3; // Increase buffer when performance is good
      }
    }
    
    // Apply constraints
    return Math.max(
      this.config.buffer.minSize,
      Math.min(this.config.buffer.maxSize, baseBuffer)
    );
  }

  /**
   * Update viewport history for prediction
   */
  private updateViewportHistory(viewport: Viewport): void {
    this.viewportHistory.push(viewport);
    
    // Keep only recent history
    const maxHistory = 10;
    if (this.viewportHistory.length > maxHistory) {
      this.viewportHistory = this.viewportHistory.slice(-maxHistory);
    }
  }

  // ==========================================================================
  // ELEMENT MANAGEMENT
  // ==========================================================================

  /**
   * Update elements in spatial index
   */
  private updateElements(nodes: FlowNode[], edges: FlowEdge[]): void {
    // Update existing elements or add new ones
    const currentNodeIds = new Set(nodes.map(n => n.id));
    const currentEdgeIds = new Set(edges.map(e => e.id || `${e.source}-${e.target}`));
    
    // Remove elements that no longer exist
    const toRemove: string[] = [];
    this.elements.forEach((element, id) => {
      if (element.type === 'node' && !currentNodeIds.has(id)) {
        toRemove.push(id);
      } else if (element.type === 'edge' && !currentEdgeIds.has(id)) {
        toRemove.push(id);
      }
    });
    
    this.removeElements(toRemove);
    
    // Add new elements
    const newNodes = nodes.filter(n => !this.elements.has(n.id));
    const newEdges = edges.filter(e => {
      const id = e.id || `${e.source}-${e.target}`;
      return !this.elements.has(id);
    });
    
    if (newNodes.length > 0 || newEdges.length > 0) {
      this.addElements(newNodes, newEdges);
    }
    
    // Update positions for existing elements
    nodes.forEach(node => {
      const element = this.elements.get(node.id);
      if (element) {
        const newBounds = this.calculateNodeBounds(node);
        if (!this.boundsEqual(element.bounds, newBounds)) {
          element.bounds = newBounds;
          this.spatialIndex.update(node.id, newBounds);
        }
      }
    });
  }

  /**
   * Filter elements for visibility
   */
  private filterVisibleElements(
    candidates: CullableElement[],
    viewport: Viewport
  ): CullableElement[] {
    const viewportBounds = this.viewportToBounds(viewport);
    const visibleElements: CullableElement[] = [];
    
    candidates.forEach(element => {
      if (this.boundsIntersect(element.bounds, viewportBounds)) {
        element.lastVisible = Date.now();
        visibleElements.push(element);
      }
    });
    
    // Sort by priority
    visibleElements.sort((a, b) => b.priority - a.priority);
    
    // Apply maximum element limit
    const maxElements = this.config.performance.maxRenderElements;
    if (visibleElements.length > maxElements) {
      return visibleElements.slice(0, maxElements);
    }
    
    return visibleElements;
  }

  /**
   * Get elements for predictive loading
   */
  private getPredictiveElements(prediction: ViewportPrediction): CullableElement[] {
    if (prediction.confidence < 0.5) {
      return []; // Low confidence, skip predictive loading
    }
    
    const predictiveElements = this.spatialIndex.query(prediction.predictedBounds);
    
    // Filter based on prediction confidence and element priority
    return predictiveElements.filter(element => {
      const priority = element.priority * prediction.confidence;
      return priority > 0.3; // Threshold for predictive loading
    });
  }

  /**
   * Determine load and unload operations
   */
  private determineLoadOperations(
    visibleElements: CullableElement[],
    predictiveElements: CullableElement[]
  ): { toLoad: CullableElement[]; toUnload: CullableElement[] } {
    const shouldBeLoaded = new Set<string>();
    
    // Mark visible elements for loading
    visibleElements.forEach(element => {
      shouldBeLoaded.add(element.id);
    });
    
    // Mark predictive elements for loading
    predictiveElements.forEach(element => {
      shouldBeLoaded.add(element.id);
    });
    
    // Determine what to load
    const toLoad: CullableElement[] = [];
    shouldBeLoaded.forEach(elementId => {
      if (!this.loadedElements.has(elementId)) {
        const element = this.elements.get(elementId);
        if (element && element.loadState === 'unloaded') {
          toLoad.push(element);
        }
      }
    });
    
    // Determine what to unload
    const toUnload: CullableElement[] = [];
    const unloadThreshold = Date.now() - 5000; // Unload after 5 seconds
    
    this.loadedElements.forEach(elementId => {
      if (!shouldBeLoaded.has(elementId)) {
        const element = this.elements.get(elementId);
        if (element && element.lastVisible < unloadThreshold) {
          toUnload.push(element);
        }
      }
    });
    
    return { toLoad, toUnload };
  }

  // ==========================================================================
  // ADAPTIVE OPTIMIZATIONS
  // ==========================================================================

  /**
   * Apply adaptive optimizations based on performance
   */
  private applyAdaptiveOptimizations(visibleCount: number): void {
    const metrics = this.performanceMonitor.getRecentMetrics();
    
    if (metrics.averageFPS < this.config.performance.targetFPS * 0.8) {
      // Performance is poor, apply optimizations
      
      if (this.config.adaptive.qualityReduction) {
        // Could implement quality reduction strategies
        this.reduceRenderingQuality();
      }
      
      // Reduce maximum render elements
      const reductionFactor = 0.8;
      this.config.performance.maxRenderElements = Math.floor(
        this.config.performance.maxRenderElements * reductionFactor
      );
      
    } else if (metrics.averageFPS > this.config.performance.targetFPS * 1.2) {
      // Performance is good, can increase quality
      
      // Restore maximum render elements
      const increaseFactor = 1.1;
      this.config.performance.maxRenderElements = Math.min(
        10000, // Maximum limit
        Math.floor(this.config.performance.maxRenderElements * increaseFactor)
      );
    }
  }

  /**
   * Reduce rendering quality for performance
   */
  private reduceRenderingQuality(): void {
    // Could implement various quality reduction strategies:
    // - Reduce node detail levels
    // - Simplify edge rendering
    // - Reduce animation quality
    // - Lower texture resolution
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Calculate node bounds
   */
  private calculateNodeBounds(node: FlowNode): Rectangle {
    const width = (node.data as any)?.width || 200;
    const height = (node.data as any)?.height || 100;
    
    return {
      x: (node.position?.x || 0) - width / 2,
      y: (node.position?.y || 0) - height / 2,
      width,
      height
    };
  }

  /**
   * Calculate edge bounds
   */
  private calculateEdgeBounds(edge: FlowEdge, nodes: FlowNode[]): Rectangle {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode?.position || !targetNode?.position) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const minX = Math.min(sourceNode.position.x, targetNode.position.x);
    const maxX = Math.max(sourceNode.position.x, targetNode.position.x);
    const minY = Math.min(sourceNode.position.y, targetNode.position.y);
    const maxY = Math.max(sourceNode.position.y, targetNode.position.y);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calculate element priority
   */
  private calculateNodePriority(node: FlowNode): number {
    let priority = 1.0;
    
    // Boost priority for selected nodes
    if ((node.data as any)?.isSelected) {
      priority += 0.5;
    }
    
    // Boost priority for nodes with more connections
    const connectionCount = (node.data as any)?.connectionCount || 0;
    priority += Math.min(0.3, connectionCount * 0.05);
    
    return priority;
  }

  /**
   * Calculate edge priority
   */
  private calculateEdgePriority(edge: FlowEdge): number {
    let priority = 0.5; // Lower than nodes by default
    
    // Boost priority for selected edges
    if ((edge.data as any)?.isSelected) {
      priority += 0.3;
    }
    
    return priority;
  }

  /**
   * Check if bounds intersect
   */
  private boundsIntersect(bounds1: Rectangle, bounds2: Rectangle): boolean {
    return !(bounds1.x + bounds1.width < bounds2.x ||
             bounds2.x + bounds2.width < bounds1.x ||
             bounds1.y + bounds1.height < bounds2.y ||
             bounds2.y + bounds2.height < bounds1.y);
  }

  /**
   * Check if bounds are equal
   */
  private boundsEqual(bounds1: Rectangle, bounds2: Rectangle): boolean {
    return bounds1.x === bounds2.x &&
           bounds1.y === bounds2.y &&
           bounds1.width === bounds2.width &&
           bounds1.height === bounds2.height;
  }

  /**
   * Convert viewport to bounds
   */
  private viewportToBounds(viewport: Viewport): Rectangle {
    return {
      x: viewport.x,
      y: viewport.y,
      width: 1 / viewport.zoom, // Simplified
      height: 1 / viewport.zoom // Simplified
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(visibleCount: number, executionTime: number): string[] {
    const recommendations: string[] = [];
    
    if (executionTime > 16) { // More than one frame at 60fps
      recommendations.push('Consider reducing buffer size or maximum render elements');
    }
    
    if (visibleCount > this.config.performance.maxRenderElements * 0.9) {
      recommendations.push('Approaching maximum render limit, consider increasing culling aggressiveness');
    }
    
    const metrics = this.performanceMonitor.getRecentMetrics();
    if (metrics.averageFPS < this.config.performance.targetFPS) {
      recommendations.push('Performance below target, enable adaptive optimizations');
    }
    
    return recommendations;
  }

  // ==========================================================================
  // SPATIAL INDEX MANAGEMENT
  // ==========================================================================

  /**
   * Create spatial index based on configuration
   */
  private createSpatialIndex(): SpatialIndex {
    switch (this.config.spatialIndex.type) {
      case 'quadtree':
        return new QuadTreeIndex(this.config);
      case 'rtree':
        return new RTreeIndex(this.config);
      case 'grid':
      default:
        return new GridIndex(this.config);
    }
  }

  // ==========================================================================
  // PERFORMANCE MONITORING
  // ==========================================================================

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    const interval = this.config.performance.monitoringInterval;
    
    setInterval(() => {
      this.performanceMonitor.update();
    }, interval);
  }

  /**
   * Stop performance monitoring
   */
  private stopPerformanceMonitoring(): void {
    this.isMonitoring = false;
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<CullingConfig>): CullingConfig {
    return {
      enabled: true,
      buffer: {
        multiplier: 1.5,
        minSize: 100,
        maxSize: 1000
      },
      predictive: {
        enabled: true,
        timeHorizon: 1000,
        velocityThreshold: 10,
        accuracyFactor: 0.8
      },
      performance: {
        maxRenderElements: 1000,
        targetFPS: 60,
        monitoringInterval: 1000
      },
      adaptive: {
        enabled: true,
        dynamicBuffer: true,
        qualityReduction: true
      },
      spatialIndex: {
        type: 'quadtree',
        maxElementsPerCell: 10,
        maxDepth: 8
      },
      ...config
    };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Enable culling
   */
  enable(): void {
    this.config.enabled = true;
    this.startPerformanceMonitoring();
  }

  /**
   * Disable culling
   */
  disable(): void {
    this.config.enabled = false;
    this.stopPerformanceMonitoring();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CullingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    totalElements: number;
    loadedElements: number;
    spatialIndexSize: number;
    performanceMetrics: any;
  } {
    return {
      totalElements: this.elements.size,
      loadedElements: this.loadedElements.size,
      spatialIndexSize: this.elements.size, // Simplified
      performanceMetrics: this.performanceMonitor.getRecentMetrics()
    };
  }

  /**
   * Clear all elements
   */
  clear(): void {
    this.elements.clear();
    this.loadedElements.clear();
    this.spatialIndex.clear();
    this.viewportHistory = [];
  }
}

// ==========================================================================
// HELPER CLASSES
// ==========================================================================

/**
 * Performance monitoring helper
 */
class PerformanceMonitor {
  private frameTimestamps: number[] = [];
  private config: CullingConfig;
  
  constructor(config: CullingConfig) {
    this.config = config;
  }
  
  update(): void {
    const now = performance.now();
    this.frameTimestamps.push(now);
    
    // Keep only recent frames
    const maxFrames = 60;
    if (this.frameTimestamps.length > maxFrames) {
      this.frameTimestamps = this.frameTimestamps.slice(-maxFrames);
    }
  }
  
  getRecentMetrics(): { averageFPS: number; frameTimes: number[] } {
    if (this.frameTimestamps.length < 2) {
      return { averageFPS: 60, frameTimes: [] };
    }
    
    const frameTimes: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      frameTimes.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
    }
    
    const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    const averageFPS = 1000 / averageFrameTime;
    
    return { averageFPS, frameTimes };
  }
}

/**
 * Viewport prediction engine
 */
class PredictionEngine {
  private config: CullingConfig;
  
  constructor(config: CullingConfig) {
    this.config = config;
  }
  
  predictViewport(history: Viewport[]): ViewportPrediction | null {
    if (history.length < 2) {
      return null;
    }
    
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    // Calculate velocity
    const velocity = {
      dx: current.x - previous.x,
      dy: current.y - previous.y
    };
    
    // Check if movement is significant
    const speed = Math.sqrt(velocity.dx * velocity.dx + velocity.dy * velocity.dy);
    if (speed < this.config.predictive.velocityThreshold) {
      return null;
    }
    
    // Predict future position
    const timeHorizonSeconds = this.config.predictive.timeHorizon / 1000;
    const predictedX = current.x + velocity.dx * timeHorizonSeconds;
    const predictedY = current.y + velocity.dy * timeHorizonSeconds;
    
    return {
      predictedBounds: {
        x: predictedX,
        y: predictedY,
        width: 1 / current.zoom,
        height: 1 / current.zoom
      },
      confidence: Math.min(0.9, this.config.predictive.accuracyFactor),
      timestamp: Date.now(),
      velocity
    };
  }
}

// Placeholder spatial index implementations
class QuadTreeIndex implements SpatialIndex {
  constructor(private config: CullingConfig) {}
  insert(element: CullableElement): void {}
  remove(elementId: string): void {}
  query(bounds: Rectangle): CullableElement[] { return []; }
  update(elementId: string, newBounds: Rectangle): void {}
  clear(): void {}
}

class RTreeIndex implements SpatialIndex {
  constructor(private config: CullingConfig) {}
  insert(element: CullableElement): void {}
  remove(elementId: string): void {}
  query(bounds: Rectangle): CullableElement[] { return []; }
  update(elementId: string, newBounds: Rectangle): void {}
  clear(): void {}
}

class GridIndex implements SpatialIndex {
  private elements = new Map<string, CullableElement>();
  
  constructor(private config: CullingConfig) {}
  
  insert(element: CullableElement): void {
    this.elements.set(element.id, element);
  }
  
  remove(elementId: string): void {
    this.elements.delete(elementId);
  }
  
  query(bounds: Rectangle): CullableElement[] {
    // Simplified grid query - would implement proper spatial partitioning
    return Array.from(this.elements.values());
  }
  
  update(elementId: string, newBounds: Rectangle): void {
    const element = this.elements.get(elementId);
    if (element) {
      element.bounds = newBounds;
    }
  }
  
  clear(): void {
    this.elements.clear();
  }
}