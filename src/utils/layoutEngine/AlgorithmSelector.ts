/**
 * Layout Algorithm Selection System
 * 
 * This system automatically selects the optimal layout algorithm based on
 * graph characteristics, user preferences, and performance constraints.
 * It uses a sophisticated scoring system and machine learning-inspired approaches.
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import {
  LayoutAlgorithm,
  GraphMetrics,
  AlgorithmSelectionCriteria,
  AlgorithmSelectionResult,
  LayoutConfig
} from './types';

/**
 * Algorithm selection strategy
 */
export type SelectionStrategy = 
  | 'automatic'      // Fully automatic based on metrics
  | 'performance'    // Prioritize speed over quality
  | 'quality'        // Prioritize quality over speed
  | 'balanced'       // Balance between performance and quality
  | 'user-guided';   // Use user preferences heavily

/**
 * Selection context for algorithm choice
 */
export interface SelectionContext {
  /** Graph characteristics */
  metrics: GraphMetrics;
  
  /** Previous algorithm performance history */
  history: AlgorithmPerformanceHistory[];
  
  /** User interaction patterns */
  userBehavior: UserBehaviorProfile;
  
  /** System constraints */
  systemConstraints: SystemConstraints;
  
  /** Current session context */
  sessionContext: SessionContext;
}

/**
 * Historical performance data for algorithms
 */
export interface AlgorithmPerformanceHistory {
  algorithmName: string;
  graphSize: number;
  executionTime: number;
  qualityScore: number;
  userSatisfaction: number;
  timestamp: number;
  graphCharacteristics: Partial<GraphMetrics>;
}

/**
 * User behavior profile for personalized selection
 */
export interface UserBehaviorProfile {
  /** Preferred algorithms based on past usage */
  preferredAlgorithms: Map<string, number>;
  
  /** Tolerance for execution time */
  speedTolerance: 'low' | 'medium' | 'high';
  
  /** Quality expectations */
  qualityExpectations: 'basic' | 'good' | 'excellent';
  
  /** Interaction frequency */
  interactionFrequency: number;
  
  /** Most used features */
  featureUsage: Map<string, number>;
}

/**
 * System performance and resource constraints
 */
export interface SystemConstraints {
  /** Available memory in MB */
  availableMemory: number;
  
  /** CPU performance tier */
  cpuPerformance: 'low' | 'medium' | 'high';
  
  /** Maximum acceptable execution time */
  maxExecutionTime: number;
  
  /** Battery/power constraints */
  powerConstraints: boolean;
  
  /** Network latency (for distributed computing) */
  networkLatency?: number;
}

/**
 * Current session context
 */
export interface SessionContext {
  /** Time since session start */
  sessionDuration: number;
  
  /** Number of layout calculations in session */
  layoutCount: number;
  
  /** Current user task type */
  taskType: 'exploration' | 'analysis' | 'presentation' | 'development';
  
  /** Urgency level */
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Algorithm scoring criteria weights
 */
export interface ScoringWeights {
  suitability: number;        // Algorithm's self-reported suitability
  performance: number;        // Historical performance
  quality: number;           // Expected quality outcome
  userPreference: number;    // User's past preferences
  systemFit: number;         // Fit with current system constraints
  contextRelevance: number;  // Relevance to current context
}

/**
 * Advanced algorithm selector with intelligent decision making
 */
export class AlgorithmSelector {
  private performanceHistory: AlgorithmPerformanceHistory[] = [];
  private userProfile: UserBehaviorProfile;
  private scoringWeights: ScoringWeights;
  
  constructor(
    initialUserProfile?: Partial<UserBehaviorProfile>,
    customWeights?: Partial<ScoringWeights>
  ) {
    this.userProfile = {
      preferredAlgorithms: new Map(),
      speedTolerance: 'medium',
      qualityExpectations: 'good',
      interactionFrequency: 0,
      featureUsage: new Map(),
      ...initialUserProfile
    };
    
    this.scoringWeights = {
      suitability: 0.3,
      performance: 0.2,
      quality: 0.2,
      userPreference: 0.15,
      systemFit: 0.1,
      contextRelevance: 0.05,
      ...customWeights
    };
  }

  // ==========================================================================
  // MAIN SELECTION LOGIC
  // ==========================================================================

