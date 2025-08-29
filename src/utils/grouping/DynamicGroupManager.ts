/**
 * Dynamic Group Manager
 * 
 * This system manages real-time group adjustments based on user interactions,
 * including drag-and-drop regrouping, selection-based grouping, and intelligent
 * group suggestions based on user behavior patterns.
 */

import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import { GroupHierarchy } from './HierarchicalGrouping';
import { SmartGroupDetectionSystem } from './SmartGroupDetection';

/**
 * User interaction types that can trigger regrouping
 */
export type InteractionType = 
  | 'node-drag'
  | 'node-select'
  | 'node-hover'
  | 'group-expand'
  | 'group-collapse'
  | 'zoom-change'
  | 'pan-change'
  | 'search-filter'
  | 'custom-action';

/**
 * Regrouping trigger configuration
 */
export interface RegroupTrigger {
  /** Type of interaction that triggers regrouping */
  interaction: InteractionType;
  
  /** Minimum time between regroup operations (ms) */
  debounceTime: number;
  
  /** Threshold for triggering regroup */
  threshold: number;
  
  /** Whether this trigger is enabled */
  enabled: boolean;
  
  /** Custom condition function */
  condition?: (context: InteractionContext) => boolean;
}

/**
 * Dynamic grouping configuration
 */
export interface DynamicGroupingConfig {
  /** Regrouping triggers */
  triggers: RegroupTrigger[];
  
  /** Regrouping strategies */
  strategies: {
    /** Strategy for handling dragged nodes */
    dragStrategy: 'immediate' | 'on-drop' | 'delayed';
    
    /** Strategy for selection-based grouping */
    selectionStrategy: 'manual' | 'auto' | 'suggested';
    
    /** How aggressive the regrouping should be */
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  };
  
  /** Performance constraints */
  performance: {
    /** Maximum nodes to process in real-time */
    maxRealtimeNodes: number;
    
    /** Maximum time allowed for regroup operation (ms) */
    maxRegroupTime: number;
    
    /** Use background processing for large operations */
    useBackgroundProcessing: boolean;
  };
  
  /** User experience settings */
  userExperience: {
    /** Show preview of regrouping before applying */
    showPreview: boolean;
    
    /** Allow undo for regroup operations */
    allowUndo: boolean;
    
    /** Show suggestions for better grouping */
    showSuggestions: boolean;
    
    /** Animation duration for group changes (ms) */
    animationDuration: number;
  };
}

/**
 * Interaction context information
 */
export interface InteractionContext {
  /** Type of interaction */
  type: InteractionType;
  
  /** Timestamp of interaction */
  timestamp: number;
  
  /** Affected nodes */
  affectedNodes: string[];
  
  /** Current selection */
  selectedNodes: string[];
  
  /** Current viewport state */
  viewport: {
    zoom: number;
    center: { x: number; y: number };
  };
  
  /** User interaction history */
  interactionHistory: InteractionEvent[];
  
  /** Additional context data */
  metadata: Record<string, any>;
}

/**
 * Interaction event record
 */
export interface InteractionEvent {
  type: InteractionType;
  timestamp: number;
  nodeIds: string[];
  groupIds: string[];
  details: Record<string, any>;
}

/**
 * Regrouping operation result
 */
export interface RegroupResult {
  /** Whether regrouping was performed */
  regrouped: boolean;
  
  /** New group structure */
  newGroups?: GroupHierarchy[];
  
  /** Affected group IDs */
  affectedGroups: string[];
  
  /** Reason for regrouping or not regrouping */
  reason: string;
  
  /** Confidence in the regrouping decision */
  confidence: number;
  
  /** Performance metrics */
  performance: {
    executionTime: number;
    nodesProcessed: number;
  };
}

/**
 * Group suggestion for user
 */
export interface GroupSuggestion {
  /** Unique suggestion ID */
  id: string;
  
  /** Suggested operation */
  operation: 'create-group' | 'merge-groups' | 'split-group' | 'move-nodes';
  
  /** Affected nodes or groups */
  targets: string[];
  
  /** Confidence in suggestion */
  confidence: number;
  
