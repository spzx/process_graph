/**
 * GraphLayoutManager - Main orchestrator for dependency-aware graph layout
 * 
 * This class coordinates all layout components to provide a unified, high-level
 * interface for graph layout processing. It manages the complete workflow from
 * dependency analysis through final positioning and validation.
 */

import { FlowNode } from '../types';
import { DependencyAnalyzer, DependencyAnalysisResult } from './dependencyAnalyzer';
import { CycleHandler, CycleDetectionResult, CycleBreakingResult } from './cycleHandler';
import { LayeringEngine, LayeringResult, LayeringOptions } from './layeringEngine';
import { PositioningEngine, PositioningResult, PositioningOptions } from './positioningEngine';
import { LayoutValidator, ValidationResult, ValidationOptions } from './layoutValidator';

export interface LayoutOptions {
  // Dependency analysis options
  enableDependencyAnalysis: boolean;
  
  // Cycle handling options
  cycleHandling: 'break' | 'highlight' | 'ignore';
  
  // Layering options
  layering: Partial<LayeringOptions>;
  
  // Positioning options
  positioning: Partial<PositioningOptions>;
  
  // Validation options
  validation: Partial<ValidationOptions>;
  
  // General options
  optimization: 'speed' | 'quality' | 'balanced';
  preserveUserPositions: boolean;
  debugMode: boolean;
}

export interface LayoutResult {
  nodes: FlowNode[];
  metadata: LayoutMetadata;
  performance: PerformanceMetrics;
  recommendations: string[];
  warnings: string[];
  debug?: DebugInformation;
}

export interface LayoutMetadata {
  processedNodes: number;
  totalLayers: number;
  cyclesDetected: number;
  cyclesBroken: number;
  layoutDimensions: {
    width: number;
    height: number;
  };
  quality: {
    dependencyCompliance: number;
    visualQuality: number;
    overallScore: number;
  };
}

export interface PerformanceMetrics {
  totalTime: number; // milliseconds
  stageTimings: {
    dependencyAnalysis: number;
    cycleHandling: number;
    layering: number;
    positioning: number;
    validation: number;
  };
  memoryUsage?: {
    peak: number;
    final: number;
  };
}

export interface DebugInformation {
  dependencyAnalysis: DependencyAnalysisResult;
  cycleDetection: CycleDetectionResult;
  cycleBreaking?: CycleBreakingResult;
  layering: LayeringResult;
  positioning: PositioningResult;
  validation: ValidationResult;
}

export class GraphLayoutManager {
  private dependencyAnalyzer: DependencyAnalyzer;
  private cycleHandler: CycleHandler;
  private layeringEngine: LayeringEngine;
  private positioningEngine: PositioningEngine;
  private layoutValidator: LayoutValidator;
  private debugMode: boolean;

  constructor(options: Partial<LayoutOptions> = {}) {
    const defaultOptions: LayoutOptions = {
      enableDependencyAnalysis: true,
      cycleHandling: 'break',
      layering: {
        optimizeBalance: true,
        preserveUserHints: false,
        maxLayerWidth: 8,
        layerSpacing: 350
      },
      positioning: {
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
        minimizeEdgeCrossings: true
      },
      validation: {
        strictDependencyChecking: true,
        allowMinorOverlaps: false,
        toleranceThreshold: 5,
        performanceThresholds: {
          maxNodes: 200,
          maxEdgeCrossings: 10,
          maxLayerWidth: 8
        }
      },
      optimization: 'balanced',
      preserveUserPositions: false,
      debugMode: false
    };

    const mergedOptions = this.mergeOptions(defaultOptions, options);
    this.debugMode = mergedOptions.debugMode;

    // Initialize all components with appropriate options
    this.dependencyAnalyzer = new DependencyAnalyzer(this.debugMode);
    this.cycleHandler = new CycleHandler(this.debugMode);
    this.layeringEngine = new LayeringEngine(mergedOptions.layering, this.debugMode);
    this.positioningEngine = new PositioningEngine(mergedOptions.positioning, this.debugMode);
    this.layoutValidator = new LayoutValidator(mergedOptions.validation, this.debugMode);

    this.log('🚀 GraphLayoutManager initialized with options:', mergedOptions.optimization, 'optimization');
  }

