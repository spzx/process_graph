/**
 * Constants and configuration for graph visualization components
 */

// Edge color mapping for different conditions
export const EDGE_COLORS = {
  success: '#10B981',    // Emerald-500
  fail: '#EF4444',       // Red-500
  error: '#EF4444',      // Red-500
  default: '#6B7280',    // Gray-500
  some_other: '#F59E0B', // Amber-500
  new_result: '#3B82F6', // Blue-500
  yes: '#10B981',        // Emerald-500 (common condition)
  no: '#EF4444',         // Red-500 (common condition)
  true: '#10B981',       // Emerald-500
  false: '#EF4444',      // Red-500
} as const;

// Node type colors for consistent styling
export const NODE_TYPE_COLORS = {
  start: {
    background: 'bg-green-50',
    border: 'border-green-500',
    hover: 'hover:border-green-600',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    minimapColor: '#22C55E',
  },
  end: {
    background: 'bg-green-50',
    border: 'border-green-500',
    hover: 'hover:border-green-600',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    minimapColor: '#10B981',
  },
  wait: {
    background: 'bg-yellow-50',
    border: 'border-yellow-500',
    hover: 'hover:border-yellow-600',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    minimapColor: '#F59E0B',
  },
  action: {
    background: 'bg-blue-50',
    border: 'border-blue-500',
    hover: 'hover:border-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    minimapColor: '#3B82F6',
  },
  default: {
    background: 'bg-white',
    border: 'border-gray-200',
    hover: 'hover:border-gray-300',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    minimapColor: '#3B82F6',
  },
} as const;

// Layout configuration for dagre
export const LAYOUT_CONFIG = {
  direction: 'TB' as const,
  nodeSpacing: {
    rankSep: 100,  // Vertical spacing between ranks
    nodeSep: 70,   // Horizontal spacing between nodes
    marginX: 30,   // Horizontal margin
    marginY: 30,   // Vertical margin
  },
  nodeSize: {
    width: 250,
    height: {
      default: 100,
      orderChange: 200,
    },
  },
} as const;

// Animation and interaction settings
export const ANIMATION_CONFIG = {
  fitView: {
    duration: 800,
    padding: 0.05,
  },
  centerNode: {
    duration: 300,
    zoom: 0.8, // Changed from 0.2 to 0.8 for better user experience
  },
  initialCenter: {
    duration: 800,
    zoom: 0.6, // Changed from 0.2 to 0.6 for initial overview
  },
} as const;

// Visual styling constants
export const VISUAL_CONFIG = {
  edge: {
    strokeWidth: {
      default: 2,
      highlighted: 3,
    },
    opacity: {
      default: 1,
      dimmed: 0.5,
    },
    marker: {
      width: 20,
      height: 20,
    },
  },
  node: {
    minWidth: 200,
    maxWidth: 300,
    borderWidth: 2,
    handle: {
      width: 12, // w-3 = 12px
      height: 12, // h-3 = 12px
      borderWidth: 2,
    },
  },
  highlight: {
    colors: {
      selected: '#EF4444',        // Red-500
      orderChange: '#A855F7',     // Purple-500
      pathToStart: '#4F46E5',     // Indigo-600
      searchMatch: '#FFD700',     // Gold
      dimmed: '#D1D5DB',          // Gray-300
    },
  },
} as const;

// Error messages and validation
export const ERROR_MESSAGES = {
  NO_DATA: 'Upload a JSON file to visualize the graph',
  INVALID_NODE_STRUCTURE: 'Invalid node structure detected',
  MISSING_TARGET_NODE: 'Target node not found in graph',
  CIRCULAR_DEPENDENCY: 'Circular dependency detected in graph',
} as const;

// Accessibility labels
export const ACCESSIBILITY_LABELS = {
  graphContainer: 'Interactive graph visualization',
  node: 'Graph node',
  edge: 'Graph edge connection',
  minimap: 'Graph minimap for navigation',
  controls: 'Graph view controls',
  background: 'Graph background grid',
} as const;

// Type definitions for better type safety
export type EdgeColorKey = keyof typeof EDGE_COLORS;
export type NodeType = keyof typeof NODE_TYPE_COLORS;
export type LayoutDirection = typeof LAYOUT_CONFIG.direction;