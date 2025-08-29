/**
 * Level of Detail (LOD) Renderer
 * 
 * This system provides adaptive rendering based on zoom levels and viewport size,
 * optimizing performance by showing different levels of detail for different zoom scales.
 * It integrates with the Edge Bundling system and supports multiple rendering strategies.
 */

import { Node as FlowNode, Edge as FlowEdge, Viewport } from 'reactflow';
import { BundlePath, EdgeBundlingSystem } from './EdgeBundling';

/**
 * LOD level configuration
 */
export interface LODLevel {
  /** Zoom threshold for this level */
  zoomThreshold: number;
  
  /** Node rendering settings */
  nodeRendering: {
    /** Show node labels */
    showLabels: boolean;
    
    /** Show node details */
    showDetails: boolean;
    
    /** Node size multiplier */
    sizeMultiplier: number;
    
    /** Show node icons */
    showIcons: boolean;
    
    /** Label font size */
    labelFontSize: number;
  };
  
  /** Edge rendering settings */
  edgeRendering: {
    /** Show edge labels */
    showLabels: boolean;
    
    /** Edge thickness multiplier */
    thicknessMultiplier: number;
    
    /** Show edge arrows */
    showArrows: boolean;
    
    /** Use edge bundling */
    useBundling: boolean;
    
    /** Simplify edge paths */
    simplifyPaths: boolean;
  };
  
  /** Group rendering settings */
  groupRendering: {
    /** Show group backgrounds */
    showBackgrounds: boolean;
    
    /** Show group labels */
    showLabels: boolean;
    
    /** Auto-collapse small groups */
    autoCollapseThreshold: number;
    
    /** Group detail level */
    detailLevel: 'minimal' | 'basic' | 'detailed';
  };
}

/**
 * LOD renderer configuration
 */
export interface LODConfig {
  /** Enable LOD rendering */
  enabled: boolean;
  
  /** LOD levels (sorted by zoom threshold) */
  levels: LODLevel[];
  
  /** Transition settings */
  transitions: {
    /** Enable smooth transitions between levels */
    enabled: boolean;
    
    /** Transition duration (ms) */
    duration: number;
    
    /** Transition easing */
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
  
  /** Performance settings */
  performance: {
    /** Update frequency (ms) */
    updateInterval: number;
    
    /** Use requestAnimationFrame for updates */
    useRAF: boolean;
    
    /** Maximum nodes to render at once */
    maxRenderNodes: number;
    
    /** Use offscreen canvas for pre-rendering */
    useOffscreenCanvas: boolean;
  };
  
  /** Adaptive settings */
  adaptive: {
    /** Enable adaptive quality based on performance */
    enabled: boolean;
    
    /** Target FPS for adaptive quality */
    targetFPS: number;
    
    /** Minimum quality level */
    minQuality: number;
    
    /** Quality adjustment step */
    qualityStep: number;
  };
}

/**
 * Rendered content for a specific LOD level
 */
export interface LODContent {
  /** Current LOD level */
  level: number;
  
  /** Rendered nodes */
  nodes: EnhancedFlowNode[];
  
  /** Rendered edges */
  edges: EnhancedFlowEdge[];
  
  /** Bundle paths (if edge bundling is enabled) */
  bundles: BundlePath[];
  
  /** Rendering metadata */
  metadata: {
    /** Total elements rendered */
    totalElements: number;
    
    /** Elements culled */
    culledElements: number;
    
    /** Rendering time (ms) */
    renderingTime: number;
    
    /** Memory usage estimate (MB) */
    memoryUsage: number;
  };
}

/**
 * Enhanced node with LOD-specific properties
 */
export interface EnhancedFlowNode extends FlowNode {
  lodLevel?: number;
  simplified?: boolean;
  originalData?: any;
  renderPriority?: number;
}

/**
 * Enhanced edge with LOD-specific properties
 */
export interface EnhancedFlowEdge extends FlowEdge {
  lodLevel?: number;
  simplified?: boolean;
  bundled?: boolean;
  originalPath?: string;
  renderPriority?: number;
}

/**
 * Performance metrics for LOD rendering
 */
export interface LODPerformanceMetrics {
  /** Current FPS */
  currentFPS: number;
  
  /** Average FPS over time window */
  averageFPS: number;
  