  /**
   * Main method to process a graph and return positioned nodes
   */
  public async processGraph(
    nodes: FlowNode[],
    options?: Partial<LayoutOptions>
  ): Promise<LayoutResult> {
    const startTime = performance.now();
    const stageTimings = {
      dependencyAnalysis: 0,
      cycleHandling: 0,
      layering: 0,
      positioning: 0,
      validation: 0
    };

    this.log('🎯 Starting graph layout processing with', nodes.length, 'nodes');

    try {
      // Apply runtime options if provided
      if (options) {
        this.applyRuntimeOptions(options);
      }

      // Stage 1: Dependency Analysis
      let stageStart = performance.now();
      this.log('📊 Stage 1: Dependency Analysis');
      const dependencyResult = this.dependencyAnalyzer.buildDependencyGraph(nodes);
      stageTimings.dependencyAnalysis = performance.now() - stageStart;

      // Stage 2: Cycle Detection and Handling
      stageStart = performance.now();
      this.log('🔄 Stage 2: Cycle Detection and Handling');
      const cycleDetection = this.cycleHandler.detectCycles(dependencyResult.graph);
      
      let cycleBreaking: CycleBreakingResult | undefined;
      if (cycleDetection.hasCycles) {
        this.log(`  Found ${cycleDetection.cycles.length} cycles, applying breaking strategy...`);
        cycleBreaking = this.cycleHandler.breakCycles(dependencyResult.graph, cycleDetection.cycles);
      }
      stageTimings.cycleHandling = performance.now() - stageStart;

      // Stage 3: Layer Assignment
      stageStart = performance.now();
      this.log('🏗️ Stage 3: Layer Assignment');
      const layeringResult = this.layeringEngine.assignLayers(
        dependencyResult.graph,
        dependencyResult.longestPaths,
        cycleBreaking
      );
      stageTimings.layering = performance.now() - stageStart;

      // Stage 4: Node Positioning
      stageStart = performance.now();
      this.log('📐 Stage 4: Node Positioning');
      const positioningResult = this.positioningEngine.positionNodes(
        layeringResult.assignment,
        dependencyResult.graph
      );
      stageTimings.positioning = performance.now() - stageStart;

      // Stage 5: Layout Validation
      stageStart = performance.now();
      this.log('🔍 Stage 5: Layout Validation');
      // Use the modified graph from cycle breaking if available, otherwise use original graph
      const graphForValidation = cycleBreaking?.modifiedGraph || dependencyResult.graph;
      const validationResult = this.layoutValidator.validateLayout(
        graphForValidation,
        layeringResult.assignment,
        positioningResult.positions
      );
      stageTimings.validation = performance.now() - stageStart;

      // Apply positions to original nodes
      const positionedNodes = this.applyPositionsToNodes(nodes, positioningResult.positions.nodes);

      // Calculate final metrics
      const totalTime = performance.now() - startTime;
      const metadata = this.createLayoutMetadata(
        nodes,
        layeringResult,
        positioningResult,
        validationResult,
        cycleDetection,
        cycleBreaking
      );

      const performance_metrics: PerformanceMetrics = {
        totalTime,
        stageTimings
      };

      // Compile recommendations and warnings
      const recommendations = this.compileRecommendations(
        dependencyResult,
        cycleDetection,
        layeringResult,
        positioningResult,
        validationResult
      );

      const warnings = this.compileWarnings(
        dependencyResult,
        cycleDetection,
        layeringResult,
        positioningResult,
        validationResult
      );

      // Create debug information if requested
      const debug = this.debugMode ? {
        dependencyAnalysis: dependencyResult,
        cycleDetection,
        cycleBreaking,
        layering: layeringResult,
        positioning: positioningResult,
        validation: validationResult
      } : undefined;

      const result: LayoutResult = {
        nodes: positionedNodes,
        metadata,
        performance: performance_metrics,
        recommendations,
        warnings,
        debug
      };

      this.log('✅ Graph layout processing complete');
      this.logProcessingSummary(result);

      return result;

    } catch (error) {
      this.log('🚨 Error during graph layout processing:', error);
      throw new Error(`Graph layout processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates a graph without performing full layout
   */
  public validateGraph(nodes: FlowNode[]): ValidationResult {
    this.log('🔍 Quick graph validation...');
    
    const dependencyResult = this.dependencyAnalyzer.buildDependencyGraph(nodes);
    
    // Create minimal positioning for validation
    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, index) => {
      positions.set(node.id, { x: index * 300, y: 100 });
    });

    const mockPositionedNodes = {
      nodes: positions,
      boundingBox: { minX: 0, maxX: nodes.length * 300, minY: 0, maxY: 300, width: nodes.length * 300, height: 300 },
      metrics: {
        totalWidth: nodes.length * 300,
        totalHeight: 300,
        layerWidths: new Map(),
        layerHeights: new Map(),
        edgeCrossings: 0,
        spacingUtilization: 0.5
      }
    };

    const mockLayerAssignment = {
      layers: new Map([[0, nodes.map(n => n.id)]]),
      nodeToLayer: new Map(nodes.map(n => [n.id, 0])),
      maxLayer: 0,
      layerMetrics: {
        totalLayers: 1,
        averageNodesPerLayer: nodes.length,
        maxNodesInLayer: nodes.length,
        layerDistribution: [nodes.length],
        balanceScore: 1.0
      }
    };

    return this.layoutValidator.validateLayout(
      dependencyResult.graph,
      mockLayerAssignment,
      mockPositionedNodes
    );
  }

  /**
   * Applies positions from the positioning engine to the original nodes
   */
  private applyPositionsToNodes(
    originalNodes: FlowNode[],
    positions: Map<string, { x: number; y: number }>
  ): FlowNode[] {
    return originalNodes.map(node => {
      const position = positions.get(node.id);
      if (!position) {
        this.log(`⚠️ No position found for node ${node.id}, using default`);
        return { ...node, position: { x: 0, y: 0 } };
      }

      return {
        ...node,
        position: {
          x: position.x,
          y: position.y
        }
      };
    });
  }

  /**
   * Creates comprehensive layout metadata
   */
  private createLayoutMetadata(
    nodes: FlowNode[],
    layeringResult: LayeringResult,
    positioningResult: PositioningResult,
    validationResult: ValidationResult,
    cycleDetection: CycleDetectionResult,
    cycleBreaking?: CycleBreakingResult
  ): LayoutMetadata {
    return {
      processedNodes: nodes.length,
      totalLayers: layeringResult.assignment.layerMetrics.totalLayers,
      cyclesDetected: cycleDetection.cycles.length,
      cyclesBroken: cycleBreaking?.cyclesSolved.length || 0,
      layoutDimensions: {
        width: positioningResult.positions.boundingBox.width,
        height: positioningResult.positions.boundingBox.height
      },
      quality: {
        dependencyCompliance: validationResult.metrics.dependencyCompliance,
        visualQuality: validationResult.metrics.visualQuality,
        overallScore: validationResult.metrics.overallScore
      }
    };
  }

  /**
   * Compiles recommendations from all processing stages
   */
  private compileRecommendations(
    dependencyResult: DependencyAnalysisResult,
    cycleDetection: CycleDetectionResult,
    layeringResult: LayeringResult,
    positioningResult: PositioningResult,
    validationResult: ValidationResult
  ): string[] {
    const recommendations: string[] = [];

    // Add stage-specific recommendations
    recommendations.push(...cycleDetection.recommendations);
    recommendations.push(...layeringResult.recommendations);
    recommendations.push(...positioningResult.recommendations);
    recommendations.push(...validationResult.suggestions.map(s => `${s.title}: ${s.description}`));

    // Add overall recommendations
    if (validationResult.score > 0.8) {
      recommendations.unshift('✅ Excellent layout quality achieved');
    } else if (validationResult.score > 0.6) {
      recommendations.unshift('👍 Good layout quality achieved');
    } else {
      recommendations.unshift('⚠️ Layout quality could be improved - review suggestions');
    }

    return recommendations;
  }

  /**
   * Compiles warnings from all processing stages
   */
  private compileWarnings(
    dependencyResult: DependencyAnalysisResult,
    cycleDetection: CycleDetectionResult,
    layeringResult: LayeringResult,
    positioningResult: PositioningResult,
    validationResult: ValidationResult
  ): string[] {
    const warnings: string[] = [];

    // Add critical issues from dependency analysis
    dependencyResult.issues.forEach(issue => {
      if (issue.severity === 'error') {
        warnings.push(`🚨 ${issue.description}`);
      }
    });

    // Add cycle complexity warnings
    if (cycleDetection.complexity === 'critical') {
      warnings.push('🚨 Critical cycle complexity detected - consider workflow redesign');
    }

    // Add layering warnings
    layeringResult.warnings.forEach(warning => {
      if (warning.severity === 'high') {
        warnings.push(`⚠️ ${warning.message}`);
      }
    });

    // Add positioning warnings
    positioningResult.warnings.forEach(warning => {
      if (warning.severity === 'high') {
        warnings.push(`⚠️ ${warning.message}`);
      }
    });

    // Add validation errors
    validationResult.errors.forEach(error => {
      if (error.severity === 'critical') {
        warnings.push(`🚨 ${error.message}`);
      }
    });

    return warnings;
  }

  /**
   * Applies runtime options to engines
   */
  private applyRuntimeOptions(options: Partial<LayoutOptions>): void {
    // This would update engine configurations at runtime
    // For now, log that options were applied
    this.log('🔧 Applied runtime options');
  }

  /**
   * Merges default and user options
   */
  private mergeOptions(defaults: LayoutOptions, overrides: Partial<LayoutOptions>): LayoutOptions {
    return {
      ...defaults,
      ...overrides,
      layering: { ...defaults.layering, ...overrides.layering },
      positioning: { ...defaults.positioning, ...overrides.positioning },
      validation: { ...defaults.validation, ...overrides.validation }
    };
  }

  /**
   * Logs processing summary
   */
  private logProcessingSummary(result: LayoutResult): void {
    this.log('📊 Processing Summary:');
    this.log(`  Nodes: ${result.metadata.processedNodes}`);
    this.log(`  Layers: ${result.metadata.totalLayers}`);
    this.log(`  Cycles: ${result.metadata.cyclesDetected} detected, ${result.metadata.cyclesBroken} broken`);
    this.log(`  Dimensions: ${result.metadata.layoutDimensions.width.toFixed(0)}x${result.metadata.layoutDimensions.height.toFixed(0)}`);
    this.log(`  Quality: ${(result.metadata.quality.overallScore * 100).toFixed(1)}%`);
    this.log(`  Total time: ${result.performance.totalTime.toFixed(1)}ms`);
    this.log(`  Recommendations: ${result.recommendations.length}`);
    this.log(`  Warnings: ${result.warnings.length}`);
  }

  /**
   * Utility method for conditional logging
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[GraphLayoutManager]', ...args);
    }
  }
}