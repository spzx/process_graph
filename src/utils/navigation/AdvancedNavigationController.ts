/**
 * Advanced Navigation Controller
 * 
 * This system provides sophisticated navigation capabilities including
 * jump-to-node, path following, guided tours, and intelligent navigation
 * based on graph structure and user behavior.
 */

import { Node as FlowNode, Edge as FlowEdge, useReactFlow } from 'reactflow';
import { SmartZoomSystem } from './SmartZoomSystem';

/**
 * Navigation operation types
 */
export type NavigationType = 
  | 'jump-to-node'
  | 'jump-to-group'
  | 'follow-path'
  | 'guided-tour'
  | 'breadth-first-tour'
  | 'depth-first-tour'
  | 'custom-tour'
  | 'find-shortest-path'
  | 'explore-neighborhood'
  | 'focus-subgraph';

/**
 * Navigation configuration
 */
export interface NavigationConfig {
  /** Animation settings for navigation */
  animation: {
    enabled: boolean;
    duration: number;
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    highlightDuration: number;
  };
  
  /** Path following settings */
  pathFollowing: {
    /** Speed of path traversal (nodes per second) */
    speed: number;
    
    /** Pause duration at each node */
    pauseDuration: number;
    
    /** Highlight style for current node */
    highlightStyle: 'pulse' | 'glow' | 'border' | 'scale';
    
    /** Show breadcrumb trail */
    showBreadcrumbs: boolean;
  };
  
  /** Tour settings */
  tour: {
    /** Default tour strategy */
    defaultStrategy: 'importance' | 'connectivity' | 'groups' | 'manual';
    
    /** Auto-advance timing */
    autoAdvance: boolean;
    autoAdvanceDelay: number;
    
    /** Tour narration */
    showNarration: boolean;
    narrationPosition: 'overlay' | 'sidebar' | 'tooltip';
  };
  
  /** Search and jump settings */
  search: {
    /** Enable fuzzy search */
    fuzzySearch: boolean;
    
    /** Search scope */
    searchScope: 'nodes' | 'edges' | 'groups' | 'all';
    
    /** Max search results */
    maxResults: number;
  };
}

/**
 * Navigation step in a tour or path
 */
export interface NavigationStep {
  /** Target node or group ID */
  target: string;
  
  /** Type of target */
  targetType: 'node' | 'group' | 'position';
  
  /** Optional narration or description */
  narration?: string;
  
  /** Duration to stay at this step */
  duration?: number;
  
  /** Custom zoom level for this step */
  zoomLevel?: number;
  
  /** Actions to perform at this step */
  actions?: NavigationAction[];
  
  /** Conditions that must be met to proceed */
  conditions?: NavigationCondition[];
}

/**
 * Navigation action
 */
export interface NavigationAction {
  type: 'highlight' | 'expand-group' | 'collapse-group' | 'filter' | 'custom';
  target?: string;
  parameters?: Record<string, any>;
}

/**
 * Navigation condition
 */
export interface NavigationCondition {
  type: 'user-click' | 'timeout' | 'custom';
  parameters?: Record<string, any>;
}

/**
 * Navigation tour definition
 */
export interface NavigationTour {
  /** Unique tour ID */
  id: string;
  
  /** Tour name and description */
  name: string;
  description: string;
  
  /** Tour steps */
  steps: NavigationStep[];
  
  /** Tour metadata */
  metadata: {
    estimatedDuration: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    author?: string;
  };
}

/**
 * Navigation state
 */
export interface NavigationState {
  /** Current navigation mode */
  mode: 'idle' | 'navigating' | 'touring' | 'following-path';
  
  /** Current step in tour/path */
  currentStep: number;
  
  /** Total steps */
  totalSteps: number;
  
  /** Current target */
  currentTarget?: string;
  
  /** Navigation history */
  history: string[];
  
  /** Can go back */
  canGoBack: boolean;
  
