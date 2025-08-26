/**
 * CycleHandler - Advanced cycle detection and breaking for dependency graphs
 * 
 * This class provides sophisticated algorithms for detecting circular dependencies
 * and implementing optimal cycle breaking strategies that minimize layout disruption
 * while preserving semantic meaning of the workflow.
 */

import { DependencyGraph, DependencyEdge } from './dependencyAnalyzer';

export interface Cycle {
  id: string;
  nodes: string[];
  edges: DependencyEdge[];
  impact: CycleImpact;
  priority: number; // Higher = break first
}

export interface CycleImpact {
  nodesAffected: number;
  criticalityScore: number; // Based on node types and edge weights
  layoutComplexity: number; // Estimated impact on layout
}

export interface FeedbackEdge {
  edge: DependencyEdge;
  reasoning: string;
  impactScore: number;
}

export interface CycleBreakingResult {
  feedbackEdges: Set<string>; // Edge IDs to mark as feedback
  modifiedGraph: DependencyGraph;
  cyclesSolved: Cycle[];
  layoutImpact: LayoutImpactMetrics;
  recommendations: string[];
}

export interface LayoutImpactMetrics {
  nodesAffected: number;
  edgesRedirected: number;
  layoutComplexity: number;
  qualityScore: number; // 0-1, higher is better
}

export interface CycleDetectionResult {
  cycles: Cycle[];
  hasCycles: boolean;
  complexity: 'none' | 'simple' | 'complex' | 'critical';
  recommendations: string[];
}

