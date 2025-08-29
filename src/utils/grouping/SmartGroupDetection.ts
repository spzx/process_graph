/**
 * Smart Group Detection System
 * 
 * This system provides advanced group detection capabilities using multiple strategies:
 * - Semantic grouping based on node properties and naming patterns
 * - Connectivity-based grouping using graph algorithms
 * - Hybrid approaches combining multiple detection methods
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import { GroupCluster, GroupingStrategy } from '../layoutEngine/types';

/**
 * Group detection configuration
 */
export interface GroupDetectionConfig {
  /** Enable different detection strategies */
  strategies: {
    semantic: boolean;
    connectivity: boolean;
    structural: boolean;
    temporal: boolean;
  };
  
  /** Strategy weights for combining results */
  strategyWeights: {
    semantic: number;
    connectivity: number;
    structural: number;
    temporal: number;
  };
  
  /** Minimum group size */
  minGroupSize: number;
  
  /** Maximum group size */
  maxGroupSize: number;
  
  /** Confidence threshold for group formation */
  confidenceThreshold: number;
  
  /** Allow overlapping groups */
  allowOverlap: boolean;
}

/**
 * Semantic grouping configuration
 */
export interface SemanticConfig {
  /** Properties to analyze for semantic similarity */
  analyzeProperties: string[];
  
  /** Text similarity algorithms */
  textSimilarity: {
    algorithm: 'levenshtein' | 'jaro' | 'jaccard' | 'cosine';
    threshold: number;
  };
  
  /** Naming pattern detection */
  namingPatterns: {
    enabled: boolean;
    commonPrefixes: boolean;
    commonSuffixes: boolean;
    numberingSystems: boolean;
  };
  
  /** Property value clustering */
  propertyAnalysis: {
    enabled: boolean;
    categoricalThreshold: number;
    numericTolerance: number;
  };
}

/**
 * Connectivity grouping configuration
 */
export interface ConnectivityConfig {
  /** Community detection algorithm */
  algorithm: 'louvain' | 'leiden' | 'modularity' | 'clique';
  
  /** Minimum internal connectivity */
  minInternalConnections: number;
  
  /** Maximum external connections ratio */
  maxExternalRatio: number;
  
  /** Edge weight consideration */
  useEdgeWeights: boolean;
  
  /** Direction sensitivity */
  directionSensitive: boolean;
}

/**
 * Main Smart Group Detection System
 */
export class SmartGroupDetectionSystem {
  private config: GroupDetectionConfig;
  private strategies: Map<string, GroupingStrategy> = new Map();
  
  constructor(config?: Partial<GroupDetectionConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.initializeStrategies();
  }

