/**
 * Core types and interfaces for the Multi-Algorithm Layout Engine
 * 
 * This file defines all the fundamental types, interfaces, and configurations
 * required for the advanced graph visualization layout system.
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';

// =============================================================================
// CORE LAYOUT INTERFACES
// =============================================================================

/**
 * Base interface for all layout algorithms
 */
export interface LayoutAlgorithm {
  /** Unique identifier for the algorithm */
  name: string;
  
  /** Human-readable display name */
  displayName: string;
  
  /** Brief description of the algorithm */
  description: string;
  
  /** Calculate suitability score (0-1) for given graph metrics */
  suitability: (metrics: GraphMetrics) => number;
  
  /** Execute the layout algorithm */
  calculate: (
    nodes: FlowNode[], 
    edges: FlowEdge[], 
    config?: LayoutConfig
  ) => Promise<LayoutResult>;
  
  /** Get default configuration for this algorithm */
  getDefaultConfig: () => LayoutConfig;
  
  /** Validate if the algorithm can handle the given graph */
  canHandle: (metrics: GraphMetrics) => boolean;
}

/**
 * Graph characteristics used for algorithm selection
 */
export interface GraphMetrics {
  /** Total number of nodes */
  nodeCount: number;
  
  /** Total number of edges */
  edgeCount: number;
  
  /** Graph density (edges / max_possible_edges) */
  density: number;
  
  /** Number of distinct groups */
  groupCount: number;
  
  /** Largest group size */
  maxGroupSize: number;
  
  /** Average group size */
  avgGroupSize: number;
  
  /** Whether the graph has circular dependencies */
  hasCircularDependencies: boolean;
  
  /** Average node connectivity (avg edges per node) */
  averageConnectivity: number;
  
  /** Maximum node connectivity */
  maxConnectivity: number;
  
  /** Graph diameter (longest shortest path) */
  diameter: number;
  
  /** Clustering coefficient */
  clusteringCoefficient: number;
  
  /** Whether the graph is directed */
  isDirected: boolean;
  
  /** Number of strongly connected components */
  stronglyConnectedComponents: number;
}

/**
 * Configuration options for layout algorithms
 */
export interface LayoutConfig {
  /** Algorithm-specific parameters */
  [key: string]: any;
  
  /** Common parameters */
  nodeSpacing?: number;
  layerSpacing?: number;
  edgeLength?: number;
  iterations?: number;
  optimize?: 'speed' | 'quality' | 'balanced';
  
  /** Group-related parameters */
  groupSpacing?: number;
  groupPadding?: number;
  maintainGroupIntegrity?: boolean;
  
  /** Layout direction (for hierarchical layouts) */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  
  /** Animation settings */
  animated?: boolean;
  animationDuration?: number;
}

/**
 * Result of a layout calculation
 */
export interface LayoutResult {
  /** Positioned nodes */
  nodes: FlowNode[];
  
  /** Layout metadata and statistics */
  metadata: LayoutMetadata;
  
  /** Performance metrics */
  performance: PerformanceMetrics;
  
  /** Quality assessment */
  quality: QualityMetrics;
  
  /** Recommendations for improvement */
  recommendations: string[];
  
  /** Warnings or issues */
  warnings: string[];
  
  /** Debug information (if enabled) */
  debug?: DebugInformation;
}

// =============================================================================
// METADATA AND METRICS
// =============================================================================

/**
 * Layout metadata and statistics
 */
export interface LayoutMetadata {
  /** Algorithm used */
  algorithm: string;
  
  /** Number of nodes processed */
  processedNodes: number;
  
  /** Number of edges processed */
  processedEdges: number;
  
  /** Layout dimensions */
  layoutDimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  
  /** Number of layout layers/levels */
  totalLayers?: number;
  
  /** Group information */
  groupInfo: {
    totalGroups: number;
    averageGroupSize: number;
    maxGroupSize: number;
  };
  
  /** Cycle information */
  cycleInfo: {
    cyclesDetected: number;
    cyclesBroken: number;
    cycleBreakingStrategy?: string;
  };
}

/**
 * Performance metrics for layout calculations
 */
