/**
 * Performance optimization hooks and utilities for graph visualization
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { GraphNode } from '../types';

/**
 * Hook for debouncing search operations
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay) as number;

    return () => {
      if (timeoutRef.current) {
        if (clearTimeout) {
          clearTimeout(timeoutRef.current);
        }
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for memoized search functionality
 */
export const useOptimizedSearch = (
  data: GraphNode[],
  searchQuery: string,
  searchOptions: {
    searchInDescription?: boolean;
    searchInBusinessRules?: boolean;
    caseSensitive?: boolean;
    useRegex?: boolean;
  } = {}
) => {
  const debouncedQuery = useDebounce(searchQuery.trim(), 300);

  return useMemo(() => {
    if (!debouncedQuery) return [];

    const {
      searchInDescription = true,
      searchInBusinessRules = false,
      caseSensitive = false,
      useRegex = false,
    } = searchOptions;

    let searchRegex: RegExp;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      searchRegex = useRegex 
        ? new RegExp(debouncedQuery, flags)
        : new RegExp(debouncedQuery.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), flags);
    } catch {
      // Fallback for invalid regex
      const escapedQuery = debouncedQuery.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      searchRegex = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
    }

    return data.filter(node => {
      // Search in node ID
      if (searchRegex.test(node.nodeId)) return true;
      
      // Search in short description
      if (searchRegex.test(node.shortDescription)) return true;
      
      // Search in full description if enabled
      if (searchInDescription && searchRegex.test(node.description)) return true;
      
      // Search in business rules if enabled and available
      if (searchInBusinessRules && node.businessRules) {
        if (node.businessRules.some(rule => searchRegex.test(rule))) return true;
      }
      
      return false;
    }).map(node => node.nodeId);
  }, [data, debouncedQuery, searchOptions]);
};

/**
 * Hook for memoized graph statistics
 */
export const useGraphStats = (data: GraphNode[]) => {
  return useMemo(() => {
    if (!data.length) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        maxDepth: 0,
        avgConnections: 0,
        complexityScore: 0,
      };
    }

    const nodeCount = data.length;
    const edgeCount = data.reduce((total, node) => total + node.nextNodes.length, 0);
    const avgConnections = edgeCount / nodeCount;
    
    // Calculate maximum depth from start nodes
    const startNodes = data.filter(node => node.type === 'start');
    let maxDepth = 0;
    
    if (startNodes.length > 0) {
      const visited = new Set<string>();
      const calculateDepth = (nodeId: string, currentDepth: number): number => {
        if (visited.has(nodeId)) return currentDepth;
        visited.add(nodeId);
        
        const node = data.find(n => n.nodeId === nodeId);
        if (!node || node.nextNodes.length === 0) return currentDepth;
        
        let deepest = currentDepth;
        for (const nextNode of node.nextNodes) {
          const targetId = typeof nextNode.to === 'string' ? nextNode.to : Object.values(nextNode as any)[0];
          const depth = calculateDepth(targetId, currentDepth + 1);
          deepest = Math.max(deepest, depth);
        }
        
        return deepest;
      };
      
      maxDepth = Math.max(...startNodes.map(node => calculateDepth(node.nodeId, 0)));
    }
    
    // Complexity score based on nodes, edges, and depth
    const complexityScore = nodeCount * 0.3 + edgeCount * 0.5 + maxDepth * 0.2;
    
    return {
      nodeCount,
      edgeCount,
      maxDepth,
      avgConnections: Number(avgConnections.toFixed(2)),
      complexityScore: Number(complexityScore.toFixed(2)),
    };
  }, [data]);
};

/**
 * Hook for viewport-based rendering optimization
 */