  /** Render time per frame (ms) */
  renderTime: number;
  
  /** Memory usage (MB) */
  memoryUsage: number;
  
  /** Current quality level (0-1) */
  currentQuality: number;
  
  /** LOD level switches count */
  levelSwitches: number;
}

/**
 * Main LOD Renderer System
 */
export class LODRenderer {
  private config: LODConfig;
  private edgeBundling: EdgeBundlingSystem;
  private currentLODLevel = 0;
  private performanceMonitor: PerformanceMonitor;
  private renderCache: Map<string, LODContent> = new Map();
  private lastUpdateTime = 0;
  
  constructor(
    config?: Partial<LODConfig>,
    edgeBundling?: EdgeBundlingSystem
  ) {
    this.config = this.mergeWithDefaults(config);
    this.edgeBundling = edgeBundling || new EdgeBundlingSystem();
    this.performanceMonitor = new PerformanceMonitor(this.config.adaptive.targetFPS);
  }

  /**
   * Render content with appropriate LOD level
   */
  async renderWithLOD(
    nodes: FlowNode[],
    edges: FlowEdge[],
    viewport: Viewport
  ): Promise<LODContent> {
    if (!this.config.enabled) {
      return this.renderFullDetail(nodes, edges);
    }

    const startTime = performance.now();
    
    // Determine appropriate LOD level
    const lodLevel = this.determineLODLevel(viewport.zoom, nodes.length);
    
    // Check cache first
    const cacheKey = this.generateCacheKey(nodes, edges, lodLevel, viewport);
    if (this.renderCache.has(cacheKey)) {
      return this.renderCache.get(cacheKey)!;
    }

    // Update performance metrics
    this.performanceMonitor.update();
    
    // Adjust quality based on performance if adaptive mode is enabled
    let adjustedLevel = lodLevel;
    if (this.config.adaptive.enabled) {
      adjustedLevel = this.adjustLevelForPerformance(lodLevel);
    }

    // Render content for the determined LOD level
    const content = await this.renderForLevel(nodes, edges, viewport, adjustedLevel);
    
    // Cache the result
    this.renderCache.set(cacheKey, content);
    
    // Clean up old cache entries
    this.cleanupCache();
    
    return content;
  }

  /**
   * Render content for a specific LOD level
   */
  private async renderForLevel(
    nodes: FlowNode[],
    edges: FlowEdge[],
    viewport: Viewport,
    level: number
  ): Promise<LODContent> {
    const startTime = performance.now();
    const lodConfig = this.config.levels[level];
    
    if (!lodConfig) {
      return this.renderFullDetail(nodes, edges);
    }

    // Process nodes for this LOD level
    const processedNodes = this.processNodesForLOD(nodes, lodConfig, viewport);
    
    // Process edges for this LOD level
    let processedEdges = this.processEdgesForLOD(edges, lodConfig, viewport);
    let bundles: BundlePath[] = [];
    
    // Apply edge bundling if enabled for this level
    if (lodConfig.edgeRendering.useBundling && processedEdges.length > 10) {
      try {
        const bundlingResult = await this.edgeBundling.bundleEdges(
          processedEdges as FlowEdge[],
          processedNodes as FlowNode[]
        );
        
        bundles = bundlingResult.bundles;
        processedEdges = bundlingResult.unbundledEdges as EnhancedFlowEdge[];
      } catch (error) {
        console.warn('Edge bundling failed for LOD level:', level, error);
      }
    }

    const renderTime = performance.now() - startTime;
    
    return {
      level,
      nodes: processedNodes,
      edges: processedEdges,
      bundles,
      metadata: {
        totalElements: processedNodes.length + processedEdges.length + bundles.length,
        culledElements: (nodes.length - processedNodes.length) + (edges.length - processedEdges.length),
        renderingTime: renderTime,
        memoryUsage: this.estimateMemoryUsage(processedNodes, processedEdges, bundles)
      }
    };
  }

  /**
   * Process nodes for specific LOD level
   */
  private processNodesForLOD(
    nodes: FlowNode[],
    lodConfig: LODLevel,
    viewport: Viewport
  ): EnhancedFlowNode[] {
    return nodes
      .filter(node => this.shouldRenderNode(node, viewport))
      .map(node => this.enhanceNodeForLOD(node, lodConfig))
      .slice(0, this.config.performance.maxRenderNodes);
  }