export interface PerformanceMetrics {
  /** Total execution time in milliseconds */
  totalTime: number;
  
  /** Time breakdown by phase */
  phaseTimings: {
    preprocessing: number;
    calculation: number;
    postprocessing: number;
    [phase: string]: number;
  };
  
  /** Memory usage statistics */
  memoryUsage?: {
    peakMB: number;
    finalMB: number;
  };
  
  /** Performance rating (1-5, 5 being best) */
  performanceRating: number;
  
  /** Whether performance thresholds were met */
  meetsThresholds: boolean;
}

/**
 * Layout quality assessment
 */
export interface QualityMetrics {
  /** Overall quality score (0-100) */
  overallScore: number;
  
  /** Individual quality measures */
  measures: {
    /** How well dependencies are respected (0-100) */
    dependencyCompliance: number;
    
    /** Visual clarity and readability (0-100) */
    visualClarity: number;
    
    /** Effective use of space (0-100) */
    spaceUtilization: number;
    
    /** Group organization quality (0-100) */
    groupOrganization: number;
    
    /** Edge crossing minimization (0-100) */
    edgeCrossings: number;
    
    /** Node overlap prevention (0-100) */
    nodeOverlaps: number;
  };
  
  /** Areas needing improvement */
  improvementAreas: string[];
}

/**
 * Debug information for layout algorithms
 */
export interface DebugInformation {
  /** Algorithm-specific debug data */
  [key: string]: any;
  
  /** Step-by-step execution trace */
  executionTrace?: ExecutionStep[];
  
  /** Intermediate results */
  intermediateResults?: {
    stepName: string;
    nodes: FlowNode[];
    timestamp: number;
  }[];
}

/**
 * Execution step for debugging
 */
export interface ExecutionStep {
  step: number;
  name: string;
  description: string;
  duration: number;
  result: any;
}

// =============================================================================
// GROUPING SYSTEM INTERFACES
// =============================================================================

/**
 * A cluster of related nodes
 */
export interface GroupCluster {
  /** Unique group identifier */
  id: string;
  
  /** Group display name */
  name: string;
  
  /** Nodes in this group */
  nodes: FlowNode[];
  
  /** Group bounding box */
  bounds: Rectangle;
  
  /** Group center position */
  center: Position;
  
  /** Group metadata */
  metadata: {
    /** How this group was detected */
    detectionMethod: string;
    
    /** Confidence in grouping (0-1) */
    confidence: number;
    
    /** Group characteristics */
    characteristics: string[];
  };
  
  /** Whether group is collapsed */
  collapsed?: boolean;
  
  /** Parent group (for hierarchical grouping) */
  parentGroup?: string;
  
  /** Child groups (for hierarchical grouping) */
  childGroups?: string[];
}

/**
 * Grouping strategy interface
 */
export interface GroupingStrategy {
  /** Strategy name */
  name: string;
  
  /** Strategy display name */
  displayName: string;
  
  /** Strategy description */
  description: string;
  
  /** Priority for strategy selection */
  priority: number;
  
  /** Detect groups in the given graph */
  detectGroups: (nodes: FlowNode[], edges: FlowEdge[]) => Promise<GroupCluster[]>;
  
  /** Whether this strategy can handle the graph */
  canHandle: (metrics: GraphMetrics) => boolean;
}

// =============================================================================
// NAVIGATION AND INTERACTION
// =============================================================================

/**
 * Viewport information
 */
export interface Viewport {
  /** Current center position */
  center: Position;
  
  /** Current zoom level */
  zoom: number;
  
  /** Viewport dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  
  /** Visible area bounds */
  bounds: Rectangle;
}

/**
 * Navigation animation configuration
 */
export interface NavigationAnimation {
  /** Target position or node ID */
  target: Position | string;
  
  /** Target zoom level */
  zoom?: number;
  
  /** Animation duration in milliseconds */
  duration?: number;
  
  /** Animation easing function */
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Zoom level configuration for LOD rendering
 */
export interface ZoomLevel {
  /** Zoom threshold */
  zoom: number;
  