  /**
   * Detect groups using all enabled strategies
   */
  async detectGroups(
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<GroupCluster[]> {
    const detectionResults: Array<{
      strategy: string;
      groups: GroupCluster[];
      confidence: number;
    }> = [];

    // Run all enabled strategies
    for (const [strategyName, strategy] of this.strategies) {
      if (this.isStrategyEnabled(strategyName)) {
        try {
          const groups = await strategy.detectGroups(nodes, edges);
          const confidence = this.calculateStrategyConfidence(groups, nodes, edges);
          
          detectionResults.push({
            strategy: strategyName,
            groups,
            confidence
          });
        } catch (error) {
          console.warn(`Strategy ${strategyName} failed:`, error);
        }
      }
    }

    // Combine and merge results from all strategies
    const combinedGroups = this.combineGroupingResults(detectionResults);
    
    // Filter and validate groups
    return this.filterAndValidateGroups(combinedGroups, nodes, edges);
  }

  /**
   * Initialize all grouping strategies
   */
  private initializeStrategies(): void {
    this.strategies.set('semantic', new SemanticGroupingStrategy());
    this.strategies.set('connectivity', new ConnectivityGroupingStrategy());
    this.strategies.set('structural', new StructuralGroupingStrategy());
    this.strategies.set('temporal', new TemporalGroupingStrategy());
  }

  /**
   * Combine results from multiple strategies
   */
  private combineGroupingResults(
    results: Array<{ strategy: string; groups: GroupCluster[]; confidence: number }>
  ): GroupCluster[] {
    const combinedGroups: GroupCluster[] = [];
    const processedNodes = new Set<string>();

    // Sort strategies by confidence and weight
    const sortedResults = results.sort((a, b) => {
      const weightA = this.config.strategyWeights[a.strategy as keyof typeof this.config.strategyWeights] || 0;
      const weightB = this.config.strategyWeights[b.strategy as keyof typeof this.config.strategyWeights] || 0;
      return (b.confidence * weightB) - (a.confidence * weightA);
    });

    // Process groups from highest confidence strategy first
    for (const result of sortedResults) {
      for (const group of result.groups) {
        if (group.metadata.confidence >= this.config.confidenceThreshold) {
          const newGroup = this.processGroupForCombination(
            group,
            result.strategy,
            processedNodes
          );
          
          if (newGroup) {
            combinedGroups.push(newGroup);
          }
        }
      }
    }

    return combinedGroups;
  }

  /**
   * Process individual group for combination logic
   */
  private processGroupForCombination(
    group: GroupCluster,
    strategy: string,
    processedNodes: Set<string>
  ): GroupCluster | null {
    const groupNodeIds = group.nodes.map(n => n.id);
    
    // Check for overlap with existing groups
    const overlappingNodes = groupNodeIds.filter(id => processedNodes.has(id));
    
    if (!this.config.allowOverlap && overlappingNodes.length > 0) {
      // Handle overlap based on confidence and strategy weight
      const strategyWeight = this.config.strategyWeights[strategy as keyof typeof this.config.strategyWeights] || 0;
      const groupScore = group.metadata.confidence * strategyWeight;
      
      // Only accept if significantly better than existing assignment
      if (groupScore < 0.8) {
        return null;
      }
    }

    // Mark nodes as processed
    groupNodeIds.forEach(id => processedNodes.add(id));
    
    return {
      ...group,
      metadata: {
        ...group.metadata,
        detectionMethod: strategy,
        characteristics: [...group.metadata.characteristics, `detected-by-${strategy}`]
      }
    };
  }

  /**
   * Filter and validate final groups
   */
  private filterAndValidateGroups(
    groups: GroupCluster[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): GroupCluster[] {
    return groups
      .filter(group => {
        // Size constraints
        if (group.nodes.length < this.config.minGroupSize) return false;
        if (group.nodes.length > this.config.maxGroupSize) return false;
        
        // Confidence threshold
        if (group.metadata.confidence < this.config.confidenceThreshold) return false;
        
        return true;
      })
      .map(group => this.enhanceGroupMetadata(group, edges));
  }

  /**
   * Enhance group metadata with additional analysis
   */
  private enhanceGroupMetadata(group: GroupCluster, edges: FlowEdge[]): GroupCluster {
    const nodeIds = new Set(group.nodes.map(n => n.id));
    
    // Calculate internal/external connectivity
    const internalEdges = edges.filter(e => 
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    const externalEdges = edges.filter(e => 
      (nodeIds.has(e.source) && !nodeIds.has(e.target)) ||
      (!nodeIds.has(e.source) && nodeIds.has(e.target))
    );
    
    const cohesion = internalEdges.length / Math.max(1, internalEdges.length + externalEdges.length);
    
    return {
      ...group,
      metadata: {
        ...group.metadata,
        characteristics: [
          ...group.metadata.characteristics,
          `cohesion-${(cohesion * 100).toFixed(0)}%`,
          `internal-edges-${internalEdges.length}`,
          `external-edges-${externalEdges.length}`
        ]
      }
    };
  }

  /**
   * Check if strategy is enabled
   */
  private isStrategyEnabled(strategyName: string): boolean {
    return this.config.strategies[strategyName as keyof typeof this.config.strategies] ?? false;
  }

  /**
   * Calculate confidence for strategy results
   */
  private calculateStrategyConfidence(
    groups: GroupCluster[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): number {
    if (groups.length === 0) return 0;
    
    const avgConfidence = groups.reduce((sum, g) => sum + g.metadata.confidence, 0) / groups.length;
    const coverage = groups.reduce((sum, g) => sum + g.nodes.length, 0) / nodes.length;
    
    return avgConfidence * (0.7 + coverage * 0.3); // Weight by coverage
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<GroupDetectionConfig>): GroupDetectionConfig {
    return {
      strategies: {
        semantic: true,
        connectivity: true,
        structural: false,
        temporal: false
      },
      strategyWeights: {
        semantic: 0.3,
        connectivity: 0.4,
        structural: 0.2,
        temporal: 0.1
      },
      minGroupSize: 2,
      maxGroupSize: 50,
      confidenceThreshold: 0.6,
      allowOverlap: false,
      ...config
    };
  }

  // Public API methods
  updateConfig(newConfig: Partial<GroupDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

/**
 * Semantic Grouping Strategy - Groups nodes based on properties and naming
 */
export class SemanticGroupingStrategy implements GroupingStrategy {
  name = 'semantic';
  displayName = 'Semantic Grouping';
  description = 'Groups nodes based on semantic similarity in names and properties';
  priority = 1;

  async detectGroups(nodes: FlowNode[], edges: FlowEdge[]): Promise<GroupCluster[]> {
    const groups: GroupCluster[] = [];
    const processed = new Set<string>();

    // Group by naming patterns
    const namingGroups = this.detectNamingPatternGroups(nodes);
    
    // Group by property similarity
    const propertyGroups = this.detectPropertySimilarityGroups(nodes);
    
    // Combine and deduplicate
    const allGroups = [...namingGroups, ...propertyGroups];
    
    return this.deduplicateGroups(allGroups);
  }

  canHandle(): boolean { return true; }

  private detectNamingPatternGroups(nodes: FlowNode[]): GroupCluster[] {
    const groups: GroupCluster[] = [];
    const patterns = new Map<string, FlowNode[]>();

    nodes.forEach(node => {
      const nodeLabel = node.data?.label || node.id;
      
      // Extract common prefixes/suffixes
      const prefix = this.extractCommonPrefix(nodeLabel);
      const suffix = this.extractCommonSuffix(nodeLabel);
      
      if (prefix.length > 2) {
        if (!patterns.has(`prefix-${prefix}`)) {
          patterns.set(`prefix-${prefix}`, []);
        }
        patterns.get(`prefix-${prefix}`)!.push(node);
      }
      
      if (suffix.length > 2) {
        if (!patterns.has(`suffix-${suffix}`)) {
          patterns.set(`suffix-${suffix}`, []);
        }
        patterns.get(`suffix-${suffix}`)!.push(node);
      }
    });

    patterns.forEach((groupNodes, pattern) => {
      if (groupNodes.length >= 2) {
        groups.push(this.createGroupCluster(
          groupNodes,
          pattern,
          'naming-pattern',
          0.8
        ));
      }
    });

    return groups;
  }

  private detectPropertySimilarityGroups(nodes: FlowNode[]): GroupCluster[] {
    // Implementation for property-based grouping
    // This is a simplified version - full implementation would analyze all properties
    const groups: GroupCluster[] = [];
    const typeGroups = new Map<string, FlowNode[]>();

    nodes.forEach(node => {
      const nodeType = node.data?.type || 'default';
      if (!typeGroups.has(nodeType)) {
        typeGroups.set(nodeType, []);
      }
      typeGroups.get(nodeType)!.push(node);
    });

    typeGroups.forEach((groupNodes, type) => {
      if (groupNodes.length >= 2) {
        groups.push(this.createGroupCluster(
          groupNodes,
          `type-${type}`,
          'property-similarity',
          0.7
        ));
      }
    });

    return groups;
  }

  private createGroupCluster(
    nodes: FlowNode[],
    id: string,
    method: string,
    confidence: number
  ): GroupCluster {
    const bounds = this.calculateBounds(nodes);
    
    return {
      id,
      name: id,
      nodes,
      bounds,
      center: {
        x: (bounds.x + bounds.width / 2),
        y: (bounds.y + bounds.height / 2)
      },
      metadata: {
        detectionMethod: method,
        confidence,
        characteristics: [method, `size-${nodes.length}`]
      }
    };
  }

  private extractCommonPrefix(text: string): string {
    const words = text.split(/[\s\-_]/);
    return words[0] || '';
  }

  private extractCommonSuffix(text: string): string {
    const words = text.split(/[\s\-_]/);
    return words[words.length - 1] || '';
  }

  private calculateBounds(nodes: FlowNode[]): any {
    const positions = nodes.map(n => n.position || { x: 0, y: 0 });
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs) + 200,
      height: Math.max(...ys) - Math.min(...ys) + 100
    };
  }

  private deduplicateGroups(groups: GroupCluster[]): GroupCluster[] {
    // Simple deduplication - in practice would be more sophisticated
    const uniqueGroups = new Map<string, GroupCluster>();
    
    groups.forEach(group => {
      const key = group.nodes.map(n => n.id).sort().join('-');
      if (!uniqueGroups.has(key) || 
          group.metadata.confidence > uniqueGroups.get(key)!.metadata.confidence) {
        uniqueGroups.set(key, group);
      }
    });
    
    return Array.from(uniqueGroups.values());
  }
}

/**
 * Connectivity Grouping Strategy - Uses graph algorithms for community detection
 */
export class ConnectivityGroupingStrategy implements GroupingStrategy {
  name = 'connectivity';
  displayName = 'Connectivity-Based Grouping';
  description = 'Detects communities using graph connectivity analysis';
  priority = 2;

  async detectGroups(nodes: FlowNode[], edges: FlowEdge[]): Promise<GroupCluster[]> {
    // Build adjacency map
    const adjacency = this.buildAdjacencyMap(nodes, edges);
    
    // Apply community detection algorithm (simplified Louvain)
    const communities = this.detectCommunities(adjacency);
    
    // Convert communities to group clusters
    return this.convertCommunitiesToGroups(communities, nodes);
  }

  canHandle(): boolean { return true; }

  private buildAdjacencyMap(nodes: FlowNode[], edges: FlowEdge[]): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();
    
    nodes.forEach(node => {
      adjacency.set(node.id, new Set());
    });
    
    edges.forEach(edge => {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source); // Treat as undirected for community detection
    });
    
    return adjacency;
  }

  private detectCommunities(adjacency: Map<string, Set<string>>): Map<number, string[]> {
    // Simplified community detection - real implementation would use proper algorithms
    const communities = new Map<number, string[]>();
    const visited = new Set<string>();
    let communityId = 0;

    for (const [nodeId] of adjacency) {
      if (!visited.has(nodeId)) {
        const community = this.findConnectedComponent(nodeId, adjacency, visited);
        if (community.length >= 2) {
          communities.set(communityId++, community);
        }
      }
    }

    return communities;
  }

  private findConnectedComponent(
    startNode: string,
    adjacency: Map<string, Set<string>>,
    visited: Set<string>
  ): string[] {
    const component: string[] = [];
    const stack = [startNode];

    while (stack.length > 0) {
      const current = stack.pop()!;
      
      if (visited.has(current)) continue;
      
      visited.add(current);
      component.push(current);
      
      const neighbors = adjacency.get(current) || new Set();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      });
    }

    return component;
  }