  /**
   * Process edges for specific LOD level
   */
  private processEdgesForLOD(
    edges: FlowEdge[],
    lodConfig: LODLevel,
    viewport: Viewport
  ): EnhancedFlowEdge[] {
    return edges
      .filter(edge => this.shouldRenderEdge(edge, viewport))
      .map(edge => this.enhanceEdgeForLOD(edge, lodConfig));
  }

  /**
   * Enhance node with LOD-specific properties
   */
  private enhanceNodeForLOD(node: FlowNode, lodConfig: LODLevel): EnhancedFlowNode {
    const enhanced: EnhancedFlowNode = {
      ...node,
      lodLevel: this.currentLODLevel,
      simplified: !lodConfig.nodeRendering.showDetails,
      originalData: node.data
    };

    // Modify node data based on LOD settings
    if (enhanced.data) {
      const data = { ...enhanced.data };
      
      if (!lodConfig.nodeRendering.showLabels) {
        data.label = '';
      }
      
      if (!lodConfig.nodeRendering.showIcons) {
        data.icon = undefined;
      }
      
      // Adjust font size
      if (data.style) {
        data.style = {
          ...data.style,
          fontSize: `${lodConfig.nodeRendering.labelFontSize}px`
        };
      }
      
      enhanced.data = data;
    }

    // Adjust node style
    if (enhanced.style) {
      enhanced.style = {
        ...enhanced.style,
        width: (enhanced.style.width || 100) * lodConfig.nodeRendering.sizeMultiplier,
        height: (enhanced.style.height || 50) * lodConfig.nodeRendering.sizeMultiplier
      };
    }

    return enhanced;
  }

  /**
   * Enhance edge with LOD-specific properties
   */
  private enhanceEdgeForLOD(edge: FlowEdge, lodConfig: LODLevel): EnhancedFlowEdge {
    const enhanced: EnhancedFlowEdge = {
      ...edge,
      lodLevel: this.currentLODLevel,
      simplified: lodConfig.edgeRendering.simplifyPaths
    };

    // Modify edge style based on LOD settings
    if (enhanced.style) {
      enhanced.style = {
        ...enhanced.style,
        strokeWidth: (enhanced.style.strokeWidth || 2) * lodConfig.edgeRendering.thicknessMultiplier
      };
    }

    // Remove labels if not needed
    if (!lodConfig.edgeRendering.showLabels && enhanced.label) {
      enhanced.label = '';
    }

    // Remove markers if arrows are disabled
    if (!lodConfig.edgeRendering.showArrows) {
      enhanced.markerEnd = undefined;
      enhanced.markerStart = undefined;
    }

    return enhanced;
  }

  /**
   * Determine appropriate LOD level based on zoom and complexity
   */
  private determineLODLevel(zoom: number, nodeCount: number): number {
    // Factor in both zoom level and graph complexity
    const complexityFactor = Math.log10(nodeCount + 1) / 3; // 0-1 scale
    const adjustedZoom = zoom * (1 - complexityFactor * 0.3); // Reduce effective zoom for complex graphs
    
    // Find the appropriate LOD level
    for (let i = this.config.levels.length - 1; i >= 0; i--) {
      if (adjustedZoom >= this.config.levels[i].zoomThreshold) {
        return i;
      }
    }
    
    return 0; // Default to lowest detail level
  }

  /**
   * Adjust LOD level based on performance metrics
   */
  private adjustLevelForPerformance(baseLevel: number): number {
    const metrics = this.performanceMonitor.getMetrics();
    
    if (metrics.averageFPS < this.config.adaptive.targetFPS * 0.8) {
      // Performance is poor, reduce quality
      return Math.max(0, baseLevel - 1);
    } else if (metrics.averageFPS > this.config.adaptive.targetFPS * 1.2) {
      // Performance is good, can increase quality
      return Math.min(this.config.levels.length - 1, baseLevel + 1);
    }
    
    return baseLevel;
  }

