/**
 * Layout Engine - Main Export Module
 * 
 * This module exports all components of the advanced multi-algorithm layout system
 * for easy integration with the graph visualization components.
 */

// Import classes for internal use
import { MultiLayoutEngine } from './MultiLayoutEngine';
import { ForceDirectedEngine } from './ForceDirectedEngine';
import { EnhancedHierarchicalEngine } from './EnhancedHierarchicalEngine';
import { ConstraintBasedEngine } from './ConstraintBasedEngine';
import { AlgorithmSelector } from './AlgorithmSelector';

// Core types and interfaces
export * from './types';

// Layout engines
export { ForceDirectedEngine } from './ForceDirectedEngine';
export { EnhancedHierarchicalEngine } from './EnhancedHierarchicalEngine';
export { ConstraintBasedEngine } from './ConstraintBasedEngine';

// Main layout engine manager
export { MultiLayoutEngine } from './MultiLayoutEngine';

// Algorithm selection system
export { AlgorithmSelector } from './AlgorithmSelector';
export type { SelectionStrategy, SelectionContext, UserBehaviorProfile } from './AlgorithmSelector';

// Convenience function to create a fully configured layout engine
export function createLayoutEngine(config?: {
  defaultAlgorithm?: string;
  autoSelection?: boolean;
  debug?: boolean;
}) {
  const engine = new MultiLayoutEngine({
    defaultAlgorithm: config?.defaultAlgorithm,
    autoSelection: config?.autoSelection ?? true,
    debug: {
      enabled: config?.debug ?? false,
      logPerformance: config?.debug ?? false,
      keepIntermediateResults: config?.debug ?? false
    }
  });

  // Register all available algorithms
  engine.registerAlgorithm(new ForceDirectedEngine());
  engine.registerAlgorithm(new EnhancedHierarchicalEngine());
  engine.registerAlgorithm(new ConstraintBasedEngine());

  return engine;
}

// Convenience function to create algorithm selector with default configuration
export function createAlgorithmSelector(userProfile?: {
  preferredAlgorithm?: string;
  speedTolerance?: 'low' | 'medium' | 'high';
  qualityExpectations?: 'basic' | 'good' | 'excellent';
}) {
  const preferredAlgorithms = new Map();
  if (userProfile?.preferredAlgorithm) {
    preferredAlgorithms.set(userProfile.preferredAlgorithm, 10);
  }

  return new AlgorithmSelector({
    preferredAlgorithms,
    speedTolerance: userProfile?.speedTolerance ?? 'medium',
    qualityExpectations: userProfile?.qualityExpectations ?? 'good',
    interactionFrequency: 0,
    featureUsage: new Map()
  });
}

// Algorithm registry for easy access
export const AVAILABLE_ALGORITHMS = {
  FORCE_DIRECTED: 'force-directed',
  ENHANCED_HIERARCHICAL: 'enhanced-hierarchical',
  CONSTRAINT_BASED: 'constraint-based'
} as const;

// Default configurations for quick setup
export const DEFAULT_CONFIGS = {
  PERFORMANCE_OPTIMIZED: {
    autoSelection: true,
    debug: false,
    quality: { prioritizeSpeed: true }
  },
  QUALITY_OPTIMIZED: {
    autoSelection: true,
    debug: false,
    quality: { prioritizeSpeed: false, minOverallScore: 85 }
  },
  DEVELOPMENT: {
    autoSelection: true,
    debug: true,
    performance: { maxExecutionTime: 5000 }
  }
} as const;