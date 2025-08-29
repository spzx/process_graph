# Enhanced Graph Visualization System

A comprehensive, high-performance graph visualization system with advanced layout algorithms, smart grouping, and intelligent navigation capabilities.

## 🚀 Features

### Multi-Algorithm Layout Engine
- **Force-Directed Layout**: Physics-based simulation for organic, natural-looking layouts
- **Enhanced Hierarchical Layout**: Structured tree-like arrangements with improved group handling
- **Constraint-Based Layout**: Advanced constraint-solving for dense networks using Webcola
- **Intelligent Algorithm Selection**: ML-inspired automatic algorithm selection based on graph characteristics

### Smart Grouping System
- **Semantic Grouping**: Groups nodes based on naming patterns and properties
- **Connectivity Grouping**: Uses graph algorithms for community detection
- **Hierarchical Grouping**: Nested group structures with collapse/expand functionality
- **Dynamic Group Management**: Real-time group adjustments based on user interactions

### Advanced Navigation
- **Smart Zoom System**: Context-aware zooming with level-of-detail rendering
- **Advanced Navigation Controller**: Jump-to-node, path following, and guided tours
- **Breadcrumb Navigation**: Track and navigate through interaction history

### Performance Optimizations
- **Enhanced Viewport Culling**: Predictive loading with spatial indexing
- **Edge Bundling**: Reduces visual complexity in dense graphs
- **Level of Detail (LOD) Rendering**: Adaptive rendering based on zoom levels
- **Performance Monitoring**: Real-time performance metrics and adaptive optimization

## 📦 Installation

```bash
npm install d3-force d3-selection webcola react-spring @react-spring/web @tanstack/react-virtual
```

## 🎯 Quick Start

### Basic Usage

```tsx
import React from 'react';
import { GraphVisualization } from './components/GraphVisualization';
import { useEnhancedGraph } from './hooks/useEnhancedGraph';

const MyGraphComponent = () => {
  const nodes = [
    { id: '1', data: { label: 'Node 1' }, position: { x: 0, y: 0 } },
    { id: '2', data: { label: 'Node 2' }, position: { x: 100, y: 0 } },
    { id: '3', data: { label: 'Node 3' }, position: { x: 200, y: 0 } }
  ];

  const edges = [
    { id: 'e1', source: '1', target: '2' },
    { id: 'e2', source: '2', target: '3' }
  ];

  return (
    <GraphVisualization
      data={nodes}
      onNodeSelect={(node) => console.log('Selected:', node)}
      layoutConfig={{
        algorithm: 'auto',
        performanceMode: 'balanced',
        enableSmartGrouping: true
      }}
      navigationConfig={{
        enableSmartZoom: true,
        enableAdvancedNavigation: true
      }}
      performanceConfig={{
        enableViewportCulling: true,
        enableLOD: true,
        maxRenderNodes: 1000
      }}
    />
  );
};
```

### Using Enhanced Hooks

```tsx
import React from 'react';
import { useEnhancedGraph, ENHANCED_GRAPH_PRESETS } from './hooks/useEnhancedGraph';

const AdvancedGraphComponent = () => {
  const { nodes, edges, actions, status, metrics } = useEnhancedGraph(
    initialNodes,
    initialEdges,
    ENHANCED_GRAPH_PRESETS.HIGH_PERFORMANCE
  );

  return (
    <div>
      <div className="controls">
        <button onClick={actions.relayout} disabled={status.isLayouting}>
          {status.isLayouting ? 'Processing...' : 'Re-layout'}
        </button>
        <button onClick={actions.resetView}>Reset View</button>
        <button onClick={() => actions.changeAlgorithm('force-directed')}>
          Force-Directed
        </button>
      </div>

      <div className="metrics">
        <p>Nodes: {metrics.nodeCount}</p>
        <p>Render Time: {metrics.renderTime.toFixed(2)}ms</p>
        <p>LOD Level: {metrics.lodLevel}</p>
      </div>

      <GraphVisualization
        data={nodes}
        onNodeSelect={(node) => actions.navigateToNode(node.id)}
      />
    </div>
  );
};
```

