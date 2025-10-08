# Tree Visualization Components

This document provides comprehensive documentation for the tree visualization components that enable hierarchical display of search results.

## Overview

The tree visualization system consists of several interconnected components that work together to provide an accessible, performant, and user-friendly hierarchical view of search suggestions.

### Key Components

- **TreeView**: Main container component that manages the tree structure and keyboard navigation
- **TreeNode**: Individual node component that renders tree items with expand/collapse functionality
- **ViewToggle**: Toggle component for switching between tree and list views
- **VirtualScrollContainer**: Performance optimization component for large datasets
- **TreeBuilder**: Utility service for converting flat suggestions into hierarchical structure

## TreeView Component

The TreeView component is the main container that orchestrates the entire tree visualization experience.

### Basic Usage

```jsx
import TreeView from './components/TreeView';

function SearchResults({ suggestions, query }) {
  const [treeNodes, setTreeNodes] = useState([]);
  
  useEffect(() => {
    // Convert flat suggestions to tree structure
    const builder = new TreeBuilder();
    const tree = builder.buildTree(suggestions);
    setTreeNodes(tree);
  }, [suggestions]);

  const handleSelect = (node) => {
    console.log('Selected word:', node.word);
    // Handle word selection (e.g., update search input, track analytics)
  };

  const handleToggleExpand = (nodeId, isExpanded) => {
    console.log(`Node ${nodeId} ${isExpanded ? 'expanded' : 'collapsed'}`);
    // Optional: Track expansion analytics
  };

  return (
    <TreeView
      treeNodes={treeNodes}
      query={query}
      onSelect={handleSelect}
      onToggleExpand={handleToggleExpand}
      autoFocus={true}
      className="max-h-96 overflow-auto"
    />
  );
}
```

### Advanced Configuration

```jsx
// Large dataset with virtual scrolling
<TreeView
  treeNodes={largeTreeData}
  query={searchQuery}
  onSelect={handleWordSelection}
  onToggleExpand={handleExpansion}
  
  // Performance settings
  virtualScrollThreshold={100}
  itemHeight={45}
  containerHeight={500}
  
  // Accessibility settings
  autoFocus={true}
  
  // Visual settings
  animateEntrance={true}
  className="border rounded-lg shadow-sm"
/>
```

### Loading States

```jsx
// Show loading state while building tree
<TreeView
  treeNodes={[]}
  isLoading={true}
  loadingMessage="Organizing search results..."
  loadingProgress={0.75} // 0-1 for progress bar, null for spinner
  showLoadingSkeleton={true}
/>
```

### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `treeNodes` | `Array<TreeNode>` | `[]` | Array of tree node objects |
| `query` | `string` | `''` | Current search query for highlighting |
| `onSelect` | `function` | - | Callback when word node is selected |
| `onToggleExpand` | `function` | - | Callback when node is expanded/collapsed |
| `autoFocus` | `boolean` | `false` | Auto-focus tree on mount |
| `virtualScrollThreshold` | `number` | `50` | Node count before enabling virtual scrolling |
| `itemHeight` | `number` | `40` | Height of each item (for virtual scrolling) |
| `containerHeight` | `number` | `400` | Container height in pixels |
| `isLoading` | `boolean` | `false` | Show loading state |
| `loadingMessage` | `string` | `'Building tree structure...'` | Loading message |
| `loadingProgress` | `number` | `null` | Loading progress (0-1) |
| `animateEntrance` | `boolean` | `true` | Animate nodes on entrance |

## TreeNode Component

Individual tree nodes that handle rendering, interaction, and accessibility.

### Basic Usage

```jsx
import TreeNode from './components/TreeNode';

// Word node
<TreeNode
  node={{
    id: 'word-tokyo',
    type: 'word',
    content: 'Tokyo',
    word: 'Tokyo',
    frequency: 150,
    suggestionType: 'exact_match'
  }}
  query="tok"
  isSelected={false}
  isFocused={true}
  onSelect={handleWordSelect}
  depth={0}
/>

// Prefix node with children
<TreeNode
  node={{
    id: 'prefix-to',
    type: 'prefix',
    content: 'to',
    children: [...childNodes],
    childCount: 5,
    totalFrequency: 300,
    isExpanded: true
  }}
  onToggleExpand={handleToggleExpand}
  depth={1}
/>
```

### Customization Options

```jsx
// With tooltips and custom styling
<TreeNode
  node={nodeData}
  query={searchQuery}
  showTooltips={true}
  tooltipOptions={{
    delay: 300,
    maxWidth: 250,
    className: 'custom-tooltip'
  }}
  depth={nodeDepth}
  position={nodePosition}
  setSize={totalSiblings}
/>
```

### Node Data Structure

