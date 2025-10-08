import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { api } from '../utils/apiClient';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { LoadingOverlay } from './LoadingSpinner';
import { VisualizationSkeleton } from './SkeletonLoader';

const TrieVisualization = ({ currentQuery = '' }) => {
  const [trieData, setTrieData] = useState(null);
  const [pathData, setPathData] = useState(null);
  const [complexityInfo, setComplexityInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [prefixFilter, setPrefixFilter] = useState('');
  const svgRef = useRef();
  const containerRef = useRef();
  const { handleError } = useErrorHandler();

  // Fetch Trie structure data with performance limits
  const fetchTrieStructure = useCallback(async (depth = 3, prefix = '', maxNodes = 100) => {
    try {
      setLoading(true);
      setError(null);
      
      // Add performance limits to prevent hanging
      const response = await api.getTrieStructure({ 
        depth: Math.min(depth, 4), // Limit max depth to 4
        prefix, 
        maxNodes: Math.min(maxNodes, 200), // Limit max nodes to 200
        timeout: 5000 // 5 second timeout
      });
      
      setTrieData(response);
    } catch (err) {
      const errorDetails = handleError(err, { 
        showToast: false,
        customMessage: 'Failed to load Trie structure. Try reducing the depth or using a prefix filter.'
      });
      setError(errorDetails.message);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Fetch path data for current query
  const fetchPathData = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setPathData(null);
      return;
    }

    try {
      // This would be a new API endpoint for path data
      const response = await api.getTrieStructure({ path: query.trim() });
      setPathData(response.pathData);
    } catch (err) {
      console.error('Error fetching path data:', err);
      setPathData(null);
    }
  }, []);

  // Fetch complexity information
  const fetchComplexityInfo = useCallback(async () => {
    try {
      // This would be part of the Trie structure response or performance metrics
      const response = await api.getPerformanceMetrics();
      setComplexityInfo(response.complexityInfo);
    } catch (err) {
      console.error('Error fetching complexity info:', err);
    }
  }, []);

  // Initialize data on component mount with smaller initial load
  useEffect(() => {
    // Start with very limited data to prevent hanging
    fetchTrieStructure(2, '', 50); // Depth 2, max 50 nodes
    fetchComplexityInfo();
  }, [fetchTrieStructure, fetchComplexityInfo]);

  // Update path highlighting when query changes
  useEffect(() => {
    fetchPathData(currentQuery);
  }, [currentQuery, fetchPathData]);

  // Render D3 visualization
  useEffect(() => {
    if (!trieData || !trieData.structure || loading) return;

    try {
      renderTrieVisualization();
    } catch (error) {
      console.error('Error rendering visualization:', error);
      setError('Failed to render visualization');
    }
  }, [trieData, pathData, selectedNode]);

  const renderTrieVisualization = () => {
    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    
    if (!container) return;

    // Clear previous visualization
    svg.selectAll('*').remove();

    const containerRect = container.getBoundingClientRect();
    const width = Math.max(800, containerRect.width - 40);
    const height = 600;

    svg.attr('width', width).attr('height', height);

    const { nodes, edges } = trieData.structure;
    
    console.log('Rendering with nodes:', nodes?.length, 'edges:', edges?.length);
    
    if (!nodes || nodes.length === 0) {
      // Show empty state
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-gray-500')
        .text('No Trie data available');
      return;
    }
    
    if (!edges || edges.length === 0) {
      // Show nodes without edges
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-gray-500')
        .text(`Found ${nodes.length} nodes but no connections. Check data structure.`);
      return;
    }

    // Create hierarchical layout
    const hierarchyData = buildHierarchy(nodes, edges);
    console.log('Hierarchy data:', hierarchyData);
    
    const root = d3.hierarchy(hierarchyData);

    const treeLayout = d3.tree()
      .size([width - 100, height - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const treeData = treeLayout(root);

    // Create main group with margins
    const g = svg.append('g')
      .attr('transform', 'translate(50, 50)');

    // Get path node IDs for highlighting
    const pathNodeIds = new Set();
    if (pathData && pathData.path) {
      let currentPrefix = '';
      pathData.path.forEach(pathItem => {
        currentPrefix = pathItem.prefix;
        const node = nodes.find(n => n.prefix === currentPrefix);
        if (node) pathNodeIds.add(node.id);
      });
    }

    // Draw edges
    g.selectAll('.edge')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'edge')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', d => {
        const sourceNode = nodes.find(n => n.id === d.source.data.id);
        const targetNode = nodes.find(n => n.id === d.target.data.id);
        return pathNodeIds.has(targetNode?.id) ? '#3b82f6' : '#d1d5db';
      })
      .attr('stroke-width', d => {
        const targetNode = nodes.find(n => n.id === d.target.data.id);
        return pathNodeIds.has(targetNode?.id) ? 3 : 1;
      });

    // Draw nodes
    const nodeGroups = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        setSelectedNode(nodeData);
      });

    // Node circles
    nodeGroups.append('circle')
      .attr('r', d => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        return nodeData?.isEndOfWord ? 12 : 8;
      })
      .attr('fill', d => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        if (selectedNode && selectedNode.id === nodeData?.id) return '#ef4444';
        if (pathNodeIds.has(nodeData?.id)) return '#3b82f6';
        return nodeData?.isEndOfWord ? '#10b981' : '#f3f4f6';
      })
      .attr('stroke', d => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        return nodeData?.isEndOfWord ? '#059669' : '#9ca3af';
      })
      .attr('stroke-width', 2);

    // Node labels
    nodeGroups.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', d => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        if (selectedNode && selectedNode.id === nodeData?.id) return 'white';
        if (pathNodeIds.has(nodeData?.id)) return 'white';
        return nodeData?.isEndOfWord ? 'white' : '#374151';
      })
      .text(d => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        return nodeData?.character === 'ROOT' ? 'ROOT' : nodeData?.character?.toUpperCase() || '';
      });

    // Frequency labels for end-of-word nodes
    nodeGroups
      .filter(d => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        return nodeData?.isEndOfWord && nodeData?.frequency > 0;
      })
      .append('text')
      .attr('dy', '25px')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text(d => {
        const nodeData = nodes.find(n => n.id === d.data.id);
        return `(${nodeData?.frequency})`;
      });
  };

  // Build hierarchy from flat node/edge structure
  const buildHierarchy = (nodes, edges) => {
    console.log('Building hierarchy with nodes:', nodes.length, 'edges:', edges.length);
    
    const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [] }]));

    // Build parent-child relationships
    edges.forEach(edge => {
      const parent = nodeMap.get(edge.from);
      const child = nodeMap.get(edge.to);
      if (parent && child) {
        parent.children.push(child);
      }
    });

    // Find and return the root node with its complete hierarchy
    const rootNode = nodes.find(n => n.character === 'ROOT' || n.id === 0);
    const rootHierarchy = rootNode ? nodeMap.get(rootNode.id) : null;
    
    console.log('Root hierarchy:', rootHierarchy);
    console.log('Root children count:', rootHierarchy?.children?.length || 0);
    
    return rootHierarchy || { id: 0, character: 'ROOT', children: [] };
  };

  if (loading) {
    return <VisualizationSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Visualization Error
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => fetchTrieStructure()}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Complexity Information */}
      {complexityInfo && complexityInfo.timeComplexity && complexityInfo.currentStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Trie Data Structure - Time Complexity Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Time Complexity:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li><strong>Search:</strong> {complexityInfo.timeComplexity.search}</li>
                <li><strong>Insert:</strong> {complexityInfo.timeComplexity.insert}</li>
                <li><strong>Delete:</strong> {complexityInfo.timeComplexity.delete}</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                {complexityInfo.timeComplexity.description}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Current Statistics:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li><strong>Words:</strong> {complexityInfo.currentStats.wordCount}</li>
                <li><strong>Nodes:</strong> {complexityInfo.currentStats.nodeCount}</li>
                <li><strong>Max Depth:</strong> {complexityInfo.currentStats.maxDepth}</li>
                <li><strong>Memory Efficiency:</strong> {complexityInfo.currentStats.memoryEfficiency.toFixed(1)}%</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Visualization Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="space-y-4">
          {/* Prefix Filter */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by prefix:
            </label>
            <input
              type="text"
              value={prefixFilter}
              onChange={(e) => setPrefixFilter(e.target.value)}
              placeholder="e.g., 'app' to see only words starting with 'app'"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => fetchTrieStructure(3, prefixFilter, 100)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Apply Filter
            </button>
          </div>
          
          {/* Size Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchTrieStructure(2, prefixFilter, 50)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Small (Depth 2)
              </button>
              <button
                onClick={() => fetchTrieStructure(3, prefixFilter, 100)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Medium (Depth 3)
              </button>
              <button
                onClick={() => fetchTrieStructure(4, prefixFilter, 150)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Large (Depth 4)
              </button>
              <div className="text-xs text-gray-500">
                ⚠️ Start with Small to avoid performance issues
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {currentQuery && (
                <span>Highlighting path for: <strong>"{currentQuery}"</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Warning */}
      {!prefixFilter && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Performance Tip
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>For large datasets, use a prefix filter (like "app" or "new") to focus on specific parts of the trie. This prevents browser hanging and improves visualization clarity.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualization Container */}
      <div ref={containerRef} className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Trie Structure Visualization</h3>
          <p className="text-sm text-gray-600 mt-1">
            Click on nodes to explore. Blue path shows current search query.
            {prefixFilter && <span className="font-medium"> Filtered by: "{prefixFilter}"</span>}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <svg ref={svgRef} className="border border-gray-100 rounded"></svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-400 mr-2"></div>
            <span>Regular Node</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600 mr-2"></div>
            <span>End of Word</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-600 mr-2"></div>
            <span>Search Path</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-600 mr-2"></div>
            <span>Selected Node</span>
          </div>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Node Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Character:</strong> {selectedNode.character}
            </div>
            <div>
              <strong>Prefix:</strong> {selectedNode.prefix || 'ROOT'}
            </div>
            <div>
              <strong>Is End of Word:</strong> {selectedNode.isEndOfWord ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Frequency:</strong> {selectedNode.frequency || 0}
            </div>
            <div>
              <strong>Depth:</strong> {selectedNode.depth}
            </div>
            <div>
              <strong>Children:</strong> {selectedNode.childCount}
            </div>
            {selectedNode.word && (
              <div className="col-span-2">
                <strong>Complete Word:</strong> {selectedNode.word}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Path Information */}
      {pathData && pathData.path && pathData.path.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Search Path Analysis</h3>
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Query:</strong> {pathData.query}
            </div>
            <div className="text-sm">
              <strong>Path Exists:</strong> {pathData.exists ? 'Yes' : 'No'}
            </div>
            <div className="text-sm">
              <strong>Complete Word:</strong> {pathData.isCompleteWord ? 'Yes' : 'No'}
            </div>
            {pathData.frequency > 0 && (
              <div className="text-sm">
                <strong>Frequency:</strong> {pathData.frequency}
              </div>
            )}
            <div className="text-sm">
              <strong>Path:</strong>
              <div className="mt-1 flex flex-wrap gap-1">
                {pathData.path.map((step, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded text-xs ${
                      step.isEndOfWord 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {step.character} → "{step.prefix}"
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrieVisualization;