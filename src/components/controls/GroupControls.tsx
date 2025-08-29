/**
 * Group Controls UI Panel
 * 
 * This component provides a user interface for managing graph grouping,
 * including group detection strategies, hierarchical organization,
 * and collapse/expand functionality.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Layers, 
  Group, 
  Target, 
  Brain, 
  Network,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Settings,
  Zap,
  Search,
  Filter
} from 'lucide-react';

import { useGroupManagement } from '../../hooks/useEnhancedGraph';

/**
 * Group control configuration
 */
export interface GroupControlsConfig {
  /** Show group detection controls */
  showDetectionControls?: boolean;
  
  /** Show hierarchy management */
  showHierarchyControls?: boolean;
  
  /** Show individual group controls */
  showGroupControls?: boolean;
  
  /** Show group statistics */
  showStatistics?: boolean;
  
  /** Panel position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /** Panel size */
  size?: 'compact' | 'normal' | 'expanded';
  
  /** Enable real-time updates */
  enableRealTimeUpdates?: boolean;
}

/**
 * Group information
 */
export interface GroupInfo {
  id: string;
  name: string;
  nodeIds: string[];
  level: number;
  isCollapsed: boolean;
  isVisible: boolean;
  parentGroupId?: string;
  childGroupIds: string[];
  metadata: {
    detectionMethod: string;
    confidence: number;
    characteristics: string[];
  };
}

/**
 * Group controls props
 */
export interface GroupControlsProps {
  /** Available groups */
  groups?: GroupInfo[];
  
  /** Current grouping strategy */
  strategy?: 'semantic' | 'connectivity' | 'structural' | 'hybrid';
  
  /** Group detection configuration */
  detectionConfig?: {
    semantic: boolean;
    connectivity: boolean;
    structural: boolean;
    minGroupSize: number;
    maxGroupSize: number;
    confidenceThreshold: number;
  };
  
  /** Configuration */
  config?: GroupControlsConfig;
  
