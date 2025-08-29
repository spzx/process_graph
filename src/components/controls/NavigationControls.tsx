/**
 * Navigation Controls UI Panel
 * 
 * This component provides a user interface for advanced graph navigation,
 * including smart zoom controls, breadcrumb navigation, guided tours,
 * and viewport management.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Navigation, 
  ZoomIn, 
  ZoomOut,
  Maximize,
  Move,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Home,
  Compass,
  Route,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronRight,
  ChevronDown,
  Search,
  Bookmark,
  History,
  Target,
  MousePointer2
} from 'lucide-react';

import { useAdvancedNavigation } from '../../hooks/useEnhancedGraph';

/**
 * Navigation control configuration
 */
export interface NavigationControlsConfig {
  /** Show zoom controls */
  showZoomControls?: boolean;
  
  /** Show viewport controls */
  showViewportControls?: boolean;
  
  /** Show breadcrumb navigation */
  showBreadcrumbs?: boolean;
  
  /** Show guided tour controls */
  showTourControls?: boolean;
  
  /** Show node search */
  showNodeSearch?: boolean;
  
  /** Show bookmarks */
  showBookmarks?: boolean;
  
  /** Panel position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /** Panel orientation */
  orientation?: 'horizontal' | 'vertical';
  
  /** Enable smart zoom features */
  enableSmartZoom?: boolean;
  
  /** Enable tour creation */
  enableTourCreation?: boolean;
}

/**
 * Bookmark information
 */
export interface Bookmark {
  id: string;
  name: string;
  nodeId?: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  timestamp: number;
  description?: string;
}

/**
 * Tour step information
 */
export interface TourStep {
  id: string;
  nodeId?: string;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  title: string;
  description?: string;
  duration?: number;
  highlightNodes?: string[];
  highlightEdges?: string[];
}

/**
 * Navigation controls props
 */
export interface NavigationControlsProps {
  /** Current viewport state */
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  
  /** Available nodes for navigation */
  nodes?: Array<{
    id: string;
    label?: string;
    position?: { x: number; y: number };
  }>;
  
  /** Navigation breadcrumbs */
  breadcrumbs?: string[];
  
  /** Bookmarks */
  bookmarks?: Bookmark[];
  
  /** Active tour */
  activeTour?: {
    id: string;
    name: string;
    steps: TourStep[];
    currentStep: number;
    isPlaying: boolean;
  };
  
  /** Configuration */
  config?: NavigationControlsConfig;
  
  /** Event handlers */
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomToFit?: () => void;
  onResetView?: () => void;
  onNavigateToNode?: (nodeId: string) => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onBookmarkCreate?: (bookmark: Omit<Bookmark, 'id' | 'timestamp'>) => void;
  onBookmarkNavigate?: (bookmarkId: string) => void;
  onBookmarkDelete?: (bookmarkId: string) => void;
  onTourStart?: (tourId: string) => void;
  onTourPause?: () => void;
  onTourResume?: () => void;
  onTourStop?: () => void;
  onTourStepChange?: (stepIndex: number) => void;
  
  /** Navigation state */
  canGoBack?: boolean;
  canGoForward?: boolean;
  isNavigating?: boolean;
  
  /** Search functionality */
  onNodeSearch?: (term: string) => Array<{ id: string; label: string; }>;
}

/**
 * Main Navigation Controls Component
 */
