/**
 * Performance Testing Suite for Enhanced Graph Visualization System
 * 
 * This suite provides comprehensive performance testing and benchmarking
 * for all components of the enhanced graph visualization system.
 */

import { performance } from 'perf_hooks';
import { MultiLayoutEngine } from '../utils/layoutEngine';
import { SmartGroupDetectionSystem } from '../utils/grouping/SmartGroupDetection';
import { EdgeBundlingSystem } from '../utils/visualization/EdgeBundling';
import { LODRenderer } from '../utils/visualization/LODRenderer';
import { EnhancedViewportCulling } from '../utils/performance/EnhancedViewportCulling';
import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';

/**
 * Performance test configuration
 */
interface PerformanceTestConfig {
  /** Test dataset sizes */
  dataSizes: number[];
  
  /** Number of iterations per test */
  iterations: number;
  
  /** Acceptable performance thresholds (ms) */
  thresholds: {
    layout: number;
    groupDetection: number;
    edgeBundling: number;
    lodRendering: number;
    viewportCulling: number;
  };
  
  /** Memory usage limits (MB) */
  memoryLimits: {
    layout: number;
    groupDetection: number;
    rendering: number;
  };
}

/**
 * Performance test results
 */
interface PerformanceTestResult {
  testName: string;
  dataSize: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryUsage: number;
  throughput: number; // operations per second
  passed: boolean;
  threshold: number;
}

/**
 * Test data generator
 */
class TestDataGenerator {
  /**
   * Generate test graph data
   */
  static generateGraphData(nodeCount: number, edgeRatio = 1.5): {
    nodes: FlowNode[];
    edges: FlowEdge[];
  } {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    
    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: `node-${i}`,
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 1000
        },
        data: {
          label: `Node ${i}`,
          type: Math.random() > 0.7 ? 'special' : 'normal',
          category: `category-${Math.floor(i / 10)}`,
          weight: Math.random() * 100
        }
      });
    }
    
    // Generate edges
    const edgeCount = Math.floor(nodeCount * edgeRatio);
    const existingEdges = new Set<string>();
    
    for (let i = 0; i < edgeCount; i++) {
      let sourceIndex, targetIndex, edgeKey;
      
      do {
        sourceIndex = Math.floor(Math.random() * nodeCount);
        targetIndex = Math.floor(Math.random() * nodeCount);
        edgeKey = `${sourceIndex}-${targetIndex}`;
      } while (sourceIndex === targetIndex || existingEdges.has(edgeKey));
      
      existingEdges.add(edgeKey);
      
      edges.push({
        id: `edge-${i}`,
        source: `node-${sourceIndex}`,
        target: `node-${targetIndex}`,
        data: {
          weight: Math.random() * 10,
          type: Math.random() > 0.8 ? 'important' : 'normal'
        }
      });
    }
    
    return { nodes, edges };
  }
  
  /**
   * Generate complex hierarchical data
   */
  static generateHierarchicalData(levels: number, branchingFactor: number): {
    nodes: FlowNode[];
    edges: FlowEdge[];
  } {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    let nodeId = 0;
    
    // Generate tree structure
    const generateLevel = (parentId: string | null, currentLevel: number, maxLevels: number) => {
      if (currentLevel >= maxLevels) return;
      
      for (let i = 0; i < branchingFactor; i++) {
        const id = `node-${nodeId++}`;
        
        nodes.push({
          id,
          position: { x: 0, y: 0 }, // Will be positioned by layout
          data: {
            label: `L${currentLevel}N${i}`,
            level: currentLevel,
            parent: parentId
          }
        });
        
        if (parentId) {
          edges.push({
            id: `edge-${parentId}-${id}`,
            source: parentId,
            target: id
          });
        }
        
        generateLevel(id, currentLevel + 1, maxLevels);
      }
    };
    
    generateLevel(null, 0, levels);
    return { nodes, edges };
  }
}

/**
 * Performance benchmark runner
 */
class PerformanceBenchmark {
  private config: PerformanceTestConfig;
  private results: PerformanceTestResult[] = [];
  
  constructor(config: PerformanceTestConfig) {
    this.config = config;
  }
  