export class CycleHandler {
  private debugMode: boolean;
  private cycleIdCounter: number;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
    this.cycleIdCounter = 1;
  }

  /**
   * Detects all cycles in the dependency graph with comprehensive analysis
   */
  public detectCycles(graph: DependencyGraph): CycleDetectionResult {
    this.log('🔍 Starting comprehensive cycle detection...');
    
    const cycles = this.findAllCycles(graph);
    const complexity = this.assessCycleComplexity(cycles);
    const recommendations = this.generateCycleRecommendations(cycles, complexity);

    this.log(`✅ Cycle detection complete. Found ${cycles.length} cycles with ${complexity} complexity`);

    return {
      cycles,
      hasCycles: cycles.length > 0,
      complexity,
      recommendations
    };
  }

  /**
   * Breaks cycles using optimal feedback edge selection
   */
  public breakCycles(graph: DependencyGraph, cycles: Cycle[]): CycleBreakingResult {
    this.log('🔧 Starting cycle breaking process...');
    
    if (cycles.length === 0) {
      return {
        feedbackEdges: new Set(),
        modifiedGraph: graph,
        cyclesSolved: [],
        layoutImpact: {
          nodesAffected: 0,
          edgesRedirected: 0,
          layoutComplexity: 0,
          qualityScore: 1.0
        },
        recommendations: ['No cycles detected - no action needed']
      };
    }

    // Sort cycles by priority (break most impactful first)
    const sortedCycles = this.prioritizeCycles(cycles);
    
    const feedbackEdges = new Set<string>();
    const cyclesSolved: Cycle[] = [];
    let totalImpact = 0;

    // Process cycles in priority order
    for (const cycle of sortedCycles) {
      const bestFeedbackEdge = this.selectOptimalFeedbackEdge(cycle, graph, feedbackEdges);
      
      if (bestFeedbackEdge) {
        const edgeId = this.getEdgeId(bestFeedbackEdge.edge);
        feedbackEdges.add(edgeId);
        cyclesSolved.push(cycle);
        totalImpact += bestFeedbackEdge.impactScore;
        
        this.log(`🎯 Breaking cycle ${cycle.id} by marking edge ${edgeId} as feedback`);
        this.log(`   Reasoning: ${bestFeedbackEdge.reasoning}`);
      }
    }

    // Create modified graph with feedback edges marked
    const modifiedGraph = this.createModifiedGraph(graph, feedbackEdges);
    
    // Calculate layout impact metrics
    const layoutImpact = this.calculateLayoutImpact(cyclesSolved, feedbackEdges, graph);
    
    // Generate recommendations
    const recommendations = this.generateBreakingRecommendations(cyclesSolved, feedbackEdges);

    this.log(`✅ Cycle breaking complete. Solved ${cyclesSolved.length} cycles with ${feedbackEdges.size} feedback edges`);

    return {
      feedbackEdges,
      modifiedGraph,
      cyclesSolved,
      layoutImpact,
      recommendations
    };
  }

  /**
   * Finds all cycles using advanced DFS with path tracking
   */
  private findAllCycles(graph: DependencyGraph): Cycle[] {
    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];
    const edgeStack: DependencyEdge[] = [];

    const dfs = (nodeId: string) => {
      if (recursionStack.has(nodeId)) {
        // Back edge found - extract cycle
        const cycleStart = pathStack.indexOf(nodeId);
        if (cycleStart >= 0) {
          const cycleNodes = pathStack.slice(cycleStart);
          const cycleEdges = edgeStack.slice(cycleStart);
          
          // Add the closing edge
          const closingEdge = graph.edges.find(e => 
            e.source === pathStack[pathStack.length - 1] && e.target === nodeId
          );
          if (closingEdge) {
            cycleEdges.push(closingEdge);
          }

          const cycle = this.createCycle(cycleNodes, cycleEdges, graph);
          cycles.push(cycle);
          
          this.log(`🔄 Found cycle: [${cycleNodes.join(' -> ')}] -> ${nodeId}`);
        }
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      pathStack.push(nodeId);

      const neighbors = graph.outgoingEdges.get(nodeId) || new Set();
      for (const neighborId of neighbors) {
        // Find the edge connecting current node to neighbor
        const edge = graph.edges.find(e => e.source === nodeId && e.target === neighborId);
        if (edge) {
          edgeStack.push(edge);
          dfs(neighborId);
          edgeStack.pop();
        }
      }

      recursionStack.delete(nodeId);
      pathStack.pop();
    };

    // Start DFS from all nodes to catch disconnected cycles
    for (const [nodeId] of graph.nodes) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return this.deduplicateCycles(cycles);
  }

  /**
   * Creates a cycle object with impact analysis
   */
  private createCycle(nodes: string[], edges: DependencyEdge[], graph: DependencyGraph): Cycle {
    const impact = this.calculateCycleImpact(nodes, edges, graph);
    const priority = this.calculateCyclePriority(nodes, edges, impact, graph);

    return {
      id: `cycle_${this.cycleIdCounter++}`,
      nodes: [...nodes],
      edges: [...edges],
      impact,
      priority
    };
  }

  /**
   * Calculates the impact of a cycle on the overall layout
   */
  private calculateCycleImpact(nodes: string[], edges: DependencyEdge[], graph: DependencyGraph): CycleImpact {
    const nodesAffected = nodes.length;
    
    // Calculate criticality based on node types and edge weights
    let criticalityScore = 0;
    nodes.forEach(nodeId => {
      const node = graph.nodes.get(nodeId);
      if (node) {
        // Start and end nodes are more critical
        if (node.data.nodeType === 'start' || node.data.nodeType === 'end') {
          criticalityScore += 3;
        } else if (node.data.nodeType === 'action') {
          criticalityScore += 2;
        } else {
          criticalityScore += 1;
        }
      }
    });

    // Add edge weight impact
    edges.forEach(edge => {
      criticalityScore += edge.weight * 0.5;
    });

    // Layout complexity increases with cycle size and criticality
    const layoutComplexity = nodesAffected * criticalityScore * 0.1;

    return {
      nodesAffected,
      criticalityScore,
      layoutComplexity
    };
  }

  /**
   * Calculates priority for cycle breaking (higher = break first)
   */
  private calculateCyclePriority(
    nodes: string[], 
    edges: DependencyEdge[], 
    impact: CycleImpact, 
    graph: DependencyGraph
  ): number {
    // Base priority on impact and cycle characteristics
    let priority = impact.criticalityScore;
    
    // Smaller cycles get higher priority (easier to break)
    priority += (10 - Math.min(nodes.length, 10));
    
    // Cycles involving start nodes get higher priority
    const hasStartNode = nodes.some(nodeId => {
      const node = graph.nodes.get(nodeId);
      return node?.data.nodeType === 'start';
    });
    if (hasStartNode) {
      priority += 5;
    }

    return priority;
  }

  /**
   * Removes duplicate cycles that represent the same cyclic dependency
   */
  private deduplicateCycles(cycles: Cycle[]): Cycle[] {
    const uniqueCycles: Cycle[] = [];
    const seenCycles = new Set<string>();

    for (const cycle of cycles) {
      // Create a normalized representation of the cycle
      const normalized = this.normalizeCycle(cycle.nodes);
      
      if (!seenCycles.has(normalized)) {
        seenCycles.add(normalized);
        uniqueCycles.push(cycle);
      }
    }

    return uniqueCycles;
  }

  /**
   * Creates a normalized string representation of a cycle for deduplication
   */
  private normalizeCycle(nodes: string[]): string {
    if (nodes.length === 0) return '';
    
    // Find the lexicographically smallest starting point
    let minIndex = 0;
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i] < nodes[minIndex]) {
        minIndex = i;
      }
    }

    // Create normalized cycle starting from the smallest node
    const normalized = [
      ...nodes.slice(minIndex),
      ...nodes.slice(0, minIndex)
    ];

    return normalized.join('->');
  }

  /**
   * Prioritizes cycles for breaking (most impactful first)
   */
  private prioritizeCycles(cycles: Cycle[]): Cycle[] {
    return [...cycles].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Selects the optimal feedback edge to break a cycle
   */
  private selectOptimalFeedbackEdge(
    cycle: Cycle, 
    graph: DependencyGraph, 
    alreadySelected: Set<string>
  ): FeedbackEdge | null {
    const candidates: FeedbackEdge[] = [];

    for (const edge of cycle.edges) {
      const edgeId = this.getEdgeId(edge);
      
      // Skip if already selected as feedback
      if (alreadySelected.has(edgeId)) {
        continue;
      }

      const impactScore = this.calculateEdgeBreakingImpact(edge, graph);
      const reasoning = this.generateBreakingReasoning(edge, graph);

      candidates.push({
        edge,
        reasoning,
        impactScore
      });
    }

    if (candidates.length === 0) {
      return null;
    }

    // Select edge with lowest impact (least disruptive)
    return candidates.reduce((best, current) => 
      current.impactScore < best.impactScore ? current : best
    );
  }

  /**
   * Calculates the impact of breaking a specific edge
   */
  private calculateEdgeBreakingImpact(edge: DependencyEdge, graph: DependencyGraph): number {
    let impact = 0;

    // Higher weight edges are more disruptive to break
    impact += edge.weight * 2;

    // Edges from/to start or end nodes are more disruptive
    const sourceNode = graph.nodes.get(edge.source);
    const targetNode = graph.nodes.get(edge.target);

    if (sourceNode?.data.nodeType === 'start' || targetNode?.data.nodeType === 'start') {
      impact += 5;
    }
    if (sourceNode?.data.nodeType === 'end' || targetNode?.data.nodeType === 'end') {
      impact += 5;
    }

    // Edges with important conditions are more disruptive
    if (edge.condition && edge.condition.toLowerCase().includes('error')) {
      impact += 3;
    }

    return impact;
  }

  /**
   * Generates human-readable reasoning for edge breaking
   */
  private generateBreakingReasoning(edge: DependencyEdge, graph: DependencyGraph): string {
    const sourceNode = graph.nodes.get(edge.source);
    const targetNode = graph.nodes.get(edge.target);
    
    let reasoning = `Break edge ${edge.source} -> ${edge.target}`;
    
    if (edge.condition) {
      reasoning += ` (condition: ${edge.condition})`;
    }
    
    reasoning += ` - lowest layout impact among cycle edges`;
    
    if (sourceNode?.data.nodeType === 'action' && targetNode?.data.nodeType === 'action') {
      reasoning += ', both nodes are actions (less critical)';
    }
    
    return reasoning;
  }

  /**
   * Creates a unique identifier for an edge
   */
  private getEdgeId(edge: DependencyEdge): string {
    return `${edge.source}->${edge.target}`;
  }

  /**
   * Creates a modified graph with feedback edges marked
   */
  private createModifiedGraph(graph: DependencyGraph, feedbackEdges: Set<string>): DependencyGraph {
    // For now, return the original graph
    // In a full implementation, we would create a new graph structure
    // with feedback edges marked but not included in the dependency calculations
    return graph;
  }

  /**
   * Calculates the overall impact of the cycle breaking solution
   */
  private calculateLayoutImpact(
    cyclesSolved: Cycle[], 
    feedbackEdges: Set<string>, 
    graph: DependencyGraph
  ): LayoutImpactMetrics {
    const nodesAffected = new Set<string>();
    let layoutComplexity = 0;

    // Count affected nodes and complexity
    cyclesSolved.forEach(cycle => {
      cycle.nodes.forEach(nodeId => nodesAffected.add(nodeId));
      layoutComplexity += cycle.impact.layoutComplexity;
    });

    const edgesRedirected = feedbackEdges.size;
    
    // Calculate quality score (0-1, higher is better)
    const totalNodes = graph.nodes.size;
    const affectedRatio = nodesAffected.size / totalNodes;
    const qualityScore = Math.max(0, 1 - (affectedRatio * 0.5) - (edgesRedirected * 0.1));

    return {
      nodesAffected: nodesAffected.size,
      edgesRedirected,
      layoutComplexity,
      qualityScore
    };
  }

  /**
   * Assesses the overall complexity of detected cycles
   */
  private assessCycleComplexity(cycles: Cycle[]): 'none' | 'simple' | 'complex' | 'critical' {
    if (cycles.length === 0) return 'none';
    if (cycles.length === 1 && cycles[0].nodes.length <= 3) return 'simple';
    if (cycles.length <= 3 && cycles.every(c => c.nodes.length <= 5)) return 'complex';
    return 'critical';
  }

  /**
   * Generates recommendations for cycle handling
   */
  private generateCycleRecommendations(cycles: Cycle[], complexity: string): string[] {
    const recommendations: string[] = [];

    if (complexity === 'none') {
      recommendations.push('✅ No cycles detected - graph has clean dependency flow');
      return recommendations;
    }

    recommendations.push(`⚠️ Detected ${cycles.length} circular dependencies with ${complexity} complexity`);

    if (complexity === 'simple') {
      recommendations.push('💡 Simple cycles can be easily resolved with minimal layout impact');
    } else if (complexity === 'complex') {
      recommendations.push('🔧 Complex cycles require careful feedback edge selection');
      recommendations.push('💡 Consider reviewing workflow logic to eliminate unnecessary cycles');
    } else {
      recommendations.push('🚨 Critical cycle complexity - significant layout adjustments needed');
      recommendations.push('💡 Strong recommendation to review and simplify workflow design');
    }

    return recommendations;
  }

  /**
   * Generates recommendations for the cycle breaking solution
   */
  private generateBreakingRecommendations(cycles: Cycle[], feedbackEdges: Set<string>): string[] {
    const recommendations: string[] = [];

    if (cycles.length === 0) {
      recommendations.push('✅ No cycle breaking needed');
      return recommendations;
    }

    recommendations.push(`🔧 Broke ${cycles.length} cycles using ${feedbackEdges.size} feedback edges`);
    recommendations.push('🎨 Feedback edges will be rendered with distinct visual styling');
    
    if (feedbackEdges.size > cycles.length) {
      recommendations.push('⚠️ Multiple feedback edges needed - consider workflow simplification');
    }

    recommendations.push('💡 Review feedback edges to ensure they represent acceptable logical flow');

    return recommendations;
  }

  /**
   * Utility method for conditional logging
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[CycleHandler]', ...args);
    }
  }
}