```typescript
interface TreeNode {
  // Required fields
  id: string;                    // Unique identifier
  type: 'prefix' | 'word';      // Node type
  content: string;              // Display text
  
  // State fields (managed by TreeView)
  isExpanded?: boolean;         // Expansion state
  isSelected?: boolean;         // Selection state
  isFocused?: boolean;          // Focus state
  
  // Word node fields
  word?: string;                // Complete word
  frequency?: number;           // Usage frequency
  suggestionType?: 'exact_match' | 'typo_correction';
  
  // Prefix node fields
  children?: TreeNode[];        // Child nodes
  childCount?: number;          // Number of children
  totalFrequency?: number;      // Sum of child frequencies
}
```

## ViewToggle Component

Provides an accessible toggle interface for switching between visualization modes.

### Basic Usage

```jsx
import ViewToggle from './components/ViewToggle';
import { VIEW_MODES } from '../types/tree';

function SuggestionsContainer() {
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  
  const handleModeChange = (newMode) => {
    setViewMode(newMode);
    // Optionally persist preference
    localStorage.setItem('preferredViewMode', newMode);
  };

  return (
    <div>
      <ViewToggle
        currentMode={viewMode}
        onModeChange={handleModeChange}
        size="medium"
      />
      
      {viewMode === VIEW_MODES.TREE ? (
        <TreeView treeNodes={treeData} />
      ) : (
        <ListView suggestions={flatData} />
      )}
    </div>
  );
}
```

### Styling Variants

```jsx
// Different sizes
<ViewToggle currentMode={mode} onModeChange={setMode} size="small" />
<ViewToggle currentMode={mode} onModeChange={setMode} size="medium" />
<ViewToggle currentMode={mode} onModeChange={setMode} size="large" />

// Custom styling
<ViewToggle
  currentMode={mode}
  onModeChange={setMode}
  className="my-4 shadow-lg"
  disabled={isLoading}
/>
```

## Integration with Existing Components

### SuggestionsDropdown Integration

```jsx
import SuggestionsDropdown from './components/SuggestionsDropdown';

function SearchInput() {
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const [suggestions, setSuggestions] = useState([]);
  
  return (
    <div className="relative">
      <input
        type="text"
        onChange={handleSearch}
        className="search-input"
      />
      
      <SuggestionsDropdown
        suggestions={suggestions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSelect={handleSuggestionSelect}
        isVisible={suggestions.length > 0}
      />
    </div>
  );
}
```

### Enhanced SuggestionsDropdown Props

```jsx
<SuggestionsDropdown
  // Existing props
  suggestions={suggestions}
  selectedIndex={selectedIndex}
  onSelect={handleSelect}
  isVisible={isVisible}
  
  // New tree view props
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  treeConfig={{
    maxDepth: 10,
    minGroupSize: 2,
    virtualScrollThreshold: 50
  }}
/>
```

## Performance Optimization

### Virtual Scrolling

For large datasets (>50 nodes), the TreeView automatically enables virtual scrolling:

```jsx
// Automatic virtual scrolling
<TreeView
  treeNodes={largeDataset} // 1000+ nodes
  virtualScrollThreshold={50}
  itemHeight={40}
  containerHeight={400}
/>

// Manual virtual scrolling configuration
<TreeView
  treeNodes={dataset}
  virtualScrollThreshold={25} // Lower threshold
  itemHeight={50}             // Taller items
  containerHeight={600}       // Larger container
/>
```

### Memory Optimization

```jsx
// Memoized tree building
const treeNodes = useMemo(() => {
  return TreeBuilder.buildTree(suggestions);
}, [suggestions]);

// Debounced expansion
const debouncedToggle = useCallback(
  debounce((nodeId, isExpanded) => {
    handleToggleExpand(nodeId, isExpanded);
  }, 100),
  [handleToggleExpand]
);
```

## Accessibility Features

### Keyboard Navigation

The tree view supports comprehensive keyboard navigation:

- **Arrow Down**: Navigate to next visible node
- **Arrow Up**: Navigate to previous visible node
- **Arrow Right**: Expand collapsed node or move to first child
- **Arrow Left**: Collapse expanded node or move to parent
- **Enter**: Select word or toggle expansion
- **Escape**: Clear selection and exit tree
- **Home**: Jump to first node
- **End**: Jump to last visible node

### Screen Reader Support

```jsx
// Automatic ARIA attributes
<TreeView
  treeNodes={nodes}
  // Automatically includes:
  // - role="tree"
  // - aria-label with context
  // - aria-describedby with instructions
/>

// Each TreeNode includes:
// - role="treeitem"
// - aria-expanded for expandable nodes
// - aria-level for depth
// - aria-setsize and aria-posinset for position
// - aria-selected for selection state
```

### Focus Management

```jsx
// Auto-focus on mount
<TreeView
  treeNodes={nodes}
  autoFocus={true} // Focuses first node
/>

// Manual focus control
const treeRef = useRef();

const focusTree = () => {
  treeRef.current?.focus();
};

<TreeView
  ref={treeRef}
  treeNodes={nodes}
  onSelect={handleSelect}
/>
```

## Error Handling and Fallbacks

### Graceful Degradation