  /** Reason for suggestion */
  reason: string;
  
  /** Visual preview information */
  preview?: {
    beforeGroups: GroupHierarchy[];
    afterGroups: GroupHierarchy[];
  };
}

/**
 * Main Dynamic Group Manager
 */
export class DynamicGroupManager {
  private config: DynamicGroupingConfig;
  private groupDetection: SmartGroupDetectionSystem;
  private interactionHistory: InteractionEvent[] = [];
  private regroupTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastRegroupTime = 0;
  private undoStack: GroupHierarchy[][] = [];
  private currentGroups: GroupHierarchy[] = [];
  
  constructor(config?: Partial<DynamicGroupingConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.groupDetection = new SmartGroupDetectionSystem();
  }

  /**
   * Handle user interaction and potentially trigger regrouping
   */
  async handleInteraction(
    interaction: InteractionContext,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<RegroupResult> {
    // Record interaction
    this.recordInteraction(interaction);
    
    // Check if any triggers apply
    const applicableTriggers = this.getApplicableTriggers(interaction);
    
    if (applicableTriggers.length === 0) {
      return {
        regrouped: false,
        affectedGroups: [],
        reason: 'No applicable triggers',
        confidence: 0,
        performance: { executionTime: 0, nodesProcessed: 0 }
      };
    }

    // Determine if regrouping should occur
    const shouldRegroup = await this.shouldTriggerRegroup(
      interaction,
      applicableTriggers,
      currentGroups,
      nodes,
      edges
    );

    if (!shouldRegroup.trigger) {
      return {
        regrouped: false,
        affectedGroups: [],
        reason: shouldRegroup.reason,
        confidence: shouldRegroup.confidence,
        performance: { executionTime: 0, nodesProcessed: 0 }
      };
    }

    // Perform regrouping
    return this.performDynamicRegroup(interaction, currentGroups, nodes, edges);
  }

  /**
   * Perform dynamic regrouping based on interaction
   */
  private async performDynamicRegroup(
    interaction: InteractionContext,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<RegroupResult> {
    const startTime = Date.now();
    
    try {
      // Save current state for undo
      if (this.config.userExperience.allowUndo) {
        this.saveToUndoStack(currentGroups);
      }

      let newGroups: GroupHierarchy[];
      let affectedGroups: string[];

      switch (interaction.type) {
        case 'node-drag':
          ({ newGroups, affectedGroups } = await this.handleNodeDragRegroup(
            interaction, currentGroups, nodes, edges
          ));
          break;

        case 'node-select':
          ({ newGroups, affectedGroups } = await this.handleSelectionRegroup(
            interaction, currentGroups, nodes, edges
          ));
          break;

        case 'zoom-change':
          ({ newGroups, affectedGroups } = await this.handleZoomRegroup(
            interaction, currentGroups, nodes, edges
          ));
          break;

        default:
          ({ newGroups, affectedGroups } = await this.handleGenericRegroup(
            interaction, currentGroups, nodes, edges
          ));
      }

      const executionTime = Date.now() - startTime;
      this.lastRegroupTime = Date.now();
      this.currentGroups = newGroups;

      return {
        regrouped: true,
        newGroups,
        affectedGroups,
        reason: `Regrouped due to ${interaction.type}`,
        confidence: 0.8,
        performance: {
          executionTime,
          nodesProcessed: nodes.length
        }
      };

    } catch (error) {
      return {
        regrouped: false,
        affectedGroups: [],
        reason: `Regrouping failed: ${error.message}`,
        confidence: 0,
        performance: {
          executionTime: Date.now() - startTime,
          nodesProcessed: 0
        }
      };
    }
  }

  /**
   * Handle regrouping based on node drag interactions
   */
  private async handleNodeDragRegroup(
    interaction: InteractionContext,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    const draggedNodes = interaction.affectedNodes;
    const affectedGroups: string[] = [];

    // Find which groups are affected by the drag
    const sourceGroups = currentGroups.filter(group =>
      group.allNodeIds.some(nodeId => draggedNodes.includes(nodeId))
    );

    affectedGroups.push(...sourceGroups.map(g => g.id));

    // Determine strategy based on configuration
    switch (this.config.strategies.dragStrategy) {
      case 'immediate':
        return this.performImmediateDragRegroup(
          draggedNodes, currentGroups, nodes, edges, affectedGroups
        );
        
      case 'on-drop':
        return this.performDropRegroup(
          draggedNodes, currentGroups, nodes, edges, affectedGroups
        );
        
      case 'delayed':
        return this.scheduleDelayedRegroup(
          draggedNodes, currentGroups, nodes, edges, affectedGroups
        );
        
      default:
        return { newGroups: currentGroups, affectedGroups };
    }
  }

  /**
   * Handle regrouping based on selection changes
   */
  private async handleSelectionRegroup(
    interaction: InteractionContext,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    const selectedNodes = interaction.selectedNodes;
    
    if (selectedNodes.length < 2) {
      return { newGroups: currentGroups, affectedGroups: [] };
    }

    switch (this.config.strategies.selectionStrategy) {
      case 'auto':
        return this.performAutoSelectionGrouping(
          selectedNodes, currentGroups, nodes, edges
        );
        
      case 'suggested':
        // Generate suggestions but don't auto-group
        await this.generateGroupingSuggestions(selectedNodes, currentGroups, nodes, edges);
        return { newGroups: currentGroups, affectedGroups: [] };
        
      case 'manual':
      default:
        return { newGroups: currentGroups, affectedGroups: [] };
    }
  }

  /**
   * Handle regrouping based on zoom changes
   */
  private async handleZoomRegroup(
    interaction: InteractionContext,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    const zoomLevel = interaction.viewport.zoom;
    
    // Adjust grouping granularity based on zoom level
    if (zoomLevel < 0.5) {
      // High-level view - create larger, more general groups
      return this.createHighLevelGroups(currentGroups, nodes, edges);
    } else if (zoomLevel > 1.5) {
      // Detailed view - create more specific, smaller groups
      return this.createDetailedGroups(currentGroups, nodes, edges);
    }
    
    return { newGroups: currentGroups, affectedGroups: [] };
  }

  /**
   * Generate grouping suggestions for user
   */
  async generateGroupingSuggestions(
    targetNodes: string[],
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<GroupSuggestion[]> {
    const suggestions: GroupSuggestion[] = [];
    
    // Analyze potential groupings
    const potentialGroups = await this.analyzePotentialGroupings(
      targetNodes, nodes, edges
    );
    
    potentialGroups.forEach((group, index) => {
      if (group.confidence > 0.6) {
        suggestions.push({
          id: `suggestion-${Date.now()}-${index}`,
          operation: 'create-group',
          targets: group.nodeIds,
          confidence: group.confidence,
          reason: group.reason,
          preview: {
            beforeGroups: currentGroups,
            afterGroups: this.previewGrouping(currentGroups, group)
          }
        });
      }
    });
    
    return suggestions;
  }

  /**
   * Apply a grouping suggestion
   */
  async applySuggestion(
    suggestion: GroupSuggestion,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<RegroupResult> {
    const startTime = Date.now();
    
    try {
      let newGroups: GroupHierarchy[];
      
      switch (suggestion.operation) {
        case 'create-group':
          newGroups = await this.createGroupFromSuggestion(
            suggestion, currentGroups, nodes, edges
          );
          break;
          
        case 'merge-groups':
          newGroups = await this.mergeGroupsFromSuggestion(
            suggestion, currentGroups
          );
          break;
          
        case 'split-group':
          newGroups = await this.splitGroupFromSuggestion(
            suggestion, currentGroups, nodes, edges
          );
          break;
          
        case 'move-nodes':
          newGroups = await this.moveNodesFromSuggestion(
            suggestion, currentGroups
          );
          break;
          
        default:
          newGroups = currentGroups;
      }
      
      return {
        regrouped: true,
        newGroups,
        affectedGroups: suggestion.targets,
        reason: `Applied suggestion: ${suggestion.reason}`,
        confidence: suggestion.confidence,
        performance: {
          executionTime: Date.now() - startTime,
          nodesProcessed: suggestion.targets.length
        }
      };
      
    } catch (error) {
      return {
        regrouped: false,
        affectedGroups: [],
        reason: `Failed to apply suggestion: ${error.message}`,
        confidence: 0,
        performance: {
          executionTime: Date.now() - startTime,
          nodesProcessed: 0
        }
      };
    }
  }

  /**
   * Undo last regrouping operation
   */
  undoLastRegroup(): GroupHierarchy[] | null {
    if (this.undoStack.length > 0) {
      const previousState = this.undoStack.pop()!;
      this.currentGroups = previousState;
      return previousState;
    }
    return null;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Record user interaction for analysis
   */
  private recordInteraction(interaction: InteractionContext): void {
    const event: InteractionEvent = {
      type: interaction.type,
      timestamp: interaction.timestamp,
      nodeIds: interaction.affectedNodes,
      groupIds: [], // Would be populated based on affected groups
      details: interaction.metadata
    };
    
    this.interactionHistory.push(event);
    
    // Keep history manageable
    if (this.interactionHistory.length > 1000) {
      this.interactionHistory = this.interactionHistory.slice(-800);
    }
  }

  /**
   * Get applicable triggers for interaction
   */
  private getApplicableTriggers(interaction: InteractionContext): RegroupTrigger[] {
    return this.config.triggers.filter(trigger => {
      if (!trigger.enabled) return false;
      if (trigger.interaction !== interaction.type) return false;
      if (trigger.condition && !trigger.condition(interaction)) return false;
      
      return true;
    });
  }

  /**
   * Determine if regrouping should be triggered
   */
  private async shouldTriggerRegroup(
    interaction: InteractionContext,
    triggers: RegroupTrigger[],
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ trigger: boolean; reason: string; confidence: number }> {
    // Check debounce timing
    const timeSinceLastRegroup = Date.now() - this.lastRegroupTime;
    const minDebounceTime = Math.min(...triggers.map(t => t.debounceTime));
    
    if (timeSinceLastRegroup < minDebounceTime) {
      return {
        trigger: false,
        reason: 'Debounce time not elapsed',
        confidence: 0
      };
    }
    
    // Check performance constraints
    if (nodes.length > this.config.performance.maxRealtimeNodes) {
      return {
        trigger: false,
        reason: 'Too many nodes for real-time processing',
        confidence: 0
      };
    }
    
    // Analyze interaction significance
    const significance = this.analyzeInteractionSignificance(
      interaction, currentGroups, nodes, edges
    );
    
    const maxThreshold = Math.max(...triggers.map(t => t.threshold));
    
    if (significance < maxThreshold) {
      return {
        trigger: false,
        reason: 'Interaction not significant enough',
        confidence: significance
      };
    }
    
    return {
      trigger: true,
      reason: 'Triggers conditions met',
      confidence: significance
    };
  }

  /**
   * Analyze significance of interaction for regrouping
   */
  private analyzeInteractionSignificance(
    interaction: InteractionContext,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): number {
    let significance = 0.5; // Base significance
    
    // Increase significance based on number of affected nodes
    const affectedRatio = interaction.affectedNodes.length / nodes.length;
    significance += affectedRatio * 0.3;
    
    // Increase significance if multiple groups are affected
    const affectedGroups = currentGroups.filter(group =>
      group.allNodeIds.some(nodeId => interaction.affectedNodes.includes(nodeId))
    );
    
    if (affectedGroups.length > 1) {
      significance += 0.2;
    }
    
    // Recent interaction patterns
    const recentSimilarInteractions = this.interactionHistory
      .filter(event => 
        event.type === interaction.type && 
        Date.now() - event.timestamp < 30000 // Last 30 seconds
      ).length;
    
    if (recentSimilarInteractions > 2) {
      significance += 0.2; // User is actively working with this type of interaction
    }
    
    return Math.min(1, significance);
  }

  /**
   * Save current state to undo stack
   */
  private saveToUndoStack(groups: GroupHierarchy[]): void {
    this.undoStack.push([...groups]);
    
    // Limit undo stack size
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<DynamicGroupingConfig>): DynamicGroupingConfig {
    const defaultTriggers: RegroupTrigger[] = [
      {
        interaction: 'node-drag',
        debounceTime: 500,
        threshold: 0.6,
        enabled: true
      },
      {
        interaction: 'node-select',
        debounceTime: 1000,
        threshold: 0.5,
        enabled: true
      },
      {
        interaction: 'zoom-change',
        debounceTime: 2000,
        threshold: 0.7,
        enabled: false
      }
    ];

    return {
      triggers: defaultTriggers,
      strategies: {
        dragStrategy: 'on-drop',
        selectionStrategy: 'manual',
        aggressiveness: 'moderate'
      },
      performance: {
        maxRealtimeNodes: 200,
        maxRegroupTime: 2000,
        useBackgroundProcessing: true
      },
      userExperience: {
        showPreview: true,
        allowUndo: true,
        showSuggestions: true,
        animationDuration: 300
      },
      ...config
    };
  }

  // Placeholder implementations for complex operations
  private async performImmediateDragRegroup(
    draggedNodes: string[],
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[],
    affectedGroups: string[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    // Placeholder - would implement immediate regrouping logic
    return { newGroups: currentGroups, affectedGroups };
  }

  private async performDropRegroup(
    draggedNodes: string[],
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[],
    affectedGroups: string[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    // Placeholder - would implement drop-based regrouping
    return { newGroups: currentGroups, affectedGroups };
  }

  private async scheduleDelayedRegroup(
    draggedNodes: string[],
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[],
    affectedGroups: string[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    // Placeholder - would schedule delayed regrouping
    return { newGroups: currentGroups, affectedGroups };
  }

  private async performAutoSelectionGrouping(
    selectedNodes: string[],
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    // Placeholder - would implement auto selection grouping
    return { newGroups: currentGroups, affectedGroups: [] };
  }

  private async createHighLevelGroups(
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    // Placeholder - would create high-level groups for zoomed-out view
    return { newGroups: currentGroups, affectedGroups: [] };
  }

  private async createDetailedGroups(
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    // Placeholder - would create detailed groups for zoomed-in view
    return { newGroups: currentGroups, affectedGroups: [] };
  }

  private async handleGenericRegroup(
    interaction: InteractionContext,
    currentGroups: GroupHierarchy[],
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): Promise<{ newGroups: GroupHierarchy[]; affectedGroups: string[] }> {
    // Placeholder - would handle generic regrouping
    return { newGroups: currentGroups, affectedGroups: [] };
  }

  // More placeholder implementations...
  private async analyzePotentialGroupings(targetNodes: string[], nodes: FlowNode[], edges: FlowEdge[]): Promise<any[]> { return []; }
  private previewGrouping(currentGroups: GroupHierarchy[], group: any): GroupHierarchy[] { return currentGroups; }
  private async createGroupFromSuggestion(suggestion: GroupSuggestion, currentGroups: GroupHierarchy[], nodes: FlowNode[], edges: FlowEdge[]): Promise<GroupHierarchy[]> { return currentGroups; }
  private async mergeGroupsFromSuggestion(suggestion: GroupSuggestion, currentGroups: GroupHierarchy[]): Promise<GroupHierarchy[]> { return currentGroups; }
  private async splitGroupFromSuggestion(suggestion: GroupSuggestion, currentGroups: GroupHierarchy[], nodes: FlowNode[], edges: FlowEdge[]): Promise<GroupHierarchy[]> { return currentGroups; }
  private async moveNodesFromSuggestion(suggestion: GroupSuggestion, currentGroups: GroupHierarchy[]): Promise<GroupHierarchy[]> { return currentGroups; }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get current configuration
   */
  getConfig(): DynamicGroupingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DynamicGroupingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get interaction history
   */
  getInteractionHistory(): InteractionEvent[] {
    return [...this.interactionHistory];
  }

  /**
   * Clear interaction history
   */
  clearHistory(): void {
    this.interactionHistory = [];
  }

  /**
   * Get current groups
   */
  getCurrentGroups(): GroupHierarchy[] {
    return [...this.currentGroups];
  }
}