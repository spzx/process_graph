/**
 * Enhanced type definitions for graph visualization
 * Includes validation helpers and utility types
 */

export interface GraphNode {
  nodeId: string;
  description: string;
  shortDescription: string;
  businessPurpose?: string; // New field
  nextNodes: Array<{
    on: string;
    to: string;
    description: string;
  }>;
  orderChanges?: OrderChange[];
  type?: NodeType;
  businessRules?: string[]; // New field
  dependencies?: string[]; // New field
  configurationFlags?: ConfigurationFlag[]; // New field
  edgeCases?: string[]; // New field
}

export interface OrderChange {
  on: string;
  description?: string; // Made optional as per example
  set: Record<string, string>;
}

// New interface for ConfigurationFlag
export interface ConfigurationFlag {
  key: string;
  description: string;
}

// Enhanced node type definition
export type NodeType = 'end' | 'wait' | 'action' | 'start';

// Enhanced FlowNode interface with better type safety
export interface FlowNode {
  id: string;
  type: 'custom';
  position: { x: number; y: number };
  width?: number;
  height?: number;
  targetPosition?: 'top' | 'bottom' | 'left' | 'right';
  sourcePosition?: 'top' | 'bottom' | 'left' | 'right';
  data: FlowNodeData;
}

// Separate interface for FlowNode data for better organization
export interface FlowNodeData {
  label: string;
  shortDescription: string;
  description: string;
  businessPurpose?: string;
  nextNodes: Array<{
    on: string;
    to: string;
    description: string;
  }>;
  isSelected?: boolean;
  isOrderChangeNode?: boolean;
  orderChanges?: OrderChange[];
  highlightOrderChangeField?: string;
  highlightOrderChangeValue?: string | null;
  nodeType?: NodeType;
  isSearchedMatch?: boolean;
  isSearchActive?: boolean;
  isPathToStartNode?: boolean;
  isPathHighlightActive?: boolean;
  businessRules?: string[];
  dependencies?: string[];
  configurationFlags?: ConfigurationFlag[];
  edgeCases?: string[];
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: 'custom';
  markerEnd?: {
    type: string;
    width: number;
    height: number;
    color: string;
  };
  style?: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
  };
  data: FlowEdgeData;
}

// Separate interface for FlowEdge data
export interface FlowEdgeData {
  label: string;
  condition: string;
  isPathToStartEdge?: boolean;
  isPathHighlightActive?: boolean;
}

// Validation helper types
export interface GraphValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Graph statistics type
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: Record<NodeType, number>;
  orphanNodes: string[]; // Nodes with no incoming edges
  deadEndNodes: string[]; // Nodes with no outgoing edges
  circularDependencies: string[][];
}

// Search and filter types
export interface SearchOptions {
  query: string;
  searchInDescription?: boolean;
  searchInBusinessRules?: boolean;
  caseSensitive?: boolean;
  useRegex?: boolean;
}

export interface FilterOptions {
  nodeTypes?: NodeType[];
  hasOrderChanges?: boolean;
  hasBusinessRules?: boolean;
  hasDependencies?: boolean;
}

// Layout configuration type
export interface LayoutOptions {
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSpacing: {
    rankSep: number;
    nodeSep: number;
    marginX: number;
    marginY: number;
  };
  nodeSize: {
    width: number;
    height: {
      default: number;
      orderChange: number;
    };
  };
}

// Event handler types
export type NodeSelectHandler = (node: GraphNode) => void;
export type EdgeSelectHandler = (edge: FlowEdge) => void;
export type GraphErrorHandler = (error: Error, context: string) => void;

// Utility types for better type inference
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Type guards for runtime validation
export const isGraphNode = (obj: any): obj is GraphNode => {
  return obj && 
    typeof obj.nodeId === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.shortDescription === 'string' &&
    Array.isArray(obj.nextNodes);
};

export const isValidNodeType = (type: any): type is NodeType => {
  return ['end', 'wait', 'action', 'start'].includes(type);
};

export const hasNewNodeStructure = (nextNode: any): nextNode is { on: string; to: string; description: string } => {
  return nextNode && 
    typeof nextNode.on === 'string' && 
    typeof nextNode.to === 'string' && 
    typeof nextNode.description === 'string';
};

// Error types for better error handling
export class GraphValidationError extends Error {
  constructor(
    message: string, 
    public readonly nodeId?: string, 
    public readonly validationDetails?: Record<string, any>
  ) {
    super(message);
    this.name = 'GraphValidationError';
  }
}

export class GraphProcessingError extends Error {
  constructor(
    message: string, 
    public readonly context: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GraphProcessingError';
  }
}