```jsx
function RobustTreeView({ suggestions }) {
  const [treeNodes, setTreeNodes] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    try {
      const tree = TreeBuilder.buildTree(suggestions);
      setTreeNodes(tree);
      setError(null);
    } catch (err) {
      console.error('Tree building failed:', err);
      setError(err);
      // Fall back to list view
    }
  }, [suggestions]);
  
  if (error) {
    return (
      <div className="error-fallback">
        <p>Unable to display tree view. Showing list instead.</p>
        <ListView suggestions={suggestions} />
      </div>
    );
  }
  
  return <TreeView treeNodes={treeNodes} />;
}
```

### Performance Monitoring

```jsx
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

function MonitoredTreeView({ suggestions }) {
  const monitor = useRef(new PerformanceMonitor());
  
  useEffect(() => {
    monitor.current.startTimer('tree-build');
    const tree = TreeBuilder.buildTree(suggestions);
    const buildTime = monitor.current.endTimer('tree-build');
    
    // Fall back to list view if building takes too long
    if (buildTime > 100) {
      console.warn('Tree building too slow, using list view');
      setUseFallback(true);
    }
  }, [suggestions]);
  
  // ... rest of component
}
```

## Testing

### Unit Testing

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import TreeView from './TreeView';

describe('TreeView', () => {
  const mockTreeNodes = [
    {
      id: 'node-1',
      type: 'word',
      content: 'Tokyo',
      word: 'Tokyo',
      frequency: 100
    }
  ];
  
  test('renders tree nodes correctly', () => {
    render(
      <TreeView
        treeNodes={mockTreeNodes}
        onSelect={jest.fn()}
      />
    );
    
    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
  });
  
  test('handles keyboard navigation', () => {
    const onSelect = jest.fn();
    render(
      <TreeView
        treeNodes={mockTreeNodes}
        onSelect={onSelect}
        autoFocus={true}
      />
    );
    
    const tree = screen.getByRole('tree');
    fireEvent.keyDown(tree, { key: 'Enter' });
    
    expect(onSelect).toHaveBeenCalledWith(mockTreeNodes[0]);
  });
});
```

### Integration Testing

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SuggestionsDropdown from './SuggestionsDropdown';

describe('Tree View Integration', () => {
  test('switches between tree and list views', async () => {
    render(
      <SuggestionsDropdown
        suggestions={mockSuggestions}
        viewMode="list"
        onViewModeChange={jest.fn()}
      />
    );
    
    // Switch to tree view
    fireEvent.click(screen.getByTestId('tree-view-button'));
    
    await waitFor(() => {
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Tree not rendering**: Check that `treeNodes` prop contains valid data structure
2. **Keyboard navigation not working**: Ensure `autoFocus` is enabled or tree is focused
3. **Performance issues**: Enable virtual scrolling for large datasets
4. **Accessibility warnings**: Verify all nodes have unique IDs and proper ARIA attributes

### Debug Mode

```jsx
// Enable debug logging
<TreeView
  treeNodes={nodes}
  onSelect={(node) => {
    console.log('TreeView: Selected node', node);
    handleSelect(node);
  }}
  onToggleExpand={(nodeId, isExpanded) => {
    console.log('TreeView: Toggled', nodeId, isExpanded);
    handleToggle(nodeId, isExpanded);
  }}
/>
```

### Performance Profiling

```jsx
import { Profiler } from 'react';

function ProfiledTreeView(props) {
  const onRenderCallback = (id, phase, actualDuration) => {
    console.log('TreeView render:', { id, phase, actualDuration });
  };
  
  return (
    <Profiler id="TreeView" onRender={onRenderCallback}>
      <TreeView {...props} />
    </Profiler>
  );
}
```

## Best Practices

1. **Data Structure**: Ensure tree nodes have consistent structure and unique IDs
2. **Performance**: Use virtual scrolling for datasets >50 nodes
3. **Accessibility**: Always provide meaningful labels and descriptions
4. **Error Handling**: Implement fallbacks for tree building failures
5. **Testing**: Test keyboard navigation and screen reader compatibility
6. **Styling**: Use consistent indentation and visual hierarchy
7. **Animation**: Disable animations for users who prefer reduced motion

## Migration Guide

### From List View Only

```jsx
// Before: List view only
function OldSuggestionsDropdown({ suggestions }) {
  return (
    <div className="suggestions">
      {suggestions.map(suggestion => (
        <div key={suggestion.word} onClick={() => select(suggestion)}>
          {suggestion.word}
        </div>
      ))}
    </div>
  );
}

// After: With tree view support
function NewSuggestionsDropdown({ suggestions }) {
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const treeNodes = useMemo(() => TreeBuilder.buildTree(suggestions), [suggestions]);
  
  return (
    <div className="suggestions">
      <ViewToggle currentMode={viewMode} onModeChange={setViewMode} />
      
      {viewMode === VIEW_MODES.TREE ? (
        <TreeView treeNodes={treeNodes} onSelect={handleSelect} />
      ) : (
        <ListView suggestions={suggestions} onSelect={handleSelect} />
      )}
    </div>
  );
}
```

This completes the comprehensive documentation for the tree visualization components. The components are now fully documented with JSDoc comments, usage examples, and integration guides.