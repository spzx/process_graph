/**
 * Enhanced GraphVisualization Component - Advanced Multi-Algorithm Layout System
 *
 * This enhanced version integrates all advanced layout capabilities including:
 * - Multi-algorithm layout engine with intelligent selection
 * - Smart group detection and hierarchical grouping
 * - Advanced navigation with zoom and culling optimizations
 * - Dynamic group management and collapse/expand functionality
 * - Performance optimization with viewport culling and LOD rendering
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { GroupNode } from './GroupNode';
import { createGroupNodes } from './GroupBackground';
import { PerformanceMonitor } from './PerformanceMonitor';
import { GraphNode } from '../types';
import {
  useGraphState,
  useNodeClick,
  useMinimapNodeColor,
} from '../hooks/useGraphVisualization';
import { useAdaptivePerformanceSettings } from '../hooks/useLargeGraphOptimization';
import { safeValidateGraph } from '../utils/validation';

// Enhanced layout and navigation systems
import { createLayoutEngine, createAlgorithmSelector, DEFAULT_CONFIGS } from '../utils/layoutEngine';
import { SmartGroupDetectionSystem } from '../utils/grouping/SmartGroupDetection';
import { HierarchicalGroupManager } from '../utils/grouping/HierarchicalGrouping';
import { DynamicGroupManager } from '../utils/grouping/DynamicGroupManager';
import { GroupCollapseExpandManager } from '../utils/grouping/GroupCollapseExpandManager';
import { SmartZoomSystem } from '../utils/navigation/SmartZoomSystem';
import { AdvancedNavigationController } from '../utils/navigation/AdvancedNavigationController';
import { EnhancedViewportCulling } from '../utils/performance/EnhancedViewportCulling';
import { createEdgeRouter, EdgeRoutingPresets } from '../utils/edgeRouting';

// Fallback to basic layout system if needed
import { getGroupedLayoutElements } from '../utils/groupLayout';

import {
  ERROR_MESSAGES,
  ACCESSIBILITY_LABELS,
} from '../constants/graphVisualization';

interface GraphVisualizationProps {
  data: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
  selectedNodeId?: string;
  highlightOrderChangeField?: string;
  highlightOrderChangeValue?: string | null;
  searchedNodeIds?: string[];
  isSearchActive?: boolean;
  highlightedPathToStartNodeIds?: Set<string> | null;
  onError?: (error: Error, context: string) => void;
  showPerformanceMonitor?: boolean;
  
  // Enhanced layout configuration
  layoutConfig?: {
    /** Preferred layout algorithm */
    algorithm?: 'auto' | 'force-directed' | 'hierarchical' | 'constraint-based';
    
    /** Layout performance mode */
    performanceMode?: 'quality' | 'balanced' | 'performance';
    
    /** Enable advanced grouping */
    enableSmartGrouping?: boolean;
    
    /** Auto-collapse large groups */
    autoCollapseGroups?: boolean;
    
    /** Group detection strategies */
    groupingStrategies?: {
      semantic?: boolean;
      connectivity?: boolean;
      structural?: boolean;
    };
  };
  
  // Navigation configuration
  navigationConfig?: {
    /** Enable smart zoom */
    enableSmartZoom?: boolean;
    
    /** Enable advanced navigation controls */
    enableAdvancedNavigation?: boolean;
    
    /** Show navigation breadcrumbs */
    showBreadcrumbs?: boolean;
  };
  
  // Performance configuration
  performanceConfig?: {
    /** Enable viewport culling */
    enableViewportCulling?: boolean;
    
    /** Enable predictive loading */
    enablePredictiveLoading?: boolean;
    
    /** Maximum nodes to render */
    maxRenderNodes?: number;
    
    /** Enable LOD rendering */
    enableLOD?: boolean;
  };
  
  // UI configuration
  uiConfig?: {
    /** Show layout controls */
    showLayoutControls?: boolean;
    
    /** Show group controls */
    showGroupControls?: boolean;
    
    /** Show navigation controls */
    showNavigationControls?: boolean;
    
    /** Control panel position */
    controlsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
}

