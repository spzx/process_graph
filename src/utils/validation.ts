/**
 * Validation utilities for graph data structures
 */

import { 
  GraphNode, 
  GraphValidationResult, 
  GraphStats, 
  NodeType,
  isGraphNode, 
  isValidNodeType,
  GraphValidationError 
} from '../types';

/**
 * Validates a single graph node
 */
export const validateNode = (node: any, index: number): string[] => {
  const errors: string[] = [];

  if (!isGraphNode(node)) {
    errors.push(`Node at index ${index}: Invalid node structure`);
    return errors;
  }

  // Validate nodeId
  if (!node.nodeId.trim()) {
    errors.push(`Node at index ${index}: nodeId cannot be empty`);
  }

  // Validate descriptions
  if (!node.shortDescription?.trim()) {
    errors.push(`Node ${node.nodeId}: shortDescription cannot be empty`);
  }
  
  if (!node.description?.trim()) {
    errors.push(`Node ${node.nodeId}: description cannot be empty`);
  }

  // Validate node type if provided
  if (node.type && !isValidNodeType(node.type)) {
    errors.push(`Node ${node.nodeId}: invalid node type "${node.type}"`);
  }

  // Validate nextNodes structure
  if (!Array.isArray(node.nextNodes)) {
    errors.push(`Node ${node.nodeId}: nextNodes must be an array`);
  } else {
    node.nextNodes.forEach((nextNode, nextIndex) => {
      if (!nextNode || typeof nextNode !== 'object') {
        errors.push(`Node ${node.nodeId}: nextNode at index ${nextIndex} is invalid`);
        return;
      }

      // Check for new structure
      if (typeof nextNode.on === 'string' && typeof nextNode.to === 'string') {
        if (!nextNode.on.trim()) {
          errors.push(`Node ${node.nodeId}: nextNode[${nextIndex}].on cannot be empty`);
        }
        if (!nextNode.to.trim()) {
          errors.push(`Node ${node.nodeId}: nextNode[${nextIndex}].to cannot be empty`);
        }
      } else {
        // Validate legacy structure
        const entries = Object.entries(nextNode);
        if (entries.length === 0) {
          errors.push(`Node ${node.nodeId}: nextNode at index ${nextIndex} has no entries`);
        }
        entries.forEach(([key, value]) => {
          if (!key.trim() || !value?.toString().trim()) {
            errors.push(`Node ${node.nodeId}: nextNode[${nextIndex}] has empty key or value`);
          }
        });
      }
    });
  }

  return errors;
};

/**
 * Finds nodes that have no incoming edges (orphan nodes)
 */
export const findOrphanNodes = (data: GraphNode[]): string[] => {
  const allNodeIds = new Set(data.map(node => node.nodeId));
  const targetNodes = new Set<string>();

  // Collect all target nodes
  data.forEach(node => {
    node.nextNodes.forEach(nextNode => {
      if (typeof nextNode.on === 'string' && typeof nextNode.to === 'string') {
        // New structure
        targetNodes.add(nextNode.to);
      } else {
        // Legacy structure
        Object.values(nextNode as Record<string, string>).forEach(target => {
          if (typeof target === 'string') {
            targetNodes.add(target);
          }
        });
      }
    });
  });

  // Find nodes that are not targets of any edge
  return Array.from(allNodeIds).filter(nodeId => !targetNodes.has(nodeId));
};

/**
 * Finds nodes that have no outgoing edges (dead end nodes)
 */
export const findDeadEndNodes = (data: GraphNode[]): string[] => {
  return data
    .filter(node => node.nextNodes.length === 0)
    .map(node => node.nodeId);
};

/**
 * Detects circular dependencies in the graph
 */