  /** Can go forward */
  canGoForward: boolean;
  
  /** Active tour */
  activeTour?: NavigationTour;
}

/**
 * Path finding result
 */
export interface PathResult {
  /** Found path as array of node IDs */
  path: string[];
  
  /** Path length */
  length: number;
  
  /** Total cost/weight */
  cost: number;
  
  /** Algorithm used */
  algorithm: 'dijkstra' | 'a-star' | 'bfs' | 'dfs';
}

/**
 * Main Advanced Navigation Controller
 */
export class AdvancedNavigationController {
  private config: NavigationConfig;
  private zoomSystem: SmartZoomSystem;
  private navigationState: NavigationState;
  private tourLibrary: Map<string, NavigationTour> = new Map();
  private currentAnimation?: Promise<void>;
  
  constructor(config?: Partial<NavigationConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.zoomSystem = new SmartZoomSystem();
    this.navigationState = this.initializeState();
  }

  // ==========================================================================
  // BASIC NAVIGATION OPERATIONS
  // ==========================================================================

  /**
   * Jump to specific node with intelligent framing
   */
  async jumpToNode(
    nodeId: string,
    nodes: FlowNode[],
    options?: {
      highlight?: boolean;
      showContext?: boolean;
      contextRadius?: number;
    }
  ): Promise<void> {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Add to navigation history
    this.addToHistory(nodeId);

    // Update navigation state
    this.navigationState.mode = 'navigating';
    this.navigationState.currentTarget = nodeId;

    // Calculate context if requested
    let contextNodes = [node];
    if (options?.showContext) {
      const radius = options.contextRadius || 1;
      contextNodes = this.getNodeContext(nodeId, radius, nodes);
    }

    // Use zoom system for intelligent navigation
    await this.zoomSystem.zoomToNode(nodeId, {
      showContext: options?.showContext,
      contextRadius: options?.contextRadius,
      animated: this.config.animation.enabled
    });

    // Highlight node if requested
    if (options?.highlight) {
      await this.highlightNode(nodeId);
    }

    this.navigationState.mode = 'idle';
  }

  /**
   * Jump to specific group
   */
  async jumpToGroup(
    groupId: string,
    options?: {
      highlight?: boolean;
      includeConnections?: boolean;
    }
  ): Promise<void> {
    this.addToHistory(`group:${groupId}`);
    
    this.navigationState.mode = 'navigating';
    this.navigationState.currentTarget = groupId;

    await this.zoomSystem.zoomToGroup(groupId, {
      includeConnections: options?.includeConnections,
      animated: this.config.animation.enabled
    });

    if (options?.highlight) {
      await this.highlightGroup(groupId);
    }

    this.navigationState.mode = 'idle';
  }

  // ==========================================================================
  // PATH FOLLOWING
  // ==========================================================================

  /**
   * Follow a predefined path through the graph
   */
  async followPath(
    path: string[],
    nodes: FlowNode[],
    options?: {
      speed?: number;
      pauseAtEach?: boolean;
      showBreadcrumbs?: boolean;
    }
  ): Promise<void> {
    if (path.length === 0) return;

    this.navigationState.mode = 'following-path';
    this.navigationState.totalSteps = path.length;
    this.navigationState.currentStep = 0;

    const speed = options?.speed || this.config.pathFollowing.speed;
    const pauseDuration = options?.pauseAtEach ? 
      this.config.pathFollowing.pauseDuration : 0;

    for (let i = 0; i < path.length; i++) {
      this.navigationState.currentStep = i;
      const nodeId = path[i];
      
      // Jump to current node
      await this.jumpToNode(nodeId, nodes, { 
        highlight: true,
        showContext: false 
      });

      // Show breadcrumbs if enabled
      if (options?.showBreadcrumbs || this.config.pathFollowing.showBreadcrumbs) {
        this.updateBreadcrumbs(path.slice(0, i + 1));
      }

      // Pause at node
      if (pauseDuration > 0) {
        await this.delay(pauseDuration);
      }

      // Wait for next step based on speed
      if (i < path.length - 1) {
        await this.delay(1000 / speed);
      }
    }

    this.navigationState.mode = 'idle';
  }