  /**
   * Select the best algorithm for given context
   */
  selectAlgorithm(
    algorithms: LayoutAlgorithm[],
    nodes: FlowNode[],
    edges: FlowEdge[],
    criteria: AlgorithmSelectionCriteria,
    strategy: SelectionStrategy = 'automatic',
    context?: Partial<SelectionContext>
  ): AlgorithmSelectionResult {
    
    // Build complete context
    const fullContext: SelectionContext = {
      metrics: criteria.metrics,
      history: this.performanceHistory,
      userBehavior: this.userProfile,
      systemConstraints: {
        availableMemory: 2048, // Default 2GB
        cpuPerformance: 'medium',
        maxExecutionTime: criteria.constraints?.maxExecutionTime || 10000,
        powerConstraints: false
      },
      sessionContext: {
        sessionDuration: Date.now() - this.getSessionStart(),
        layoutCount: this.getSessionLayoutCount(),
        taskType: 'analysis',
        urgency: 'medium'
      },
      ...context
    };

    // Apply strategy-specific adjustments
    const adjustedWeights = this.adjustWeightsForStrategy(strategy);
    
    // Score all algorithms
    const algorithmScores = algorithms
      .filter(algorithm => algorithm.canHandle(criteria.metrics))
      .map(algorithm => ({
        algorithm,
        score: this.calculateAlgorithmScore(algorithm, fullContext, adjustedWeights),
        reasoning: this.generateReasoningForAlgorithm(algorithm, fullContext)
      }))
      .sort((a, b) => b.score - a.score);

    if (algorithmScores.length === 0) {
      throw new Error('No suitable algorithms available for this graph');
    }

    const selectedScore = algorithmScores[0];
    const alternatives = algorithmScores.slice(1, 4); // Top 3 alternatives

    // Update user profile based on selection
    this.updateUserProfile(selectedScore.algorithm, fullContext);

    return {
      algorithm: selectedScore.algorithm,
      confidence: Math.min(selectedScore.score, 1.0),
      reasoning: [
        `Selected ${selectedScore.algorithm.displayName} (strategy: ${strategy})`,
        `Overall score: ${(selectedScore.score * 100).toFixed(1)}%`,
        ...selectedScore.reasoning,
        ...this.generateContextualReasoning(fullContext)
      ],
      alternatives: alternatives.map(alt => ({
        algorithm: alt.algorithm,
        suitabilityScore: alt.score,
        reason: alt.reasoning.join(', ')
      }))
    };
  }

  // ==========================================================================
  // SCORING SYSTEM
  // ==========================================================================

  /**
   * Calculate comprehensive score for an algorithm
   */
  private calculateAlgorithmScore(
    algorithm: LayoutAlgorithm,
    context: SelectionContext,
    weights: ScoringWeights
  ): number {
    const suitabilityScore = this.calculateSuitabilityScore(algorithm, context);
    const performanceScore = this.calculatePerformanceScore(algorithm, context);
    const qualityScore = this.calculateQualityScore(algorithm, context);
    const userPreferenceScore = this.calculateUserPreferenceScore(algorithm, context);
    const systemFitScore = this.calculateSystemFitScore(algorithm, context);
    const contextRelevanceScore = this.calculateContextRelevanceScore(algorithm, context);

    return (
      suitabilityScore * weights.suitability +
      performanceScore * weights.performance +
      qualityScore * weights.quality +
      userPreferenceScore * weights.userPreference +
      systemFitScore * weights.systemFit +
      contextRelevanceScore * weights.contextRelevance
    );
  }

  /**
   * Calculate algorithm suitability score
   */
  private calculateSuitabilityScore(
    algorithm: LayoutAlgorithm,
    context: SelectionContext
  ): number {
    return algorithm.suitability(context.metrics);
  }

  /**
   * Calculate performance score based on historical data
   */
  private calculatePerformanceScore(
    algorithm: LayoutAlgorithm,
    context: SelectionContext
  ): number {
    const relevantHistory = this.performanceHistory.filter(
      h => h.algorithmName === algorithm.name &&
           Math.abs(h.graphSize - context.metrics.nodeCount) < context.metrics.nodeCount * 0.3
    );

    if (relevantHistory.length === 0) {
      return 0.5; // Default score for unknown performance
    }

    // Calculate weighted average based on recency and similarity
    const weightedPerformance = relevantHistory.reduce((sum, history) => {
      const recencyWeight = this.calculateRecencyWeight(history.timestamp);
      const sizeWeight = this.calculateSizeWeight(
        history.graphSize, 
        context.metrics.nodeCount
      );
      const normalizedTime = Math.min(history.executionTime / 10000, 1); // Normalize to 0-1
      const timeScore = 1 - normalizedTime; // Lower time = higher score
      
      return sum + (timeScore * recencyWeight * sizeWeight);
    }, 0);

    const totalWeight = relevantHistory.reduce((sum, history) => {
      return sum + this.calculateRecencyWeight(history.timestamp) * 
                   this.calculateSizeWeight(history.graphSize, context.metrics.nodeCount);
    }, 0);

    return weightedPerformance / totalWeight;
  }