## 🎛️ Advanced Configuration

### Layout Engine Configuration

```tsx
import { createLayoutEngine, DEFAULT_CONFIGS } from './utils/layoutEngine';

// Create custom layout engine
const engine = createLayoutEngine({
  defaultAlgorithm: 'force-directed',
  autoSelection: true,
  debug: false
});

// Use with predefined configurations
const performanceConfig = DEFAULT_CONFIGS.PERFORMANCE_OPTIMIZED;
const qualityConfig = DEFAULT_CONFIGS.QUALITY_OPTIMIZED;
```

### Group Detection Configuration

```tsx
import { SmartGroupDetectionSystem } from './utils/grouping/SmartGroupDetection';

const groupDetection = new SmartGroupDetectionSystem({
  strategies: {
    semantic: true,      // Group by naming patterns
    connectivity: true,  // Group by graph connectivity
    structural: false,   // Group by structural similarity
    temporal: false      // Group by temporal patterns
  },
  minGroupSize: 2,
  maxGroupSize: 50,
  confidenceThreshold: 0.6
});

// Detect groups
const groups = await groupDetection.detectGroups(nodes, edges);
```

### Performance Optimization

```tsx
import { EdgeBundlingSystem, LODRenderer } from './utils/visualization';

// Configure edge bundling
const edgeBundling = new EdgeBundlingSystem({
  enabled: true,
  strategy: 'adaptive',
  strength: 0.7,
  minBundleSize: 3
});

// Configure LOD rendering
const lodRenderer = new LODRenderer({
  enabled: true,
  performance: {
    maxRenderNodes: 1000,
    updateInterval: 16 // 60 FPS
  },
  adaptive: {
    enabled: true,
    targetFPS: 45
  }
});
```

## 🎨 UI Controls

### Layout Controls

```tsx
import { LayoutControls } from './components/controls/LayoutControls';

<LayoutControls
  currentAlgorithm="force-directed"
  availableAlgorithms={['force-directed', 'hierarchical', 'constraint-based']}
  performanceMode="balanced"
  autoSelection={true}
  onAlgorithmChange={(algorithm) => console.log('Changed to:', algorithm)}
  onRelayout={() => console.log('Relayout triggered')}
  showMetrics={true}
  performanceStats={{
    averageTime: 150,
    lastExecutionTime: 120,
    memoryUsage: 45
  }}
/>
```

### Group Controls

```tsx
import { GroupControls } from './components/controls/GroupControls';

<GroupControls
  groups={detectedGroups}
  strategy="semantic"
  detectionConfig={{
    semantic: true,
    connectivity: true,
    structural: false,
    minGroupSize: 2,
    maxGroupSize: 50,
    confidenceThreshold: 0.6
  }}
  onDetectionConfigChange={(config) => console.log('Config changed:', config)}
  onGroupToggle={(groupId, action) => console.log('Group action:', groupId, action)}
  onRedetectGroups={() => console.log('Re-detecting groups')}
/>
```

### Navigation Controls

```tsx
import { NavigationControls } from './components/controls/NavigationControls';

<NavigationControls
  viewport={{ x: 0, y: 0, zoom: 1 }}
  nodes={nodes}
  breadcrumbs={['node1', 'node2', 'node3']}
  bookmarks={savedBookmarks}
  onZoomIn={() => console.log('Zoom in')}
  onNavigateToNode={(nodeId) => console.log('Navigate to:', nodeId)}
  onBookmarkCreate={(bookmark) => console.log('Bookmark created:', bookmark)}
/>
```

## 📊 Performance Optimization Examples

### Large Graph Optimization