  private convertCommunitiesToGroups(
    communities: Map<number, string[]>,
    allNodes: FlowNode[]
  ): GroupCluster[] {
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const groups: GroupCluster[] = [];

    communities.forEach((nodeIds, communityId) => {
      const nodes = nodeIds.map(id => nodeMap.get(id)!).filter(Boolean);
      
      if (nodes.length >= 2) {
        groups.push({
          id: `community-${communityId}`,
          name: `Community ${communityId}`,
          nodes,
          bounds: this.calculateBounds(nodes),
          center: this.calculateCenter(nodes),
          metadata: {
            detectionMethod: 'connectivity',
            confidence: 0.85,
            characteristics: ['connected-component', `size-${nodes.length}`]
          }
        });
      }
    });

    return groups;
  }

  private calculateBounds(nodes: FlowNode[]): any {
    const positions = nodes.map(n => n.position || { x: 0, y: 0 });
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs) + 200,
      height: Math.max(...ys) - Math.min(...ys) + 100
    };
  }

  private calculateCenter(nodes: FlowNode[]): { x: number; y: number } {
    const positions = nodes.map(n => n.position || { x: 0, y: 0 });
    const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
    
    return { x: avgX, y: avgY };
  }
}

// Placeholder implementations for other strategies
export class StructuralGroupingStrategy implements GroupingStrategy {
  name = 'structural';
  displayName = 'Structural Grouping';
  description = 'Groups nodes based on structural patterns';
  priority = 3;

  async detectGroups(nodes: FlowNode[], edges: FlowEdge[]): Promise<GroupCluster[]> {
    // Placeholder - would implement structural pattern detection
    return [];
  }

  canHandle(): boolean { return true; }
}

export class TemporalGroupingStrategy implements GroupingStrategy {
  name = 'temporal';
  displayName = 'Temporal Grouping';
  description = 'Groups nodes based on temporal relationships';
  priority = 4;

  async detectGroups(nodes: FlowNode[], edges: FlowEdge[]): Promise<GroupCluster[]> {
    // Placeholder - would implement temporal analysis
    return [];
  }

  canHandle(): boolean { return true; }
}