export const detectCircularDependencies = (data: GraphNode[]): string[][] => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  const nodeMap = new Map(data.map(node => [node.nodeId, node]));

  const dfs = (nodeId: string, path: string[]): void => {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = nodeMap.get(nodeId);
    if (node) {
      node.nextNodes.forEach(nextNode => {
        let targetId: string;
        if (typeof nextNode.on === 'string' && typeof nextNode.to === 'string') {
          targetId = nextNode.to;
        } else {
          // Legacy structure - get first target
          const targets = Object.values(nextNode as Record<string, string>);
          targetId = targets[0];
        }

        if (targetId && nodeMap.has(targetId)) {
          dfs(targetId, [...path]);
        }
      });
    }

    recursionStack.delete(nodeId);
  };

  data.forEach(node => {
    if (!visited.has(node.nodeId)) {
      dfs(node.nodeId, []);
    }
  });

  return cycles;
};

/**
 * Generates statistics about the graph
 */
export const generateGraphStats = (data: GraphNode[]): GraphStats => {
  const nodeTypes = {
    start: 0,
    end: 0,
    action: 0,
    wait: 0,
  };

  let edgeCount = 0;

  data.forEach(node => {
    // Count node types
    const nodeType = node.type || 'action';
    if (nodeType in nodeTypes) {
      nodeTypes[nodeType as keyof typeof nodeTypes]++;
    }

    // Count edges
    edgeCount += node.nextNodes.length;
  });

  return {
    nodeCount: data.length,
    edgeCount,
    nodeTypes,
    orphanNodes: findOrphanNodes(data),
    deadEndNodes: findDeadEndNodes(data),
    circularDependencies: detectCircularDependencies(data),
  };
};

/**
 * Validates the entire graph structure
 */
export const validateGraph = (data: any[]): GraphValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['Graph data must be an array'],
      warnings: [],
    };
  }

  if (data.length === 0) {
    return {
      isValid: false,
      errors: ['Graph cannot be empty'],
      warnings: [],
    };
  }

  // Validate each node
  data.forEach((node, index) => {
    const nodeErrors = validateNode(node, index);
    errors.push(...nodeErrors);
  });

  // Early return if basic validation fails
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Advanced validation for valid nodes
  const validNodes = data as GraphNode[];
  const nodeIds = new Set<string>();
  const duplicateIds: string[] = [];

  // Check for duplicate node IDs
  validNodes.forEach(node => {
    if (nodeIds.has(node.nodeId)) {
      duplicateIds.push(node.nodeId);
    } else {
      nodeIds.add(node.nodeId);
    }
  });

  if (duplicateIds.length > 0) {
    errors.push(`Duplicate node IDs found: ${duplicateIds.join(', ')}`);
  }

  // Check for missing target nodes
  const missingTargets: string[] = [];
  validNodes.forEach(node => {
    node.nextNodes.forEach(nextNode => {
      let targetId: string;
      if (typeof nextNode.on === 'string' && typeof nextNode.to === 'string') {
        targetId = nextNode.to;
      } else {
        // Legacy structure
        const targets = Object.values(nextNode as Record<string, string>);
        targetId = targets[0];
      }

      if (targetId && !nodeIds.has(targetId)) {
        missingTargets.push(targetId);
      }
    });
  });

  if (missingTargets.length > 0) {
    errors.push(`Target nodes not found: ${[...new Set(missingTargets)].join(', ')}`);
  }

  // Check for missing start/end nodes
  const hasStartNode = validNodes.some(node => node.type === 'start');
  const hasEndNode = validNodes.some(node => node.type === 'end');

  if (!hasStartNode) {
    warnings.push('No start node found in graph');
  }
  if (!hasEndNode) {
    warnings.push('No end nodes found in graph');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Safe wrapper for graph validation that catches errors
 */
export const safeValidateGraph = (data: any): GraphValidationResult => {
  try {
    return validateGraph(data);
  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
};

/**
 * Creates a validation error with context
 */
export const createValidationError = (
  message: string,
  nodeId?: string,
  details?: Record<string, any>
): GraphValidationError => {
  return new GraphValidationError(message, nodeId, details);
};