  /**
   * Calculate expected quality score
   */
  private calculateQualityScore(
    algorithm: LayoutAlgorithm,
    context: SelectionContext
  ): number {
    const relevantHistory = this.performanceHistory.filter(
      h => h.algorithmName === algorithm.name
    );

    if (relevantHistory.length === 0) {
      // Use algorithm-specific quality estimates
      return this.getBaseQualityScore(algorithm, context.metrics);
    }

    const avgQuality = relevantHistory.reduce(
      (sum, h) => sum + h.qualityScore, 0
    ) / relevantHistory.length;

    return avgQuality / 100; // Normalize to 0-1
  }

  /**
   * Calculate user preference score
   */
  private calculateUserPreferenceScore(
    algorithm: LayoutAlgorithm,
    context: SelectionContext
  ): number {
    const preference = context.userBehavior.preferredAlgorithms.get(algorithm.name) || 0;
    const maxPreference = Math.max(...context.userBehavior.preferredAlgorithms.values(), 1);
    
    return preference / maxPreference;
  }

  /**
   * Calculate system fitness score
   */
  private calculateSystemFitScore(
    algorithm: LayoutAlgorithm,
    context: SelectionContext
  ): number {
    let score = 1.0;
    
    // Penalize resource-intensive algorithms on constrained systems
    if (context.systemConstraints.cpuPerformance === 'low') {
      if (algorithm.name === 'constraint-based') {
        score *= 0.6; // Constraint solving is CPU intensive
      }
      if (algorithm.name === 'force-directed' && context.metrics.nodeCount > 100) {
        score *= 0.7; // Force simulation can be intensive
      }
    }
    
    // Consider memory constraints
    if (context.systemConstraints.availableMemory < 1024) {
      if (context.metrics.nodeCount > 200) {
        score *= 0.8; // Large graphs need more memory
      }
    }
    
    // Consider power constraints
    if (context.systemConstraints.powerConstraints) {
      score *= 0.9; // Slight preference for less intensive algorithms
    }
    
    return score;
  }

  /**
   * Calculate contextual relevance score
   */
  private calculateContextRelevanceScore(
    algorithm: LayoutAlgorithm,
    context: SelectionContext
  ): number {
    let score = 0.5; // Base score
    
    // Task-specific preferences
    switch (context.sessionContext.taskType) {
      case 'exploration':
        if (algorithm.name === 'force-directed') score += 0.3; // Good for exploration
        break;
      case 'analysis':
        if (algorithm.name === 'enhanced-hierarchical') score += 0.3; // Good for analysis
        break;
      case 'presentation':
        if (algorithm.name === 'constraint-based') score += 0.3; // Clean layouts for presentation
        break;
    }
    
    // Urgency considerations
    if (context.sessionContext.urgency === 'high') {
      const historicalSpeed = this.getAverageExecutionTime(algorithm.name);
      if (historicalSpeed < 2000) score += 0.2; // Fast algorithms for urgent tasks
    }
    
    return Math.min(score, 1.0);
  }

  // ==========================================================================
  // STRATEGY ADAPTATIONS
  // ==========================================================================

