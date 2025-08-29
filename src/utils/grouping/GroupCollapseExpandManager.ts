/**
 * Group Collapse/Expand Manager
 * 
 * This system manages the collapse and expand functionality for groups with
 * representative nodes, smooth animations, and intelligent state management.
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import { useSpring, animated } from '@react-spring/web';
import { GroupHierarchy } from './HierarchicalGrouping';

/**
 * Animation configuration for collapse/expand operations
 */
export interface CollapseAnimationConfig {
  /** Duration of collapse/expand animation in milliseconds */
  duration: number;
  
  /** Easing function for animation */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
  
  /** Stagger delay between multiple group animations */
  stagger: number;
  
  /** Scale animation configuration */
  scale: {
    from: number;
    to: number;
    enabled: boolean;
  };
  
  /** Opacity animation configuration */
  opacity: {
    from: number;
    to: number;
    enabled: boolean;
  };
  
  /** Position animation configuration */
  position: {
    enabled: boolean;
    centerOnCollapse: boolean;
  };
}

/**
 * Representative node configuration
 */
export interface RepresentativeNodeConfig {
  /** How to determine the representative node */
  selectionMethod: 'central' | 'most-connected' | 'first' | 'custom';
  
  /** Visual style for representative node */
  style: {
    /** Scale multiplier for representative node */
    scaleFactor: number;
    
    /** Special styling indicators */
    showGroupCount: boolean;
    showGroupPreview: boolean;
    
    /** Color scheme */
    colorScheme: 'inherit' | 'highlight' | 'custom';
    customColor?: string;
    
    /** Border styling */
    borderStyle: 'solid' | 'dashed' | 'dotted';
    borderWidth: number;
  };
  
  /** Interaction behavior */
  interaction: {
    /** Show tooltip with group info on hover */
    showTooltip: boolean;
    
    /** Allow double-click to expand */
    doubleClickExpand: boolean;
    
    /** Show context menu for group operations */
    showContextMenu: boolean;
  };
}

/**
 * Collapse state information
 */
export interface CollapseState {
  /** Group ID */
  groupId: string;
  
  /** Whether group is currently collapsed */
  collapsed: boolean;
  
  /** Representative node if collapsed */
  representativeNode?: FlowNode;
  
  /** Original positions of collapsed nodes */
  originalPositions: Map<string, { x: number; y: number }>;
  
  /** Animation state */
  animating: boolean;
  
  /** Collapse timestamp */
  collapsedAt?: number;
  
  /** Expand timestamp */
  expandedAt?: number;
}

/**
 * Collapse operation result
 */
export interface CollapseResult {
  /** Whether operation was successful */
  success: boolean;
  
  /** Updated nodes list */
  updatedNodes: FlowNode[];
  
  /** Updated edges list */
  updatedEdges: FlowEdge[];
  
  /** Animation promise */
  animationPromise?: Promise<void>;
  
  /** Error message if failed */
  error?: string;
}

/**
 * Main Group Collapse/Expand Manager
 */
export class GroupCollapseExpandManager {
  private collapseStates = new Map<string, CollapseState>();
  private animationConfig: CollapseAnimationConfig;
  private representativeConfig: RepresentativeNodeConfig;
  private activeAnimations = new Set<string>();
  
  constructor(
    animationConfig?: Partial<CollapseAnimationConfig>,
    representativeConfig?: Partial<RepresentativeNodeConfig>
  ) {
    this.animationConfig = this.mergeAnimationDefaults(animationConfig);
    this.representativeConfig = this.mergeRepresentativeDefaults(representativeConfig);
  }