```tsx
// Configuration for graphs with 1000+ nodes
const largeGraphConfig = {
  layout: {
    strategy: 'performance',
    performanceMode: 'performance'
  },
  performance: {
    culling: true,
    predictiveLoading: true,
    maxNodes: 200,
    lod: true,
    bundling: true
  },
  grouping: {
    enabled: true,
    dynamic: false,
    autoCollapse: true
  }
};

<GraphVisualization
  data={largeDataset}
  onNodeSelect={handleNodeSelect}
  {...largeGraphConfig}
/>
```

### Real-time Performance Monitoring

```tsx
import { usePerformanceOptimization } from './hooks/useEnhancedGraph';

const PerformanceMonitoredGraph = () => {
  const { systems, metrics } = usePerformanceOptimization({
    enableCulling: true,
    enableLOD: true,
    enableBundling: true,
    maxNodes: 500
  });

  return (
    <div>
      <div className="performance-metrics">
        <p>FPS: {metrics.fps.toFixed(1)}</p>
        <p>Render Time: {metrics.renderTime.toFixed(2)}ms</p>
        <p>Memory: {metrics.memoryUsage.toFixed(1)}MB</p>
        <p>Nodes: {metrics.nodeCount}</p>
      </div>
      
      <GraphVisualization data={nodes} onNodeSelect={handleSelect} />
    </div>
  );
};
```

## 🧪 Algorithm Selection Examples

### Automatic Algorithm Selection

```tsx
import { useLayoutEngine } from './hooks/useEnhancedGraph';

const AdaptiveLayoutGraph = () => {
  const { 
    engine, 
    processLayout, 
    algorithms, 
    performance 
  } = useLayoutEngine({
    autoSelection: true,
    performanceMode: 'balanced'
  });

  const handleLayoutChange = async () => {
    const result = await processLayout(nodes, edges);
    console.log('Selected algorithm:', result.algorithm);
    console.log('Quality score:', result.quality.overallScore);
  };

  return (
    <div>
      <h3>Available Algorithms:</h3>
      {algorithms.map(alg => (
        <div key={alg.name}>
          {alg.displayName} - Priority: {alg.priority}
        </div>
      ))}
      
      <button onClick={handleLayoutChange}>
        Auto-select and Layout
      </button>
      
      {performance && (
        <div>
          Average Time: {performance.averageTime?.toFixed(2)}ms
        </div>
      )}
    </div>
  );
};
```

### Custom Algorithm Selection Strategy

```tsx
import { AlgorithmSelector } from './utils/layoutEngine/AlgorithmSelector';

const selector = new AlgorithmSelector({
  preferredAlgorithms: new Map([
    ['force-directed', 10],
    ['hierarchical', 5]
  ]),
  speedTolerance: 'high',
  qualityExpectations: 'excellent'
});

// Custom selection with user preferences
const selection = selector.selectAlgorithm(
  algorithms,
  nodes,
  edges,
  criteria,
  'user-guided'
);

console.log('Selected:', selection.algorithm.displayName);
console.log('Confidence:', (selection.confidence * 100).toFixed(1) + '%');
console.log('Reasoning:', selection.reasoning);
```

## 🔄 Group Management Examples

### Dynamic Group Management

```tsx
import { useGroupManagement } from './hooks/useEnhancedGraph';

const DynamicGroupGraph = () => {
  const {
    groups,
    isDetecting,
    detectGroups,
    collapseGroup,
    expandGroup
  } = useGroupManagement({
    enableSmartDetection: true,
    enableHierarchical: true,
    enableDynamic: true
  });

  const handleSelectionGrouping = async () => {
    if (selectedNodes.length >= 2) {
      await detectGroups(nodes, edges);
    }
  };

  return (
    <div>
      <div className="group-info">
        <p>Detected Groups: {groups.length}</p>
        <button onClick={handleSelectionGrouping} disabled={isDetecting}>
          {isDetecting ? 'Detecting...' : 'Detect Groups'}
        </button>
      </div>

      {groups.map(group => (
        <div key={group.id} className="group-item">
          <span>{group.name} ({group.nodeIds.length} nodes)</span>
          <button onClick={() => collapseGroup(group.id)}>
            Collapse
          </button>
          <button onClick={() => expandGroup(group.id)}>
            Expand
          </button>
        </div>
      ))}
    </div>
  );
};
```