  /** Event handlers */
  onDetectionConfigChange?: (config: any) => void;
  onGroupToggle?: (groupId: string, action: 'collapse' | 'expand' | 'hide' | 'show') => void;
  onGroupCreate?: (nodeIds: string[], name: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onGroupMerge?: (groupIds: string[]) => void;
  onGroupSplit?: (groupId: string) => void;
  onStrategyChange?: (strategy: string) => void;
  onRedetectGroups?: () => void;
  
  /** Group statistics */
  statistics?: {
    totalGroups: number;
    avgGroupSize: number;
    maxGroupSize: number;
    groupingEfficiency: number;
    detectionTime: number;
  };
  
  /** Selection state */
  selectedNodes?: string[];
  selectedGroups?: string[];
}

/**
 * Main Group Controls Component
 */
export const GroupControls: React.FC<GroupControlsProps> = ({
  groups = [],
  strategy = 'semantic',
  detectionConfig = {
    semantic: true,
    connectivity: true,
    structural: false,
    minGroupSize: 2,
    maxGroupSize: 50,
    confidenceThreshold: 0.6
  },
  config = {},
  onDetectionConfigChange,
  onGroupToggle,
  onGroupCreate,
  onGroupDelete,
  onGroupMerge,
  onGroupSplit,
  onStrategyChange,
  onRedetectGroups,
  statistics,
  selectedNodes = [],
  selectedGroups = []
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'detection' | 'hierarchy' | 'groups'>('detection');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Merge with default config
  const fullConfig: Required<GroupControlsConfig> = {
    showDetectionControls: true,
    showHierarchyControls: true,
    showGroupControls: true,
    showStatistics: true,
    position: 'top-left',
    size: 'normal',
    enableRealTimeUpdates: true,
    ...config
  };

  // Filter groups based on search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.metadata.characteristics.some(char => 
        char.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [groups, searchTerm]);

  // Group hierarchy display
  const hierarchicalGroups = useMemo(() => {
    const hierarchy = new Map<number, GroupInfo[]>();
    filteredGroups.forEach(group => {
      if (!hierarchy.has(group.level)) {
        hierarchy.set(group.level, []);
      }
      hierarchy.get(group.level)!.push(group);
    });
    return hierarchy;
  }, [filteredGroups]);

  // Handle detection config change
  const handleDetectionConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...detectionConfig, [key]: value };
    onDetectionConfigChange?.(newConfig);
  }, [detectionConfig, onDetectionConfigChange]);

  // Handle group action
  const handleGroupAction = useCallback((groupId: string, action: 'collapse' | 'expand' | 'hide' | 'show') => {
    onGroupToggle?.(groupId, action);
  }, [onGroupToggle]);

  // Handle create group from selection
  const handleCreateGroupFromSelection = useCallback(() => {
    if (selectedNodes.length >= 2) {
      const groupName = `Group ${groups.length + 1}`;
      onGroupCreate?.(selectedNodes, groupName);
    }
  }, [selectedNodes, groups.length, onGroupCreate]);

  // Panel positioning classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  // Panel size classes
  const sizeClasses = {
    'compact': 'w-72',
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
        transition-all duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">Group Controls</span>
        </div>
        <div className="flex items-center space-x-1">
          {statistics && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {statistics.totalGroups} groups
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? 
              <Minimize2 className="w-4 h-4 text-gray-500" /> : 
              <Maximize2 className="w-4 h-4 text-gray-500" />
            }
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'detection', label: 'Detection', icon: Brain, show: fullConfig.showDetectionControls },
              { id: 'hierarchy', label: 'Hierarchy', icon: Network, show: fullConfig.showHierarchyControls },
              { id: 'groups', label: 'Groups', icon: Group, show: fullConfig.showGroupControls }
            ].filter(tab => tab.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium
                  ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }
                `}
              >
                <tab.icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-3">
            {/* Detection Tab */}
            {activeTab === 'detection' && (
              <GroupDetectionControls
                strategy={strategy}
                config={detectionConfig}
                onConfigChange={handleDetectionConfigChange}
                onStrategyChange={onStrategyChange}
                onRedetect={onRedetectGroups}
                statistics={statistics}
              />
            )}

            {/* Hierarchy Tab */}
            {activeTab === 'hierarchy' && (
              <GroupHierarchyControls
                hierarchicalGroups={hierarchicalGroups}
                onGroupAction={handleGroupAction}
                selectedGroups={selectedGroups}
              />
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <IndividualGroupControls
                groups={filteredGroups}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onGroupAction={handleGroupAction}
                onGroupDelete={onGroupDelete}
                onCreateFromSelection={handleCreateGroupFromSelection}
                selectedNodes={selectedNodes}
                selectedGroups={selectedGroups}
              />
            )}
          </div>

          {/* Statistics Footer */}
          {fullConfig.showStatistics && statistics && (
            <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 rounded-b-lg">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Avg Size:</span>
                  <span className="ml-1 font-mono">{statistics.avgGroupSize.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Max Size:</span>
                  <span className="ml-1 font-mono">{statistics.maxGroupSize}</span>
                </div>
                <div>
                  <span className="text-gray-500">Efficiency:</span>
                  <span className="ml-1 font-mono">{(statistics.groupingEfficiency * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Detection:</span>
                  <span className="ml-1 font-mono">{statistics.detectionTime.toFixed(0)}ms</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Group Detection Controls Sub-component
 */
interface GroupDetectionControlsProps {
  strategy: string;
  config: any;
  onConfigChange: (key: string, value: any) => void;
  onStrategyChange?: (strategy: string) => void;
  onRedetect?: () => void;
  statistics?: any;
}

const GroupDetectionControls: React.FC<GroupDetectionControlsProps> = ({
  strategy,
  config,
  onConfigChange,
  onStrategyChange,
  onRedetect,
  statistics
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRedetect = useCallback(() => {
    setIsProcessing(true);
    onRedetect?.();
    setTimeout(() => setIsProcessing(false), 1500);
  }, [onRedetect]);

  return (
    <div className="space-y-4">
      {/* Detection Strategy */}
      <div>
        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
          Detection Strategy
        </label>
        <div className="grid grid-cols-2 gap-1">
          {(['semantic', 'connectivity', 'structural', 'hybrid'] as const).map((strat) => (
            <button
              key={strat}
              onClick={() => onStrategyChange?.(strat)}
              className={`
                px-2 py-1 text-xs font-medium rounded transition-colors
                ${strategy === strat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {strat.charAt(0).toUpperCase() + strat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Detection Methods */}
      <div>
        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
          Detection Methods
        </label>
        <div className="space-y-1">
          {Object.entries({
            semantic: 'Semantic Analysis',
            connectivity: 'Connectivity Patterns',
            structural: 'Structural Similarity'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => onConfigChange(key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 scale-75"
              />
              <span className="text-xs text-gray-600">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div>
        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
          Parameters
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Min Group Size</span>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={config.minGroupSize}
              onChange={(e) => onConfigChange('minGroupSize', parseInt(e.target.value))}
              className="w-16"
            />
            <span className="text-xs font-mono w-6">{config.minGroupSize}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Max Group Size</span>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={config.maxGroupSize}
              onChange={(e) => onConfigChange('maxGroupSize', parseInt(e.target.value))}
              className="w-16"
            />
            <span className="text-xs font-mono w-6">{config.maxGroupSize}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Confidence</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={config.confidenceThreshold}
              onChange={(e) => onConfigChange('confidenceThreshold', parseFloat(e.target.value))}
              className="w-16"
            />
            <span className="text-xs font-mono w-6">{config.confidenceThreshold.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleRedetect}
        disabled={isProcessing}
        className={`
          w-full flex items-center justify-center space-x-2 px-3 py-2 
          text-sm font-medium rounded-md transition-colors
          ${isProcessing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
          }
        `}
      >
        <Search className="w-4 h-4" />
        <span>{isProcessing ? 'Detecting...' : 'Re-detect Groups'}</span>
      </button>
    </div>
  );
};

/**
 * Group Hierarchy Controls Sub-component
 */
interface GroupHierarchyControlsProps {
  hierarchicalGroups: Map<number, GroupInfo[]>;
  onGroupAction: (groupId: string, action: 'collapse' | 'expand' | 'hide' | 'show') => void;
  selectedGroups: string[];
}

const GroupHierarchyControls: React.FC<GroupHierarchyControlsProps> = ({
  hierarchicalGroups,
  onGroupAction,
  selectedGroups
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Hierarchy Levels
        </label>
        <span className="text-xs text-gray-500">
          {hierarchicalGroups.size} levels
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {Array.from(hierarchicalGroups.entries())
          .sort(([a], [b]) => a - b)
          .map(([level, groups]) => (
            <div key={level} className="border border-gray-200 rounded-md">
              <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-600">Level {level}</span>
                <span className="text-xs text-gray-500">{groups.length} groups</span>
              </div>
              <div className="p-2 space-y-1">
                {groups.map(group => (
                  <GroupItem
                    key={group.id}
                    group={group}
                    onAction={onGroupAction}
                    isSelected={selectedGroups.includes(group.id)}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

/**
 * Individual Group Controls Sub-component
 */
interface IndividualGroupControlsProps {
  groups: GroupInfo[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onGroupAction: (groupId: string, action: 'collapse' | 'expand' | 'hide' | 'show') => void;
  onGroupDelete?: (groupId: string) => void;
  onCreateFromSelection: () => void;
  selectedNodes: string[];
  selectedGroups: string[];
}

const IndividualGroupControls: React.FC<IndividualGroupControlsProps> = ({
  groups,
  searchTerm,
  onSearchChange,
  onGroupAction,
  onGroupDelete,
  onCreateFromSelection,
  selectedNodes,
  selectedGroups
}) => {
  return (
    <div className="space-y-3">
      {/* Search and Actions */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {selectedNodes.length >= 2 && (
          <button
            onClick={onCreateFromSelection}
            className="w-full flex items-center justify-center space-x-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Create Group ({selectedNodes.length} nodes)</span>
          </button>
        )}
      </div>

      {/* Groups List */}
      <div className="max-h-64 overflow-y-auto space-y-1">
        {groups.map(group => (
          <GroupItem
            key={group.id}
            group={group}
            onAction={onGroupAction}
            onDelete={onGroupDelete}
            isSelected={selectedGroups.includes(group.id)}
            showActions={true}
          />
        ))}
        
        {groups.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <Group className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs">No groups found</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Group Item Component
 */
interface GroupItemProps {
  group: GroupInfo;
  onAction: (groupId: string, action: 'collapse' | 'expand' | 'hide' | 'show') => void;
  onDelete?: (groupId: string) => void;
  isSelected: boolean;
  showActions?: boolean;
}

const GroupItem: React.FC<GroupItemProps> = ({
  group,
  onAction,
  onDelete,
  isSelected,
  showActions = false
}) => {
  return (
    <div 
      className={`
        flex items-center justify-between p-2 rounded-md border
        ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
        hover:bg-gray-100 transition-colors
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-800 truncate">{group.name}</span>
          <span className="text-xs text-gray-500">({group.nodeIds.length})</span>
        </div>
        <div className="flex items-center space-x-1 mt-1">
          <span className="text-xs text-gray-400">{group.metadata.detectionMethod}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-400">
            {(group.metadata.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {showActions && (
          <>
            <button
              onClick={() => onAction(group.id, group.isVisible ? 'hide' : 'show')}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={group.isVisible ? 'Hide group' : 'Show group'}
            >
              {group.isVisible ? 
                <Eye className="w-3 h-3 text-gray-500" /> : 
                <EyeOff className="w-3 h-3 text-gray-500" />
              }
            </button>
            
            <button
              onClick={() => onAction(group.id, group.isCollapsed ? 'expand' : 'collapse')}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={group.isCollapsed ? 'Expand group' : 'Collapse group'}
            >
              {group.isCollapsed ? 
                <Plus className="w-3 h-3 text-gray-500" /> : 
                <Minus className="w-3 h-3 text-gray-500" />
              }
            </button>

            {onDelete && (
              <button
                onClick={() => onDelete(group.id)}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Delete group"
              >
                <Minus className="w-3 h-3 text-red-500" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GroupControls;