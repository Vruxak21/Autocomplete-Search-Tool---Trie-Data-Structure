# Tree View Troubleshooting Guide

This guide helps resolve common issues with the tree visualization feature.

## Table of Contents

- [Common Issues](#common-issues)
- [Performance Problems](#performance-problems)
- [Accessibility Issues](#accessibility-issues)
- [Integration Problems](#integration-problems)
- [Debug Tools](#debug-tools)
- [Error Recovery](#error-recovery)

## Common Issues

### Tree Not Rendering

**Symptoms:**
- Empty tree view container
- No tree nodes visible
- Console errors about missing data

**Solutions:**

1. **Check Data Structure**
   ```javascript
   // Verify tree nodes have required fields
   const validNode = {
     id: 'unique-id',        // Required: unique string
     type: 'word',           // Required: 'word' or 'prefix'
     content: 'Tokyo',       // Required: display text
     // Optional fields...
   };
   
   // Debug tree data
   console.log('Tree nodes:', treeNodes);
   console.log('Valid structure:', treeNodes.every(node => 
     node.id && node.type && node.content
   ));
   ```

2. **Verify TreeBuilder Output**
   ```javascript
   import { TreeBuilder } from '../utils/TreeBuilder';
   
   const builder = new TreeBuilder();
   try {
     const tree = builder.buildTree(suggestions);
     console.log('Built tree:', tree);
   } catch (error) {
     console.error('Tree building failed:', error);
   }
   ```

3. **Check Component Props**
   ```jsx
   // Ensure TreeView receives valid props
   <TreeView
     treeNodes={treeNodes}  // Must be array
     query={query}          // Must be string
     onSelect={handleSelect} // Must be function
   />
   ```

### Keyboard Navigation Not Working

**Symptoms:**
- Arrow keys don't move focus
- Enter key doesn't select items
- Escape key doesn't clear selection

**Solutions:**

1. **Enable Auto-Focus**
   ```jsx
   <TreeView
     treeNodes={nodes}
     autoFocus={true}  // Enable automatic focus
   />
   ```

2. **Manual Focus Management**
   ```jsx
   const treeRef = useRef();
   
   useEffect(() => {
     // Focus tree when it becomes visible
     if (isVisible && treeRef.current) {
       treeRef.current.focus();
     }
   }, [isVisible]);
   
   <TreeView ref={treeRef} treeNodes={nodes} />
   ```

3. **Check Event Handlers**
   ```jsx
   <TreeView
     treeNodes={nodes}
     onSelect={(node) => {
       console.log('Selected:', node); // Debug selection
       handleSelect(node);
     }}
     onToggleExpand={(nodeId, isExpanded) => {
       console.log('Toggled:', nodeId, isExpanded); // Debug expansion
       handleToggle(nodeId, isExpanded);
     }}
   />
   ```

### Expand/Collapse Not Working

**Symptoms:**
- Clicking expand icon has no effect
- Keyboard expansion doesn't work
- Nodes remain collapsed/expanded

**Solutions:**

1. **Verify Node Structure**
   ```javascript
   // Prefix nodes need children array
   const prefixNode = {
     id: 'prefix-1',
     type: 'prefix',
     content: 'to',
     children: [/* child nodes */],
     childCount: 5
   };
   ```

2. **Check Expansion Handler**
   ```jsx
   const handleToggleExpand = useCallback((nodeId, isExpanded) => {
     console.log('Expansion request:', nodeId, isExpanded);
     
     // Update your tree state
     setTreeNodes(prevNodes => 
       updateNodeExpansion(prevNodes, nodeId, isExpanded)
     );
   }, []);
   ```

3. **Debug Expansion State**
   ```jsx
   // Add debug logging to TreeNode
   <TreeNode
     node={node}
     onToggleExpand={(nodeId, isExpanded) => {
       console.log('TreeNode expansion:', nodeId, isExpanded);
       onToggleExpand(nodeId, isExpanded);
     }}
   />
   ```

## Performance Problems

### Slow Rendering

**Symptoms:**
- Tree takes >100ms to render
- UI freezes during tree building
- Scroll lag with large datasets

**Solutions:**

1. **Enable Virtual Scrolling**
   ```jsx
   <TreeView
     treeNodes={largeDataset}
     virtualScrollThreshold={50}  // Lower threshold
     itemHeight={40}
     containerHeight={400}
   />
   ```

2. **Optimize Tree Building**
   ```javascript
   // Use memoization for expensive operations
   const treeNodes = useMemo(() => {
     console.time('tree-build');
     const tree = TreeBuilder.buildTree(suggestions);
     console.timeEnd('tree-build');
     return tree;
   }, [suggestions]);
   ```

3. **Implement Progressive Loading**
   ```jsx
   const [loadingProgress, setLoadingProgress] = useState(0);
   
   useEffect(() => {
     const buildTreeProgressively = async () => {
       setLoadingProgress(0.1);
       const tree = await TreeBuilder.buildTreeAsync(suggestions, {
         onProgress: setLoadingProgress
       });
       setTreeNodes(tree);
       setLoadingProgress(1);
     };
     
     buildTreeProgressively();
   }, [suggestions]);
   ```

### Memory Issues

**Symptoms:**
- High memory usage
- Browser becomes unresponsive
- Memory leaks over time

**Solutions:**

1. **Limit Tree Depth**
   ```javascript
   const treeConfig = {
     maxDepth: 8,           // Limit nesting
     minGroupSize: 2,       // Avoid single-child groups
     maxNodes: 1000         // Cap total nodes
   };
   
   const tree = TreeBuilder.buildTree(suggestions, treeConfig);
   ```

2. **Clean Up Event Listeners**
   ```jsx
   useEffect(() => {
     const controller = new KeyboardNavigationController();
     
     return () => {
       controller.cleanup(); // Important: clean up
     };
   }, []);
   ```

3. **Use React.memo Effectively**
   ```jsx
   const MemoizedTreeNode = memo(TreeNode, (prevProps, nextProps) => {
     // Custom comparison for better performance
     return (
       prevProps.node.id === nextProps.node.id &&
       prevProps.node.isExpanded === nextProps.node.isExpanded &&
       prevProps.node.isSelected === nextProps.node.isSelected
     );
   });
   ```

## Accessibility Issues

### Screen Reader Problems

**Symptoms:**
- Screen reader doesn't announce tree structure
- Navigation instructions unclear
- Missing context information

**Solutions:**

1. **Verify ARIA Attributes**
   ```jsx
   // Check that TreeView has proper ARIA
   <TreeView
     treeNodes={nodes}
     // Should automatically include:
     // role="tree"
     // aria-label="Search results tree"
     // aria-describedby="tree-instructions"
   />
   ```

2. **Test with Screen Readers**
   ```bash
   # Test with different screen readers
   # NVDA (Windows): Free download
   # JAWS (Windows): Trial available
   # VoiceOver (macOS): Built-in
   # Orca (Linux): Built-in
   ```

3. **Add Custom Announcements**
   ```jsx
   import { announce } from '../utils/screenReaderAnnouncements';
   
   const handleSelect = (node) => {
     announce(`Selected ${node.word}, ${node.frequency} searches`);
     onSelect(node);
   };
   ```

### Focus Management Issues

**Symptoms:**
- Focus gets lost during navigation
- Tab order is incorrect
- Focus trap not working

**Solutions:**

1. **Enable Focus Trapping**
   ```jsx
   <TreeView
     treeNodes={nodes}
     autoFocus={true}
     // Focus trap is automatically enabled
   />
   ```

2. **Debug Focus State**
   ```jsx
   const TreeViewWithDebug = (props) => {
     useEffect(() => {
       const handleFocus = (e) => {
         console.log('Focus changed to:', e.target);
       };
       
       document.addEventListener('focusin', handleFocus);
       return () => document.removeEventListener('focusin', handleFocus);
     }, []);
     
     return <TreeView {...props} />;
   };
   ```

## Integration Problems

### ViewToggle Not Working

**Symptoms:**
- Toggle buttons don't switch views
- View mode state not updating
- Visual state out of sync

**Solutions:**

1. **Check State Management**
   ```jsx
   const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
   
   const handleModeChange = (newMode) => {
     console.log('Mode change:', viewMode, '->', newMode);
     setViewMode(newMode);
   };
   
   <ViewToggle
     currentMode={viewMode}
     onModeChange={handleModeChange}
   />
   ```

2. **Verify View Constants**
   ```javascript
   import { VIEW_MODES } from '../types/tree';
   
   console.log('Available modes:', VIEW_MODES);
   // Should show: { LIST: 'list', TREE: 'tree' }
   ```

### SuggestionsDropdown Integration

**Symptoms:**
- Tree view not appearing in dropdown
- Layout issues with tree view
- Selection not working properly

**Solutions:**

1. **Check Dropdown Props**
   ```jsx
   <SuggestionsDropdown
     suggestions={suggestions}
     viewMode={viewMode}           // Required for tree view
     onViewModeChange={setViewMode} // Required for toggle
     treeConfig={{                 // Optional configuration
       maxDepth: 10,
       minGroupSize: 2
     }}
   />
   ```

2. **Debug Tree Building in Dropdown**
   ```jsx
   const EnhancedSuggestionsDropdown = (props) => {
     const { suggestions, viewMode } = props;
     
     useEffect(() => {
       if (viewMode === VIEW_MODES.TREE) {
         console.log('Building tree for dropdown:', suggestions.length, 'suggestions');
       }
     }, [suggestions, viewMode]);
     
     return <SuggestionsDropdown {...props} />;
   };
   ```

## Debug Tools

### Performance Monitoring

```jsx
import { Profiler } from 'react';

function ProfiledTreeView(props) {
  const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    console.log('TreeView Performance:', {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    });
    
    // Alert if rendering is slow
    if (actualDuration > 16) {
      console.warn('Slow TreeView render:', actualDuration + 'ms');
    }
  };
  
  return (
    <Profiler id="TreeView" onRender={onRenderCallback}>
      <TreeView {...props} />
    </Profiler>
  );
}
```

### Debug Component

```jsx
function DebugTreeView({ debug = false, ...props }) {
  const [debugInfo, setDebugInfo] = useState({});
  
  useEffect(() => {
    if (debug) {
      setDebugInfo({
        nodeCount: props.treeNodes?.length || 0,
        hasQuery: Boolean(props.query),
        hasOnSelect: Boolean(props.onSelect),
        autoFocus: props.autoFocus,
        timestamp: Date.now()
      });
    }
  }, [debug, props]);
  
  return (
    <div>
      {debug && (
        <div className="debug-panel bg-yellow-100 p-2 text-xs">
          <h4>TreeView Debug Info:</h4>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
      <TreeView {...props} />
    </div>
  );
}

// Usage
<DebugTreeView debug={process.env.NODE_ENV === 'development'} {...props} />
```

### Console Debugging

```javascript
// Add to browser console for debugging
window.debugTreeView = {
  logTreeStructure: (treeNodes) => {
    console.log('Tree Structure:');
    const logNode = (node, depth = 0) => {
      const indent = '  '.repeat(depth);
      console.log(`${indent}${node.type}: ${node.content} (${node.id})`);
      if (node.children) {
        node.children.forEach(child => logNode(child, depth + 1));
      }
    };
    treeNodes.forEach(node => logNode(node));
  },
  
  validateTreeStructure: (treeNodes) => {
    const errors = [];
    const checkNode = (node, path = '') => {
      if (!node.id) errors.push(`${path}: Missing id`);
      if (!node.type) errors.push(`${path}: Missing type`);
      if (!node.content) errors.push(`${path}: Missing content`);
      
      if (node.children) {
        node.children.forEach((child, index) => 
          checkNode(child, `${path}[${index}]`)
        );
      }
    };
    
    treeNodes.forEach((node, index) => checkNode(node, `root[${index}]`));
    
    if (errors.length > 0) {
      console.error('Tree validation errors:', errors);
    } else {
      console.log('Tree structure is valid');
    }
    
    return errors.length === 0;
  }
};
```

## Error Recovery

### Graceful Fallbacks

```jsx
function RobustTreeView({ suggestions, ...props }) {
  const [error, setError] = useState(null);
  const [treeNodes, setTreeNodes] = useState([]);
  
  useEffect(() => {
    try {
      const startTime = performance.now();
      const tree = TreeBuilder.buildTree(suggestions);
      const buildTime = performance.now() - startTime;
      
      // Fall back to list view if building is too slow
      if (buildTime > 200) {
        console.warn('Tree building too slow, falling back to list view');
        setError(new Error('Performance fallback'));
        return;
      }
      
      setTreeNodes(tree);
      setError(null);
    } catch (err) {
      console.error('Tree building failed:', err);
      setError(err);
    }
  }, [suggestions]);
  
  if (error) {
    return (
      <div className="fallback-container">
        <div className="error-message text-sm text-yellow-700 bg-yellow-100 p-2 rounded mb-2">
          Tree view unavailable. Showing list instead.
        </div>
        <ListView suggestions={suggestions} {...props} />
      </div>
    );
  }
  
  return <TreeView treeNodes={treeNodes} {...props} />;
}
```

### Error Boundaries

```jsx
class TreeViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('TreeView error:', error, errorInfo);
    
    // Report to error tracking service
    if (window.errorTracker) {
      window.errorTracker.captureException(error, {
        component: 'TreeView',
        errorInfo
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h3>Something went wrong with the tree view</h3>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<TreeViewErrorBoundary>
  <TreeView treeNodes={nodes} />
</TreeViewErrorBoundary>
```

### Retry Logic

```jsx
function RetryableTreeView({ suggestions, maxRetries = 3, ...props }) {
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);
  const [treeNodes, setTreeNodes] = useState([]);
  
  const buildTree = useCallback(async () => {
    try {
      setError(null);
      const tree = await TreeBuilder.buildTreeAsync(suggestions);
      setTreeNodes(tree);
      setRetryCount(0);
    } catch (err) {
      console.error(`Tree building attempt ${retryCount + 1} failed:`, err);
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        // Exponential backoff
        setTimeout(() => buildTree(), Math.pow(2, retryCount) * 1000);
      } else {
        setError(err);
      }
    }
  }, [suggestions, retryCount, maxRetries]);
  
  useEffect(() => {
    buildTree();
  }, [buildTree]);
  
  if (error && retryCount >= maxRetries) {
    return <ListView suggestions={suggestions} {...props} />;
  }
  
  if (retryCount > 0) {
    return (
      <div className="retry-indicator">
        <div className="text-sm text-blue-600">
          Optimizing tree structure... (attempt {retryCount + 1})
        </div>
        <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
      </div>
    );
  }
  
  return <TreeView treeNodes={treeNodes} {...props} />;
}
```

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Browser Console**: Look for error messages and warnings
2. **Enable Debug Mode**: Use the debug tools provided above
3. **Test with Minimal Data**: Try with a small, simple dataset
4. **Verify Dependencies**: Ensure all required utilities are imported
5. **Check Version Compatibility**: Verify React and other dependencies
6. **Review Recent Changes**: Check if recent code changes introduced the issue

### Reporting Issues

When reporting tree view issues, please include:

- Browser and version
- React version
- Error messages from console
- Steps to reproduce
- Sample data that causes the issue
- Expected vs actual behavior

### Performance Benchmarks

Expected performance targets:

- Tree building: <50ms for 100 suggestions, <200ms for 1000 suggestions
- Initial render: <16ms for 50 nodes, <100ms for 500 nodes
- Keyboard navigation: <16ms response time
- Expand/collapse: <200ms animation duration
- Memory usage: <10MB for 1000 nodes

If your tree view doesn't meet these targets, use the debugging tools to identify bottlenecks.