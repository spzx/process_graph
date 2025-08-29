/**
 * Comprehensive Integration Hooks
 * 
 * This module provides easy-to-use React hooks that integrate all the advanced
 * graph visualization capabilities including layout engines, grouping systems,
 * navigation controllers, and performance optimizations.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Node as FlowNode, Edge as FlowEdge, Viewport, useReactFlow } from 'reactflow';

// Import all the advanced systems
import { MultiLayoutEngine, createLayoutEngine, SelectionStrategy } from '../utils/layoutEngine';
import { SmartGroupDetectionSystem } from '../utils/grouping/SmartGroupDetection';
import { HierarchicalGroupManager } from '../utils/grouping/HierarchicalGrouping';
import { DynamicGroupManager } from '../utils/grouping/DynamicGroupManager';
import { GroupCollapseExpandManager } from '../utils/grouping/GroupCollapseExpandManager';
import { SmartZoomSystem } from '../utils/navigation/SmartZoomSystem';
import { AdvancedNavigationController } from '../utils/navigation/AdvancedNavigationController';
import { EnhancedViewportCulling } from '../utils/performance/EnhancedViewportCulling';
import { EdgeBundlingSystem, EdgeBundlingConfig } from '../utils/visualization/EdgeBundling';
import { LODRenderer, LODConfig } from '../utils/visualization/LODRenderer';

/**
 * Configuration for the enhanced graph visualization system
 */
export interface EnhancedGraphConfig {
  /** Layout configuration */
  layout: {
    /** Algorithm selection strategy */
    strategy: SelectionStrategy;
    
    /** Preferred algorithm (if not using auto selection) */
    algorithm?: string;
    
    /** Enable automatic algorithm selection */
    autoSelection: boolean;
    
    /** Performance vs quality preference */
    performanceMode: 'performance' | 'balanced' | 'quality';
  };
  
  /** Grouping configuration */
  grouping: {
    /** Enable smart group detection */
    enabled: boolean;
    
    /** Grouping strategies to use */
    strategies: {
      semantic: boolean;
      connectivity: boolean;
      structural: boolean;
    };
    
    /** Enable hierarchical grouping */
    hierarchical: boolean;
    
    /** Enable dynamic regrouping */
    dynamic: boolean;
    
    /** Auto-collapse large groups */
    autoCollapse: boolean;
  };
  
  /** Navigation configuration */
  navigation: {
    /** Enable smart zoom */
    smartZoom: boolean;
    
    /** Enable advanced navigation */
    advanced: boolean;
    
    /** Show navigation breadcrumbs */
    breadcrumbs: boolean;
  };
  
  /** Performance configuration */
  performance: {
    /** Enable viewport culling */
    culling: boolean;
    
    /** Enable predictive loading */
    predictiveLoading: boolean;
    
    /** Maximum nodes to render */
    maxNodes: number;
    
    /** Enable Level of Detail rendering */
    lod: boolean;
    
    /** Enable edge bundling */
    bundling: boolean;
  };
  
  /** Debug settings */
  debug: {
    /** Enable debug logging */
    enabled: boolean;
    
    /** Show performance metrics */
    showMetrics: boolean;
    
    /** Log algorithm selections */
    logAlgorithms: boolean;
  };
}

/**
 * Enhanced graph state returned by the main hook
 */
export interface EnhancedGraphState {
  /** Current layout engine */
  layoutEngine: MultiLayoutEngine;
  
  /** Processed nodes with enhancements */
  nodes: FlowNode[];
  
  /** Processed edges with enhancements */
  edges: FlowEdge[];
  
  /** Current viewport state */
  viewport: Viewport;
  
  /** Performance metrics */
  metrics: {
    renderTime: number;
    nodeCount: number;
    edgeCount: number;
    lodLevel: number;
    cullingEfficiency: number;
  };
  
  /** System status */
  status: {
    isLayouting: boolean;
    isGrouping: boolean;
    isNavigating: boolean;
    lastError?: string;
  };
  
  /** Available actions */
  actions: {
    /** Trigger re-layout */
    relayout: () => Promise<void>;
    
    /** Navigate to specific node */
    navigateToNode: (nodeId: string) => Promise<void>;
    
    /** Toggle group collapse/expand */
    toggleGroup: (groupId: string) => Promise<void>;
    
    /** Change layout algorithm */
    changeAlgorithm: (algorithm: string) => Promise<void>;
    
    /** Reset viewport */
    resetView: () => void;
    
    /** Update configuration */
    updateConfig: (newConfig: Partial<EnhancedGraphConfig>) => void;
  };
}