  /**
   * Find shortest path between two nodes
   */
  findShortestPath(
    startId: string,
    endId: string,
    nodes: FlowNode[],
    edges: FlowEdge[],
    algorithm: 'dijkstra' | 'bfs' = 'bfs'
  ): PathResult | null {
    switch (algorithm) {
      case 'bfs':
        return this.bfsPath(startId, endId, nodes, edges);
      case 'dijkstra':
        return this.dijkstraPath(startId, endId, nodes, edges);
      default:
        return this.bfsPath(startId, endId, nodes, edges);
    }
  }

  /**
   * BFS pathfinding algorithm
   */
  private bfsPath(
    startId: string,
    endId: string,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): PathResult | null {
    const graph = this.buildAdjacencyList(edges);
    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currentNode = path[path.length - 1];

      if (currentNode === endId) {
        return {
          path,
          length: path.length,
          cost: path.length - 1,
          algorithm: 'bfs'
        };
      }

      const neighbors = graph.get(currentNode) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Dijkstra pathfinding algorithm
   */
  private dijkstraPath(
    startId: string,
    endId: string,
    nodes: FlowNode[],
    edges: FlowEdge[]
  ): PathResult | null {
    // Simplified Dijkstra implementation
    // In practice, would use proper priority queue
    return this.bfsPath(startId, endId, nodes, edges);
  }

  // ==========================================================================
  // GUIDED TOURS
  // ==========================================================================

  /**
   * Start a guided tour
   */
  async startTour(
    tourId: string,
    nodes: FlowNode[],
    options?: {
      autoAdvance?: boolean;
      speed?: number;
    }
  ): Promise<void> {
    const tour = this.tourLibrary.get(tourId);
    if (!tour) {
      throw new Error(`Tour ${tourId} not found`);
    }

    this.navigationState.mode = 'touring';
    this.navigationState.activeTour = tour;
    this.navigationState.currentStep = 0;
    this.navigationState.totalSteps = tour.steps.length;

    const autoAdvance = options?.autoAdvance ?? this.config.tour.autoAdvance;

    for (let i = 0; i < tour.steps.length; i++) {
      this.navigationState.currentStep = i;
      const step = tour.steps[i];

      await this.executeNavigationStep(step, nodes);

      // Show narration if enabled
      if (this.config.tour.showNarration && step.narration) {
        this.showNarration(step.narration, step.target);
      }

      // Wait for advance signal
      if (autoAdvance) {
        const delay = step.duration || this.config.tour.autoAdvanceDelay;
        await this.delay(delay);
      } else {
        await this.waitForUserAdvance();
      }
    }

    this.navigationState.mode = 'idle';
    this.navigationState.activeTour = undefined;
  }

  /**
   * Create automatic tour based on graph structure
   */
  generateAutomaticTour(
    nodes: FlowNode[],
    edges: FlowEdge[],
    strategy: 'importance' | 'connectivity' | 'groups' = 'importance'
  ): NavigationTour {
    const steps: NavigationStep[] = [];
    let tourNodes: FlowNode[] = [];

    switch (strategy) {
      case 'importance':
        tourNodes = this.selectImportantNodes(nodes, edges);
        break;
      case 'connectivity':
        tourNodes = this.selectHighlyConnectedNodes(nodes, edges);
        break;
      case 'groups':
        tourNodes = this.selectRepresentativeNodes(nodes, edges);
        break;
    }

    tourNodes.forEach((node, index) => {
      steps.push({
        target: node.id,
        targetType: 'node',
        narration: `Step ${index + 1}: ${node.data?.label || node.id}`,
        duration: 3000
      });
    });

    const tour: NavigationTour = {
      id: `auto-tour-${strategy}-${Date.now()}`,
      name: `Auto Tour (${strategy})`,
      description: `Automatically generated tour based on ${strategy}`,
      steps,
      metadata: {
        estimatedDuration: steps.length * 3,
        difficulty: 'beginner',
        tags: ['auto-generated', strategy],
        author: 'system'
      }
    };

    return tour;
  }

  /**
   * Execute a navigation step
   */
  private async executeNavigationStep(step: NavigationStep, nodes: FlowNode[]): Promise<void> {
    // Execute pre-step actions
    if (step.actions) {
      for (const action of step.actions) {
        await this.executeNavigationAction(action);
      }
    }

    // Navigate to target
    switch (step.targetType) {
      case 'node':
        await this.jumpToNode(step.target, nodes, { 
          highlight: true,
          showContext: true 
        });
        break;
      case 'group':
        await this.jumpToGroup(step.target, { highlight: true });
        break;
      case 'position':
        // Would implement position-based navigation
        break;
    }

    // Apply custom zoom if specified
    if (step.zoomLevel) {
      await this.zoomSystem.zoomTo('zoom-in', undefined, { 
        animated: true 
      });
    }
  }

  // ==========================================================================
  // SEARCH AND DISCOVERY
  // ==========================================================================

  /**
   * Search for nodes, groups, or other elements
   */
  searchGraph(
    query: string,
    nodes: FlowNode[],
    edges: FlowEdge[],
    options?: {
      scope?: 'nodes' | 'edges' | 'groups' | 'all';
      fuzzy?: boolean;
      maxResults?: number;
    }
  ): Array<{
    id: string;
    type: 'node' | 'edge' | 'group';
    label: string;
    score: number;
  }> {
    const results: Array<{
      id: string;
      type: 'node' | 'edge' | 'group';
      label: string;
      score: number;
    }> = [];

    const scope = options?.scope || this.config.search.searchScope;
    const fuzzy = options?.fuzzy ?? this.config.search.fuzzySearch;
    const maxResults = options?.maxResults || this.config.search.maxResults;

    if (scope === 'nodes' || scope === 'all') {
      const nodeResults = this.searchNodes(query, nodes, fuzzy);
      results.push(...nodeResults);
    }

    if (scope === 'edges' || scope === 'all') {
      const edgeResults = this.searchEdges(query, edges, fuzzy);
      results.push(...edgeResults);
    }

    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Search nodes
   */
  private searchNodes(
    query: string,
    nodes: FlowNode[],
    fuzzy: boolean
  ): Array<{ id: string; type: 'node'; label: string; score: number }> {
    const results: Array<{ id: string; type: 'node'; label: string; score: number }> = [];
    
    nodes.forEach(node => {
      const label = node.data?.label || node.id;
      const score = this.calculateMatchScore(query, label, fuzzy);
      
      if (score > 0) {
        results.push({
          id: node.id,
          type: 'node',
          label,
          score
        });
      }
    });

    return results;
  }

  /**
   * Search edges
   */
  private searchEdges(
    query: string,
    edges: FlowEdge[],
    fuzzy: boolean
  ): Array<{ id: string; type: 'edge'; label: string; score: number }> {
    const results: Array<{ id: string; type: 'edge'; label: string; score: number }> = [];
    
    edges.forEach(edge => {
      const label = edge.data?.label || `${edge.source} -> ${edge.target}`;
      const score = this.calculateMatchScore(query, label, fuzzy);
      
      if (score > 0) {
        results.push({
          id: edge.id || `${edge.source}-${edge.target}`,
          type: 'edge',
          label,
          score
        });
      }
    });

    return results;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Calculate match score between query and text
   */
  private calculateMatchScore(query: string, text: string, fuzzy: boolean): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    if (textLower === queryLower) {
      return 1.0; // Perfect match
    }

    if (textLower.includes(queryLower)) {
      return 0.8; // Contains match
    }

    if (fuzzy) {
      // Simple fuzzy matching - could use more sophisticated algorithms
      const distance = this.levenshteinDistance(queryLower, textLower);
      const maxLength = Math.max(queryLower.length, textLower.length);
      const similarity = 1 - (distance / maxLength);
      
      return similarity > 0.6 ? similarity * 0.6 : 0;
    }

    return 0;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Build adjacency list from edges
   */
  private buildAdjacencyList(edges: FlowEdge[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    edges.forEach(edge => {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, []);
      }
      graph.get(edge.source)!.push(edge.target);
    });

    return graph;
  }

  /**
   * Get node context (neighbors within radius)
   */
  private getNodeContext(nodeId: string, radius: number, nodes: FlowNode[]): FlowNode[] {
    // Simplified - would implement proper graph traversal
    return [nodes.find(n => n.id === nodeId)!];
  }

  /**
   * Add to navigation history
   */
  private addToHistory(target: string): void {
    this.navigationState.history.push(target);
    this.navigationState.canGoBack = this.navigationState.history.length > 1;
  }

  /**
   * Initialize navigation state
   */
  private initializeState(): NavigationState {
    return {
      mode: 'idle',
      currentStep: 0,
      totalSteps: 0,
      history: [],
      canGoBack: false,
      canGoForward: false
    };
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<NavigationConfig>): NavigationConfig {
    return {
      animation: {
        enabled: true,
        duration: 300,
        easing: 'ease-out',
        highlightDuration: 1000
      },
      pathFollowing: {
        speed: 2,
        pauseDuration: 1000,
        highlightStyle: 'pulse',
        showBreadcrumbs: true
      },
      tour: {
        defaultStrategy: 'importance',
        autoAdvance: false,
        autoAdvanceDelay: 3000,
        showNarration: true,
        narrationPosition: 'overlay'
      },
      search: {
        fuzzySearch: true,
        searchScope: 'all',
        maxResults: 10
      },
      ...config
    };
  }

  // Placeholder implementations for UI interactions
  private async highlightNode(nodeId: string): Promise<void> {
    // Would implement node highlighting
    await this.delay(this.config.animation.highlightDuration);
  }

  private async highlightGroup(groupId: string): Promise<void> {
    // Would implement group highlighting
    await this.delay(this.config.animation.highlightDuration);
  }

  private updateBreadcrumbs(path: string[]): void {
    // Would update breadcrumb UI
  }

  private showNarration(narration: string, target: string): void {
    // Would show narration UI
  }

  private async waitForUserAdvance(): Promise<void> {
    // Would wait for user interaction
    return new Promise(resolve => {
      // Placeholder - would listen for user events
      setTimeout(resolve, 1000);
    });
  }

  private async executeNavigationAction(action: NavigationAction): Promise<void> {
    // Would execute specific navigation actions
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private selectImportantNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    // Would implement importance-based selection
    return nodes.slice(0, 5);
  }

  private selectHighlyConnectedNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    // Would implement connectivity-based selection
    return nodes.slice(0, 5);
  }

  private selectRepresentativeNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    // Would implement group representative selection
    return nodes.slice(0, 5);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Go back in navigation history
   */
  goBack(): void {
    if (this.navigationState.canGoBack) {
      this.navigationState.history.pop();
      const previous = this.navigationState.history[this.navigationState.history.length - 1];
      if (previous) {
        // Would navigate to previous location
      }
    }
  }

  /**
   * Get current navigation state
   */
  getState(): NavigationState {
    return { ...this.navigationState };
  }

  /**
   * Add tour to library
   */
  addTour(tour: NavigationTour): void {
    this.tourLibrary.set(tour.id, tour);
  }

  /**
   * Get available tours
   */
  getAvailableTours(): NavigationTour[] {
    return Array.from(this.tourLibrary.values());
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NavigationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}