  /**
   * Check if node should be rendered at current viewport
   */
  private shouldRenderNode(node: FlowNode, viewport: Viewport): boolean {
    if (!node.position) return true;
    
    // Simple viewport culling
    const nodeX = node.position.x;
    const nodeY = node.position.y;
    const nodeSize = 100; // Estimated node size
    
    const viewportLeft = -viewport.x / viewport.zoom;
    const viewportTop = -viewport.y / viewport.zoom;
    const viewportRight = viewportLeft + (window.innerWidth / viewport.zoom);
    const viewportBottom = viewportTop + (window.innerHeight / viewport.zoom);
    
    return nodeX + nodeSize >= viewportLeft &&
           nodeX - nodeSize <= viewportRight &&
           nodeY + nodeSize >= viewportTop &&
           nodeY - nodeSize <= viewportBottom;
  }

  /**
   * Check if edge should be rendered at current viewport
   */
  private shouldRenderEdge(edge: FlowEdge, viewport: Viewport): boolean {
    // For now, render all edges - could be enhanced with viewport culling
    return true;
  }

  /**
   * Render content without LOD optimizations
   */
  private renderFullDetail(nodes: FlowNode[], edges: FlowEdge[]): LODContent {
    return {
      level: -1, // Full detail
      nodes: nodes as EnhancedFlowNode[],
      edges: edges as EnhancedFlowEdge[],
      bundles: [],
      metadata: {
        totalElements: nodes.length + edges.length,
        culledElements: 0,
        renderingTime: 0,
        memoryUsage: this.estimateMemoryUsage(nodes, edges, [])
      }
    };
  }

  /**
   * Estimate memory usage for rendered content
   */
  private estimateMemoryUsage(
    nodes: FlowNode[],
    edges: FlowEdge[],
    bundles: BundlePath[]
  ): number {
    // Rough estimation in MB
    const nodeMemory = nodes.length * 0.001; // ~1KB per node
    const edgeMemory = edges.length * 0.0005; // ~0.5KB per edge
    const bundleMemory = bundles.length * 0.002; // ~2KB per bundle
    
    return nodeMemory + edgeMemory + bundleMemory;
  }

  /**
   * Generate cache key for LOD content
   */
  private generateCacheKey(
    nodes: FlowNode[],
    edges: FlowEdge[],
    level: number,
    viewport: Viewport
  ): string {
    const nodeKey = nodes.length;
    const edgeKey = edges.length;
    const viewportKey = `${Math.round(viewport.zoom * 100)}_${Math.round(viewport.x)}_${Math.round(viewport.y)}`;
    
    return `${nodeKey}_${edgeKey}_${level}_${viewportKey}`;
  }

  /**
   * Clean up old cache entries to prevent memory leaks
   */
  private cleanupCache(): void {
    const maxCacheSize = 50;
    
    if (this.renderCache.size > maxCacheSize) {
      const entries = Array.from(this.renderCache.entries());
      const toDelete = entries.slice(0, entries.length - maxCacheSize);
      
      toDelete.forEach(([key]) => {
        this.renderCache.delete(key);
      });
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<LODConfig>): LODConfig {
    return {
      enabled: true,
      levels: DEFAULT_LOD_LEVELS,
      transitions: {
        enabled: true,
        duration: 300,
        easing: 'ease-out'
      },
      performance: {
        updateInterval: 16, // ~60 FPS
        useRAF: true,
        maxRenderNodes: 1000,
        useOffscreenCanvas: false
      },
      adaptive: {
        enabled: true,
        targetFPS: 30,
        minQuality: 0.3,
        qualityStep: 0.1
      },
      ...config
    };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LODConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.renderCache.clear();
  }

  /**
   * Get current LOD level
   */
  getCurrentLODLevel(): number {
    return this.currentLODLevel;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): LODPerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Clear render cache
   */
  clearCache(): void {
    this.renderCache.clear();
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): number {
    let totalMemory = 0;
    
    this.renderCache.forEach(content => {
      totalMemory += content.metadata.memoryUsage;
    });
    
    return totalMemory;
  }
}

/**
 * Performance monitor for LOD rendering
 */
class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fpsHistory: number[] = [];
  private targetFPS: number;
  
  constructor(targetFPS = 60) {
    this.targetFPS = targetFPS;
  }
  
  update(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.fpsHistory.push(fps);
      
      // Keep only recent FPS readings
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
    }
    
    this.frameCount++;
    this.lastTime = currentTime;
  }
  
