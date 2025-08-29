/**
 * Hierarchical Grouping System
 * 
 * This system manages nested group structures with advanced hierarchy operations,
 * including collapse/expand functionality, parent-child relationships, and
 * intelligent hierarchy construction.
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import { GroupCluster } from '../layoutEngine/types';

/**
 * Hierarchical group structure
 */
export interface GroupHierarchy {
  /** Unique group identifier */
  id: string;
  
  /** Group display name */
  name: string;
  
  /** Hierarchy level (0 = root) */
  level: number;
  
  /** Parent group ID */
  parentId?: string;
  
  /** Child group IDs */
  childIds: string[];
  
  /** Direct member nodes */
  nodeIds: string[];
  
  /** All descendant nodes (including from child groups) */
  allNodeIds: string[];
  
  /** Group visual bounds */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Collapse state */
  collapsed: boolean;
  
  /** Group metadata */
  metadata: {
    /** How this hierarchy level was determined */
    hierarchyMethod: string;
    
    /** Confidence in hierarchy placement */
    confidence: number;
    
    /** Group characteristics */
    characteristics: string[];
    
    /** Visual style preferences */
    style?: {
      color?: string;
      borderStyle?: 'solid' | 'dashed' | 'dotted';
      opacity?: number;
    };
  };
  
  /** Representative node when collapsed */
  representativeNode?: FlowNode;
}

/**
 * Hierarchy construction configuration
 */
export interface HierarchyConfig {
  /** Maximum hierarchy depth */
  maxDepth: number;
  
  /** Minimum nodes per group at each level */
  minNodesPerGroup: number;
  
  /** Maximum nodes per group at each level */
  maxNodesPerGroup: number;
  
  /** Hierarchy construction method */
  constructionMethod: 'bottom-up' | 'top-down' | 'hybrid';
  
  /** Similarity threshold for grouping */
  similarityThreshold: number;
  
  /** Auto-collapse large groups */
  autoCollapse: {
    enabled: boolean;
    threshold: number;
  };
  
  /** Visual hierarchy indicators */
  visualIndicators: {
    showLevelColors: boolean;
    showNesting: boolean;
    indentationSize: number;
  };
}

/**
 * Hierarchy operation types
 */
export type HierarchyOperation = 
  | 'expand-all'
  | 'collapse-all'
  | 'expand-group'
  | 'collapse-group'
  | 'expand-level'
  | 'collapse-level'
  | 'auto-organize'
  | 'flatten'
  | 'rebuild';

/**
 * Main Hierarchical Grouping Manager
 */
export class HierarchicalGroupManager {
  private hierarchy: Map<string, GroupHierarchy> = new Map();
  private config: HierarchyConfig;
  private rootGroups: Set<string> = new Set();
  private maxLevelReached: number = 0;
  
