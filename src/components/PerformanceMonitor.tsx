import React, { useEffect, useState, useRef } from 'react';
import { Monitor, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  nodeCount: number;
  edgeCount: number;
  memoryUsage: number;
  fps: number;
}

interface PerformanceMonitorProps {
  nodeCount: number;
  edgeCount: number;
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  nodeCount,
  edgeCount,
  enabled = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
    memoryUsage: 0,
    fps: 0
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();

  // FPS monitoring
  useEffect(() => {
    if (!enabled) return;

    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) { // Update every second
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        setMetrics(prev => ({ ...prev, fps }));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(updateFPS);
    };

    animationFrameRef.current = requestAnimationFrame(updateFPS);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Performance monitoring
  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      nodeCount,
      edgeCount,
      renderTime: performance.now() - startTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0
    }));
  }, [nodeCount, edgeCount, enabled]);

  if (!enabled) return null;

  const getPerformanceStatus = () => {
    if (metrics.fps < 30 || metrics.renderTime > 100) {
      return { icon: AlertTriangle, color: 'text-red-500', label: 'Poor' };
    }
    if (metrics.fps < 50 || metrics.renderTime > 50) {
      return { icon: Monitor, color: 'text-yellow-500', label: 'Fair' };
    }
    return { icon: CheckCircle, color: 'text-green-500', label: 'Good' };
  };

  const status = getPerformanceStatus();
  const StatusIcon = status.icon;

  return (
    <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs font-mono z-50">
      <div className="flex items-center space-x-2 mb-2">
        <StatusIcon className={`w-4 h-4 ${status.color}`} />
        <span className={`font-semibold ${status.color}`}>Performance: {status.label}</span>
      </div>
      
      <div className="space-y-1 text-gray-600">
        <div>Nodes: {metrics.nodeCount}</div>
        <div>Edges: {metrics.edgeCount}</div>
        <div>FPS: {metrics.fps}</div>
        <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
        {metrics.memoryUsage > 0 && (
          <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
        )}
      </div>
    </div>
  );
};