export const useViewportOptimization = (enabled: boolean = true) => {
  const intersectionObserver = useRef<IntersectionObserver | null>(null);
  const visibleNodes = useRef(new Set<string>());

  const setupObserver = useCallback((container: HTMLElement) => {
    if (!enabled || !container) return;

    intersectionObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const nodeId = entry.target.getAttribute('data-node-id');
          if (nodeId) {
            if (entry.isIntersecting) {
              visibleNodes.current.add(nodeId);
            } else {
              visibleNodes.current.delete(nodeId);
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
  }, [enabled]);

  const observeNode = useCallback((element: HTMLElement, nodeId: string) => {
    if (intersectionObserver.current && element) {
      element.setAttribute('data-node-id', nodeId);
      intersectionObserver.current.observe(element);
    }
  }, []);

  const unobserveNode = useCallback((element: HTMLElement) => {
    if (intersectionObserver.current && element) {
      intersectionObserver.current.unobserve(element);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (intersectionObserver.current) {
      intersectionObserver.current.disconnect();
      intersectionObserver.current = null;
    }
    visibleNodes.current.clear();
  }, []);

  return {
    setupObserver,
    observeNode,
    unobserveNode,
    cleanup,
    getVisibleNodes: () => Array.from(visibleNodes.current),
  };
};

/**
 * Hook for memoized filter operations
 */
export const useOptimizedFilter = (
  data: GraphNode[],
  filterOptions: {
    nodeTypes?: string[];
    hasOrderChanges?: boolean;
    hasBusinessRules?: boolean;
    hasDependencies?: boolean;
  }
) => {
  return useMemo(() => {
    if (!data.length) return [];

    return data.filter(node => {
      // Filter by node type
      if (filterOptions.nodeTypes && filterOptions.nodeTypes.length > 0) {
        if (!node.type || !filterOptions.nodeTypes.includes(node.type)) {
          return false;
        }
      }

      // Filter by order changes
      if (filterOptions.hasOrderChanges !== undefined) {
        const hasOrderChanges = !!(node.orderChanges && node.orderChanges.length > 0);
        if (hasOrderChanges !== filterOptions.hasOrderChanges) {
          return false;
        }
      }

      // Filter by business rules
      if (filterOptions.hasBusinessRules !== undefined) {
        const hasBusinessRules = !!(node.businessRules && node.businessRules.length > 0);
        if (hasBusinessRules !== filterOptions.hasBusinessRules) {
          return false;
        }
      }

      // Filter by dependencies
      if (filterOptions.hasDependencies !== undefined) {
        const hasDependencies = !!(node.dependencies && node.dependencies.length > 0);
        if (hasDependencies !== filterOptions.hasDependencies) {
          return false;
        }
      }

      return true;
    });
  }, [data, filterOptions]);
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (enabled: boolean = false) => {
  const metrics = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
  });

  const startMeasure = useCallback((label: string) => {
    if (!enabled) return () => {};
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      metrics.current.renderCount++;
      metrics.current.lastRenderTime = duration;
      metrics.current.avgRenderTime = 
        (metrics.current.avgRenderTime * (metrics.current.renderCount - 1) + duration) / 
        metrics.current.renderCount;
      metrics.current.maxRenderTime = Math.max(metrics.current.maxRenderTime, duration);
      
      if (duration > 16.67) { // More than one frame at 60fps
        console.warn(`Slow render detected for ${label}: ${duration.toFixed(2)}ms`);
      }
    };
  }, [enabled]);

  const getMetrics = useCallback(() => ({ ...metrics.current }), []);
  
  const resetMetrics = useCallback(() => {
    metrics.current = {
      renderCount: 0,
      lastRenderTime: 0,
      avgRenderTime: 0,
      maxRenderTime: 0,
    };
  }, []);

  return { startMeasure, getMetrics, resetMetrics };
};

/**
 * Memory optimization for large datasets
 */
export const useMemoryOptimization = () => {
  const nodeCache = useRef(new Map<string, any>());
  const edgeCache = useRef(new Map<string, any>());
  
  const getCachedNode = useCallback((nodeId: string, factory: () => any) => {
    if (nodeCache.current.has(nodeId)) {
      return nodeCache.current.get(nodeId);
    }
    
    const node = factory();
    nodeCache.current.set(nodeId, node);
    return node;
  }, []);
  
  const getCachedEdge = useCallback((edgeId: string, factory: () => any) => {
    if (edgeCache.current.has(edgeId)) {
      return edgeCache.current.get(edgeId);
    }
    
    const edge = factory();
    edgeCache.current.set(edgeId, edge);
    return edge;
  }, []);
  
  const clearCache = useCallback(() => {
    nodeCache.current.clear();
    edgeCache.current.clear();
  }, []);
  
  const getCacheSize = useCallback(() => ({
    nodes: nodeCache.current.size,
    edges: edgeCache.current.size,
  }), []);
  
  return {
    getCachedNode,
    getCachedEdge,
    clearCache,
    getCacheSize,
  };
};