  constructor(config?: Partial<HierarchyConfig>) {
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Build hierarchical structure from flat groups
   */
  async buildHierarchy(
    groups: GroupCluster[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<GroupHierarchy[]> {
    // Clear existing hierarchy
    this.clearHierarchy();
    
    switch (this.config.constructionMethod) {
      case 'bottom-up':
        return this.buildBottomUpHierarchy(groups, nodes, edges);
      case 'top-down':
        return this.buildTopDownHierarchy(groups, nodes, edges);
      case 'hybrid':
        return this.buildHybridHierarchy(groups, nodes, edges);
      default:
        return this.buildBottomUpHierarchy(groups, nodes, edges);
    }
  }

  /**
   * Bottom-up hierarchy construction
   */
  private async buildBottomUpHierarchy(
    groups: GroupCluster[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<GroupHierarchy[]> {
    // Start with leaf level groups
    let currentLevel = 0;
    let currentGroups = this.convertToHierarchicalGroups(groups, currentLevel);
    
    // Add to hierarchy
    currentGroups.forEach(group => {
      this.hierarchy.set(group.id, group);
      this.rootGroups.add(group.id);
    });

    // Build levels upward
    while (currentLevel < this.config.maxDepth && currentGroups.length > 1) {
      const parentGroups = await this.createParentLevel(
        currentGroups,
        currentLevel + 1,
        nodes,
        edges
      );
      
      if (parentGroups.length === 0 || parentGroups.length >= currentGroups.length) {
        break; // No meaningful grouping found
      }
      
      // Update relationships
      this.updateParentChildRelationships(parentGroups, currentGroups);
      
      // Add new level to hierarchy
      parentGroups.forEach(group => {
        this.hierarchy.set(group.id, group);
        this.rootGroups.add(group.id);
      });
      
      // Remove child groups from root level
      currentGroups.forEach(childGroup => {
        this.rootGroups.delete(childGroup.id);
      });
      
      currentGroups = parentGroups;
      currentLevel++;
    }
    
    this.maxLevelReached = currentLevel;
    return Array.from(this.hierarchy.values());
  }

  /**
   * Create parent level by clustering current groups
   */
  private async createParentLevel(
    childGroups: GroupHierarchy[],
    level: number,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<GroupHierarchy[]> {
    const parentGroups: GroupHierarchy[] = [];
    const processed = new Set<string>();
    
    // Calculate similarity matrix between child groups
    const similarities = this.calculateGroupSimilarities(childGroups, edges);
    
    // Cluster similar groups
    const clusters = this.clusterBysimilarity(similarities, this.config.similarityThreshold);
    
    clusters.forEach((cluster, index) => {
      if (cluster.length >= 2) { // Need at least 2 children for a parent
        const parentGroup = this.createParentGroup(cluster, level, index);
        parentGroups.push(parentGroup);
        
        cluster.forEach(childId => processed.add(childId));
      }
    });
    
    // Handle ungrouped children
    const ungrouped = childGroups.filter(group => !processed.has(group.id));
    if (ungrouped.length === 1) {
      // Promote single child to parent level
      const promoted = { ...ungrouped[0], level };
      parentGroups.push(promoted);
    }
    
    return parentGroups;
  }

  /**
   * Calculate similarities between groups
   */
  private calculateGroupSimilarities(
    groups: GroupHierarchy[],
    edges: FlowEdge[]
  ): Map<string, Map<string, number>> {
    const similarities = new Map<string, Map<string, number>>();
    
    groups.forEach(groupA => {
      const aMap = new Map<string, number>();
      similarities.set(groupA.id, aMap);
      
      groups.forEach(groupB => {
        if (groupA.id !== groupB.id) {
          const similarity = this.calculatePairwiseGroupSimilarity(groupA, groupB, edges);
          aMap.set(groupB.id, similarity);
        }
      });
    });
    
    return similarities;
  }

  /**
   * Calculate similarity between two groups
   */
  private calculatePairwiseGroupSimilarity(
    groupA: GroupHierarchy,
    groupB: GroupHierarchy,
    edges: FlowEdge[]
  ): number {
    // Connectivity similarity
    const connectivitySim = this.calculateConnectivitySimilarity(groupA, groupB, edges);
    
    // Spatial similarity
    const spatialSim = this.calculateSpatialSimilarity(groupA, groupB);
    
    // Semantic similarity
    const semanticSim = this.calculateSemanticSimilarity(groupA, groupB);
    
    // Weighted combination
    return (connectivitySim * 0.5) + (spatialSim * 0.3) + (semanticSim * 0.2);
  }

  /**
   * Calculate connectivity similarity between groups
   */
  private calculateConnectivitySimilarity(
    groupA: GroupHierarchy,
    groupB: GroupHierarchy,
    edges: FlowEdge[]
  ): number {
    const nodesA = new Set(groupA.allNodeIds);
    const nodesB = new Set(groupB.allNodeIds);
    
    // Count connections between groups
    const connections = edges.filter(edge => 
      (nodesA.has(edge.source) && nodesB.has(edge.target)) ||
      (nodesB.has(edge.source) && nodesA.has(edge.target))
    );
    
    // Normalize by group sizes
    const maxConnections = Math.min(nodesA.size, nodesB.size);
    return maxConnections > 0 ? connections.length / maxConnections : 0;
  }

  /**
   * Calculate spatial proximity similarity
   */
  private calculateSpatialSimilarity(
    groupA: GroupHierarchy,
    groupB: GroupHierarchy
  ): number {
    const centerA = {
      x: groupA.bounds.x + groupA.bounds.width / 2,
      y: groupA.bounds.y + groupA.bounds.height / 2
    };
    
    const centerB = {
      x: groupB.bounds.x + groupB.bounds.width / 2,
      y: groupB.bounds.y + groupB.bounds.height / 2
    };
    
    const distance = Math.sqrt(
      Math.pow(centerA.x - centerB.x, 2) + Math.pow(centerA.y - centerB.y, 2)
    );
    
    // Normalize distance (closer = more similar)
    const maxDistance = 1000; // Configurable
    return Math.max(0, 1 - (distance / maxDistance));
  }

  /**
   * Calculate semantic similarity between groups
   */
  private calculateSemanticSimilarity(
    groupA: GroupHierarchy,
    groupB: GroupHierarchy
  ): number {
    // Compare group characteristics
    const characteristicsA = new Set(groupA.metadata.characteristics);
    const characteristicsB = new Set(groupB.metadata.characteristics);
    
    const intersection = new Set([...characteristicsA].filter(x => characteristicsB.has(x)));
    const union = new Set([...characteristicsA, ...characteristicsB]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Cluster groups by similarity
   */
  private clusterBysimilarity(
    similarities: Map<string, Map<string, number>>,
    threshold: number
  ): string[][] {
    const clusters: string[][] = [];
    const processed = new Set<string>();
    
    similarities.forEach((groupSims, groupId) => {
      if (processed.has(groupId)) return;
      
      const cluster = [groupId];
      processed.add(groupId);
      
      // Find similar groups
      groupSims.forEach((similarity, otherId) => {
        if (!processed.has(otherId) && similarity >= threshold) {
          cluster.push(otherId);
          processed.add(otherId);
        }
      });
      
      clusters.push(cluster);
    });
    
    return clusters;
  }

  /**
   * Create parent group from child cluster
   */
  private createParentGroup(
    childIds: string[],
    level: number,
    index: number
  ): GroupHierarchy {
    const childGroups = childIds.map(id => this.hierarchy.get(id)!);
    
    // Calculate combined bounds
    const allBounds = childGroups.map(g => g.bounds);
    const minX = Math.min(...allBounds.map(b => b.x));
    const minY = Math.min(...allBounds.map(b => b.y));
    const maxX = Math.max(...allBounds.map(b => b.x + b.width));
    const maxY = Math.max(...allBounds.map(b => b.y + b.height));
    
    // Collect all descendant nodes
    const allNodeIds = new Set<string>();
    childGroups.forEach(child => {
      child.allNodeIds.forEach(nodeId => allNodeIds.add(nodeId));
    });
    
    return {
      id: `parent-${level}-${index}`,
      name: `Group Level ${level}`,
      level,
      childIds,
      nodeIds: [], // Parent groups don't have direct nodes
      allNodeIds: Array.from(allNodeIds),
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      collapsed: this.shouldAutoCollapse(Array.from(allNodeIds)),
      metadata: {
        hierarchyMethod: 'bottom-up-clustering',
        confidence: 0.8,
        characteristics: this.mergeCharacteristics(childGroups)
      }
    };
  }

  /**
   * Update parent-child relationships
   */
  private updateParentChildRelationships(
    parentGroups: GroupHierarchy[],
    childGroups: GroupHierarchy[]
  ): void {
    parentGroups.forEach(parent => {
      parent.childIds.forEach(childId => {
        const child = this.hierarchy.get(childId);
        if (child) {
          child.parentId = parent.id;
          this.hierarchy.set(childId, child);
        }
      });
    });
  }

  // ==========================================================================
  // HIERARCHY OPERATIONS
  // ==========================================================================

  /**
   * Perform hierarchy operation
   */
  async performOperation(
    operation: HierarchyOperation,
    targetId?: string,
    level?: number
  ): Promise<void> {
    switch (operation) {
      case 'expand-all':
        this.expandAll();
        break;
      case 'collapse-all':
        this.collapseAll();
        break;
      case 'expand-group':
        if (targetId) this.expandGroup(targetId);
        break;
      case 'collapse-group':
        if (targetId) this.collapseGroup(targetId);
        break;
      case 'expand-level':
        if (level !== undefined) this.expandLevel(level);
        break;
      case 'collapse-level':
        if (level !== undefined) this.collapseLevel(level);
        break;
      case 'auto-organize':
        this.autoOrganize();
        break;
      case 'flatten':
        this.flattenHierarchy();
        break;
      case 'rebuild':
        // Would trigger full rebuild - requires external data
        break;
    }
  }

  /**
   * Expand specific group
   */
  expandGroup(groupId: string): void {
    const group = this.hierarchy.get(groupId);
    if (group && group.collapsed) {
      group.collapsed = false;
      this.hierarchy.set(groupId, group);
      
      // Recursively expand children if needed
      this.expandChildren(groupId);
    }
  }

  /**
   * Collapse specific group
   */
  collapseGroup(groupId: string): void {
    const group = this.hierarchy.get(groupId);
    if (group && !group.collapsed) {
      group.collapsed = true;
      this.hierarchy.set(groupId, group);
      
      // Create representative node
      this.createRepresentativeNode(group);
    }
  }

  /**
   * Expand all groups at specific level
   */
  expandLevel(level: number): void {
    this.hierarchy.forEach(group => {
      if (group.level === level) {
        this.expandGroup(group.id);
      }
    });
  }

  /**
   * Collapse all groups at specific level
   */
  collapseLevel(level: number): void {
    this.hierarchy.forEach(group => {
      if (group.level === level) {
        this.collapseGroup(group.id);
      }
    });
  }

  /**
   * Auto-organize based on usage patterns
   */
  private autoOrganize(): void {
    // Implement intelligent auto-organization
    // This would analyze usage patterns and optimize the hierarchy
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Convert flat groups to hierarchical format
   */
  private convertToHierarchicalGroups(
    groups: GroupCluster[],
    level: number
  ): GroupHierarchy[] {
    return groups.map(group => ({
      id: group.id,
      name: group.name,
      level,
      childIds: [],
      nodeIds: group.nodes.map(n => n.id),
      allNodeIds: group.nodes.map(n => n.id),
      bounds: {
        x: group.bounds.x || 0,
        y: group.bounds.y || 0,
        width: group.bounds.width || 200,
        height: group.bounds.height || 100
      },
      collapsed: false,
      metadata: {
        hierarchyMethod: 'flat-conversion',
        confidence: group.metadata.confidence,
        characteristics: group.metadata.characteristics
      }
    }));
  }

  /**
   * Check if group should be auto-collapsed
   */
  private shouldAutoCollapse(nodeIds: string[]): boolean {
    return this.config.autoCollapse.enabled && 
           nodeIds.length >= this.config.autoCollapse.threshold;
  }

  /**
   * Merge characteristics from child groups
   */
  private mergeCharacteristics(childGroups: GroupHierarchy[]): string[] {
    const allCharacteristics = new Set<string>();
    childGroups.forEach(child => {
      child.metadata.characteristics.forEach(char => allCharacteristics.add(char));
    });
    
    return Array.from(allCharacteristics);
  }

  /**
   * Create representative node for collapsed group
   */
  private createRepresentativeNode(group: GroupHierarchy): void {
    // Create a representative node that summarizes the collapsed group
    const representative: FlowNode = {
      id: `rep-${group.id}`,
      type: 'group-representative',
      position: {
        x: group.bounds.x + group.bounds.width / 2,
        y: group.bounds.y + group.bounds.height / 2
      },
      data: {
        label: `${group.name} (${group.allNodeIds.length} nodes)`,
        groupId: group.id,
        nodeCount: group.allNodeIds.length,
        isRepresentative: true
      }
    };
    
    group.representativeNode = representative;
    this.hierarchy.set(group.id, group);
  }

  /**
   * Recursively expand children
   */
  private expandChildren(groupId: string): void {
    const group = this.hierarchy.get(groupId);
    if (group) {
      group.childIds.forEach(childId => {
        this.expandGroup(childId);
      });
    }
  }

  /**
   * Expand all groups
   */
  private expandAll(): void {
    this.hierarchy.forEach(group => {
      group.collapsed = false;
      this.hierarchy.set(group.id, group);
    });
  }

  /**
   * Collapse all groups
   */
  private collapseAll(): void {
    this.hierarchy.forEach(group => {
      this.collapseGroup(group.id);
    });
  }

  /**
   * Flatten hierarchy to single level
   */
  private flattenHierarchy(): void {
    this.hierarchy.forEach(group => {
      if (group.level > 0) {
        group.level = 0;
        group.parentId = undefined;
        this.rootGroups.add(group.id);
        this.hierarchy.set(group.id, group);
      }
    });
  }

  /**
   * Clear existing hierarchy
   */
  private clearHierarchy(): void {
    this.hierarchy.clear();
    this.rootGroups.clear();
    this.maxLevelReached = 0;
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<HierarchyConfig>): HierarchyConfig {
    return {
      maxDepth: 4,
      minNodesPerGroup: 2,
      maxNodesPerGroup: 20,
      constructionMethod: 'bottom-up',
      similarityThreshold: 0.6,
      autoCollapse: {
        enabled: true,
        threshold: 10
      },
      visualIndicators: {
        showLevelColors: true,
        showNesting: true,
        indentationSize: 20
      },
      ...config
    };
  }

  // Top-down and hybrid construction methods (placeholder implementations)
  private async buildTopDownHierarchy(
    groups: GroupCluster[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<GroupHierarchy[]> {
    // Placeholder - would implement top-down hierarchy construction
    return this.buildBottomUpHierarchy(groups, nodes, edges);
  }

  private async buildHybridHierarchy(
    groups: GroupCluster[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<GroupHierarchy[]> {
    // Placeholder - would implement hybrid approach
    return this.buildBottomUpHierarchy(groups, nodes, edges);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get all groups in hierarchy
   */
  getAllGroups(): GroupHierarchy[] {
    return Array.from(this.hierarchy.values());
  }

  /**
   * Get root level groups
   */
  getRootGroups(): GroupHierarchy[] {
    return Array.from(this.rootGroups).map(id => this.hierarchy.get(id)!);
  }

  /**
   * Get group by ID
   */
  getGroup(id: string): GroupHierarchy | undefined {
    return this.hierarchy.get(id);
  }

  /**
   * Get children of a group
   */
  getChildren(groupId: string): GroupHierarchy[] {
    const group = this.hierarchy.get(groupId);
    return group ? group.childIds.map(id => this.hierarchy.get(id)!) : [];
  }

  /**
   * Get parent of a group
   */
  getParent(groupId: string): GroupHierarchy | undefined {
    const group = this.hierarchy.get(groupId);
    return group?.parentId ? this.hierarchy.get(group.parentId) : undefined;
  }

  /**
   * Get hierarchy statistics
   */
  getHierarchyStats(): {
    totalGroups: number;
    maxLevel: number;
    rootGroups: number;
    collapsedGroups: number;
    totalNodes: number;
  } {
    const groups = Array.from(this.hierarchy.values());
    const collapsed = groups.filter(g => g.collapsed).length;
    const totalNodes = new Set(groups.flatMap(g => g.allNodeIds)).size;
    
    return {
      totalGroups: groups.length,
      maxLevel: this.maxLevelReached,
      rootGroups: this.rootGroups.size,
      collapsedGroups: collapsed,
      totalNodes
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HierarchyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}