  /**
   * Adjust scoring weights based on selection strategy
   */
  private adjustWeightsForStrategy(strategy: SelectionStrategy): ScoringWeights {
    const baseWeights = { ...this.scoringWeights };
    
    switch (strategy) {
      case 'performance':
        return {
          ...baseWeights,
          performance: 0.4,
          suitability: 0.3,
          quality: 0.1,
          systemFit: 0.15,
          userPreference: 0.05,
          contextRelevance: 0.0
        };
        
      case 'quality':
        return {
          ...baseWeights,
          quality: 0.4,
          suitability: 0.3,
          performance: 0.1,
          userPreference: 0.1,
          systemFit: 0.05,
          contextRelevance: 0.05
        };
        
      case 'balanced':
        return {
          suitability: 0.25,
          performance: 0.25,
          quality: 0.25,
          userPreference: 0.1,
          systemFit: 0.1,
          contextRelevance: 0.05
        };
        
      case 'user-guided':
        return {
          ...baseWeights,
          userPreference: 0.4,
          suitability: 0.2,
          performance: 0.15,
          quality: 0.15,
          systemFit: 0.05,
          contextRelevance: 0.05
        };
        
      default: // 'automatic'
        return baseWeights;
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Calculate recency weight for historical data
   */
  private calculateRecencyWeight(timestamp: number): number {
    const age = Date.now() - timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    return Math.max(0.1, 1 - (age / maxAge));
  }

  /**
   * Calculate similarity weight based on graph size
   */
  private calculateSizeWeight(historicalSize: number, currentSize: number): number {
    const ratio = Math.min(historicalSize, currentSize) / Math.max(historicalSize, currentSize);
    return ratio;
  }

  /**
   * Get base quality score for an algorithm
   */
  private getBaseQualityScore(algorithm: LayoutAlgorithm, metrics: GraphMetrics): number {
    // Algorithm-specific quality estimates
    const qualityMap = new Map([
      ['force-directed', 0.75],
      ['enhanced-hierarchical', 0.85],
      ['constraint-based', 0.88]
    ]);
    
    return qualityMap.get(algorithm.name) || 0.7;
  }

  /**
   * Get average execution time for an algorithm
   */
  private getAverageExecutionTime(algorithmName: string): number {
    const relevantHistory = this.performanceHistory.filter(h => h.algorithmName === algorithmName);
    
    if (relevantHistory.length === 0) {
      return 5000; // Default estimate
    }
    
    return relevantHistory.reduce((sum, h) => sum + h.executionTime, 0) / relevantHistory.length;
  }

  /**
   * Generate reasoning for algorithm selection
   */
  private generateReasoningForAlgorithm(
    algorithm: LayoutAlgorithm,
    context: SelectionContext
  ): string[] {
    const reasoning: string[] = [];
    
    // Suitability reasoning
    const suitability = algorithm.suitability(context.metrics);
    if (suitability > 0.8) {
      reasoning.push(`Excellent match for graph characteristics (${(suitability * 100).toFixed(0)}% suitability)`);
    } else if (suitability > 0.6) {
      reasoning.push(`Good match for graph characteristics (${(suitability * 100).toFixed(0)}% suitability)`);
    }
    
    // Performance reasoning
    const avgTime = this.getAverageExecutionTime(algorithm.name);
    if (avgTime < 2000) {
      reasoning.push('Fast execution based on historical data');
    } else if (avgTime > 8000) {
      reasoning.push('Slower execution but higher quality expected');
    }
    
    // Graph size reasoning
    if (context.metrics.nodeCount > 200) {
      reasoning.push('Suitable for large graphs');
    } else if (context.metrics.nodeCount < 50) {
      reasoning.push('Optimal for small to medium graphs');
    }
    
    return reasoning;
  }

  /**
   * Generate contextual reasoning
   */
  private generateContextualReasoning(context: SelectionContext): string[] {
    const reasoning: string[] = [];
    
    if (context.sessionContext.urgency === 'high') {
      reasoning.push('Prioritized performance due to high urgency');
    }
    
    if (context.systemConstraints.powerConstraints) {
      reasoning.push('Optimized for power efficiency');
    }
    
    if (context.userBehavior.qualityExpectations === 'excellent') {
      reasoning.push('Selected for high quality output');
    }
    
    return reasoning;
  }

  // ==========================================================================
  // LEARNING AND ADAPTATION
  // ==========================================================================

  /**
   * Record algorithm performance for learning
   */
  recordPerformance(
    algorithmName: string,
    executionTime: number,
    qualityScore: number,
    graphMetrics: GraphMetrics,
    userSatisfaction?: number
  ): void {
    const record: AlgorithmPerformanceHistory = {
      algorithmName,
      graphSize: graphMetrics.nodeCount,
      executionTime,
      qualityScore,
      userSatisfaction: userSatisfaction || 3, // Default neutral
      timestamp: Date.now(),
      graphCharacteristics: {
        density: graphMetrics.density,
        groupCount: graphMetrics.groupCount,
        averageConnectivity: graphMetrics.averageConnectivity
      }
    };
    
    this.performanceHistory.push(record);
    
    // Keep only recent history to prevent memory issues
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-800);
    }
  }

