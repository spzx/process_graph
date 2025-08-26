import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { GraphVisualization } from './components/GraphVisualization';
import { NodeDetailsModal } from './components/NodeDetailsModal';
import { SearchBar } from './components/SearchBar';
import { GraphNode } from './types';
import { BarChart3, Upload, Search, Info, GitCommit, ArrowRightCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';

// Helper function for graph traversal (forward)
const getConnectedNodes = (nodes: GraphNode[], startNodeId: string): GraphNode[] => {
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(node => nodeMap.set(node.nodeId, node));

  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  const connectedNodes: GraphNode[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    const currentNode = nodeMap.get(currentId);
    if (currentNode) {
      connectedNodes.push(currentNode);
      currentNode.nextNodes.forEach(nextNode => {
        // Handle the new data structure with 'on', 'to', and 'description' fields
        if (nextNode.to) {
          const targetId = nextNode.to;
          if (!visited.has(targetId) && nodeMap.has(targetId)) {
            queue.push(targetId);
          }
        } else {
          // Fallback to the old structure for backward compatibility
          Object.values(nextNode as any).forEach(targetId => {
            if (!visited.has(targetId) && nodeMap.has(targetId)) {
              queue.push(targetId);
            }
          });
        }
      });
    }
  }
  return connectedNodes;
};

// Helper function to find all paths from a target node back to the start node
const getPathsToStart = (nodes: GraphNode[], targetNodeId: string, startNodeId: string): Set<string> => {
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(node => nodeMap.set(node.nodeId, node));

  // Build a reverse graph (predecessors)
  const reverseGraph = new Map<string, string[]>();
  nodes.forEach(node => {
    node.nextNodes.forEach(nextNode => {
      // Handle the new data structure with 'on', 'to', and 'description' fields
      if (nextNode.to) {
        const target = nextNode.to;
        if (nodeMap.has(target)) { // Only add if target exists in the graph
          if (!reverseGraph.has(target)) {
            reverseGraph.set(target, []);
          }
          reverseGraph.get(target)!.push(node.nodeId);
        }
      } else {
        // Fallback to the old structure for backward compatibility
        Object.values(nextNode as any).forEach(target => {
          if (nodeMap.has(target)) { // Only add if target exists in the graph
            if (!reverseGraph.has(target)) {
              reverseGraph.set(target, []);
            }
            reverseGraph.get(target)!.push(node.nodeId);
          }
        });
      }
    });
  });

  const pathNodes = new Set<string>();
  const visitedPaths = new Set<string>(); // To avoid infinite loops in cyclic graphs

  const findPathsDFS = (currentId: string, currentPath: string[]) => {
    const pathKey = currentPath.join('->') + '->' + currentId;
    if (visitedPaths.has(pathKey)) {
      return;
    }
    visitedPaths.add(pathKey);

    currentPath.push(currentId);
    pathNodes.add(currentId); // Add current node to the set of path nodes

    if (currentId === startNodeId) {
      // Found a path to start, all nodes in currentPath are part of it
      currentPath.forEach(nodeId => pathNodes.add(nodeId));
    } else {
      const predecessors = reverseGraph.get(currentId) || [];
      for (const predId of predecessors) {
        // Only traverse if the predecessor is not already in the current path to avoid simple cycles
        if (!currentPath.includes(predId)) {
          findPathsDFS(predId, [...currentPath]); // Pass a copy of currentPath
        }
      }
    }
  };

  // Start DFS from the target node
  findPathsDFS(targetNodeId, []);

  return pathNodes;
};


function App() {
  const [graphData, setGraphData] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [highlightOrderChangeField, setHighlightOrderChangeField] = useState<string>('none'); // Default to 'none'
  const [highlightOrderChangeValue, setHighlightOrderChangeValue] = useState<string | null>(null);
  const [showOnlyFromStart, setShowOnlyFromStart] = useState<boolean>(true);
  const [highlightedPathToStartNodeIds, setHighlightedPathToStartNodeIds] = useState<Set<string> | null>(null);
  const [currentTraversalIndex, setCurrentTraversalIndex] = useState(-1); // New state for traversal

  // This memo now determines the base set of nodes based on 'showOnlyFromStart'
  // It operates on the full graphData to ensure connectivity is correctly determined.
  const baseGraphForDisplay = useMemo(() => {
    if (!showOnlyFromStart) {
      return graphData;
    }

    const startNode = graphData.find(node => node.type === 'start');
    if (!startNode) {
      // If "show only from start" is checked but no start node exists, show nothing
      return [];
    }

    return getConnectedNodes(graphData, startNode.nodeId);
  }, [graphData, showOnlyFromStart]);

  // This memo now identifies nodes that match the search query
  const searchedNodeIds = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return baseGraphForDisplay
      .filter(node =>
        node.nodeId.toLowerCase().includes(lowerCaseQuery) ||
        node.shortDescription.toLowerCase().includes(lowerCaseQuery) ||
        node.description.toLowerCase().includes(lowerCaseQuery) ||
        (node.businessPurpose && node.businessPurpose.toLowerCase().includes(lowerCaseQuery)) || // New field
        (node.businessRules && node.businessRules.some(rule => rule.toLowerCase().includes(lowerCaseQuery))) || // New field
        (node.dependencies && node.dependencies.some(dep => dep.toLowerCase().includes(lowerCaseQuery))) || // New field
        (node.configurationFlags && node.configurationFlags.some(flag =>
          flag.key.toLowerCase().includes(lowerCaseQuery) || flag.description.toLowerCase().includes(lowerCaseQuery)
        )) || // New field
        (node.edgeCases && node.edgeCases.some(ec => ec.toLowerCase().includes(lowerCaseQuery))) // New field
      )
      .map(node => node.nodeId);
  }, [baseGraphForDisplay, searchQuery]);

  // The displayGraphData now always returns the baseGraphForDisplay,
  // and search highlighting is handled by passing searchedNodeIds to GraphVisualization.
  const displayGraphData = baseGraphForDisplay;

  // Memo to get all currently highlighted nodes for traversal
  const allHighlightedNodes = useMemo(() => {
    // If path highlight is active, it takes precedence
    if (highlightedPathToStartNodeIds && highlightedPathToStartNodeIds.size > 0) {
      return displayGraphData
        .filter(node => highlightedPathToStartNodeIds.has(node.nodeId))
        .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    }

    const orderChangeMatchedNodeIds = new Set<string>();
    if (highlightOrderChangeField !== 'none') {
      displayGraphData.forEach(node => {
        if (node.orderChanges?.some(change => {
          if (Object.keys(change.set).includes(highlightOrderChangeField)) {
            if (highlightOrderChangeValue) {
              return change.set[highlightOrderChangeField] === highlightOrderChangeValue;
            }
            return true;
          }
          return false;
        })) {
          orderChangeMatchedNodeIds.add(node.nodeId);
        }
      });
    }

    let combinedHighlightedIds: Set<string> = new Set();

    const isSearchActive = searchQuery.trim().length > 0;
    const isOrderChangeHighlightActive = highlightOrderChangeField !== 'none';

    if (isSearchActive && isOrderChangeHighlightActive) {
      // AND logic: intersection of searched nodes and order change nodes
      searchedNodeIds.forEach(id => {
        if (orderChangeMatchedNodeIds.has(id)) {
          combinedHighlightedIds.add(id);
        }
      });
    } else if (isSearchActive) {
      // Only search is active
      searchedNodeIds.forEach(id => combinedHighlightedIds.add(id));
    } else if (isOrderChangeHighlightActive) {
      // Only order change highlight is active
      orderChangeMatchedNodeIds.forEach(id => combinedHighlightedIds.add(id));
    }

    // Filter displayGraphData to get the actual node objects
    // Sort them for consistent traversal order
    return displayGraphData
      .filter(node => combinedHighlightedIds.has(node.nodeId))
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }, [displayGraphData, searchedNodeIds, highlightOrderChangeField, highlightOrderChangeValue, highlightedPathToStartNodeIds, searchQuery]);

  // Effect to update traversal index and selected node when highlighted nodes change
  useEffect(() => {
    if (allHighlightedNodes.length > 0) {
      // If there's an existing highlightedNodeId (e.g., from "Highlight Path to Start"),
      // try to find its index in allHighlightedNodes and set it as currentTraversalIndex.
      // Otherwise, default to the first node.
      const existingHighlightedIndex = highlightedNodeId 
        ? allHighlightedNodes.findIndex(node => node.nodeId === highlightedNodeId)
        : -1;
      
      const initialIndex = existingHighlightedIndex !== -1 ? existingHighlightedIndex : 0;

      setCurrentTraversalIndex(initialIndex);
      setSelectedNode(allHighlightedNodes[initialIndex]); // Select the node for details modal
      setHighlightedNodeId(allHighlightedNodes[initialIndex].nodeId); // Highlight it in the graph
    } else {
      setCurrentTraversalIndex(-1);
      setSelectedNode(null);
      setHighlightedNodeId(null);
    }
  }, [allHighlightedNodes]); // Dependency on allHighlightedNodes

  const handleFileUploadSuccess = (data: GraphNode[]) => {
    setUploadError(null); // Clear any previous error
    setGraphData(data);
    resetApp(); // Reset all filters/highlights when a new file is uploaded
  };

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNode(node);
    setHighlightedNodeId(node.nodeId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNode(null);
    // Do not clear highlightedNodeId here if it's part of an active traversal
    // It will be cleared by the useEffect if allHighlightedNodes becomes empty
  };

  const handleNavigateToNode = (nodeId: string) => {
    setHighlightedNodeId(nodeId);
    const targetNode = graphData.find(n => n.nodeId === nodeId);
    if (targetNode) {
      // Small delay to allow the graph to update the highlight
      setTimeout(() => {
        setSelectedNode(targetNode);
        setIsModalOpen(true);
      }, 300);
    }
  };
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setHighlightedPathToStartNodeIds(null); // Clear path highlight on search
  };

  const handleHighlightPathToStart = (targetNodeId: string) => {
    const startNode = graphData.find(node => node.type === 'start');
    if (!startNode) {
      alert('No "start" node found in the graph to highlight paths to.');
      return;
    }

    // Clear other highlights/filters
    setSearchQuery('');
    setHighlightOrderChangeField('none'); // Reset to 'none'
    setHighlightOrderChangeValue(null);
    // setShowOnlyFromStart(false); // Removed this line to prevent unchecking the checkbox
    const paths = getPathsToStart(graphData, targetNodeId, startNode.nodeId);
    setHighlightedPathToStartNodeIds(paths);
    setHighlightedNodeId(targetNodeId); // Keep the clicked node highlighted and centered
    setIsModalOpen(false); // Close modal after initiating highlight
  };

  const resetApp = () => {
    // Do not clear graphData here, only on new file upload success
    setSelectedNode(null);
    setHighlightedNodeId(null);
    setIsModalOpen(false);
    setSearchQuery('');
    setUploadError(null);
    setHighlightOrderChangeField('none'); // Reset highlight field to 'none'
    setHighlightOrderChangeValue(null); // Reset highlight value
    setShowOnlyFromStart(true); // Reset filter
    setHighlightedPathToStartNodeIds(null); // Reset path highlight
    setCurrentTraversalIndex(-1); // Explicitly reset traversal index
  };

  const handleClearAllHighlights = () => {
    resetApp();
  };

  const handleGoToNextHighlightedNode = () => {
    if (allHighlightedNodes.length === 0) return;
    const nextIndex = (currentTraversalIndex + 1) % allHighlightedNodes.length;
    setCurrentTraversalIndex(nextIndex);
    setSelectedNode(allHighlightedNodes[nextIndex]);
    setHighlightedNodeId(allHighlightedNodes[nextIndex].nodeId);
  };

  const handleGoToPreviousHighlightedNode = () => {
    if (allHighlightedNodes.length === 0) return;
    const prevIndex = (currentTraversalIndex - 1 + allHighlightedNodes.length) % allHighlightedNodes.length;
    setCurrentTraversalIndex(prevIndex);
    setSelectedNode(allHighlightedNodes[prevIndex]);
    setHighlightedNodeId(allHighlightedNodes[prevIndex].nodeId);
  };

  // Calculate nodes that are order changes for display in stats bar
  const orderChangeNodesCount = useMemo(() => {
    if (highlightOrderChangeField === 'none') return 0; // No highlighting when 'none' is selected

    return displayGraphData.filter(node =>
      node.orderChanges?.some(change => {
        if (Object.keys(change.set).includes(highlightOrderChangeField)) {
          // If a specific value is selected, check if the change matches that value
          if (highlightOrderChangeValue) {
            return change.set[highlightOrderChangeField] === highlightOrderChangeValue;
          }
          return true; // Otherwise, just check if the field exists
        }
        return false;
      })
    ).length;
  }, [displayGraphData, highlightOrderChangeField, highlightOrderChangeValue]);

  // Extract all unique field names from orderChanges.set for the dropdown
  const uniqueOrderChangeFields = useMemo(() => {
    const fields = new Set<string>();
    graphData.forEach(node => {
      node.orderChanges?.forEach(change => {
        // Extract keys from the 'set' object for more specific field changes
        Object.keys(change.set).forEach(key => {
          fields.add(key); // Add full field name
        });
      });
    });
    const sortedFields = Array.from(fields).sort().map(field => {
      return { value: field, label: field };
    });
    // Add the "None" option at the beginning
    return [{ value: 'none', label: 'None' }, ...sortedFields];
  }, [graphData]);

  // Extract unique values for the currently selected highlightOrderChangeField
  const uniqueOrderChangeValues = useMemo(() => {
    if (!highlightOrderChangeField || highlightOrderChangeField === 'none') return [];
    const values = new Set<string>();
    graphData.forEach(node => {
      node.orderChanges?.forEach(change => {
        if (Object.keys(change.set).includes(highlightOrderChangeField)) {
          values.add(change.set[highlightOrderChangeField]);
        }
      });
    });
    return Array.from(values).sort().map(value => ({ value, label: value }));
  }, [graphData, highlightOrderChangeField]);

  const isAnyHighlightActive = searchQuery.trim() ||
                               highlightedNodeId ||
                               highlightOrderChangeField !== 'none' ||
                               (highlightedPathToStartNodeIds && highlightedPathToStartNodeIds.size > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Graph Visualizer</h1>
                <p className="text-sm text-gray-600">Interactive JSON node graph explorer</p>
              </div>
            </div>

            {graphData.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="w-64">
                  <SearchBar onSearch={handleSearch} />
                </div>
                <button
                  onClick={() => {
                    setGraphData([]); // Clear graph data to show upload component
                    resetApp(); // Reset all other states
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>New File</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {graphData.length === 0 ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <FileUpload
              onSuccess={handleFileUploadSuccess}
              onError={setUploadError}
              currentError={uploadError}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Bar */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {displayGraphData.length} of {graphData.length} nodes
                    </span>
                  </div>
                  {searchQuery && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Search className="w-4 h-4" />
                      <span>Searching for: "{searchQuery}"</span>
                    </div>
                  )}
                  {highlightedNodeId && (
                    <div className="flex items-center space-x-2 text-sm text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Highlighting: {highlightedNodeId}</span>
                    </div>
                  )}
                  {orderChangeNodesCount > 0 && highlightOrderChangeField !== 'none' && (
                    <div className="flex items-center space-x-2 text-sm text-purple-600">
                      <GitCommit className="w-4 h-4" />
                      <span>
                        {orderChangeNodesCount} nodes with '{highlightOrderChangeField}'
                        {highlightOrderChangeValue && ` = '${highlightOrderChangeValue}'`} changes
                      </span>
                    </div>
                  )}
                  {showOnlyFromStart && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <ArrowRightCircle className="w-4 h-4" />
                      <span>Showing only nodes from 'start'</span>
                    </div>
                  )}
                  {highlightedPathToStartNodeIds && highlightedPathToStartNodeIds.size > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-indigo-600">
                      <ArrowRightCircle className="w-4 h-4" />
                      <span>Path to start highlighted ({highlightedPathToStartNodeIds.size} nodes)</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {/* "Show only from start" checkbox */}
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      id="showOnlyFromStart"
                      checked={showOnlyFromStart}
                      onChange={(e) => setShowOnlyFromStart(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showOnlyFromStart" className="font-medium">Show only from start</label>
                  </div>

                  {uniqueOrderChangeFields.length > 0 && (
                    <>
                      <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <label htmlFor="highlightField" className="font-medium">Highlight changes on:</label>
                        <select
                          id="highlightField"
                          value={highlightOrderChangeField}
                          onChange={(e) => {
                            setHighlightOrderChangeField(e.target.value);
                            setHighlightOrderChangeValue(null); // Reset value when field changes
                          }}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          {uniqueOrderChangeFields.map(field => (
                            <option key={field.value} value={field.value}>{field.label}</option>
                          ))}
                        </select>
                      </div>

                      {highlightOrderChangeField !== 'none' && uniqueOrderChangeValues.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-700">
                          <label htmlFor="highlightValue" className="font-medium">Value:</label>
                          <select
                            id="highlightValue"
                            value={highlightOrderChangeValue || ''}
                            onChange={(e) => setHighlightOrderChangeValue(e.target.value || null)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            <option value="">All values</option>
                            {uniqueOrderChangeValues.map(val => (
                              <option key={val.value} value={val.value}>{val.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Clear Highlight Button */}
                  {isAnyHighlightActive && (
                    <button
                      onClick={handleClearAllHighlights}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Clear Highlight</span>
                    </button>
                  )}

                  {/* Traversal Buttons */}
                  {allHighlightedNodes.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleGoToPreviousHighlightedNode}
                        disabled={currentTraversalIndex === 0}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous highlighted node"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="text-sm text-gray-700 font-medium">
                        {currentTraversalIndex + 1} / {allHighlightedNodes.length}
                      </span>
                      <button
                        onClick={handleGoToNextHighlightedNode}
                        disabled={currentTraversalIndex === allHighlightedNodes.length - 1}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next highlighted node"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Info className="w-4 h-4" />
                    <span>Click on nodes to view details</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Graph Visualization */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div style={{ height: '70vh' }}>
                <ReactFlowProvider>
                  <GraphVisualization
                    data={displayGraphData}
                    onNodeSelect={handleNodeSelect}
                    selectedNodeId={highlightedNodeId}
                    highlightOrderChangeField={highlightOrderChangeField}
                    highlightOrderChangeValue={highlightOrderChangeValue}
                    searchedNodeIds={searchedNodeIds}
                    isSearchActive={!!searchQuery.trim()}
                    highlightedPathToStartNodeIds={highlightedPathToStartNodeIds}
                  />
                </ReactFlowProvider>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Node Details Modal */}
      <NodeDetailsModal
        node={selectedNode}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onNavigateToNode={handleNavigateToNode}
        onHighlightPathToStart={handleHighlightPathToStart}
        allNodes={graphData}
      />
    </div>
  );
}

export default App;
