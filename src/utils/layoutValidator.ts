/**
 * LayoutValidator - Comprehensive validation for dependency-aware graph layouts
 * 
 * This class performs thorough validation of layout results, ensuring that
 * dependency relationships are respected, coordinates are valid, spacing
 * rules are followed, and the overall layout meets quality standards.
 */

import { DependencyGraph } from './dependencyAnalyzer';
import { LayerAssignment } from './layeringEngine';
import { PositionedNodes, Position } from './positioningEngine';
import { FlowNode } from '../types';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1, higher is better
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: LayoutSuggestion[];
  metrics: ValidationMetrics;
}

export interface ValidationError {
  type: 'dependency_violation' | 'coordinate_invalid' | 'overlap' | 'spacing_violation' | 'bounds_violation';
  message: string;
  nodeIds: string[];
  severity: 'critical' | 'high' | 'medium';
  fixable: boolean;
}

export interface ValidationWarning {
  type: 'suboptimal_spacing' | 'edge_crossing' | 'unbalanced_layers' | 'performance_concern';
  message: string;
  nodeIds: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface LayoutSuggestion {
  type: 'optimization' | 'configuration' | 'workflow_improvement';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImprovement: number; // 0-1
}

export interface ValidationMetrics {
  dependencyCompliance: number; // 0-1
  coordinateValidity: number; // 0-1
  spacingCompliance: number; // 0-1
  layoutEfficiency: number; // 0-1
  visualQuality: number; // 0-1
  overallScore: number; // 0-1
}

export interface ValidationOptions {
  strictDependencyChecking: boolean;
  allowMinorOverlaps: boolean;
  toleranceThreshold: number; // Pixel tolerance for spacing checks
  performanceThresholds: {
    maxNodes: number;
    maxEdgeCrossings: number;
    maxLayerWidth: number;
  };
}

export class LayoutValidator {
  private debugMode: boolean;
  private options: ValidationOptions;

  constructor(options: Partial<ValidationOptions> = {}, debugMode = false) {
    this.debugMode = debugMode;
    this.options = {
      strictDependencyChecking: true,
      allowMinorOverlaps: false,
      toleranceThreshold: 5,
      performanceThresholds: {
        maxNodes: 200,
        maxEdgeCrossings: 10,
        maxLayerWidth: 8
      },
      ...options
    };
  }

  /**
   * Validates the complete layout result
   */
  public validateLayout(
    graph: DependencyGraph,
    layerAssignment: LayerAssignment,
    positionedNodes: PositionedNodes
  ): ValidationResult {
    this.log('🔍 Starting comprehensive layout validation...');

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: LayoutSuggestion[] = [];

    // Core validation checks
    const dependencyErrors = this.validateDependencyFlow(graph, positionedNodes);
    const coordinateErrors = this.validateCoordinates(positionedNodes);
    const spacingErrors = this.validateSpacing(positionedNodes);
    const boundsErrors = this.validateBounds(positionedNodes);

    errors.push(...dependencyErrors, ...coordinateErrors, ...spacingErrors, ...boundsErrors);

    // Warning checks
    const spacingWarnings = this.checkSpacingOptimization(positionedNodes);
    const layerWarnings = this.checkLayerBalance(layerAssignment);
    const performanceWarnings = this.checkPerformanceConcerns(graph, positionedNodes);

    warnings.push(...spacingWarnings, ...layerWarnings, ...performanceWarnings);

    // Generate suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(errors, warnings);
    const configurationSuggestions = this.generateConfigurationSuggestions(positionedNodes);

    suggestions.push(...optimizationSuggestions, ...configurationSuggestions);

    // Calculate metrics
    const metrics = this.calculateValidationMetrics(graph, layerAssignment, positionedNodes, errors, warnings);

    // Determine overall validity
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const isValid = criticalErrors.length === 0;

    this.log(`✅ Validation complete. Valid: ${isValid}, Score: ${metrics.overallScore.toFixed(2)}`);
    this.logValidationSummary(errors, warnings, suggestions);

    return {
      isValid,
      score: metrics.overallScore,
      errors,
      warnings,
      suggestions,
      metrics
    };
  }