  /**
   * Run performance test for a specific function
   */
  async runTest<T>(
    testName: string,
    testFunction: () => Promise<T> | T,
    dataSize: number,
    threshold: number
  ): Promise<PerformanceTestResult> {
    const times: number[] = [];
    const memoryBefore = this.getMemoryUsage();
    
    // Warm-up run
    await testFunction();
    
    // Performance runs
    for (let i = 0; i < this.config.iterations; i++) {
      const startTime = performance.now();
      await testFunction();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const memoryAfter = this.getMemoryUsage();
    
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const memoryUsage = memoryAfter - memoryBefore;
    const throughput = 1000 / averageTime; // operations per second
    const passed = averageTime <= threshold;
    
    const result: PerformanceTestResult = {
      testName,
      dataSize,
      averageTime,
      minTime,
      maxTime,
      memoryUsage,
      throughput,
      passed,
      threshold
    };
    
    this.results.push(result);
    return result;
  }
  
  /**
   * Get current memory usage (approximation)
   */
  private getMemoryUsage(): number {
    if (typeof (performance as any).memory !== 'undefined') {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }
  
  /**
   * Get all results
   */
  getResults(): PerformanceTestResult[] {
    return this.results;
  }
  
  /**
   * Generate performance report
   */
  generateReport(): string {
    let report = '\n=== ENHANCED GRAPH VISUALIZATION PERFORMANCE REPORT ===\n\n';
    
    // Group results by test name
    const groupedResults = new Map<string, PerformanceTestResult[]>();
    this.results.forEach(result => {
      if (!groupedResults.has(result.testName)) {
        groupedResults.set(result.testName, []);
      }
      groupedResults.get(result.testName)!.push(result);
    });
    
    groupedResults.forEach((results, testName) => {
      report += `## ${testName}\n`;
      report += '| Data Size | Avg Time (ms) | Min Time (ms) | Max Time (ms) | Memory (MB) | Throughput (ops/s) | Status |\n';
      report += '|-----------|---------------|---------------|---------------|-------------|-------------------|--------|\n';
      
      results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        report += `| ${result.dataSize} | ${result.averageTime.toFixed(2)} | ${result.minTime.toFixed(2)} | ${result.maxTime.toFixed(2)} | ${result.memoryUsage.toFixed(2)} | ${result.throughput.toFixed(2)} | ${status} |\n`;
      });
      
      report += '\n';
    });
    
    // Summary
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const passRate = (passedTests / totalTests * 100).toFixed(1);
    
    report += `## Summary\n`;
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${totalTests - passedTests}\n`;
    report += `- Pass Rate: ${passRate}%\n\n`;
    
    return report;
  }
}

/**
 * Performance test suite
 */
describe('Enhanced Graph Visualization - Performance Tests', () => {
  let benchmark: PerformanceBenchmark;
  let layoutEngine: MultiLayoutEngine;
  let groupDetection: SmartGroupDetectionSystem;
  let edgeBundling: EdgeBundlingSystem;
  let lodRenderer: LODRenderer;
  let viewportCulling: EnhancedViewportCulling;
  
  const testConfig: PerformanceTestConfig = {
    dataSizes: [50, 100, 200, 500],
    iterations: 5,
    thresholds: {
      layout: 2000, // 2 seconds
      groupDetection: 1000, // 1 second
      edgeBundling: 500, // 0.5 seconds
      lodRendering: 100, // 0.1 seconds
      viewportCulling: 50 // 0.05 seconds
    },
    memoryLimits: {
      layout: 50, // 50 MB
      groupDetection: 30, // 30 MB
      rendering: 20 // 20 MB
    }
  };
  
  beforeAll(() => {
    benchmark = new PerformanceBenchmark(testConfig);
    layoutEngine = new MultiLayoutEngine();
    groupDetection = new SmartGroupDetectionSystem();
    edgeBundling = new EdgeBundlingSystem();
    lodRenderer = new LODRenderer();
    viewportCulling = new EnhancedViewportCulling();
  });
  
  afterAll(() => {
    console.log(benchmark.generateReport());
  });
  
  /**
   * Test layout engine performance
   */
  describe('Layout Engine Performance', () => {
    testConfig.dataSizes.forEach(dataSize => {
      test(`Force-Directed Layout - ${dataSize} nodes`, async () => {
        const { nodes, edges } = TestDataGenerator.generateGraphData(dataSize);
        
        const result = await benchmark.runTest(
          'Force-Directed Layout',
          () => layoutEngine.processLayout(nodes, edges, { algorithm: 'force-directed' }),
          dataSize,
          testConfig.thresholds.layout
        );
        
        expect(result.passed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(testConfig.memoryLimits.layout);
      });
      
      test(`Hierarchical Layout - ${dataSize} nodes`, async () => {
        const { nodes, edges } = TestDataGenerator.generateHierarchicalData(5, Math.ceil(dataSize / 25));
        
        const result = await benchmark.runTest(
          'Hierarchical Layout',
          () => layoutEngine.processLayout(nodes, edges, { algorithm: 'hierarchical' }),
          dataSize,
          testConfig.thresholds.layout
        );
        
        expect(result.passed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(testConfig.memoryLimits.layout);
      });
      
      test(`Constraint-Based Layout - ${dataSize} nodes`, async () => {
        const { nodes, edges } = TestDataGenerator.generateGraphData(dataSize, 2.5);
        
        const result = await benchmark.runTest(
          'Constraint-Based Layout',
          () => layoutEngine.processLayout(nodes, edges, { algorithm: 'constraint-based' }),
          dataSize,
          testConfig.thresholds.layout
        );
        
        expect(result.passed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(testConfig.memoryLimits.layout);
      });
    });
  });
  
  /**
   * Test group detection performance
   */
  describe('Group Detection Performance', () => {
    testConfig.dataSizes.forEach(dataSize => {
      test(`Smart Group Detection - ${dataSize} nodes`, async () => {
        const { nodes, edges } = TestDataGenerator.generateGraphData(dataSize);
        
        const result = await benchmark.runTest(
          'Smart Group Detection',
          () => groupDetection.detectGroups(nodes, edges),
          dataSize,
          testConfig.thresholds.groupDetection
        );
        
        expect(result.passed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(testConfig.memoryLimits.groupDetection);
      });
    });
  });
  
  /**
   * Test edge bundling performance
   */
  describe('Edge Bundling Performance', () => {
    testConfig.dataSizes.forEach(dataSize => {
      test(`Edge Bundling - ${dataSize} nodes`, async () => {
        const { nodes, edges } = TestDataGenerator.generateGraphData(dataSize, 3);
        
        const result = await benchmark.runTest(
          'Edge Bundling',
          () => edgeBundling.bundleEdges(edges, nodes),
          dataSize,
          testConfig.thresholds.edgeBundling
        );
        
        expect(result.passed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(testConfig.memoryLimits.rendering);
      });
    });
  });
  
  /**
   * Test LOD rendering performance
   */
  describe('LOD Rendering Performance', () => {
    testConfig.dataSizes.forEach(dataSize => {
      test(`LOD Rendering - ${dataSize} nodes`, async () => {
        const { nodes, edges } = TestDataGenerator.generateGraphData(dataSize);
        const viewport = { x: 0, y: 0, zoom: 1 };
        
        const result = await benchmark.runTest(
          'LOD Rendering',
          () => lodRenderer.renderWithLOD(nodes, edges, viewport),
          dataSize,
          testConfig.thresholds.lodRendering
        );
        
        expect(result.passed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(testConfig.memoryLimits.rendering);
      });
    });
  });
  
  /**
   * Test viewport culling performance
   */
  describe('Viewport Culling Performance', () => {
    testConfig.dataSizes.forEach(dataSize => {
      test(`Viewport Culling - ${dataSize} nodes`, async () => {
        const { nodes } = TestDataGenerator.generateGraphData(dataSize);
        const viewport = { 
          x: 0, 
          y: 0, 
          zoom: 1, 
          width: 1920, 
          height: 1080 
        };
        
        const result = await benchmark.runTest(
          'Viewport Culling',
          () => viewportCulling.cullNodes(nodes as any, viewport as any),
          dataSize,
          testConfig.thresholds.viewportCulling
        );
        
        expect(result.passed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(testConfig.memoryLimits.rendering);
      });
    });
  });
  
  /**
   * Stress test with large datasets
   */
  describe('Stress Tests', () => {
    const stressSizes = [1000, 2000, 5000];
    
    stressSizes.forEach(dataSize => {
      test(`Stress Test - ${dataSize} nodes`, async () => {
        const { nodes, edges } = TestDataGenerator.generateGraphData(dataSize);
        const viewport = { x: 0, y: 0, zoom: 1 };
        
        // Test complete pipeline
        const pipelineTest = async () => {
          // Layout
          const layoutResult = await layoutEngine.processLayout(nodes, edges);
          
          // Group detection
          const groups = await groupDetection.detectGroups(nodes, edges);
          
          // Edge bundling (if many edges)
          let bundles = [];
          if (edges.length > 100) {
            const bundlingResult = await edgeBundling.bundleEdges(edges, nodes);
            bundles = bundlingResult.bundles;
          }
          
          // LOD rendering
          const lodResult = await lodRenderer.renderWithLOD(nodes, edges, viewport);
          
          return {
            layout: layoutResult,
            groups,
            bundles,
            lod: lodResult
          };
        };
        
        const result = await benchmark.runTest(
          'Complete Pipeline',
          pipelineTest,
          dataSize,
          testConfig.thresholds.layout * 3 // More lenient for full pipeline
        );
        
        expect(result.averageTime).toBeLessThan(10000); // 10 seconds max
        expect(result.memoryUsage).toBeLessThan(100); // 100 MB max
      });
    });
  });
});

/**
 * Export performance utilities for external use
 */
export {
  PerformanceBenchmark,
  TestDataGenerator,
  PerformanceTestConfig,
  PerformanceTestResult
};