  /** Node detail level */
  nodeDetail: 'minimal' | 'basic' | 'detailed' | 'full';
  
  /** Edge detail level */
  edgeDetail: 'hidden' | 'straight' | 'curved' | 'decorated';
  
  /** Label visibility (0-1) */
  labelVisibility: number;
  
  /** Whether animations are enabled at this level */
  animationEnabled: boolean;
}

// =============================================================================
// PERFORMANCE OPTIMIZATION
// =============================================================================

/**
 * Viewport culling configuration
 */
export interface CullingConfig {
  /** Buffer multiplier for viewport bounds */
  bufferMultiplier: number;
  
  /** Enable predictive loading */
  predictiveLoading: boolean;
  
  /** Radius for predictive loading */
  loadingRadius: number;
  
  /** Distance at which to unload elements */
  unloadDistance: number;
}

/**
 * Culling operation result
 */
export interface CullingResult {
  /** Elements currently visible */
  visible: string[];
  
  /** Elements to load */
  toLoad: string[];
  
  /** Elements to unload */
  toUnload: string[];
  
  /** Culling performance metrics */
  metrics: {
    totalElements: number;
    visibleElements: number;
    culledElements: number;
    cullingRatio: number;
  };
}

/**
 * Edge bundling configuration
 */
export interface EdgeBundlingConfig {
  /** Bundling algorithm */
  algorithm: 'force' | 'hierarchical' | 'geometric';
  
  /** Threshold for bundling edges */
  bundleThreshold: number;
  
  /** Curve strength (0-1) */
  curveStrength: number;
  
  /** Number of subdivisions for curves */
  subdivisions: number;
  
  /** Compatibility function for edge bundling */
  compatibility?: (edge1: FlowEdge, edge2: FlowEdge) => number;
}

/**
 * Bundled edge result
 */
export interface BundledEdge {
  /** Edge ID */
  id: string;
  
  /** Source node ID */
  source: string;
  
  /** Target node ID */
  target: string;
  
  /** Edge type */
  type?: string;
  
  /** Edge data */
  data?: any;
  
  /** Original edges that were bundled */
  originalEdges: string[];
  
  /** Control points for the bundled path */
  controlPoints: Position[];
  
  /** Bundle metadata */
  bundleMetadata: {
    bundleId: string;
    bundleSize: number;
    bundleStrength: number;
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * 2D position
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Rectangle bounds
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Node size configuration
 */
export interface NodeSize {
  width: number;
  height: number | {
    default: number;
    [nodeType: string]: number;
  };
}

/**
 * Color configuration
 */
export interface ColorConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
}

// =============================================================================
// ALGORITHM SELECTION
// =============================================================================

/**
 * Algorithm selection criteria
 */
export interface AlgorithmSelectionCriteria {
  /** Graph metrics */
  metrics: GraphMetrics;
  
  /** User preferences */
  preferences: {
    prioritizeSpeed?: boolean;
    prioritizeQuality?: boolean;
    preferredAlgorithm?: string;
  };
  
  /** Performance constraints */
  constraints: {
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
  };
}

/**
 * Algorithm selection result
 */
export interface AlgorithmSelectionResult {
  /** Selected algorithm */
  algorithm: LayoutAlgorithm;
  
  /** Confidence in selection (0-1) */
  confidence: number;
  
  /** Reasoning for selection */
  reasoning: string[];
  
  /** Alternative algorithms considered */
  alternatives: {
    algorithm: LayoutAlgorithm;
    suitabilityScore: number;
    reason: string;
  }[];
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Layout error types
 */
export type LayoutErrorType = 
  | 'INVALID_INPUT'
  | 'ALGORITHM_FAILURE'
  | 'PERFORMANCE_TIMEOUT'
  | 'MEMORY_EXCEEDED'
  | 'UNSUPPORTED_GRAPH'
  | 'CONFIGURATION_ERROR';

/**
 * Layout error information
 */
export interface LayoutError extends Error {
  type: LayoutErrorType;
  algorithm?: string;
  context: {
    nodeCount: number;
    edgeCount: number;
    timestamp: number;
  };
  suggestions: string[];
}