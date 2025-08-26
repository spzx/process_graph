/**
 * DependencyAnalyzer - Core component for building and analyzing dependency graphs
 * 
 * This class constructs dependency graphs from GraphNode nextNodes relationships,
 * identifies start and end nodes, and provides comprehensive graph analysis
 * capabilities including path finding and dependency validation.
 */

import { FlowNode } from '../types';

export interface DependencyEdge {
  source: string;
  target: string;
  condition: string;
  description: string;
  weight: number; // For prioritization in cycle breaking
}

export interface DependencyGraph {
  nodes: Map<string, FlowNode>;
  incomingEdges: Map<string, Set<string>>;
  outgoingEdges: Map<string, Set<string>>;
  edges: DependencyEdge[];
  startNodes: string[];
  endNodes: string[];
  orphanNodes: string[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    hasCycles: boolean;
    maxDepth: number;
  };
}

export interface PathLengthMap {
  [nodeId: string]: number;
}

export interface DependencyAnalysisResult {
  graph: DependencyGraph;
  longestPaths: PathLengthMap;
  unreachableNodes: string[];
  issues: DependencyIssue[];
}

export interface DependencyIssue {
  type: 'orphan' | 'unreachable' | 'circular' | 'missing_target';
  nodeId: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export class DependencyAnalyzer {
  private debugMode: boolean;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  /**
   * Main method to build and analyze a dependency graph from FlowNodes
   */
  public buildDependencyGraph(nodes: FlowNode[]): DependencyAnalysisResult {
    this.log('🚀 Starting dependency analysis with', nodes.length, 'nodes');
    
    const graph = this.constructGraph(nodes);
    const longestPaths = this.calculateLongestPaths(graph);
    const unreachableNodes = this.findUnreachableNodes(graph);
    const issues = this.identifyIssues(graph, unreachableNodes);

    this.log('✅ Dependency analysis complete');
    this.logGraphStatistics(graph);

    return {
      graph,
      longestPaths,
      unreachableNodes,
      issues
    };
  }

  /**
   * Constructs the dependency graph from node relationships
   */
  private constructGraph(nodes: FlowNode[]): DependencyGraph {
    const nodeMap = new Map<string, FlowNode>();
    const incomingEdges = new Map<string, Set<string>>();
    const outgoingEdges = new Map<string, Set<string>>();
    const edges: DependencyEdge[] = [];

    // Initialize maps
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      incomingEdges.set(node.id, new Set());
      outgoingEdges.set(node.id, new Set());
    });

    this.log('📊 Node map initialized with nodes:', Array.from(nodeMap.keys()));

    // Build edge relationships from nextNodes data
    let edgeCount = 0;
    nodes.forEach(node => {
      this.log(`🔍 Processing node: ${node.id}, nodeType: ${node.data.nodeType}, nextNodes:`, node.data.nextNodes);
      
      if (node.data.nextNodes && node.data.nextNodes.length > 0) {
        node.data.nextNodes.forEach((nextNode, index) => {
          if (nextNode.to && nodeMap.has(nextNode.to)) {
            // Add edge: node -> nextNode.to
            outgoingEdges.get(node.id)!.add(nextNode.to);
            incomingEdges.get(nextNode.to)!.add(node.id);
            
            edges.push({
              source: node.id,
              target: nextNode.to,
              condition: nextNode.on || '',
              description: nextNode.description || '',
              weight: index + 1 // Lower weight = higher priority
            });
            
            edgeCount++;
            this.log(`  ➡️ Added edge: ${node.id} -> ${nextNode.to} (condition: ${nextNode.on})`);
          } else if (nextNode.to) {
            this.log(`  ⚠️ Target node ${nextNode.to} not found in graph`);
          }
        });
      }
    });

    this.log(`📈 Total edges built: ${edgeCount}`);

    // Find start and end nodes
    const startNodes = this.findStartNodes(nodes, incomingEdges);
    const endNodes = this.findEndNodes(nodes, outgoingEdges);
    const orphanNodes = this.findOrphanNodes(nodes, incomingEdges, outgoingEdges);