  /**
   * Validates that dependency relationships are respected in positioning
   */
  private validateDependencyFlow(
    graph: DependencyGraph,
    positionedNodes: PositionedNodes
  ): ValidationError[] {
    this.log('🔄 Validating dependency flow...');
    
    const errors: ValidationError[] = [];

    graph.edges.forEach(edge => {
      const sourcePos = positionedNodes.nodes.get(edge.source);
      const targetPos = positionedNodes.nodes.get(edge.target);

      if (!sourcePos || !targetPos) {
        errors.push({
          type: 'dependency_violation',
          message: `Missing position for dependency edge ${edge.source} -> ${edge.target}`,
          nodeIds: [edge.source, edge.target],
          severity: 'critical',
          fixable: false
        });
        return;
      }

      // Source should be to the left of target (smaller X coordinate)
      if (sourcePos.x >= targetPos.x) {
        const violation = this.options.strictDependencyChecking ? 'critical' : 'high';
        errors.push({
          type: 'dependency_violation',
          message: `Dependency violation: ${edge.source} (x=${sourcePos.x}) should be left of ${edge.target} (x=${targetPos.x})`,
          nodeIds: [edge.source, edge.target],
          severity: violation,
          fixable: true
        });
      }
    });

    this.log(`📊 Found ${errors.length} dependency violations`);
    return errors;
  }

  /**
   * Validates that all coordinates are valid and within expected ranges
   */
  private validateCoordinates(positionedNodes: PositionedNodes): ValidationError[] {
    this.log('📐 Validating coordinates...');
    
    const errors: ValidationError[] = [];

    positionedNodes.nodes.forEach((position, nodeId) => {
      // Check for negative coordinates
      if (position.x < 0 || position.y < 0) {
        errors.push({
          type: 'coordinate_invalid',
          message: `Node ${nodeId} has negative coordinates: (${position.x}, ${position.y})`,
          nodeIds: [nodeId],
          severity: 'high',
          fixable: true
        });
      }

      // Check for NaN or infinite coordinates
      if (!isFinite(position.x) || !isFinite(position.y)) {
        errors.push({
          type: 'coordinate_invalid',
          message: `Node ${nodeId} has invalid coordinates: (${position.x}, ${position.y})`,
          nodeIds: [nodeId],
          severity: 'critical',
          fixable: true
        });
      }

      // Check for extremely large coordinates (potential layout issue)
      if (position.x > 10000 || position.y > 10000) {
        errors.push({
          type: 'coordinate_invalid',
          message: `Node ${nodeId} has unusually large coordinates: (${position.x}, ${position.y})`,
          nodeIds: [nodeId],
          severity: 'medium',
          fixable: true
        });
      }
    });

    this.log(`📊 Found ${errors.length} coordinate issues`);
    return errors;
  }

  /**
   * Validates spacing between nodes
   */
  private validateSpacing(positionedNodes: PositionedNodes): ValidationError[] {
    this.log('📏 Validating node spacing...');
    
    const errors: ValidationError[] = [];
    const positions = Array.from(positionedNodes.nodes.entries());
    const tolerance = this.options.toleranceThreshold;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const [nodeIdA, posA] = positions[i];
        const [nodeIdB, posB] = positions[j];

        const distance = Math.sqrt(
          Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2)
        );

        // Check for overlapping nodes (assuming 280x220 node size)
        const minDistance = 150; // Minimum safe distance

