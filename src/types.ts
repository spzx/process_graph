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
  type?: 'end' | 'wait' | 'action' | 'start';
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

export interface FlowNode {
  id: string;
  type: 'custom';
  position: { x: number; y: number };
  data: {
    label: string;
    shortDescription: string;
    description: string;
    businessPurpose?: string; // New field
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
    nodeType?: 'end' | 'wait' | 'action' | 'start';
    isSearchedMatch?: boolean;
    isSearchActive?: boolean;
    isPathToStartNode?: boolean;
    isPathHighlightActive?: boolean;
    businessRules?: string[]; // New field
    dependencies?: string[]; // New field
    configurationFlags?: ConfigurationFlag[]; // New field
    edgeCases?: string[]; // New field
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: 'custom';
  data: {
    label: string;
    condition: string;
    isPathToStartEdge?: boolean;
    isPathHighlightActive?: boolean;
  };
}
