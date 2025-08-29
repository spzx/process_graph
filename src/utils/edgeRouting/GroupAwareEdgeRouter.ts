/**
 * Group-Aware Edge Routing System
 * 
 * This module provides intelligent edge routing that:
 * 1. Routes inter-group edges around group boundaries instead of through them
 * 2. Maintains clean internal edges within groups
 * 3. Provides smooth curve paths for better visual appeal
 */

import type { FlowNode, FlowEdge } from '../../types';

interface GroupBounds {
  groupName: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

interface RoutingPoint {
  x: number;
  y: number;
}

interface EdgePath {
  edgeId: string;
  sourcePoint: RoutingPoint;
  targetPoint: RoutingPoint;
  controlPoints: RoutingPoint[];
  pathType: 'internal' | 'external' | 'inter-group';
  groupRoute?: {
    avoidedGroups: string[];
    routingStrategy: 'around-top' | 'around-bottom' | 'around-left' | 'around-right';
  };
}

export interface EdgeRoutingOptions {
  /** Minimum distance to maintain from group boundaries */
  groupMargin: number;
  
  /** Curve smoothness factor (0-1) */
  curveSmoothness: number;
  
  /** Whether to use orthogonal routing */
  orthogonalRouting: boolean;
  
  /** Prefer horizontal or vertical routing */
  routingPreference: 'horizontal' | 'vertical' | 'auto';
}

export class GroupAwareEdgeRouter {
  private options: EdgeRoutingOptions;
  
  constructor(options: Partial<EdgeRoutingOptions> = {}) {
    this.options = {
      groupMargin: 40,
      curveSmoothness: 0.7,
      orthogonalRouting: false,
      routingPreference: 'auto',
      ...options
    };
  }

  /**
   * Route all edges considering group boundaries
   */
  routeEdges(nodes: FlowNode[], edges: FlowEdge[]): EdgePath[] {
    console.log('🛣️ Starting group-aware edge routing...');
    
    // Calculate group boundaries
    const groupBounds = this.calculateGroupBounds(nodes);
    console.log(`📦 Found ${groupBounds.length} groups for routing`);
    
    // Route each edge
    const routedEdges = edges.map(edge => this.routeEdge(edge, nodes, groupBounds));
    
    // Log routing statistics
    const routingStats = this.calculateRoutingStats(routedEdges);
    console.log('📊 Edge routing complete:', routingStats);
    
    return routedEdges;
  }

  /**
   * Route a single edge around groups
   */
  private routeEdge(edge: FlowEdge, nodes: FlowNode[], groupBounds: GroupBounds[]): EdgePath {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      throw new Error(`Edge ${edge.id} references non-existent nodes`);
    }

    const sourcePoint = this.getNodeConnectionPoint(sourceNode, 'source');
    const targetPoint = this.getNodeConnectionPoint(targetNode, 'target');

    // Determine if this is an inter-group edge
    const sourceGroup = this.findNodeGroup(sourceNode, groupBounds);
    const targetGroup = this.findNodeGroup(targetNode, groupBounds);
    
    if (sourceGroup && targetGroup && sourceGroup.groupName === targetGroup.groupName) {
      // Internal edge - use direct routing
      return {
        edgeId: edge.id,
        sourcePoint,
        targetPoint,
        controlPoints: this.createStraightPath(sourcePoint, targetPoint),
        pathType: 'internal'
      };
    } else if (sourceGroup || targetGroup) {
      // Inter-group or external edge - route around groups
      return this.routeAroundGroups(edge.id, sourcePoint, targetPoint, groupBounds, sourceGroup, targetGroup);
    } else {
      // External edge - use direct routing
      return {
        edgeId: edge.id,
        sourcePoint,
        targetPoint,
        controlPoints: this.createStraightPath(sourcePoint, targetPoint),
        pathType: 'external'
      };
    }
  }

  /**
   * Route edge around group boundaries
   */
  private routeAroundGroups(
    edgeId: string,
    sourcePoint: RoutingPoint,
    targetPoint: RoutingPoint,
    groupBounds: GroupBounds[],
    sourceGroup?: GroupBounds,
    targetGroup?: GroupBounds
  ): EdgePath {
    // Find groups that intersect with the direct path
    const intersectingGroups = this.findIntersectingGroups(sourcePoint, targetPoint, groupBounds, sourceGroup, targetGroup);
    
    if (intersectingGroups.length === 0) {
      // No groups to avoid - use direct path
      return {
        edgeId,
        sourcePoint,
        targetPoint,
        controlPoints: this.createStraightPath(sourcePoint, targetPoint),
        pathType: 'inter-group'
      };
    }

    // Calculate routing path around groups
    const routingStrategy = this.determineRoutingStrategy(sourcePoint, targetPoint, intersectingGroups);
    const controlPoints = this.calculateRoutingPath(sourcePoint, targetPoint, intersectingGroups, routingStrategy);

    return {
      edgeId,
      sourcePoint,
      targetPoint,
      controlPoints,
      pathType: 'inter-group',
      groupRoute: {
        avoidedGroups: intersectingGroups.map(g => g.groupName),
        routingStrategy
      }
    };
  }