  /**
   * Collapse a group with animation
   */
  async collapseGroup(
    groupId: string,
    group: GroupHierarchy,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<CollapseResult> {
    try {
      // Check if already collapsed or animating
      const currentState = this.collapseStates.get(groupId);
      if (currentState?.collapsed || this.activeAnimations.has(groupId)) {
        return {
          success: false,
          updatedNodes: nodes,
          updatedEdges: edges,
          error: 'Group already collapsed or animating'
        };
      }

      // Find nodes that belong to this group
      const groupNodes = nodes.filter(node => group.allNodeIds.includes(node.id));
      const otherNodes = nodes.filter(node => !group.allNodeIds.includes(node.id));
      
      if (groupNodes.length === 0) {
        return {
          success: false,
          updatedNodes: nodes,
          updatedEdges: edges,
          error: 'No nodes found in group'
        };
      }

      // Create representative node
      const representativeNode = this.createRepresentativeNode(group, groupNodes);
      
      // Store original positions
      const originalPositions = new Map<string, { x: number; y: number }>();
      groupNodes.forEach(node => {
        if (node.position) {
          originalPositions.set(node.id, { x: node.position.x, y: node.position.y });
        }
      });

      // Create collapse state
      const collapseState: CollapseState = {
        groupId,
        collapsed: true,
        representativeNode,
        originalPositions,
        animating: true,
        collapsedAt: Date.now()
      };

      this.collapseStates.set(groupId, collapseState);
      this.activeAnimations.add(groupId);

      // Create updated nodes list (remove group nodes, add representative)
      const updatedNodes = [...otherNodes, representativeNode];
      
      // Update edges to connect to representative node
      const updatedEdges = this.updateEdgesForCollapse(edges, group.allNodeIds, representativeNode.id);

      // Start animation
      const animationPromise = this.animateCollapse(groupNodes, representativeNode);
      
      animationPromise.finally(() => {
        this.activeAnimations.delete(groupId);
        const state = this.collapseStates.get(groupId);
        if (state) {
          state.animating = false;
          this.collapseStates.set(groupId, state);
        }
      });

      return {
        success: true,
        updatedNodes,
        updatedEdges,
        animationPromise
      };

    } catch (error) {
      return {
        success: false,
        updatedNodes: nodes,
        updatedEdges: edges,
        error: `Collapse failed: ${error.message}`
      };
    }
  }

  /**
   * Expand a collapsed group with animation
   */
  async expandGroup(
    groupId: string,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<CollapseResult> {
    try {
      const collapseState = this.collapseStates.get(groupId);
      
      if (!collapseState?.collapsed || this.activeAnimations.has(groupId)) {
        return {
          success: false,
          updatedNodes: nodes,
          updatedEdges: edges,
          error: 'Group not collapsed or currently animating'
        };
      }

      // Get original group nodes with restored positions
      const restoredNodes = this.restoreGroupNodes(collapseState);
      
      // Remove representative node from current nodes
      const otherNodes = nodes.filter(node => node.id !== collapseState.representativeNode?.id);
      
      // Create updated nodes list
      const updatedNodes = [...otherNodes, ...restoredNodes];
      
      // Restore original edges
      const updatedEdges = this.updateEdgesForExpand(edges, collapseState);

      // Update collapse state
      collapseState.collapsed = false;
      collapseState.animating = true;
      collapseState.expandedAt = Date.now();
      this.collapseStates.set(groupId, collapseState);
      this.activeAnimations.add(groupId);

      // Start animation
      const animationPromise = this.animateExpand(restoredNodes, collapseState.representativeNode!);
      
      animationPromise.finally(() => {
        this.activeAnimations.delete(groupId);
        this.collapseStates.delete(groupId); // Remove state after expansion
      });

      return {
        success: true,
        updatedNodes,
        updatedEdges,
        animationPromise
      };

    } catch (error) {
      return {
        success: false,
        updatedNodes: nodes,
        updatedEdges: edges,
        error: `Expand failed: ${error.message}`
      };
    }
  }

  /**
   * Toggle collapse state of a group
   */
  async toggleGroup(
    groupId: string,
    group: GroupHierarchy,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<CollapseResult> {
    const collapseState = this.collapseStates.get(groupId);
    
    if (collapseState?.collapsed) {
      return this.expandGroup(groupId, nodes, edges);
    } else {
      return this.collapseGroup(groupId, group, nodes, edges);
    }
  }

  // ==========================================================================
  // REPRESENTATIVE NODE CREATION
  // ==========================================================================

  /**
   * Create representative node for collapsed group
   */
  private createRepresentativeNode(group: GroupHierarchy, groupNodes: FlowNode[]): FlowNode {
    const selectedNode = this.selectRepresentativeNode(groupNodes);
    const centerPosition = this.calculateGroupCenter(groupNodes);
    
    const representativeNode: FlowNode = {
      id: `rep-${group.id}`,
      type: 'group-representative',
      position: centerPosition,
      data: {
        label: this.generateRepresentativeLabel(group, groupNodes),
        originalGroupId: group.id,
        nodeCount: groupNodes.length,
        isRepresentative: true,
        groupLevel: group.level,
        representedNodes: groupNodes.map(n => n.id),
        
        // Visual styling
        style: this.generateRepresentativeStyle(selectedNode),
        
        // Metadata for interactions
        metadata: {
          originalNode: selectedNode,
          groupCharacteristics: group.metadata.characteristics,
          groupBounds: group.bounds
        }
      }
    };

    return representativeNode;
  }

  /**
   * Select which node should represent the group
   */
  private selectRepresentativeNode(groupNodes: FlowNode[]): FlowNode {
    switch (this.representativeConfig.selectionMethod) {
      case 'central':
        return this.findMostCentralNode(groupNodes);
        
      case 'most-connected':
        return this.findMostConnectedNode(groupNodes);
        
      case 'first':
        return groupNodes[0];
        
      case 'custom':
        // Would implement custom selection logic
        return groupNodes[0];
        
      default:
        return groupNodes[0];
    }
  }

  /**
   * Find the most central node in the group
   */
  private findMostCentralNode(groupNodes: FlowNode[]): FlowNode {
    if (groupNodes.length === 1) return groupNodes[0];
    
    const center = this.calculateGroupCenter(groupNodes);
    
    let closestNode = groupNodes[0];
    let minDistance = Infinity;
    
    groupNodes.forEach(node => {
      if (node.position) {
        const distance = Math.sqrt(
          Math.pow(node.position.x - center.x, 2) + 
          Math.pow(node.position.y - center.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestNode = node;
        }
      }
    });
    
    return closestNode;
  }

  /**
   * Find the most connected node in the group
   */
  private findMostConnectedNode(groupNodes: FlowNode[]): FlowNode {
    // This would require edge information - simplified implementation
    return groupNodes[0];
  }

  /**
   * Calculate the center position of the group
   */
  private calculateGroupCenter(groupNodes: FlowNode[]): { x: number; y: number } {
    const positions = groupNodes
      .map(node => node.position)
      .filter((pos): pos is { x: number; y: number } => pos != null);
    
    if (positions.length === 0) {
      return { x: 0, y: 0 };
    }
    
    const sumX = positions.reduce((sum, pos) => sum + pos.x, 0);
    const sumY = positions.reduce((sum, pos) => sum + pos.y, 0);
    
    return {
      x: sumX / positions.length,
      y: sumY / positions.length
    };
  }

  /**
   * Generate label for representative node
   */
  private generateRepresentativeLabel(group: GroupHierarchy, groupNodes: FlowNode[]): string {
    const baseLabel = group.name || `Group ${group.id}`;
    
    if (this.representativeConfig.style.showGroupCount) {
      return `${baseLabel} (${groupNodes.length})`;
    }
    
    return baseLabel;
  }

  /**
   * Generate style for representative node
   */
  private generateRepresentativeStyle(originalNode: FlowNode): any {
    const config = this.representativeConfig.style;
    
    return {
      transform: `scale(${config.scaleFactor})`,
      border: `${config.borderWidth}px ${config.borderStyle} ${this.getRepresentativeColor()}`,
      opacity: 0.9,
      ...originalNode.data?.style
    };
  }

  /**
   * Get color for representative node
   */
  private getRepresentativeColor(): string {
    const config = this.representativeConfig.style;
    
    switch (config.colorScheme) {
      case 'highlight':
        return '#ff6b6b';
      case 'custom':
        return config.customColor || '#3498db';
      case 'inherit':
      default:
        return 'inherit';
    }
  }

  // ==========================================================================
  // EDGE MANAGEMENT
  // ==========================================================================

  /**
   * Update edges when collapsing a group
   */
  private updateEdgesForCollapse(
    edges: FlowEdge[],
    groupNodeIds: string[],
    representativeId: string
  ): FlowEdge[] {
    const groupNodeSet = new Set(groupNodeIds);
    const updatedEdges: FlowEdge[] = [];
    const externalConnections = new Set<string>();

    edges.forEach(edge => {
      const sourceInGroup = groupNodeSet.has(edge.source);
      const targetInGroup = groupNodeSet.has(edge.target);

      if (sourceInGroup && targetInGroup) {
        // Internal edge - remove it
        return;
      } else if (sourceInGroup) {
        // Edge from group to external node
        const newEdgeId = `${representativeId}-${edge.target}`;
        if (!externalConnections.has(newEdgeId)) {
          updatedEdges.push({
            ...edge,
            id: newEdgeId,
            source: representativeId,
            data: {
              ...edge.data,
              isGroupEdge: true,
              originalSource: edge.source,
              representedEdges: [edge.id]
            }
          });
          externalConnections.add(newEdgeId);
        }
      } else if (targetInGroup) {
        // Edge from external node to group
        const newEdgeId = `${edge.source}-${representativeId}`;
        if (!externalConnections.has(newEdgeId)) {
          updatedEdges.push({
            ...edge,
            id: newEdgeId,
            target: representativeId,
            data: {
              ...edge.data,
              isGroupEdge: true,
              originalTarget: edge.target,
              representedEdges: [edge.id]
            }
          });
          externalConnections.add(newEdgeId);
        }
      } else {
        // External edge - keep as is
        updatedEdges.push(edge);
      }
    });

    return updatedEdges;
  }

  /**
   * Update edges when expanding a group
   */
  private updateEdgesForExpand(edges: FlowEdge[], collapseState: CollapseState): FlowEdge[] {
    const representativeId = collapseState.representativeNode?.id;
    if (!representativeId) return edges;

    const updatedEdges: FlowEdge[] = [];

    edges.forEach(edge => {
      if (edge.data?.isGroupEdge && (edge.source === representativeId || edge.target === representativeId)) {
        // This is a group edge - restore original edges
        const representedEdges = edge.data.representedEdges || [];
        // Would restore original edges from stored state
        // For now, skip the group edges
        return;
      } else {
        // Keep non-group edges
        updatedEdges.push(edge);
      }
    });

    return updatedEdges;
  }

  // ==========================================================================
  // ANIMATION SYSTEM
  // ==========================================================================

  /**
   * Animate group collapse
   */
  private async animateCollapse(groupNodes: FlowNode[], representativeNode: FlowNode): Promise<void> {
    const config = this.animationConfig;
    
    return new Promise((resolve) => {
      // Calculate target position (representative node position)
      const targetPos = representativeNode.position || { x: 0, y: 0 };

      const animations = groupNodes.map((node, index) => {
        const delay = index * config.stagger;
        
        return new Promise<void>((resolveNode) => {
          setTimeout(() => {
            // This would trigger React Spring animation
            // For now, simulate with timeout
            setTimeout(() => {
              resolveNode();
            }, config.duration);
          }, delay);
        });
      });

      Promise.all(animations).then(() => resolve());
    });
  }

  /**
   * Animate group expand
   */
  private async animateExpand(restoredNodes: FlowNode[], representativeNode: FlowNode): Promise<void> {
    const config = this.animationConfig;
    
    return new Promise((resolve) => {
      const animations = restoredNodes.map((node, index) => {
        const delay = index * config.stagger;
        
        return new Promise<void>((resolveNode) => {
          setTimeout(() => {
            // This would trigger React Spring animation
            // For now, simulate with timeout
            setTimeout(() => {
              resolveNode();
            }, config.duration);
          }, delay);
        });
      });

      Promise.all(animations).then(() => resolve());
    });
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Restore group nodes from collapse state
   */
  private restoreGroupNodes(collapseState: CollapseState): FlowNode[] {
    const restoredNodes: FlowNode[] = [];
    
    // This would restore original nodes with their positions
    // For now, return empty array as placeholder
    
    return restoredNodes;
  }

  /**
   * Get collapse state for a group
   */
  getCollapseState(groupId: string): CollapseState | undefined {
    return this.collapseStates.get(groupId);
  }

  /**
   * Check if group is collapsed
   */
  isGroupCollapsed(groupId: string): boolean {
    const state = this.collapseStates.get(groupId);
    return state?.collapsed ?? false;
  }

  /**
   * Get all collapsed groups
   */
  getCollapsedGroups(): string[] {
    return Array.from(this.collapseStates.entries())
      .filter(([_, state]) => state.collapsed)
      .map(([groupId]) => groupId);
  }

  /**
   * Clear all collapse states
   */
  clearAllStates(): void {
    this.collapseStates.clear();
    this.activeAnimations.clear();
  }

  // ==========================================================================
  // BATCH OPERATIONS
  // ==========================================================================

  /**
   * Collapse multiple groups at once
   */
  async collapseMultipleGroups(
    groupData: Array<{ groupId: string; group: GroupHierarchy }>,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<CollapseResult> {
    const results: CollapseResult[] = [];
    let currentNodes = nodes;
    let currentEdges = edges;

    for (const { groupId, group } of groupData) {
      const result = await this.collapseGroup(groupId, group, currentNodes, currentEdges);
      results.push(result);
      
      if (result.success) {
        currentNodes = result.updatedNodes;
        currentEdges = result.updatedEdges;
      }
    }

    const overallSuccess = results.every(r => r.success);
    const animationPromises = results
      .map(r => r.animationPromise)
      .filter((p): p is Promise<void> => p != null);

    return {
      success: overallSuccess,
      updatedNodes: currentNodes,
      updatedEdges: currentEdges,
      animationPromise: Promise.all(animationPromises).then(() => {}),
      error: overallSuccess ? undefined : 'Some groups failed to collapse'
    };
  }

  /**
   * Expand multiple groups at once
   */
  async expandMultipleGroups(
    groupIds: string[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<CollapseResult> {
    const results: CollapseResult[] = [];
    let currentNodes = nodes;
    let currentEdges = edges;

    for (const groupId of groupIds) {
      const result = await this.expandGroup(groupId, currentNodes, currentEdges);
      results.push(result);
      
      if (result.success) {
        currentNodes = result.updatedNodes;
        currentEdges = result.updatedEdges;
      }
    }

    const overallSuccess = results.every(r => r.success);
    const animationPromises = results
      .map(r => r.animationPromise)
      .filter((p): p is Promise<void> => p != null);

    return {
      success: overallSuccess,
      updatedNodes: currentNodes,
      updatedEdges: currentEdges,
      animationPromise: Promise.all(animationPromises).then(() => {}),
      error: overallSuccess ? undefined : 'Some groups failed to expand'
    };
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Merge animation configuration with defaults
   */
  private mergeAnimationDefaults(config?: Partial<CollapseAnimationConfig>): CollapseAnimationConfig {
    return {
      duration: 300,
      easing: 'ease-out',
      stagger: 50,
      scale: {
        from: 1.0,
        to: 0.1,
        enabled: true
      },
      opacity: {
        from: 1.0,
        to: 0.0,
        enabled: true
      },
      position: {
        enabled: true,
        centerOnCollapse: true
      },
      ...config
    };
  }

  /**
   * Merge representative node configuration with defaults
   */
  private mergeRepresentativeDefaults(config?: Partial<RepresentativeNodeConfig>): RepresentativeNodeConfig {
    return {
      selectionMethod: 'central',
      style: {
        scaleFactor: 1.2,
        showGroupCount: true,
        showGroupPreview: false,
        colorScheme: 'highlight',
        borderStyle: 'solid',
        borderWidth: 2
      },
      interaction: {
        showTooltip: true,
        doubleClickExpand: true,
        showContextMenu: true
      },
      ...config
    };
  }

  /**
   * Update animation configuration
   */
  updateAnimationConfig(newConfig: Partial<CollapseAnimationConfig>): void {
    this.animationConfig = { ...this.animationConfig, ...newConfig };
  }

  /**
   * Update representative node configuration
   */
  updateRepresentativeConfig(newConfig: Partial<RepresentativeNodeConfig>): void {
    this.representativeConfig = { ...this.representativeConfig, ...newConfig };
  }

  /**
   * Get current configurations
   */
  getConfigs(): {
    animation: CollapseAnimationConfig;
    representative: RepresentativeNodeConfig;
  } {
    return {
      animation: { ...this.animationConfig },
      representative: { ...this.representativeConfig }
    };
  }
}