  getMetrics(): LODPerformanceMetrics {
    const currentFPS = this.fpsHistory.length > 0 ? 
      this.fpsHistory[this.fpsHistory.length - 1] : 0;
    
    const averageFPS = this.fpsHistory.length > 0 ? 
      this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length : 0;
    
    return {
      currentFPS,
      averageFPS,
      renderTime: averageFPS > 0 ? 1000 / averageFPS : 0,
      memoryUsage: (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0,
      currentQuality: Math.min(1, averageFPS / this.targetFPS),
      levelSwitches: 0 // Would track LOD level changes
    };
  }
}

/**
 * Default LOD levels configuration
 */
const DEFAULT_LOD_LEVELS: LODLevel[] = [
  // Level 0: Minimum detail (zoom < 0.25)
  {
    zoomThreshold: 0.25,
    nodeRendering: {
      showLabels: false,
      showDetails: false,
      sizeMultiplier: 0.5,
      showIcons: false,
      labelFontSize: 8
    },
    edgeRendering: {
      showLabels: false,
      thicknessMultiplier: 0.5,
      showArrows: false,
      useBundling: true,
      simplifyPaths: true
    },
    groupRendering: {
      showBackgrounds: true,
      showLabels: false,
      autoCollapseThreshold: 5,
      detailLevel: 'minimal'
    }
  },
  
  // Level 1: Low detail (zoom 0.25-0.5)
  {
    zoomThreshold: 0.5,
    nodeRendering: {
      showLabels: true,
      showDetails: false,
      sizeMultiplier: 0.8,
      showIcons: false,
      labelFontSize: 10
    },
    edgeRendering: {
      showLabels: false,
      thicknessMultiplier: 0.7,
      showArrows: true,
      useBundling: true,
      simplifyPaths: false
    },
    groupRendering: {
      showBackgrounds: true,
      showLabels: true,
      autoCollapseThreshold: 10,
      detailLevel: 'basic'
    }
  },
  
  // Level 2: Medium detail (zoom 0.5-1.0)
  {
    zoomThreshold: 1.0,
    nodeRendering: {
      showLabels: true,
      showDetails: true,
      sizeMultiplier: 1.0,
      showIcons: true,
      labelFontSize: 12
    },
    edgeRendering: {
      showLabels: false,
      thicknessMultiplier: 1.0,
      showArrows: true,
      useBundling: false,
      simplifyPaths: false
    },
    groupRendering: {
      showBackgrounds: true,
      showLabels: true,
      autoCollapseThreshold: 20,
      detailLevel: 'detailed'
    }
  },
  
  // Level 3: High detail (zoom > 1.0)
  {
    zoomThreshold: 2.0,
    nodeRendering: {
      showLabels: true,
      showDetails: true,
      sizeMultiplier: 1.2,
      showIcons: true,
      labelFontSize: 14
    },
    edgeRendering: {
      showLabels: true,
      thicknessMultiplier: 1.2,
      showArrows: true,
      useBundling: false,
      simplifyPaths: false
    },
    groupRendering: {
      showBackgrounds: true,
      showLabels: true,
      autoCollapseThreshold: 50,
      detailLevel: 'detailed'
    }
  }
];

/**
 * Convenience function to create LOD renderer
 */
export function createLODRenderer(
  config?: Partial<LODConfig>,
  edgeBundling?: EdgeBundlingSystem
): LODRenderer {
  return new LODRenderer(config, edgeBundling);
}

/**
 * LOD renderer presets for different use cases
 */
export const LOD_PRESETS = {
  HIGH_PERFORMANCE: {
    enabled: true,
    performance: {
      maxRenderNodes: 200,
      updateInterval: 33 // 30 FPS
    },
    adaptive: {
      enabled: true,
      targetFPS: 30,
      minQuality: 0.2
    }
  },
  
  HIGH_QUALITY: {
    enabled: true,
    performance: {
      maxRenderNodes: 2000,
      updateInterval: 16 // 60 FPS
    },
    adaptive: {
      enabled: false
    }
  },
  
  BALANCED: {
    enabled: true,
    performance: {
      maxRenderNodes: 1000,
      updateInterval: 20 // 50 FPS
    },
    adaptive: {
      enabled: true,
      targetFPS: 45
    }
  }
} as const;