export const NavigationControls: React.FC<NavigationControlsProps> = ({
  viewport = { x: 0, y: 0, zoom: 1 },
  nodes = [],
  breadcrumbs = [],
  bookmarks = [],
  activeTour,
  config = {},
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onResetView,
  onNavigateToNode,
  onGoBack,
  onGoForward,
  onBookmarkCreate,
  onBookmarkNavigate,
  onBookmarkDelete,
  onTourStart,
  onTourPause,
  onTourResume,
  onTourStop,
  onTourStepChange,
  canGoBack = false,
  canGoForward = false,
  isNavigating = false,
  onNodeSearch
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState<'navigation' | 'bookmarks' | 'tours' | 'search'>('navigation');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; label: string; }>>([]);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);

  // Merge with default config
  const fullConfig: Required<NavigationControlsConfig> = {
    showZoomControls: true,
    showViewportControls: true,
    showBreadcrumbs: true,
    showTourControls: true,
    showNodeSearch: true,
    showBookmarks: true,
    position: 'bottom-right',
    orientation: 'vertical',
    enableSmartZoom: true,
    enableTourCreation: false,
    ...config
  };

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (term.length >= 2 && onNodeSearch) {
      const results = onNodeSearch(term);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [onNodeSearch]);

  // Handle bookmark creation
  const handleCreateBookmark = useCallback(() => {
    if (newBookmarkName.trim()) {
      onBookmarkCreate?.({
        name: newBookmarkName.trim(),
        viewport: { ...viewport },
        description: `Saved at zoom ${viewport.zoom.toFixed(2)}`
      });
      setNewBookmarkName('');
      setShowBookmarkForm(false);
    }
  }, [newBookmarkName, viewport, onBookmarkCreate]);

  // Format zoom percentage
  const zoomPercentage = Math.round(viewport.zoom * 100);

  // Panel positioning classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div 
      className={`
        absolute z-50 
        ${positionClasses[fullConfig.position]}
        bg-white rounded-lg shadow-lg border border-gray-200
        ${fullConfig.orientation === 'horizontal' ? 'min-w-max' : 'w-72'}
        transition-all duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">Navigation</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {zoomPercentage}%
          </span>
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

      {isExpanded && (
        <>
          {/* Quick Controls - Always visible */}
          <div className="p-3 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              {/* Zoom Controls */}
              {fullConfig.showZoomControls && (
                <div className="space-y-1">
                  <div className="flex space-x-1">
                    <button
                      onClick={onZoomIn}
                      className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                    <button
                      onClick={onZoomOut}
                      className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={onZoomToFit}
                    className="w-full flex items-center justify-center space-x-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    title="Fit to View"
                  >
                    <Maximize className="w-3 h-3" />
                    <span>Fit</span>
                  </button>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="space-y-1">
                <div className="flex space-x-1">
                  <button
                    onClick={onGoBack}
                    disabled={!canGoBack}
                    className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded transition-colors"
                    title="Go Back"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={onGoForward}
                    disabled={!canGoForward}
                    className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded transition-colors"
                    title="Go Forward"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={onResetView}
                  className="w-full flex items-center justify-center space-x-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="Reset View"
                >
                  <Home className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Panel Navigation */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'navigation', label: 'Navigate', icon: Compass },
              { id: 'search', label: 'Search', icon: Search },
              { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
              { id: 'tours', label: 'Tours', icon: Route }
            ].map(panel => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id as any)}
                className={`
                  flex-1 flex items-center justify-center space-x-1 px-2 py-2 text-xs font-medium
                  ${activePanel === panel.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }
                `}
              >
                <panel.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{panel.label}</span>
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="p-3">
            {/* Navigation Panel */}
            {activePanel === 'navigation' && (
              <NavigationPanel
                breadcrumbs={breadcrumbs}
                onNavigateToNode={onNavigateToNode}
                isNavigating={isNavigating}
              />
            )}

            {/* Search Panel */}
            {activePanel === 'search' && fullConfig.showNodeSearch && (
              <SearchPanel
                searchTerm={searchTerm}
                searchResults={searchResults}
                onSearch={handleSearch}
                onNavigateToNode={onNavigateToNode}
              />
            )}

            {/* Bookmarks Panel */}
            {activePanel === 'bookmarks' && fullConfig.showBookmarks && (
              <BookmarksPanel
                bookmarks={bookmarks}
                showForm={showBookmarkForm}
                newBookmarkName={newBookmarkName}
                onShowForm={setShowBookmarkForm}
                onBookmarkNameChange={setNewBookmarkName}
                onCreateBookmark={handleCreateBookmark}
                onNavigateToBookmark={onBookmarkNavigate}
                onDeleteBookmark={onBookmarkDelete}
              />
            )}

            {/* Tours Panel */}
            {activePanel === 'tours' && fullConfig.showTourControls && (
              <ToursPanel
                activeTour={activeTour}
                onTourStart={onTourStart}
                onTourPause={onTourPause}
                onTourResume={onTourResume}
                onTourStop={onTourStop}
                onTourStepChange={onTourStepChange}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Navigation Panel Sub-component
 */
interface NavigationPanelProps {
  breadcrumbs: string[];
  onNavigateToNode?: (nodeId: string) => void;
  isNavigating: boolean;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  breadcrumbs,
  onNavigateToNode,
  isNavigating
}) => {
  return (
    <div className="space-y-3">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
            Navigation History
          </label>
          <div className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((nodeId, index) => (
              <React.Fragment key={nodeId}>
                <button
                  onClick={() => onNavigateToNode?.(nodeId)}
                  className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  {nodeId}
                </button>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Status */}
      {isNavigating && (
        <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-md">
          <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-xs text-blue-700">Navigating...</span>
        </div>
      )}

      {breadcrumbs.length === 0 && !isNavigating && (
        <div className="text-center py-4 text-gray-500">
          <Compass className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-xs">No navigation history</p>
        </div>
      )}
    </div>
  );
};

/**
 * Search Panel Sub-component
 */
interface SearchPanelProps {
  searchTerm: string;
  searchResults: Array<{ id: string; label: string; }>;
  onSearch: (term: string) => void;
  onNavigateToNode?: (nodeId: string) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  searchTerm,
  searchResults,
  onSearch,
  onNavigateToNode
}) => {
  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {searchResults.map(result => (
            <button
              key={result.id}
              onClick={() => onNavigateToNode?.(result.id)}
              className="w-full flex items-center space-x-2 p-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Target className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">{result.label || result.id}</span>
            </button>
          ))}
        </div>
      )}

      {searchTerm.length >= 2 && searchResults.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-xs">No nodes found</p>
        </div>
      )}
    </div>
  );
};

/**
 * Bookmarks Panel Sub-component
 */
interface BookmarksPanelProps {
  bookmarks: Bookmark[];
  showForm: boolean;
  newBookmarkName: string;
  onShowForm: (show: boolean) => void;
  onBookmarkNameChange: (name: string) => void;
  onCreateBookmark: () => void;
  onNavigateToBookmark?: (bookmarkId: string) => void;
  onDeleteBookmark?: (bookmarkId: string) => void;
}

const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  bookmarks,
  showForm,
  newBookmarkName,
  onShowForm,
  onBookmarkNameChange,
  onCreateBookmark,
  onNavigateToBookmark,
  onDeleteBookmark
}) => {
  return (
    <div className="space-y-3">
      {/* Add Bookmark */}
      <div>
        {!showForm ? (
          <button
            onClick={() => onShowForm(true)}
            className="w-full flex items-center justify-center space-x-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Bookmark className="w-4 h-4" />
            <span>Add Bookmark</span>
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Bookmark name..."
              value={newBookmarkName}
              onChange={(e) => onBookmarkNameChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={onCreateBookmark}
                disabled={!newBookmarkName.trim()}
                className="flex-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => onShowForm(false)}
                className="flex-1 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {bookmarks.map(bookmark => (
          <div
            key={bookmark.id}
            className="flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
          >
            <button
              onClick={() => onNavigateToBookmark?.(bookmark.id)}
              className="flex-1 text-left"
            >
              <div className="text-sm font-medium text-gray-800 truncate">
                {bookmark.name}
              </div>
              {bookmark.description && (
                <div className="text-xs text-gray-500 truncate">
                  {bookmark.description}
                </div>
              )}
            </button>
            <button
              onClick={() => onDeleteBookmark?.(bookmark.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {bookmarks.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <Bookmark className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-xs">No bookmarks saved</p>
        </div>
      )}
    </div>
  );
};

/**
 * Tours Panel Sub-component
 */
interface ToursPanelProps {
  activeTour?: {
    id: string;
    name: string;
    steps: TourStep[];
    currentStep: number;
    isPlaying: boolean;
  };
  onTourStart?: (tourId: string) => void;
  onTourPause?: () => void;
  onTourResume?: () => void;
  onTourStop?: () => void;
  onTourStepChange?: (stepIndex: number) => void;
}

const ToursPanel: React.FC<ToursPanelProps> = ({
  activeTour,
  onTourStart,
  onTourPause,
  onTourResume,
  onTourStop,
  onTourStepChange
}) => {
  const [availableTours] = useState([
    { id: 'overview', name: 'Graph Overview', stepCount: 5 },
    { id: 'analysis', name: 'Data Analysis Tour', stepCount: 8 }
  ]);

  return (
    <div className="space-y-3">
      {/* Active Tour Controls */}
      {activeTour && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">{activeTour.name}</span>
            <button
              onClick={onTourStop}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Stop
            </button>
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={() => onTourStepChange?.(Math.max(0, activeTour.currentStep - 1))}
              disabled={activeTour.currentStep === 0}
              className="p-1 text-blue-600 hover:text-blue-800 disabled:text-blue-300"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            
            <button
              onClick={activeTour.isPlaying ? onTourPause : onTourResume}
              className="p-1 text-blue-600 hover:text-blue-800"
            >
              {activeTour.isPlaying ? 
                <Pause className="w-4 h-4" /> : 
                <Play className="w-4 h-4" />
              }
            </button>
            
            <button
              onClick={() => onTourStepChange?.(Math.min(activeTour.steps.length - 1, activeTour.currentStep + 1))}
              disabled={activeTour.currentStep === activeTour.steps.length - 1}
              className="p-1 text-blue-600 hover:text-blue-800 disabled:text-blue-300"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-xs text-blue-700">
            Step {activeTour.currentStep + 1} of {activeTour.steps.length}
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((activeTour.currentStep + 1) / activeTour.steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Available Tours */}
      {!activeTour && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
            Available Tours
          </label>
          {availableTours.map(tour => (
            <button
              key={tour.id}
              onClick={() => onTourStart?.(tour.id)}
              className="w-full flex items-center justify-between p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div>
                <div className="font-medium text-gray-800">{tour.name}</div>
                <div className="text-xs text-gray-500">{tour.stepCount} steps</div>
              </div>
              <Route className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      )}

      {!activeTour && availableTours.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <Route className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-xs">No tours available</p>
        </div>
      )}
    </div>
  );
};

export default NavigationControls;