  /**
   * Calculate group boundaries from nodes
   */
  private calculateGroupBounds(nodes: FlowNode[]): GroupBounds[] {
    const groupMap = new Map<string, FlowNode[]>();
    
    // Group nodes by groupName
    nodes.forEach(node => {
      const groupName = node.data.groupName;
      if (groupName) {
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, []);
        }
        groupMap.get(groupName)!.push(node);
      }
    });

    // Calculate bounds for each group
    const bounds: GroupBounds[] = [];
    groupMap.forEach((groupNodes, groupName) => {
      if (groupNodes.length === 0) return;

      const nodeWidth = 280;
      const nodeHeight = 220;
      const groupPadding = 120; // Increased padding from GroupBackground

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      groupNodes.forEach(node => {
        minX = Math.min(minX, node.position.x - groupPadding);
        maxX = Math.max(maxX, node.position.x + nodeWidth + groupPadding);
        minY = Math.min(minY, node.position.y - groupPadding);
        maxY = Math.max(maxY, node.position.y + nodeHeight + groupPadding);
      });

      bounds.push({
        groupName,
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY
      });
    });

    return bounds;
  }

  /**
   * Find groups that intersect with the direct path between two points
   */
  private findIntersectingGroups(
    sourcePoint: RoutingPoint,
    targetPoint: RoutingPoint,
    groupBounds: GroupBounds[],
    sourceGroup?: GroupBounds,
    targetGroup?: GroupBounds
  ): GroupBounds[] {
    return groupBounds.filter(group => {
      // Don't avoid source or target groups
      if (sourceGroup && group.groupName === sourceGroup.groupName) return false;
      if (targetGroup && group.groupName === targetGroup.groupName) return false;

      // Check if line intersects with group bounds (with margin)
      const margin = this.options.groupMargin;
      const expandedBounds = {
        minX: group.minX - margin,
        maxX: group.maxX + margin,
        minY: group.minY - margin,
        maxY: group.maxY + margin
      };

      return this.lineIntersectsRectangle(sourcePoint, targetPoint, expandedBounds);
    });
  }

  /**
   * Check if a line intersects with a rectangle
   */
  private lineIntersectsRectangle(
    point1: RoutingPoint,
    point2: RoutingPoint,
    rect: { minX: number; maxX: number; minY: number; maxY: number }
  ): boolean {
    // Use line-rectangle intersection algorithm
    const { minX, maxX, minY, maxY } = rect;
    const { x: x1, y: y1 } = point1;
    const { x: x2, y: y2 } = point2;

    // Check if either point is inside the rectangle
    if ((x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
        (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)) {
      return true;
    }

    // Check intersection with rectangle edges
    return this.lineIntersectsLine(x1, y1, x2, y2, minX, minY, maxX, minY) || // top
           this.lineIntersectsLine(x1, y1, x2, y2, maxX, minY, maxX, maxY) || // right
           this.lineIntersectsLine(x1, y1, x2, y2, maxX, maxY, minX, maxY) || // bottom
           this.lineIntersectsLine(x1, y1, x2, y2, minX, maxY, minX, minY);   // left
  }

  /**
   * Check if two lines intersect
   */
  private lineIntersectsLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return false; // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  /**
   * Determine optimal routing strategy
   */
  private determineRoutingStrategy(
    sourcePoint: RoutingPoint,
    targetPoint: RoutingPoint,
    intersectingGroups: GroupBounds[]
  ): 'around-top' | 'around-bottom' | 'around-left' | 'around-right' {
    if (intersectingGroups.length === 0) return 'around-top';

    // Find the primary group to route around (largest or most central)
    const primaryGroup = intersectingGroups.reduce((largest, current) => 
      current.width * current.height > largest.width * largest.height ? current : largest
    );

    // Determine best routing direction based on source/target positions
    const groupCenterX = (primaryGroup.minX + primaryGroup.maxX) / 2;
    const groupCenterY = (primaryGroup.minY + primaryGroup.maxY) / 2;
    
    const sourceToTargetVector = {
      x: targetPoint.x - sourcePoint.x,
      y: targetPoint.y - sourcePoint.y
    };

    // Prefer routing that follows the general direction
    if (Math.abs(sourceToTargetVector.x) > Math.abs(sourceToTargetVector.y)) {
      // Horizontal preference
      return sourcePoint.y < groupCenterY ? 'around-top' : 'around-bottom';
    } else {
      // Vertical preference
      return sourcePoint.x < groupCenterX ? 'around-left' : 'around-right';
    }
  }

  /**
   * Calculate routing path around groups
   */
  private calculateRoutingPath(
    sourcePoint: RoutingPoint,
    targetPoint: RoutingPoint,
    intersectingGroups: GroupBounds[],
    strategy: 'around-top' | 'around-bottom' | 'around-left' | 'around-right'
  ): RoutingPoint[] {
    if (intersectingGroups.length === 0) {
      return this.createStraightPath(sourcePoint, targetPoint);
    }

    // Find the combined bounds of all intersecting groups
    const combinedBounds = this.getCombinedBounds(intersectingGroups);
    const margin = this.options.groupMargin;

    let waypoints: RoutingPoint[] = [sourcePoint];

    switch (strategy) {
      case 'around-top':
        waypoints.push(
          { x: sourcePoint.x, y: combinedBounds.minY - margin },
          { x: targetPoint.x, y: combinedBounds.minY - margin }
        );
        break;
      
      case 'around-bottom':
        waypoints.push(
          { x: sourcePoint.x, y: combinedBounds.maxY + margin },
          { x: targetPoint.x, y: combinedBounds.maxY + margin }
        );
        break;
      
      case 'around-left':
        waypoints.push(
          { x: combinedBounds.minX - margin, y: sourcePoint.y },
          { x: combinedBounds.minX - margin, y: targetPoint.y }
        );
        break;
      
      case 'around-right':
        waypoints.push(
          { x: combinedBounds.maxX + margin, y: sourcePoint.y },
          { x: combinedBounds.maxX + margin, y: targetPoint.y }
        );
        break;
    }

    waypoints.push(targetPoint);

    // Apply smoothing if enabled
    if (this.options.curveSmoothness > 0) {
      return this.smoothPath(waypoints);
    }

    return waypoints;
  }

  /**
   * Create a smooth path through waypoints
   */
  private smoothPath(waypoints: RoutingPoint[]): RoutingPoint[] {
    if (waypoints.length <= 2) return waypoints;

    const smoothed: RoutingPoint[] = [waypoints[0]];
    const smoothness = this.options.curveSmoothness;

    for (let i = 1; i < waypoints.length - 1; i++) {
      const prev = waypoints[i - 1];
      const current = waypoints[i];
      const next = waypoints[i + 1];

      // Add control points for smooth curves
      const controlPoint1 = {
        x: prev.x + (current.x - prev.x) * (1 - smoothness),
        y: prev.y + (current.y - prev.y) * (1 - smoothness)
      };

      const controlPoint2 = {
        x: current.x + (next.x - current.x) * smoothness,
        y: current.y + (next.y - current.y) * smoothness
      };

      smoothed.push(controlPoint1, current, controlPoint2);
    }

    smoothed.push(waypoints[waypoints.length - 1]);
    return smoothed;
  }

  /**
   * Utility methods
   */
  private getNodeConnectionPoint(node: FlowNode, side: 'source' | 'target'): RoutingPoint {
    const nodeWidth = 280;
    const nodeHeight = 220;
    
    return {
      x: side === 'source' ? node.position.x + nodeWidth : node.position.x,
      y: node.position.y + nodeHeight / 2
    };
  }

  private findNodeGroup(node: FlowNode, groupBounds: GroupBounds[]): GroupBounds | undefined {
    const groupName = node.data.groupName;
    return groupBounds.find(group => group.groupName === groupName);
  }

  private createStraightPath(source: RoutingPoint, target: RoutingPoint): RoutingPoint[] {
    return [source, target];
  }

  private getCombinedBounds(groups: GroupBounds[]): { minX: number; maxX: number; minY: number; maxY: number } {
    return {
      minX: Math.min(...groups.map(g => g.minX)),
      maxX: Math.max(...groups.map(g => g.maxX)),
      minY: Math.min(...groups.map(g => g.minY)),
      maxY: Math.max(...groups.map(g => g.maxY))
    };
  }

  private calculateRoutingStats(routedEdges: EdgePath[]) {
    const internal = routedEdges.filter(e => e.pathType === 'internal').length;
    const external = routedEdges.filter(e => e.pathType === 'external').length;
    const interGroup = routedEdges.filter(e => e.pathType === 'inter-group').length;
    const routed = routedEdges.filter(e => e.groupRoute).length;

    return {
      totalEdges: routedEdges.length,
      internal,
      external,
      interGroup,
      routedAroundGroups: routed,
      routingEfficiency: routed / Math.max(interGroup, 1)
    };
  }
}