## 🧭 Advanced Navigation Examples

### Guided Tours

```tsx
import { useAdvancedNavigation } from './hooks/useEnhancedGraph';

const TourEnabledGraph = () => {
  const {
    isNavigating,
    breadcrumbs,
    navigateToNode,
    goBack,
    canGoBack
  } = useAdvancedNavigation({
    enableSmartZoom: true,
    enableBreadcrumbs: true
  });

  const startTour = async () => {
    const tourSteps = ['node1', 'node2', 'node3', 'node4'];
    
    for (const nodeId of tourSteps) {
      await navigateToNode(nodeId, { duration: 1000, padding: 0.3 });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Pause
    }
  };

  return (
    <div>
      <div className="navigation-controls">
        <button onClick={startTour} disabled={isNavigating}>
          Start Tour
        </button>
        <button onClick={goBack} disabled={!canGoBack}>
          Go Back
        </button>
      </div>

      <div className="breadcrumbs">
        {breadcrumbs.map((nodeId, index) => (
          <span key={index}>
            <button onClick={() => navigateToNode(nodeId)}>
              {nodeId}
            </button>
            {index < breadcrumbs.length - 1 && ' → '}
          </span>
        ))}
      </div>
    </div>
  );
};
```

## 🔧 Debugging and Development

### Debug Mode

```tsx
import { useGraphDebugger } from './hooks/useEnhancedGraph';

const DebugGraph = () => {
  const { enabled, logs, log, clearLogs } = useGraphDebugger(true);

  useEffect(() => {
    log('info', 'Graph component mounted', { nodeCount: nodes.length });
  }, []);

  return (
    <div>
      {enabled && (
        <div className="debug-panel">
          <h4>Debug Logs:</h4>
          <button onClick={clearLogs}>Clear</button>
          <div className="logs">
            {logs.map((entry, index) => (
              <div key={index} className={`log-${entry.level}`}>
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span>{entry.message}</span>
                {entry.data && <pre>{JSON.stringify(entry.data, null, 2)}</pre>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## 📈 Performance Best Practices

### 1. Choose the Right Configuration

```tsx
// For small graphs (< 50 nodes)
const smallGraphConfig = ENHANCED_GRAPH_PRESETS.HIGH_QUALITY;

// For medium graphs (50-200 nodes)
const mediumGraphConfig = ENHANCED_GRAPH_PRESETS.BALANCED;

// For large graphs (> 200 nodes)
const largeGraphConfig = ENHANCED_GRAPH_PRESETS.HIGH_PERFORMANCE;
```

### 2. Optimize for Your Use Case

```tsx
// Exploration/Analysis
const explorationConfig = {
  layout: { strategy: 'balanced', performanceMode: 'quality' },
  grouping: { enabled: true, dynamic: true },
  navigation: { smartZoom: true, advanced: true }
};

// Presentation/Demo
const presentationConfig = {
  layout: { strategy: 'quality', performanceMode: 'quality' },
  performance: { lod: false, bundling: false },
  navigation: { smartZoom: true, breadcrumbs: false }
};