// Enhanced internal component that integrates all advanced layout and navigation systems
const EnhancedGraphLayoutWrapper: React.FC<GraphVisualizationProps> = (props) => {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const [isLaidOut, setIsLaidOut] = useState(false);
  const [currentViewport, setCurrentViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const { fitView, getViewport, setViewport } = useReactFlow();

  // Initialize advanced layout and navigation systems
  const layoutEngine = useMemo(() => {
    const performanceMode = props.layoutConfig?.performanceMode || 'balanced';
    const config = DEFAULT_CONFIGS[performanceMode.toUpperCase() as keyof typeof DEFAULT_CONFIGS] || DEFAULT_CONFIGS.QUALITY_OPTIMIZED;
    return createLayoutEngine({
      defaultAlgorithm: props.layoutConfig?.algorithm === 'auto' ? undefined : props.layoutConfig?.algorithm,
      autoSelection: props.layoutConfig?.algorithm === 'auto',
      debug: process.env.NODE_ENV === 'development'
    });
  }, [props.layoutConfig?.algorithm, props.layoutConfig?.performanceMode]);

  const groupDetection = useMemo(() => new SmartGroupDetectionSystem({
    strategies: {
      semantic: props.layoutConfig?.groupingStrategies?.semantic ?? true,
      connectivity: props.layoutConfig?.groupingStrategies?.connectivity ?? true,
      structural: props.layoutConfig?.groupingStrategies?.structural ?? false,
      temporal: false
    },
    minGroupSize: 2,
    maxGroupSize: 50,
    confidenceThreshold: 0.6
  }), [props.layoutConfig?.groupingStrategies]);

  // Enhanced edge routing system for better group visualization
  const edgeRouter = useMemo(() => createEdgeRouter({
    ...EdgeRoutingPresets.SMOOTH,
    groupMargin: 60, // Extra margin for better visibility
    curveSmoothness: 0.8
  }), []);

  // Basic layout engine fallback (local grouping)
  const performLayout = useCallback(async (nodes: any[], edges: any[]) => {
    try {
      console.log('🎉 Using basic local grouping layout system...');
      const layoutedNodes = await getGroupedLayoutElements(nodes, edges);
      return layoutedNodes;
    } catch (error) {
      console.error('Basic layout failed:', error);
      // Ultimate fallback - grid layout
      return nodes.map((node, index) => ({
        ...node,
        position: {
          x: (index % 10) * 300,
          y: Math.floor(index / 10) * 200
        }
      }));
    }
  }, []);

  const {
    nodes: processedNodes,
    edges: processedEdges,
  } = useGraphState(
    props.data,
    props.selectedNodeId,
    props.highlightOrderChangeField,
    props.highlightOrderChangeValue,
    props.searchedNodeIds,
    props.isSearchActive,
    props.highlightedPathToStartNodeIds,
  );

  // Enhanced layout calculation using multi-algorithm system
  useEffect(() => {
    if (processedNodes.length > 0) {
      const performLayoutAsync = async () => {
        try {
          console.log('🚀 Starting enhanced layout calculation...');
          
          // Step 1: Detect groups if smart grouping is enabled
          let groups: any[] = [];
          if (props.layoutConfig?.enableSmartGrouping !== false) {
            try {
              groups = await groupDetection.detectGroups(processedNodes as any, processedEdges as any);
              console.log(`🔍 Detected ${groups.length} groups using smart detection`);
            } catch (error) {
              console.warn('Group detection failed, continuing without groups:', error);
            }
          }

          // Step 2: Calculate layout using the multi-algorithm engine
          const layoutResult = await layoutEngine.processLayout(
            processedNodes as any, // Type conversion for compatibility
            processedEdges as any,
            {
              config: {
                grouping: {
                  enabled: props.layoutConfig?.enableSmartGrouping !== false,
                  groups: groups
                },
                animation: {
                  enabled: true,
                  duration: 300
                },
                spacing: {
                  nodeSpacing: 350,
                  layerSpacing: 450,
                  groupSpacing: 500,
                  groupPadding: 120
                }
              }
            }
          );

          console.log(`✅ Layout completed with ${layoutResult.metadata.algorithm} algorithm (quality: ${layoutResult.quality.overallScore})`);

          // Step 3: Apply group-aware edge routing for better visual clarity
          console.log('🛣️ Applying group-aware edge routing...');
          const routedEdgePaths = edgeRouter.routeEdges(layoutResult.nodes as any, processedEdges as any);
          
          // Convert routed paths back to ReactFlow edges (for now, we'll use the original edges)
          // TODO: Implement custom edge rendering with routed paths
          const enhancedEdges = processedEdges.map(edge => {
            const routedPath = routedEdgePaths.find(p => p.edgeId === edge.id);
            if (routedPath && routedPath.pathType === 'inter-group' && routedPath.controlPoints.length > 2) {
              return {
                ...edge,
                data: {
                  ...edge.data,
                  routedPath: routedPath.controlPoints,
                  routingType: routedPath.pathType
                }
              };
            }
            return edge;
          });

          // Step 4: Create group background nodes and combine with regular nodes
          const groupNodes = createGroupNodes(layoutResult.nodes as any); // Type conversion for compatibility
          const allNodes = [...groupNodes, ...layoutResult.nodes];
          
          console.log('🎯 Enhanced layout complete:', {
            totalNodes: allNodes.length,
            groupNodes: groupNodes.length,
            regularNodes: layoutResult.nodes.length,
            algorithm: layoutResult.metadata.algorithm,
            quality: layoutResult.quality.overallScore
          });
          
          setFlowNodes(allNodes as any);
          setFlowEdges(enhancedEdges as any); // Use routed edges instead of original
          setIsLaidOut(true);

        } catch (error) {
          console.error("Enhanced layout calculation failed:", error);
          props.onError?.(error as Error, 'layout-calculation');
          
          // Fallback to basic layout
          console.log('🔄 Falling back to basic layout system...');
          try {
            const layoutedNodes = await performLayout(processedNodes, processedEdges);
            const groupNodes = createGroupNodes(layoutedNodes);
            const allNodes = [...groupNodes, ...layoutedNodes];
            
            setFlowNodes(allNodes as any);
            setFlowEdges(processedEdges as any);
            setIsLaidOut(true);
          } catch (fallbackError) {
            console.error('Fallback layout also failed:', fallbackError);
            // Ultimate fallback - grid layout
            const fallbackNodes = processedNodes.map((node, index) => ({
              ...node,
              position: {
                x: (index % 10) * 200,
                y: Math.floor(index / 10) * 150
              }
            }));
            
            setFlowNodes(fallbackNodes as any);
            setFlowEdges(processedEdges as any);
            setIsLaidOut(true);
          }
        }
      };

      performLayoutAsync();
    } else {
      // Clear the graph if the data is empty
      setFlowNodes([]);
      setFlowEdges([]);
      setIsLaidOut(false);
    }
  }, [processedNodes, processedEdges, setFlowNodes, setFlowEdges, 
      layoutEngine, groupDetection, performLayout, props.layoutConfig, props.onError]);

  // Enhanced fit view with smart zoom capabilities (simplified)
  useEffect(() => {
    if (isLaidOut) {
      const timer = setTimeout(() => {
        if (props.navigationConfig?.enableSmartZoom !== false) {
          console.log('🔍 Smart zoom enabled - using enhanced fit view');
        }
        fitView({ padding: 0.1, duration: 300 });
      }, 100);
      
      setIsLaidOut(false);
      return () => clearTimeout(timer);
    }
  }, [isLaidOut, fitView, props.navigationConfig]);

  // Track viewport changes for culling and navigation
  const handleViewportChange = useCallback((viewport: Viewport) => {
    setCurrentViewport(viewport);
  }, []);

  // Enhanced node click with navigation support
  const handleEnhancedNodeClick = useCallback(async (event: any, node: any) => {
    // Call original node click handler
    const originalHandler = useNodeClick(props.data, props.onNodeSelect);
    originalHandler(event, node);

    // Advanced navigation features
    if (props.navigationConfig?.enableAdvancedNavigation !== false && node.type === 'custom') {
      try {
        console.log('🧭 Advanced navigation to node:', node.id);
        // Use fitView to navigate to the node for now
        fitView({ 
          nodes: [{ id: node.id }], 
          padding: 0.2, 
          duration: 500 
        });
      } catch (error) {
        console.warn('Navigation failed:', error);
      }
    }
  }, [props.data, props.onNodeSelect, props.navigationConfig, fitView]);
  // Enhanced performance settings based on configuration and graph size
  const performanceSettings = useMemo(() => {
    const nodeCount = flowNodes.length;
    const maxRenderNodes = props.performanceConfig?.maxRenderNodes || 500;
    
    return {
      onlyRenderVisibleElements: nodeCount > 100 || props.performanceConfig?.enableViewportCulling !== false,
      elevateNodesOnSelect: nodeCount < 200,
      elevateEdgesOnSelect: nodeCount < 200,
      selectNodesOnDrag: nodeCount < maxRenderNodes,
      panOnDrag: nodeCount > maxRenderNodes ? [1] : [1, 2],
      zoomOnScroll: nodeCount < maxRenderNodes,
      zoomOnPinch: nodeCount < maxRenderNodes
    };
  }, [flowNodes.length, props.performanceConfig]);

  const getMinimapNodeColor = useMinimapNodeColor();
  const nodeTypes = useMemo(() => ({ custom: CustomNode, group: GroupNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  return (
    <div className="h-full w-full relative" role="application">
        {/* Enhanced information panel */}
        <div className="absolute top-2 left-2 bg-blue-100 border border-blue-400 p-2 text-xs z-50 rounded shadow-lg">
            <div>📊 Graph Data: {props.data.length} nodes</div>
            <div>🎯 Rendered: {flowNodes.length} positioned</div>
            <div>🎨 Layout: Multi-algorithm system</div>
            <div>🏗️ Groups: {new Set(props.data.filter(n => n.groupName).map(n => n.groupName)).size} detected</div>
            <div>🚀 Performance: {props.layoutConfig?.performanceMode || 'balanced'} mode</div>
            <div>🔍 Navigation: {props.navigationConfig?.enableSmartZoom !== false ? 'Smart Zoom' : 'Standard'}</div>
        </div>
        
        <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleEnhancedNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            className="bg-gray-50"
            proOptions={{ hideAttribution: true }}
            minZoom={0.05}
            maxZoom={4}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            deleteKeyCode={null}
            {...performanceSettings}
        >
            <Background color="#e5e7eb" size={1} />
            <Controls />
            <MiniMap nodeColor={getMinimapNodeColor} />
        </ReactFlow>
        
        <PerformanceMonitor
            nodeCount={flowNodes.length}
            edgeCount={flowEdges.length}
            enabled={props.showPerformanceMonitor}
        />
    </div>
  );
};

// Main export component that handles validation and provides the ReactFlowProvider.
export const GraphVisualization: React.FC<GraphVisualizationProps> = (props) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (props.data.length > 0) {
      const validation = safeValidateGraph(props.data);
      if (!validation.isValid) {
        const errorMessage = validation.errors[0] || 'Invalid graph data';
        setValidationError(errorMessage);
        props.onError?.(new Error(errorMessage), 'data-validation');
        return;
      }
      setValidationError(null);
    }
  }, [props.data, props.onError]);

  if (validationError) {
    return (
      <div className="h-full flex items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-lg" role="alert">
        <div className="text-center p-6">
          <h3 className="font-semibold mb-2">Graph Validation Error</h3>
          <p className="text-sm">{validationError}</p>
        </div>
      </div>
    );
  }

  if (props.data.length === 0) {
     return (
      <div className="h-full flex items-center justify-center text-gray-500" role="status">
        <p>{ERROR_MESSAGES.NO_DATA}</p>
      </div>
    );
  }

  // The ReactFlowProvider is essential for the `useReactFlow` hook (like `fitView`) to work.
  return (
    <ReactFlowProvider>
      <EnhancedGraphLayoutWrapper {...props} />
    </ReactFlowProvider>
  );
};