  /**
   * Update user profile based on selections and feedback
   */
  private updateUserProfile(algorithm: LayoutAlgorithm, context: SelectionContext): void {
    // Update algorithm preference
    const currentPreference = this.userProfile.preferredAlgorithms.get(algorithm.name) || 0;
    this.userProfile.preferredAlgorithms.set(algorithm.name, currentPreference + 1);
    
    // Update interaction frequency
    this.userProfile.interactionFrequency += 1;
  }

  /**
   * Get user feedback and incorporate into learning
   */
  recordUserFeedback(
    algorithmName: string,
    satisfaction: number, // 1-5 scale
    specificFeedback?: {
      tooSlow?: boolean;
      poorQuality?: boolean;
      goodResult?: boolean;
    }
  ): void {
    // Update the most recent performance record
    const recentRecord = this.performanceHistory
      .filter(h => h.algorithmName === algorithmName)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
      
    if (recentRecord) {
      recentRecord.userSatisfaction = satisfaction;
      
      // Adjust user profile based on feedback
      if (specificFeedback?.tooSlow && this.userProfile.speedTolerance === 'medium') {
        this.userProfile.speedTolerance = 'low';
      } else if (specificFeedback?.goodResult && satisfaction >= 4) {
        const currentPreference = this.userProfile.preferredAlgorithms.get(algorithmName) || 0;
        this.userProfile.preferredAlgorithms.set(algorithmName, currentPreference + 2);
      }
    }
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  private sessionStart = Date.now();
  private sessionLayoutCount = 0;

  private getSessionStart(): number {
    return this.sessionStart;
  }

  private getSessionLayoutCount(): number {
    return this.sessionLayoutCount;
  }

  /**
   * Reset session counters
   */
  resetSession(): void {
    this.sessionStart = Date.now();
    this.sessionLayoutCount = 0;
  }

  /**
   * Increment layout counter
   */
  incrementLayoutCount(): void {
    this.sessionLayoutCount++;
  }

  // ==========================================================================
  // CONFIGURATION AND EXPORT
  // ==========================================================================

  /**
   * Export current configuration and learning data
   */
  exportConfiguration(): {
    userProfile: UserBehaviorProfile;
    performanceHistory: AlgorithmPerformanceHistory[];
    scoringWeights: ScoringWeights;
  } {
    return {
      userProfile: { ...this.userProfile },
      performanceHistory: [...this.performanceHistory],
      scoringWeights: { ...this.scoringWeights }
    };
  }

  /**
   * Import configuration and learning data
   */
  importConfiguration(config: {
    userProfile?: Partial<UserBehaviorProfile>;
    performanceHistory?: AlgorithmPerformanceHistory[];
    scoringWeights?: Partial<ScoringWeights>;
  }): void {
    if (config.userProfile) {
      this.userProfile = { ...this.userProfile, ...config.userProfile };
    }
    
    if (config.performanceHistory) {
      this.performanceHistory = config.performanceHistory;
    }
    
    if (config.scoringWeights) {
      this.scoringWeights = { ...this.scoringWeights, ...config.scoringWeights };
    }
  }

  /**
   * Get selection statistics
   */
  getSelectionStatistics(): {
    totalSelections: number;
    algorithmUsage: Map<string, number>;
    averageSatisfaction: number;
    performanceTrends: Map<string, { avgTime: number; avgQuality: number }>;
  } {
    const algorithmUsage = new Map<string, number>();
    const performanceTrends = new Map<string, { avgTime: number; avgQuality: number }>();
    
    this.performanceHistory.forEach(record => {
      // Usage counting
      const currentUsage = algorithmUsage.get(record.algorithmName) || 0;
      algorithmUsage.set(record.algorithmName, currentUsage + 1);
      
      // Performance trends
      const current = performanceTrends.get(record.algorithmName) || { avgTime: 0, avgQuality: 0 };
      const count = algorithmUsage.get(record.algorithmName) || 1;
      
      performanceTrends.set(record.algorithmName, {
        avgTime: (current.avgTime * (count - 1) + record.executionTime) / count,
        avgQuality: (current.avgQuality * (count - 1) + record.qualityScore) / count
      });
    });
    
    const totalSatisfaction = this.performanceHistory.reduce(
      (sum, record) => sum + record.userSatisfaction, 0
    );
    
    return {
      totalSelections: this.performanceHistory.length,
      algorithmUsage,
      averageSatisfaction: this.performanceHistory.length > 0 ? 
        totalSatisfaction / this.performanceHistory.length : 0,
      performanceTrends
    };
  }
}