// Real-time/Interactive
const realtimeConfig = {
  layout: { strategy: 'performance', performanceMode: 'performance' },
  performance: { culling: true, lod: true, maxNodes: 100 },
  grouping: { dynamic: false, autoCollapse: true }
};
```

### 3. Monitor and Adapt

```tsx
const AdaptivePerformanceGraph = () => {
  const [config, setConfig] = useState(ENHANCED_GRAPH_PRESETS.BALANCED);
  const { metrics } = usePerformanceOptimization();

  useEffect(() => {
    if (metrics.fps < 30) {
      // Switch to performance mode
      setConfig(ENHANCED_GRAPH_PRESETS.HIGH_PERFORMANCE);
    } else if (metrics.fps > 50 && metrics.memoryUsage < 100) {
      // Can afford better quality
      setConfig(ENHANCED_GRAPH_PRESETS.HIGH_QUALITY);
    }
  }, [metrics]);

  return <GraphVisualization config={config} />;
};
```

## 🎉 Complete Example Application

```tsx
import React, { useState } from 'react';
import {
  GraphVisualization,
  LayoutControls,
  GroupControls,
  NavigationControls
} from './components';
import { useEnhancedGraph, ENHANCED_GRAPH_PRESETS } from './hooks/useEnhancedGraph';

const CompleteGraphApp = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [config, setConfig] = useState(ENHANCED_GRAPH_PRESETS.DEVELOPMENT);

  const {
    nodes,
    edges,
    viewport,
    metrics,
    status,
    actions
  } = useEnhancedGraph(initialNodes, initialEdges, config);

  return (
    <div className="graph-app">
      {/* Main Graph */}
      <div className="graph-container">
        <GraphVisualization
          data={nodes}
          onNodeSelect={(node) => setSelectedNodeId(node.id)}
          selectedNodeId={selectedNodeId}
          showPerformanceMonitor={true}
          {...config}
        />
      </div>

      {/* Control Panels */}
      <LayoutControls
        currentAlgorithm={metrics.algorithm}
        performanceMode={config.layout.performanceMode}
        onAlgorithmChange={actions.changeAlgorithm}
        onRelayout={actions.relayout}
        showMetrics={true}
        performanceStats={metrics}
      />

      <GroupControls
        groups={detectedGroups}
        onGroupToggle={actions.toggleGroup}
        onRedetectGroups={() => actions.relayout()}
      />

      <NavigationControls
        viewport={viewport}
        nodes={nodes}
        onNavigateToNode={actions.navigateToNode}
        onZoomToFit={actions.resetView}
      />

      {/* Status Bar */}
      <div className="status-bar">
        <span>Nodes: {metrics.nodeCount}</span>
        <span>Render: {metrics.renderTime.toFixed(2)}ms</span>
        <span>LOD: Level {metrics.lodLevel}</span>
        <span>Status: {status.isLayouting ? 'Processing' : 'Ready'}</span>
      </div>
    </div>
  );
};

export default CompleteGraphApp;
```

## 📚 API Reference

### Core Components
- [`GraphVisualization`](./components/GraphVisualization.tsx) - Main graph visualization component
- [`LayoutControls`](./components/controls/LayoutControls.tsx) - Algorithm selection and configuration
- [`GroupControls`](./components/controls/GroupControls.tsx) - Group management interface
- [`NavigationControls`](./components/controls/NavigationControls.tsx) - Advanced navigation features

### Hooks
- [`useEnhancedGraph`](./hooks/useEnhancedGraph.ts) - Main integration hook
- [`useLayoutEngine`](./hooks/useEnhancedGraph.ts) - Layout engine management
- [`useGroupManagement`](./hooks/useEnhancedGraph.ts) - Group detection and management
- [`useAdvancedNavigation`](./hooks/useEnhancedGraph.ts) - Navigation and viewport management

### Core Systems
- [`MultiLayoutEngine`](./utils/layoutEngine/MultiLayoutEngine.ts) - Multi-algorithm coordinator
- [`SmartGroupDetectionSystem`](./utils/grouping/SmartGroupDetection.ts) - Intelligent group detection
- [`EdgeBundlingSystem`](./utils/visualization/EdgeBundling.ts) - Edge bundling for complexity reduction
- [`LODRenderer`](./utils/visualization/LODRenderer.ts) - Level-of-detail rendering

---

For more detailed information, see the individual component and system documentation files.