/**
 * Main hook for enhanced graph visualization
 * 
 * This hook orchestrates all the advanced systems and provides a unified interface
 * for managing complex graph visualizations with optimal performance.
 */
export function useEnhancedGraph(
  initialNodes: FlowNode[],
  initialEdges: FlowEdge[],
  config: Partial<EnhancedGraphConfig> = {}
): EnhancedGraphState {
  // Merge with default configuration
  const fullConfig = useMemo(() => mergeWithDefaults(config), [config]);
  
  // State management
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [isLayouting, setIsLayouting] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastError, setLastError] = useState<string>();
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
    lodLevel: 0,
    cullingEfficiency: 1
  });
  
  // React Flow integration
  const { fitView, setViewport: setReactFlowViewport } = useReactFlow();
  
  // Initialize systems
  const systems = useMemo(() => {
    const layoutEngine = createLayoutEngine({
      defaultAlgorithm: fullConfig.layout.algorithm,
      autoSelection: fullConfig.layout.autoSelection,
      debug: fullConfig.debug.enabled
    });
    
    const groupDetection = new SmartGroupDetectionSystem({
      strategies: {
        semantic: fullConfig.grouping.strategies.semantic,
        connectivity: fullConfig.grouping.strategies.connectivity,
        structural: fullConfig.grouping.strategies.structural,
        temporal: false
      }
    });
    
    const hierarchicalGroupManager = new HierarchicalGroupManager();
    const dynamicGroupManager = new DynamicGroupManager();
    const groupCollapseManager = new GroupCollapseExpandManager();
    const smartZoomSystem = new SmartZoomSystem({});
    const navigationController = new AdvancedNavigationController();
    const viewportCulling = new EnhancedViewportCulling({
      enabled: fullConfig.performance.culling,
      maxRenderNodes: fullConfig.performance.maxNodes
    });
    
    const edgeBundling = new EdgeBundlingSystem({
      enabled: fullConfig.performance.bundling,
      strategy: 'adaptive'
    });
    
    const lodRenderer = new LODRenderer({
      enabled: fullConfig.performance.lod
    }, edgeBundling);
    
    return {
      layoutEngine,
      groupDetection,
      hierarchicalGroupManager,
      dynamicGroupManager,
      groupCollapseManager,
      smartZoomSystem,
      navigationController,
      viewportCulling,
      edgeBundling,
      lodRenderer
    };
  }, [fullConfig]);
  
  // Performance monitoring
  const performanceRef = useRef({ startTime: 0, frameCount: 0 });
  
  // Main layout processing function
  const processLayout = useCallback(async () => {
    if (isLayouting) return;
    
    setIsLayouting(true);
    setLastError(undefined);
    performanceRef.current.startTime = performance.now();
    
    try {
      // Step 1: Group detection if enabled
      let detectedGroups = [];
      if (fullConfig.grouping.enabled) {
        setIsGrouping(true);
        detectedGroups = await systems.groupDetection.detectGroups(
          initialNodes as any, 
          initialEdges as any
        );
        console.log(`📊 Detected ${detectedGroups.length} groups`);
      }
      
      // Step 2: Layout calculation
      const layoutResult = await systems.layoutEngine.processLayout(
        initialNodes,
        initialEdges,
        {
          config: {
            grouping: {
              enabled: fullConfig.grouping.enabled,
              groups: detectedGroups
            }
          }
        }
      );
      
      // Step 3: Apply LOD rendering if enabled
      let finalNodes = layoutResult.nodes;
      let finalEdges = layoutResult.edges || initialEdges;
      
      if (fullConfig.performance.lod) {
        const lodContent = await systems.lodRenderer.renderWithLOD(
          finalNodes,
          finalEdges,
          viewport
        );
        
        finalNodes = lodContent.nodes as FlowNode[];
        finalEdges = lodContent.edges as FlowEdge[];
        
        setMetrics(prev => ({ ...prev, lodLevel: lodContent.level }));
      }
      
      // Step 4: Apply viewport culling if enabled
      if (fullConfig.performance.culling) {
        const cullingResult = await systems.viewportCulling.processViewport(
          viewport,
          finalNodes,
          finalEdges
        );
        
        if (cullingResult.visibleNodes) {
          finalNodes = cullingResult.visibleNodes;
          setMetrics(prev => ({ 
            ...prev, 
            cullingEfficiency: cullingResult.visibleNodes!.length / finalNodes.length 
          }));
        }
      }
      
      // Update state
      setNodes(finalNodes);
      setEdges(finalEdges);
      
      // Update metrics
      const renderTime = performance.now() - performanceRef.current.startTime;
      setMetrics(prev => ({
        ...prev,
        renderTime,
        nodeCount: finalNodes.length,
        edgeCount: finalEdges.length
      }));
      
      console.log(`✅ Layout complete in ${renderTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Layout processing failed:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLayouting(false);
      setIsGrouping(false);
    }
  }, [initialNodes, initialEdges, fullConfig, isLayouting, systems, viewport]);
  
  // Process layout when data changes
  useEffect(() => {
    if (initialNodes.length > 0) {
      processLayout();
    }
  }, [initialNodes, initialEdges, processLayout]);
  
  // Actions
  const actions = useMemo(() => ({
    relayout: processLayout,
    
    navigateToNode: async (nodeId: string) => {
      if (isNavigating) return;
      
      setIsNavigating(true);
      try {
        if (fullConfig.navigation.smartZoom) {
          console.log('🧭 Smart navigation to node:', nodeId);
          fitView({ nodes: [{ id: nodeId }], padding: 0.2, duration: 500 });
        } else {
          fitView({ nodes: [{ id: nodeId }], padding: 0.1, duration: 300 });
        }
      } catch (error) {
        console.error('Navigation failed:', error);
        setLastError(error instanceof Error ? error.message : 'Navigation failed');
      } finally {
        setIsNavigating(false);
      }
    },
    
    toggleGroup: async (groupId: string) => {
      try {
        const isCollapsed = await systems.groupCollapseManager.isGroupCollapsed(groupId);\n        if (isCollapsed) {\n          await systems.groupCollapseManager.expandGroup(groupId, { animated: true });\n        } else {\n          await systems.groupCollapseManager.collapseGroup(groupId, { animated: true });\n        }\n        \n        // Refresh layout after group toggle\n        await processLayout();\n      } catch (error) {\n        console.error('Group toggle failed:', error);\n        setLastError(error instanceof Error ? error.message : 'Group toggle failed');\n      }\n    },\n    \n    changeAlgorithm: async (algorithm: string) => {\n      try {\n        // Update the layout engine configuration\n        systems.layoutEngine.updateConfig({\n          defaultAlgorithm: algorithm,\n          autoSelection: false\n        });\n        \n        // Trigger re-layout with new algorithm\n        await processLayout();\n      } catch (error) {\n        console.error('Algorithm change failed:', error);\n        setLastError(error instanceof Error ? error.message : 'Algorithm change failed');\n      }\n    },\n    \n    resetView: () => {\n      fitView({ duration: 300 });\n      setViewport({ x: 0, y: 0, zoom: 1 });\n    },\n    \n    updateConfig: (newConfig: Partial<EnhancedGraphConfig>) => {\n      // This would trigger a re-render with new config\n      console.log('Config update requested:', newConfig);\n    }\n  }), [processLayout, fullConfig, systems, isNavigating, fitView]);\n  \n  return {\n    layoutEngine: systems.layoutEngine,\n    nodes,\n    edges,\n    viewport,\n    metrics,\n    status: {\n      isLayouting,\n      isGrouping,\n      isNavigating,\n      lastError\n    },\n    actions\n  };\n}\n\n/**\n * Hook for layout engine management\n */\nexport function useLayoutEngine(\n  config?: {\n    algorithm?: string;\n    autoSelection?: boolean;\n    performanceMode?: 'performance' | 'balanced' | 'quality';\n  }\n) {\n  const engine = useMemo(() => {\n    return createLayoutEngine({\n      defaultAlgorithm: config?.algorithm,\n      autoSelection: config?.autoSelection ?? true,\n      debug: process.env.NODE_ENV === 'development'\n    });\n  }, [config]);\n  \n  const [isProcessing, setIsProcessing] = useState(false);\n  const [lastResult, setLastResult] = useState<any>(null);\n  \n  const processLayout = useCallback(async (\n    nodes: FlowNode[], \n    edges: FlowEdge[],\n    options?: any\n  ) => {\n    setIsProcessing(true);\n    try {\n      const result = await engine.processLayout(nodes, edges, options);\n      setLastResult(result);\n      return result;\n    } finally {\n      setIsProcessing(false);\n    }\n  }, [engine]);\n  \n  return {\n    engine,\n    processLayout,\n    isProcessing,\n    lastResult,\n    algorithms: engine.getAlgorithms(),\n    performance: engine.getPerformanceStats()\n  };\n}\n\n/**\n * Hook for group management\n */\nexport function useGroupManagement(\n  config?: {\n    enableSmartDetection?: boolean;\n    enableHierarchical?: boolean;\n    enableDynamic?: boolean;\n  }\n) {\n  const systems = useMemo(() => ({\n    detection: new SmartGroupDetectionSystem(),\n    hierarchical: new HierarchicalGroupManager(),\n    dynamic: new DynamicGroupManager(),\n    collapseExpand: new GroupCollapseExpandManager()\n  }), []);\n  \n  const [groups, setGroups] = useState<any[]>([]);\n  const [isDetecting, setIsDetecting] = useState(false);\n  \n  const detectGroups = useCallback(async (\n    nodes: FlowNode[], \n    edges: FlowEdge[]\n  ) => {\n    if (!config?.enableSmartDetection) return [];\n    \n    setIsDetecting(true);\n    try {\n      const detected = await systems.detection.detectGroups(nodes as any, edges as any);\n      setGroups(detected);\n      return detected;\n    } finally {\n      setIsDetecting(false);\n    }\n  }, [systems.detection, config?.enableSmartDetection]);\n  \n  const collapseGroup = useCallback(async (groupId: string) => {\n    return systems.collapseExpand.collapseGroup(groupId, { animated: true });\n  }, [systems.collapseExpand]);\n  \n  const expandGroup = useCallback(async (groupId: string) => {\n    return systems.collapseExpand.expandGroup(groupId, { animated: true });\n  }, [systems.collapseExpand]);\n  \n  return {\n    systems,\n    groups,\n    isDetecting,\n    detectGroups,\n    collapseGroup,\n    expandGroup\n  };\n}\n\n/**\n * Hook for navigation and viewport management\n */\nexport function useAdvancedNavigation(\n  config?: {\n    enableSmartZoom?: boolean;\n    enableBreadcrumbs?: boolean;\n  }\n) {\n  const { fitView, setViewport, getViewport } = useReactFlow();\n  const [isNavigating, setIsNavigating] = useState(false);\n  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);\n  \n  const systems = useMemo(() => ({\n    zoom: new SmartZoomSystem({}),\n    navigation: new AdvancedNavigationController()\n  }), []);\n  \n  const navigateToNode = useCallback(async (\n    nodeId: string,\n    options?: { padding?: number; duration?: number }\n  ) => {\n    setIsNavigating(true);\n    try {\n      if (config?.enableBreadcrumbs) {\n        setBreadcrumbs(prev => [...prev, nodeId]);\n      }\n      \n      await fitView({\n        nodes: [{ id: nodeId }],\n        padding: options?.padding || 0.2,\n        duration: options?.duration || 500\n      });\n    } finally {\n      setIsNavigating(false);\n    }\n  }, [fitView, config?.enableBreadcrumbs]);\n  \n  const resetView = useCallback(() => {\n    fitView({ duration: 300 });\n    if (config?.enableBreadcrumbs) {\n      setBreadcrumbs([]);\n    }\n  }, [fitView, config?.enableBreadcrumbs]);\n  \n  const goBack = useCallback(() => {\n    if (breadcrumbs.length > 1) {\n      const newBreadcrumbs = [...breadcrumbs];\n      newBreadcrumbs.pop(); // Remove current\n      const previous = newBreadcrumbs.pop(); // Get previous\n      \n      if (previous) {\n        setBreadcrumbs(newBreadcrumbs);\n        navigateToNode(previous);\n      }\n    }\n  }, [breadcrumbs, navigateToNode]);\n  \n  return {\n    systems,\n    isNavigating,\n    breadcrumbs,\n    navigateToNode,\n    resetView,\n    goBack,\n    canGoBack: breadcrumbs.length > 1\n  };\n}\n\n/**\n * Hook for performance monitoring and optimization\n */\nexport function usePerformanceOptimization(\n  config?: {\n    enableCulling?: boolean;\n    enableLOD?: boolean;\n    enableBundling?: boolean;\n    maxNodes?: number;\n  }\n) {\n  const [metrics, setMetrics] = useState({\n    fps: 0,\n    renderTime: 0,\n    memoryUsage: 0,\n    nodeCount: 0,\n    edgeCount: 0\n  });\n  \n  const systems = useMemo(() => ({\n    culling: new EnhancedViewportCulling({\n      enabled: config?.enableCulling ?? true,\n      maxRenderNodes: config?.maxNodes || 1000\n    }),\n    bundling: new EdgeBundlingSystem({\n      enabled: config?.enableBundling ?? true,\n      strategy: 'adaptive'\n    }),\n    lod: new LODRenderer({\n      enabled: config?.enableLOD ?? true\n    })\n  }), [config]);\n  \n  // Performance monitoring\n  useEffect(() => {\n    let frameCount = 0;\n    let lastTime = performance.now();\n    \n    const monitor = () => {\n      const currentTime = performance.now();\n      frameCount++;\n      \n      if (currentTime - lastTime >= 1000) {\n        const fps = (frameCount * 1000) / (currentTime - lastTime);\n        \n        setMetrics(prev => ({\n          ...prev,\n          fps,\n          memoryUsage: (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0\n        }));\n        \n        frameCount = 0;\n        lastTime = currentTime;\n      }\n      \n      requestAnimationFrame(monitor);\n    };\n    \n    const animationId = requestAnimationFrame(monitor);\n    return () => cancelAnimationFrame(animationId);\n  }, []);\n  \n  return {\n    systems,\n    metrics\n  };\n}\n\n/**\n * Utility hook for debugging and development\n */\nexport function useGraphDebugger(\n  enabled = process.env.NODE_ENV === 'development'\n) {\n  const [logs, setLogs] = useState<Array<{\n    timestamp: number;\n    level: 'info' | 'warn' | 'error';\n    message: string;\n    data?: any;\n  }>>([]);\n  \n  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {\n    if (!enabled) return;\n    \n    const logEntry = {\n      timestamp: Date.now(),\n      level,\n      message,\n      data\n    };\n    \n    setLogs(prev => [...prev.slice(-99), logEntry]); // Keep last 100 logs\n    \n    // Also log to console\n    console[level](`[GraphDebugger] ${message}`, data || '');\n  }, [enabled]);\n  \n  const clearLogs = useCallback(() => {\n    setLogs([]);\n  }, []);\n  \n  return {\n    enabled,\n    logs,\n    log,\n    clearLogs\n  };\n}\n\n// ==========================================================================\n// UTILITY FUNCTIONS\n// ==========================================================================\n\n/**\n * Merge user configuration with sensible defaults\n */\nfunction mergeWithDefaults(config: Partial<EnhancedGraphConfig>): EnhancedGraphConfig {\n  return {\n    layout: {\n      strategy: 'automatic',\n      autoSelection: true,\n      performanceMode: 'balanced',\n      ...config.layout\n    },\n    grouping: {\n      enabled: true,\n      strategies: {\n        semantic: true,\n        connectivity: true,\n        structural: false\n      },\n      hierarchical: true,\n      dynamic: false,\n      autoCollapse: true,\n      ...config.grouping\n    },\n    navigation: {\n      smartZoom: true,\n      advanced: true,\n      breadcrumbs: false,\n      ...config.navigation\n    },\n    performance: {\n      culling: true,\n      predictiveLoading: true,\n      maxNodes: 1000,\n      lod: true,\n      bundling: false, // Disabled by default for compatibility\n      ...config.performance\n    },\n    debug: {\n      enabled: process.env.NODE_ENV === 'development',\n      showMetrics: false,\n      logAlgorithms: false,\n      ...config.debug\n    }\n  };\n}\n\n/**\n * Export configuration presets for common use cases\n */\nexport const ENHANCED_GRAPH_PRESETS = {\n  HIGH_PERFORMANCE: {\n    layout: { performanceMode: 'performance' as const },\n    performance: { maxNodes: 500, lod: true, culling: true, bundling: true },\n    grouping: { dynamic: false, autoCollapse: true },\n    debug: { enabled: false }\n  },\n  \n  HIGH_QUALITY: {\n    layout: { performanceMode: 'quality' as const },\n    performance: { maxNodes: 2000, lod: false, culling: false, bundling: false },\n    grouping: { dynamic: true, autoCollapse: false },\n    debug: { enabled: false }\n  },\n  \n  DEVELOPMENT: {\n    layout: { performanceMode: 'balanced' as const },\n    performance: { maxNodes: 1000, lod: true, culling: true, bundling: false },\n    grouping: { dynamic: true, autoCollapse: true },\n    debug: { enabled: true, showMetrics: true, logAlgorithms: true }\n  },\n  \n  LARGE_GRAPHS: {\n    layout: { performanceMode: 'performance' as const, strategy: 'performance' as const },\n    performance: { maxNodes: 200, lod: true, culling: true, bundling: true },\n    grouping: { dynamic: false, autoCollapse: true },\n    navigation: { smartZoom: true, advanced: false }\n  }\n} as const;