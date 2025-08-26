import React, { useRef } from 'react';
import { X, Info, ChevronRight, GitCommit, Waypoints, Book, Code, Settings, AlertTriangle } from 'lucide-react';
import { GraphNode } from '../types';

interface NodeDetailsModalProps {
  node: GraphNode | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
  onHighlightPathToStart: (nodeId: string) => void;
  allNodes: GraphNode[];
}

export const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({
  node,
  isOpen,
  onClose,
  onNavigateToNode,
  onHighlightPathToStart,
  allNodes,
}) => {
  const modalContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !node) return null;

  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  const hasNextNodes = node.nextNodes && node.nextNodes.length > 0;
  const hasOrderChanges = node.orderChanges && node.orderChanges.some(change => Object.keys(change.set).length > 0);
  const hasBusinessRules = node.businessRules && node.businessRules.length > 0;
  const hasDependencies = node.dependencies && node.dependencies.length > 0;
  const hasConfigurationFlags = node.configurationFlags && node.configurationFlags.length > 0;
  const hasEdgeCases = node.edgeCases && node.edgeCases.length > 0;

  const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; count?: number; color: string }> = ({ icon, title, count, color }) => (
    <h4 className={`flex items-center space-x-2 text-base font-semibold ${color} mb-3`}>
      {icon}
      <span>{title} {count !== undefined && `(${count})`}</span>
    </h4>
  );

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalContentRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
            <Info className="w-6 h-6 text-blue-600" />
            <span>Node Details: <span className="text-blue-800">{node.nodeId}</span></span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 divide-y divide-gray-100">
          {/* Basic Info */}
          <div className="pt-0">
            <p className="text-sm font-medium text-gray-500 mb-1">Short Description</p>
            <p className="text-gray-800 text-base leading-relaxed">{node.shortDescription}</p>
          </div>
          {node.businessPurpose && (
            <div className="pt-6">
              <p className="text-sm font-medium text-gray-500 mb-1">Business Purpose</p>
              <p className="text-gray-800 text-base leading-relaxed">{node.businessPurpose}</p>
            </div>
          )}
          <div className="pt-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Full Description</p>
            <p className="text-gray-800 text-base leading-relaxed">{node.description}</p>
          </div>

          {/* Order Changes */}
          {hasOrderChanges && (
            <div className="pt-6">
              <SectionTitle
                icon={<GitCommit className="w-5 h-5" />}
                title="Order Changes"
                count={node.orderChanges?.filter(change => Object.keys(change.set).length > 0).length}
                color="text-purple-700"
              />
              <div className="space-y-4 border border-purple-200 rounded-lg p-4 bg-purple-50">
                {node.orderChanges?.filter(change => Object.keys(change.set).length > 0).map((change, index) => (
                  <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-purple-100">
                    {change.description && <p className="font-semibold text-purple-800 mb-2 text-sm">{change.description}</p>}
                    <p className="text-gray-700 text-sm mb-2">On: <code className="font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{change.on}</code></p>
                    <div className="mt-3">
                      <p className="font-medium text-gray-600 text-sm mb-1">Set values:</p>
                      <ul className="space-y-1">
                        {Object.entries(change.set).map(([key, value]) => (
                          <li key={key} className="flex items-center text-sm">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded mr-2">{key}:</span>
                            <span className="text-gray-800">{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Nodes */}
          {hasNextNodes && (
            <div className="pt-6">
              <SectionTitle
                icon={<ChevronRight className="w-5 h-5" />}
                title="Next Nodes"
                count={node.nextNodes.length}
                color="text-blue-700"
              />
              <div className="space-y-3 border border-blue-200 rounded-lg p-4 bg-blue-50">
                {node.nextNodes.map((nextNode, index) => (
                  <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-blue-100">
                    {/* Handle the new data structure with 'on', 'to', and 'description' fields */}
                    {nextNode.on && nextNode.to ? (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-gray-700">{nextNode.on}:</span>
                          {allNodes.some(n => n.nodeId === nextNode.to) ? (
                            <button
                              onClick={() => onNavigateToNode(nextNode.to)}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                            >
                              <span>{nextNode.to}</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-gray-500 italic">{nextNode.to} (Not found)</span>
                          )}
                        </div>
                        {nextNode.description && (
                          <p className="text-xs text-gray-600 mt-1 italic">{nextNode.description}</p>
                        )}
                      </div>
                    ) : (
                      /* Fallback to the old structure for backward compatibility */
                      Object.entries(nextNode as any).map(([condition, targetNodeId]: [string, any]) => (
                        <div key={condition} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">{condition}:</span>
                          {allNodes.some(n => n.nodeId === String(targetNodeId)) ? (
                            <button
                              onClick={() => onNavigateToNode(String(targetNodeId))}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                            >
                              <span>{String(targetNodeId)}</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-gray-500 italic">{String(targetNodeId)} (Not found)</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Rules */}
          {hasBusinessRules && (
            <div className="pt-6">
              <SectionTitle
                icon={<Book className="w-5 h-5" />}
                title="Business Rules"
                count={node.businessRules?.length || 0}
                color="text-green-700"
              />
              <div className="space-y-1 border border-green-200 rounded-lg p-4 bg-green-50">
                <ul className="list-disc list-inside ml-2 text-gray-700 text-sm space-y-1">
                  {node.businessRules?.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Dependencies */}
          {hasDependencies && (
            <div className="pt-6">
              <SectionTitle
                icon={<Code className="w-5 h-5" />}
                title="Dependencies"
                count={node.dependencies?.length || 0}
                color="text-orange-700"
              />
              <div className="space-y-1 border border-orange-200 rounded-lg p-4 bg-orange-50 flex flex-wrap gap-2">
                {node.dependencies?.map((dep, index) => (
                  <span key={index} className="font-mono bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs shadow-sm border border-gray-200">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Flags */}
          {hasConfigurationFlags && (
            <div className="pt-6">
              <SectionTitle
                icon={<Settings className="w-5 h-5" />}
                title="Configuration Flags"
                count={node.configurationFlags?.length || 0}
                color="text-teal-700"
              />
              <div className="space-y-3 border border-teal-200 rounded-lg p-4 bg-teal-50">
                {node.configurationFlags?.map((flag, index) => (
                  <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-teal-100">
                    <p className="font-semibold text-teal-800 mb-1 text-sm">{flag.key}</p>
                    <p className="text-gray-700 text-sm">{flag.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edge Cases */}
          {hasEdgeCases && (
            <div className="pt-6">
              <SectionTitle
                icon={<AlertTriangle className="w-5 h-5" />}
                title="Edge Cases"
                count={node.edgeCases?.length || 0}
                color="text-red-700"
              />
              <div className="space-y-1 border border-red-200 rounded-lg p-4 bg-red-50">
                <ul className="list-disc list-inside ml-2 text-gray-700 text-sm space-y-1">
                  {node.edgeCases?.map((ec, index) => (
                    <li key={index}>{ec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
          <button
            onClick={() => onHighlightPathToStart(node.nodeId)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Waypoints className="w-4 h-4" />
            <span>Highlight Path to Start</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