    // Create graph metadata
    const hasCycles = this.quickCycleCheck(nodes, outgoingEdges);
    const maxDepth = this.calculateMaxDepth(startNodes, outgoingEdges);

    return {
      nodes: nodeMap,
      incomingEdges,
      outgoingEdges,
      edges,
      startNodes,
      endNodes,
      orphanNodes,
      metadata: {
        nodeCount: nodes.length,
        edgeCount,
        hasCycles,
        maxDepth
      }
    };
  }

  /**
   * Identifies start nodes (nodes with no incoming edges or explicitly marked as start)
   */
  private findStartNodes(nodes: FlowNode[], incomingEdges: Map<string, Set<string>>): string[] {
    const startNodes = nodes.filter(node => {
      const hasIncoming = incomingEdges.get(node.id)!.size > 0;
      const isStartType = node.data.nodeType === 'start';
      this.log(`🔎 Node ${node.id}: hasIncoming=${hasIncoming}, isStartType=${isStartType}`);
      return isStartType || !hasIncoming;
    }).map(node => node.id);

    this.log('🏁 Start nodes:', startNodes);

    if (startNodes.length === 0) {
      this.log('⚠️ No start node found, using first node');
      return nodes.length > 0 ? [nodes[0].id] : [];
    }

    return startNodes;
  }

  /**
   * Identifies end nodes (nodes with no outgoing edges or explicitly marked as end)
   */
  private findEndNodes(nodes: FlowNode[], outgoingEdges: Map<string, Set<string>>): string[] {
    const endNodes = nodes.filter(node => {
      const hasOutgoing = outgoingEdges.get(node.id)!.size > 0;
      const isEndType = node.data.nodeType === 'end';
      return isEndType || !hasOutgoing;
    }).map(node => node.id);

    this.log('🏁 End nodes:', endNodes);
    return endNodes;
  }

  /**
   * Identifies orphan nodes (nodes with no connections)
   */
  private findOrphanNodes(
    nodes: FlowNode[], 
    incomingEdges: Map<string, Set<string>>, 
    outgoingEdges: Map<string, Set<string>>
  ): string[] {
    return nodes.filter(node => {
      const hasIncoming = incomingEdges.get(node.id)!.size > 0;
      const hasOutgoing = outgoingEdges.get(node.id)!.size > 0;
      return !hasIncoming && !hasOutgoing;
    }).map(node => node.id);
  }

  /**
   * Quick cycle detection using DFS
   */
  private quickCycleCheck(nodes: FlowNode[], outgoingEdges: Map<string, Set<string>>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Back edge found - cycle detected
      }

      if (visited.has(nodeId)) {
        return false; // Already processed
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = outgoingEdges.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (hasCycleDFS(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycleDFS(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculates the maximum depth of the graph
   */
  private calculateMaxDepth(startNodes: string[], outgoingEdges: Map<string, Set<string>>): number {
    let maxDepth = 0;

    const calculateDepthDFS = (nodeId: string, currentDepth: number, visited: Set<string>): number => {
      if (visited.has(nodeId)) {
        return currentDepth; // Avoid infinite loops
      }

      visited.add(nodeId);
      let maxChildDepth = currentDepth;

      const neighbors = outgoingEdges.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        const childDepth = calculateDepthDFS(neighbor, currentDepth + 1, new Set(visited));
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }

      return maxChildDepth;
    };

    for (const startNode of startNodes) {
      const depth = calculateDepthDFS(startNode, 0, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Calculates longest paths from start nodes to all reachable nodes
   */
  private calculateLongestPaths(graph: DependencyGraph): PathLengthMap {
    const paths: PathLengthMap = {};
    const processing = new Set<string>();

    const calculatePath = (nodeId: string, currentPath: string[] = []): number => {
      if (paths[nodeId] !== undefined) {
        return paths[nodeId];
      }

      if (processing.has(nodeId)) {
        // Circular dependency detected - return current path length
        this.log(`🔄 Circular dependency detected at ${nodeId}, path: [${currentPath.join(' -> ')}]`);
        return currentPath.length;
      }

      processing.add(nodeId);
      const newPath = [...currentPath, nodeId];

      const incoming = graph.incomingEdges.get(nodeId) || new Set();
      
      if (incoming.size === 0) {
        // This is a start node
        paths[nodeId] = 0;
        processing.delete(nodeId);
        return 0;
      }

      // Calculate the maximum path length of all predecessors + 1
      let maxPredecessorPath = -1;
      incoming.forEach(predecessorId => {
        const predecessorPath = calculatePath(predecessorId, newPath);
        maxPredecessorPath = Math.max(maxPredecessorPath, predecessorPath);
      });

      const nodePath = maxPredecessorPath + 1;
      paths[nodeId] = nodePath;
      processing.delete(nodeId);
      return nodePath;
    };

    // Calculate paths for all nodes
    graph.nodes.forEach((_, nodeId) => {
      if (paths[nodeId] === undefined) {
        calculatePath(nodeId);
      }
    });

    return paths;
  }

  /**
   * Finds nodes that are unreachable from start nodes
   */
  private findUnreachableNodes(graph: DependencyGraph): string[] {
    const reachable = new Set<string>();

    const markReachable = (nodeId: string, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      reachable.add(nodeId);

      const outgoing = graph.outgoingEdges.get(nodeId) || new Set();
      outgoing.forEach(targetId => {
        markReachable(targetId, visited);
      });
    };

    // Start DFS from all start nodes
    graph.startNodes.forEach(startId => {
      markReachable(startId, new Set());
    });

    // Find unreachable nodes
    const unreachable: string[] = [];
    graph.nodes.forEach((_, nodeId) => {
      if (!reachable.has(nodeId) && !graph.orphanNodes.includes(nodeId)) {
        unreachable.push(nodeId);
      }
    });

    return unreachable;
  }

  /**
   * Identifies various issues in the dependency graph
   */
  private identifyIssues(graph: DependencyGraph, unreachableNodes: string[]): DependencyIssue[] {
    const issues: DependencyIssue[] = [];

    // Orphan nodes
    graph.orphanNodes.forEach(nodeId => {
      issues.push({
        type: 'orphan',
        nodeId,
        description: `Node ${nodeId} has no connections`,
        severity: 'warning'
      });
    });

    // Unreachable nodes
    unreachableNodes.forEach(nodeId => {
      issues.push({
        type: 'unreachable',
        nodeId,
        description: `Node ${nodeId} is not reachable from start nodes`,
        severity: 'error'
      });
    });

    // Missing target nodes
    graph.edges.forEach(edge => {
      if (!graph.nodes.has(edge.target)) {
        issues.push({
          type: 'missing_target',
          nodeId: edge.source,
          description: `Node ${edge.source} references non-existent target ${edge.target}`,
          severity: 'error'
        });
      }
    });

    return issues;
  }

  /**
   * Logs graph statistics for debugging
   */
  private logGraphStatistics(graph: DependencyGraph): void {
    this.log('📊 Graph Statistics:');
    this.log(`  Nodes: ${graph.metadata.nodeCount}`);
    this.log(`  Edges: ${graph.metadata.edgeCount}`);
    this.log(`  Start nodes: ${graph.startNodes.length}`);
    this.log(`  End nodes: ${graph.endNodes.length}`);
    this.log(`  Orphan nodes: ${graph.orphanNodes.length}`);
    this.log(`  Has cycles: ${graph.metadata.hasCycles}`);
    this.log(`  Max depth: ${graph.metadata.maxDepth}`);

    if (this.debugMode) {
      this.log('📥 Incoming edges:');
      graph.incomingEdges.forEach((edges, nodeId) => {
        if (edges.size > 0) {
          this.log(`  ${nodeId}: [${Array.from(edges).join(', ')}]`);
        }
      });

      this.log('📤 Outgoing edges:');
      graph.outgoingEdges.forEach((edges, nodeId) => {
        if (edges.size > 0) {
          this.log(`  ${nodeId}: [${Array.from(edges).join(', ')}]`);
        }
      });
    }
  }

  /**
   * Utility method for conditional logging
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[DependencyAnalyzer]', ...args);
    }
  }
}