        if (distance < minDistance - tolerance) {
          const severity = distance < minDistance / 2 ? 'critical' : 'high';
          errors.push({
            type: 'overlap',
            message: `Nodes ${nodeIdA} and ${nodeIdB} are too close (distance: ${distance.toFixed(1)}px, minimum: ${minDistance}px)`,
            nodeIds: [nodeIdA, nodeIdB],
            severity,
            fixable: true
          });
        }
      }
    }

    this.log(`📊 Found ${errors.length} spacing violations`);
    return errors;
  }

  /**
   * Validates that all nodes are within reasonable bounds
   */
  private validateBounds(positionedNodes: PositionedNodes): ValidationError[] {
    this.log('🎯 Validating layout bounds...');
    
    const errors: ValidationError[] = [];
    const { boundingBox } = positionedNodes;

    // Check for unreasonably large layout
    const maxReasonableWidth = 5000;
    const maxReasonableHeight = 3000;

    if (boundingBox.width > maxReasonableWidth) {
      errors.push({
        type: 'bounds_violation',
        message: `Layout width ${boundingBox.width.toFixed(0)}px exceeds reasonable limit (${maxReasonableWidth}px)`,
        nodeIds: [],
        severity: 'medium',
        fixable: true
      });
    }

    if (boundingBox.height > maxReasonableHeight) {
      errors.push({
        type: 'bounds_violation',
        message: `Layout height ${boundingBox.height.toFixed(0)}px exceeds reasonable limit (${maxReasonableHeight}px)`,
        nodeIds: [],
        severity: 'medium',
        fixable: true
      });
    }

    this.log(`📊 Found ${errors.length} bounds violations`);
    return errors;
  }

  /**
   * Checks for suboptimal spacing that could be improved
   */
  private checkSpacingOptimization(positionedNodes: PositionedNodes): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check space utilization
    if (positionedNodes.metrics.spacingUtilization < 0.5) {
      warnings.push({
        type: 'suboptimal_spacing',
        message: `Low space utilization (${(positionedNodes.metrics.spacingUtilization * 100).toFixed(1)}%) - consider tighter spacing`,
        nodeIds: [],
        impact: 'medium'
      });
    }

    return warnings;
  }

  /**
   * Checks for layer balance issues
   */
  private checkLayerBalance(layerAssignment: LayerAssignment): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    if (layerAssignment.layerMetrics.balanceScore < 0.6) {
      warnings.push({
        type: 'unbalanced_layers',
        message: `Unbalanced layer distribution (score: ${layerAssignment.layerMetrics.balanceScore.toFixed(2)})`,
        nodeIds: [],
        impact: 'medium'
      });
    }

    // Check for overly wide layers
    layerAssignment.layers.forEach((nodeIds, layerIndex) => {
      if (nodeIds.length > this.options.performanceThresholds.maxLayerWidth) {
        warnings.push({
          type: 'unbalanced_layers',
          message: `Layer ${layerIndex} has ${nodeIds.length} nodes (recommended max: ${this.options.performanceThresholds.maxLayerWidth})`,
          nodeIds: [...nodeIds],
          impact: 'high'
        });
      }
    });

    return warnings;
  }

  /**
   * Checks for performance-related concerns
   */
  private checkPerformanceConcerns(
    graph: DependencyGraph,
    positionedNodes: PositionedNodes
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check node count
    if (graph.nodes.size > this.options.performanceThresholds.maxNodes) {
      warnings.push({
        type: 'performance_concern',
        message: `Large graph (${graph.nodes.size} nodes) may impact rendering performance`,
        nodeIds: [],
        impact: 'medium'
      });
    }

    // Check edge crossings
    if (positionedNodes.metrics.edgeCrossings > this.options.performanceThresholds.maxEdgeCrossings) {
      warnings.push({
        type: 'edge_crossing',
        message: `High number of edge crossings (${positionedNodes.metrics.edgeCrossings}) affects readability`,
        nodeIds: [],
        impact: 'high'
      });
    }

    return warnings;
  }

  /**
   * Generates optimization suggestions based on errors and warnings
   */
  private generateOptimizationSuggestions(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): LayoutSuggestion[] {
    const suggestions: LayoutSuggestion[] = [];

    // Suggestions based on errors
    const dependencyViolations = errors.filter(e => e.type === 'dependency_violation');
    if (dependencyViolations.length > 0) {
      suggestions.push({
        type: 'optimization',
        title: 'Fix Dependency Flow',
        description: `Correct ${dependencyViolations.length} dependency violations by adjusting layer assignments`,
        priority: 'high',
        estimatedImprovement: 0.8
      });
    }

    const spacingIssues = errors.filter(e => e.type === 'overlap' || e.type === 'spacing_violation');
    if (spacingIssues.length > 0) {
      suggestions.push({
        type: 'optimization',
        title: 'Improve Node Spacing',
        description: `Adjust spacing parameters to resolve ${spacingIssues.length} spacing issues`,
        priority: 'medium',
        estimatedImprovement: 0.6
      });
    }

    // Suggestions based on warnings
    const edgeCrossingWarnings = warnings.filter(w => w.type === 'edge_crossing');
    if (edgeCrossingWarnings.length > 0) {
      suggestions.push({
        type: 'optimization',
        title: 'Minimize Edge Crossings',
        description: 'Enable edge crossing minimization for better readability',
        priority: 'medium',
        estimatedImprovement: 0.5
      });
    }

    const balanceWarnings = warnings.filter(w => w.type === 'unbalanced_layers');
    if (balanceWarnings.length > 0) {
      suggestions.push({
        type: 'optimization',
        title: 'Balance Layer Distribution',
        description: 'Redistribute nodes across layers for better visual balance',
        priority: 'low',
        estimatedImprovement: 0.3
      });
    }

    return suggestions;
  }

  /**
   * Generates configuration suggestions
   */
  private generateConfigurationSuggestions(positionedNodes: PositionedNodes): LayoutSuggestion[] {
    const suggestions: LayoutSuggestion[] = [];

    // Suggest spacing adjustments based on utilization
    if (positionedNodes.metrics.spacingUtilization < 0.4) {
      suggestions.push({
        type: 'configuration',
        title: 'Reduce Spacing Parameters',
        description: 'Consider reducing layer or node spacing for more compact layout',
        priority: 'low',
        estimatedImprovement: 0.2
      });
    } else if (positionedNodes.metrics.spacingUtilization > 0.9) {
      suggestions.push({
        type: 'configuration',
        title: 'Increase Spacing Parameters',
        description: 'Consider increasing spacing for better readability',
        priority: 'medium',
        estimatedImprovement: 0.4
      });
    }

    return suggestions;
  }

  /**
   * Calculates comprehensive validation metrics
   */
  private calculateValidationMetrics(
    graph: DependencyGraph,
    layerAssignment: LayerAssignment,
    positionedNodes: PositionedNodes,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): ValidationMetrics {
    // Dependency compliance (0-1)
    const dependencyErrors = errors.filter(e => e.type === 'dependency_violation');
    const dependencyCompliance = Math.max(0, 1 - (dependencyErrors.length / graph.edges.length));

    // Coordinate validity (0-1)
    const coordinateErrors = errors.filter(e => e.type === 'coordinate_invalid');
    const coordinateValidity = Math.max(0, 1 - (coordinateErrors.length / positionedNodes.nodes.size));

    // Spacing compliance (0-1)
    const spacingErrors = errors.filter(e => e.type === 'overlap' || e.type === 'spacing_violation');
    const maxPossibleSpacingIssues = (positionedNodes.nodes.size * (positionedNodes.nodes.size - 1)) / 2;
    const spacingCompliance = Math.max(0, 1 - (spacingErrors.length / maxPossibleSpacingIssues));

    // Layout efficiency (based on space utilization and layer balance)
    const layoutEfficiency = (positionedNodes.metrics.spacingUtilization + layerAssignment.layerMetrics.balanceScore) / 2;

    // Visual quality (inverse of edge crossings and warnings)
    const crossingPenalty = Math.min(1, positionedNodes.metrics.edgeCrossings / 20);
    const warningPenalty = Math.min(0.5, warnings.length / 10);
    const visualQuality = Math.max(0, 1 - crossingPenalty - warningPenalty);

    // Overall score (weighted average)
    const overallScore = (
      dependencyCompliance * 0.3 +
      coordinateValidity * 0.2 +
      spacingCompliance * 0.2 +
      layoutEfficiency * 0.15 +
      visualQuality * 0.15
    );

    return {
      dependencyCompliance,
      coordinateValidity,
      spacingCompliance,
      layoutEfficiency,
      visualQuality,
      overallScore
    };
  }

  /**
   * Logs validation summary for debugging
   */
  private logValidationSummary(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: LayoutSuggestion[]
  ): void {
    this.log('📊 Validation Summary:');
    this.log(`  Errors: ${errors.length} (Critical: ${errors.filter(e => e.severity === 'critical').length})`);
    this.log(`  Warnings: ${warnings.length} (High Impact: ${warnings.filter(w => w.impact === 'high').length})`);
    this.log(`  Suggestions: ${suggestions.length} (High Priority: ${suggestions.filter(s => s.priority === 'high').length})`);

    if (this.debugMode && errors.length > 0) {
      this.log('🚨 Errors:');
      errors.forEach(error => {
        this.log(`  [${error.severity.toUpperCase()}] ${error.type}: ${error.message}`);
      });
    }

    if (this.debugMode && warnings.length > 0) {
      this.log('⚠️ Warnings:');
      warnings.forEach(warning => {
        this.log(`  [${warning.impact.toUpperCase()}] ${warning.type}: ${warning.message}`);
      });
    }
  }

  /**
   * Utility method for conditional logging
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[LayoutValidator]', ...args);
    }
  }
}