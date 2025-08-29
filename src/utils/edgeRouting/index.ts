/**
 * Edge Routing Module - Integration Point
 * 
 * This module provides the main interface for group-aware edge routing
 * and integrates with the existing layout system.
 */

export { GroupAwareEdgeRouter } from './GroupAwareEdgeRouter';
export type { EdgeRoutingOptions } from './GroupAwareEdgeRouter';

// Re-export for convenience
import { GroupAwareEdgeRouter, type EdgeRoutingOptions } from './GroupAwareEdgeRouter';

/**
 * Create a pre-configured edge router with sensible defaults
 */
export function createEdgeRouter(options?: Partial<EdgeRoutingOptions>): GroupAwareEdgeRouter {
  return new GroupAwareEdgeRouter({
    groupMargin: 40,
    curveSmoothness: 0.7,
    orthogonalRouting: false,
    routingPreference: 'auto',
    ...options
  });
}

/**
 * Quick routing presets
 */
export const EdgeRoutingPresets = {
  /** Smooth curved routing around groups */
  SMOOTH: {
    groupMargin: 50,
    curveSmoothness: 0.8,
    orthogonalRouting: false,
    routingPreference: 'auto' as const
  },
  
  /** Sharp orthogonal routing */
  ORTHOGONAL: {
    groupMargin: 30,
    curveSmoothness: 0,
    orthogonalRouting: true,
    routingPreference: 'auto' as const
  },
  
  /** Performance-optimized routing */
  PERFORMANCE: {
    groupMargin: 25,
    curveSmoothness: 0.3,
    orthogonalRouting: false,
    routingPreference: 'horizontal' as const
  }
} as const;