/**
 * Layout Controls UI Panel
 * 
 * This component provides a user interface for selecting and configuring
 * layout algorithms, performance settings, and visualization options.
 */

import React, { useState, useCallback } from 'react';
import { 
  Settings, 
  Zap, 
  Target, 
  BarChart3, 
  Sliders, 
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';

import { useLayoutEngine } from '../../hooks/useEnhancedGraph';
import { AVAILABLE_ALGORITHMS, DEFAULT_CONFIGS } from '../../utils/layoutEngine';

/**
 * Layout control configuration
 */
export interface LayoutControlsConfig {
  /** Show algorithm selection */
  showAlgorithmSelection?: boolean;
  
  /** Show performance controls */
  showPerformanceControls?: boolean;
  
  /** Show quality controls */
  showQualityControls?: boolean;
  
  /** Show advanced options */
  showAdvancedOptions?: boolean;
  
  /** Panel position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /** Panel size */
  size?: 'compact' | 'normal' | 'expanded';
  
  /** Enable animations */
  enableAnimations?: boolean;
}

/**
 * Layout control props
 */
export interface LayoutControlsProps {
  /** Current algorithm */
  currentAlgorithm?: string;
  
  /** Available algorithms */
  availableAlgorithms?: string[];
  
  /** Performance mode */
  performanceMode?: 'performance' | 'balanced' | 'quality';
  
  /** Auto-selection enabled */
  autoSelection?: boolean;
  
  /** Configuration */
  config?: LayoutControlsConfig;
  
  /** Event handlers */
  onAlgorithmChange?: (algorithm: string) => void;
  onPerformanceModeChange?: (mode: 'performance' | 'balanced' | 'quality') => void;
  onAutoSelectionToggle?: (enabled: boolean) => void;
  onRelayout?: () => void;
  onReset?: () => void;
  
  /** Advanced configuration change handler */
  onAdvancedConfigChange?: (config: any) => void;
  
  /** Show performance metrics */
  showMetrics?: boolean;
  performanceStats?: {
    averageTime?: number;
    lastExecutionTime?: number;
    memoryUsage?: number;
    algorithmsUsed?: Record<string, number>;
  };
}

/**
 * Main Layout Controls Component
 */
export const LayoutControls: React.FC<LayoutControlsProps> = ({
  currentAlgorithm = 'auto',
  availableAlgorithms = Object.values(AVAILABLE_ALGORITHMS),
  performanceMode = 'balanced',
  autoSelection = true,
  config = {},
  onAlgorithmChange,
  onPerformanceModeChange,
  onAutoSelectionToggle,
  onRelayout,
  onReset,
  onAdvancedConfigChange,
  showMetrics = false,
  performanceStats
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Merge with default config
  const fullConfig: Required<LayoutControlsConfig> = {
    showAlgorithmSelection: true,
    showPerformanceControls: true,
    showQualityControls: true,
    showAdvancedOptions: true,
    position: 'top-right',
    size: 'normal',
    enableAnimations: true,
    ...config
  };

  // Handle algorithm change
  const handleAlgorithmChange = useCallback((algorithm: string) => {
    setIsProcessing(true);
    onAlgorithmChange?.(algorithm);
    
    // Simulate processing time
    setTimeout(() => setIsProcessing(false), 1000);
  }, [onAlgorithmChange]);

  // Handle performance mode change
  const handlePerformanceModeChange = useCallback((mode: 'performance' | 'balanced' | 'quality') => {
    onPerformanceModeChange?.(mode);
  }, [onPerformanceModeChange]);

  // Handle relayout
  const handleRelayout = useCallback(() => {
    setIsProcessing(true);
    onRelayout?.();
    setTimeout(() => setIsProcessing(false), 1500);
  }, [onRelayout]);

  // Get algorithm display name
  const getAlgorithmDisplayName = (algorithm: string): string => {
    const displayNames: Record<string, string> = {
      [AVAILABLE_ALGORITHMS.FORCE_DIRECTED]: 'Force-Directed',
      [AVAILABLE_ALGORITHMS.ENHANCED_HIERARCHICAL]: 'Hierarchical',
      [AVAILABLE_ALGORITHMS.CONSTRAINT_BASED]: 'Constraint-Based',
      'auto': 'Auto-Select'
    };
    return displayNames[algorithm] || algorithm;
  };

  // Get algorithm description
  const getAlgorithmDescription = (algorithm: string): string => {
    const descriptions: Record<string, string> = {
      [AVAILABLE_ALGORITHMS.FORCE_DIRECTED]: 'Physics-based simulation for organic layouts',
      [AVAILABLE_ALGORITHMS.ENHANCED_HIERARCHICAL]: 'Structured tree-like arrangements',
      [AVAILABLE_ALGORITHMS.CONSTRAINT_BASED]: 'Constraint-solving for dense networks',
      'auto': 'Automatically selects the best algorithm'
    };
    return descriptions[algorithm] || 'Custom algorithm configuration';
  };

  // Panel positioning classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  // Panel size classes
  const sizeClasses = {
    'compact': 'w-64',
    'normal': 'w-80',
    'expanded': 'w-96'
  };

  return (
    <div 
      className={`
        absolute z-50 
        ${positionClasses[fullConfig.position]} 
        ${sizeClasses[fullConfig.size]}
        bg-white rounded-lg shadow-lg border border-gray-200
        ${fullConfig.enableAnimations ? 'transition-all duration-200' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">Layout Controls</span>
        </div>
        <div className="flex items-center space-x-1">
          {isProcessing && (
            <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? 
              <ChevronDown className="w-4 h-4 text-gray-500" /> : 
              <ChevronRight className="w-4 h-4 text-gray-500" />
            }
          </button>
        </div>
      </div>

      {/* Main Controls - Always visible */}
      <div className="p-3 space-y-3">
        {/* Quick Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleRelayout}
            disabled={isProcessing}
            className={`
              flex-1 flex items-center justify-center space-x-1 px-3 py-2 
              text-sm font-medium rounded-md transition-colors
              ${isProcessing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {isProcessing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isProcessing ? 'Processing...' : 'Re-layout'}</span>
          </button>
          <button
            onClick={onReset}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Algorithm Selection */}
        {fullConfig.showAlgorithmSelection && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
              Layout Algorithm
            </label>
            <div className="space-y-1">
              <select
                value={currentAlgorithm}
                onChange={(e) => handleAlgorithmChange(e.target.value)}
                disabled={autoSelection}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="auto">Auto-Select</option>
                {availableAlgorithms.map(algorithm => (
                  <option key={algorithm} value={algorithm}>
                    {getAlgorithmDisplayName(algorithm)}
                  </option>
                ))}
              </select>
              {currentAlgorithm !== 'auto' && (
                <p className="text-xs text-gray-500">
                  {getAlgorithmDescription(currentAlgorithm)}
                </p>
              )}
            </div>
            
            {/* Auto-selection toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoSelection}
                onChange={(e) => onAutoSelectionToggle?.(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">Enable auto-selection</span>
            </label>
          </div>
        )}

        {/* Performance Mode */}
        {fullConfig.showPerformanceControls && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
              Performance Mode
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['performance', 'balanced', 'quality'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handlePerformanceModeChange(mode)}
                  className={`
                    px-2 py-1 text-xs font-medium rounded transition-colors
                    ${performanceMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {mode === 'performance' && <Zap className="w-3 h-3 inline mr-1" />}
                  {mode === 'balanced' && <Target className="w-3 h-3 inline mr-1" />}
                  {mode === 'quality' && <BarChart3 className="w-3 h-3 inline mr-1" />}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Performance Metrics */}
          {showMetrics && performanceStats && (
            <div className="p-3 bg-gray-50">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                Performance Metrics
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Avg Time:</span>
                  <span className="ml-1 font-mono">
                    {performanceStats.averageTime?.toFixed(1)}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Last:</span>
                  <span className="ml-1 font-mono">
                    {performanceStats.lastExecutionTime?.toFixed(1)}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Memory:</span>
                  <span className="ml-1 font-mono">
                    {performanceStats.memoryUsage?.toFixed(1)}MB
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Algorithms:</span>
                  <span className="ml-1 font-mono">
                    {Object.keys(performanceStats.algorithmsUsed || {}).length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Options */}
          {fullConfig.showAdvancedOptions && (
            <div className="p-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-1 text-xs font-medium text-gray-700 hover:text-gray-900 mb-2"
              >
                <Sliders className="w-3 h-3" />
                <span>Advanced Options</span>
                {showAdvanced ? 
                  <ChevronDown className="w-3 h-3" /> : 
                  <ChevronRight className="w-3 h-3" />
                }
              </button>

              {showAdvanced && (
                <AdvancedLayoutOptions 
                  onConfigChange={onAdvancedConfigChange}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Advanced Layout Options Component
 */
interface AdvancedLayoutOptionsProps {
  onConfigChange?: (config: any) => void;
}

const AdvancedLayoutOptions: React.FC<AdvancedLayoutOptionsProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState({
    groupSpacing: 400,
    nodeSpacing: 100,
    edgeLength: 200,
    iterations: 100,
    enableGrouping: true,
    enableClustering: true,
    springStrength: 0.1,
    repulsionStrength: 100,
    centeringStrength: 0.05,
    damping: 0.9
  });

  const handleConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [config, onConfigChange]);

  return (
    <div className="space-y-3 pl-4">
      {/* Spacing Controls */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">Spacing</label>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Group Spacing</span>
            <input
              type="range"
              min="100"
              max="800"
              step="50"
              value={config.groupSpacing}
              onChange={(e) => handleConfigChange('groupSpacing', parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-xs font-mono w-8">{config.groupSpacing}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Node Spacing</span>
            <input
              type="range"
              min="50"
              max="300"
              step="25"
              value={config.nodeSpacing}
              onChange={(e) => handleConfigChange('nodeSpacing', parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-xs font-mono w-8">{config.nodeSpacing}</span>
          </div>
        </div>
      </div>

      {/* Force Parameters */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">Force Parameters</label>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Spring Strength</span>
            <input
              type="range"
              min="0.01"
              max="1"
              step="0.01"
              value={config.springStrength}
              onChange={(e) => handleConfigChange('springStrength', parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-xs font-mono w-8">{config.springStrength.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Repulsion</span>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={config.repulsionStrength}
              onChange={(e) => handleConfigChange('repulsionStrength', parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-xs font-mono w-8">{config.repulsionStrength}</span>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">Features</label>
        <div className="space-y-1">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.enableGrouping}
              onChange={(e) => handleConfigChange('enableGrouping', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 scale-75"
            />
            <span className="text-xs text-gray-600">Enable Grouping</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.enableClustering}
              onChange={(e) => handleConfigChange('enableClustering', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 scale-75"
            />
            <span className="text-xs text-gray-600">Enable Clustering</span>
          </label>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact Layout Controls for minimal UI
 */
export const CompactLayoutControls: React.FC<Omit<LayoutControlsProps, 'config'>> = (props) => {
  return (
    <LayoutControls
      {...props}
      config={{
        size: 'compact',
        showAdvancedOptions: false,
        showQualityControls: false
      }}
    />
  );
};

/**
 * Algorithm Quick Selector
 */
interface AlgorithmSelectorProps {
  currentAlgorithm: string;
  onAlgorithmChange: (algorithm: string) => void;
  className?: string;
}

export const AlgorithmSelector: React.FC<AlgorithmSelectorProps> = ({
  currentAlgorithm,
  onAlgorithmChange,
  className = ""
}) => {
  const algorithms = Object.values(AVAILABLE_ALGORITHMS);

  return (
    <div className={`flex space-x-1 ${className}`}>
      {algorithms.map((algorithm) => (
        <button
          key={algorithm}
          onClick={() => onAlgorithmChange(algorithm)}
          className={`
            px-2 py-1 text-xs font-medium rounded transition-colors
            ${currentAlgorithm === algorithm
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
          title={algorithm}
        >
          {algorithm.split('-')[0].charAt(0).toUpperCase()}
        </button>
      ))}
      <button
        onClick={() => onAlgorithmChange('auto')}
        className={`
          px-2 py-1 text-xs font-medium rounded transition-colors
          ${currentAlgorithm === 'auto'
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
        `}
        title="Auto-select"
      >
        A
      </button>
    </div>
  );
};

export default LayoutControls;