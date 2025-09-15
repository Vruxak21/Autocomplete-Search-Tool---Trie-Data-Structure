# User Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Search Functionality](#search-functionality)
- [Trie Visualization](#trie-visualization)
- [Advanced Features](#advanced-features)
- [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)
- [Keyboard Shortcuts](#keyboard-shortcuts)

## Getting Started

### What is the Auto-Complete Search Tool?

The Auto-Complete Search Tool is a web application that provides Google-style search suggestions as you type. It uses advanced computer science algorithms (specifically a Trie data structure) to deliver fast, relevant suggestions from large datasets.

### Key Features

- **Real-time Suggestions**: See search results instantly as you type
- **Smart Ranking**: Most popular results appear first
- **Typo Tolerance**: Find results even with minor spelling mistakes
- **Educational Visualization**: See how the search algorithm works
- **Large Dataset Support**: Search through thousands of entries efficiently

### Accessing the Application

1. Open your web browser
2. Navigate to the application URL (typically `http://localhost:5173` for development)
3. You'll see the main search interface with two tabs:
   - **Search**: Main search functionality
   - **Visualization**: Educational view of the data structure

## Search Functionality

### Basic Search

1. **Start Typing**: Click in the search box and begin typing your query
2. **View Suggestions**: Suggestions appear automatically as you type
3. **Navigate Results**: Use arrow keys (↑/↓) to navigate through suggestions
4. **Select Result**: Click on a suggestion or press Enter to select it

![Search Interface](images/search-interface.png)

### Search Features

#### Real-time Suggestions
- Suggestions appear after typing just one character
- Results update instantly as you continue typing
- No need to press Enter or click a search button

#### Frequency-based Ranking
- Most popular/frequently searched items appear first
- Popularity increases when items are selected
- Ensures relevant results are always at the top

#### Suggestion Details
Each suggestion shows:
- **Word/Phrase**: The suggested search term
- **Frequency Count**: How many times it's been searched (shown on the right)
- **Highlighted Match**: Your typed characters are highlighted in yellow

### Advanced Search Options

#### Typo Tolerance
The application can find results even when you make small typing mistakes:

**Examples:**
- Type "tokio" → Find "tokyo"
- Type "recieve" → Find "receive"
- Type "seperate" → Find "separate"

**How it works:**
- Detects 1-2 character differences
- Shows corrected suggestions with a small indicator
- Maintains high accuracy while being forgiving

#### Search Categories
Depending on the loaded dataset, you might search through:
- **World Cities**: Major cities and their variations
- **Products**: E-commerce product names
- **Movies**: Film titles and variations
- **Mixed Data**: Combination of multiple datasets

### Search Tips

#### For Best Results:
1. **Start with common letters**: Begin typing the most distinctive part of your search
2. **Use partial words**: You don't need to type complete words
3. **Try variations**: If you don't find what you're looking for, try different spellings
4. **Check suggestions**: Often what you're looking for appears in the suggestion list

#### Search Behavior:
- **Minimum length**: Start seeing suggestions after 1 character
- **Maximum suggestions**: Up to 5 suggestions shown at once
- **Case insensitive**: "Tokyo", "tokyo", and "TOKYO" all work the same
- **Special characters**: Supports letters, numbers, spaces, hyphens, and apostrophes

## Trie Visualization

### What is a Trie?

A Trie (pronounced "try") is a tree-like data structure that stores words in a way that makes prefix-based searching extremely fast. Each node in the tree represents a character, and paths from the root to leaves form complete words.

### Accessing the Visualization

1. Click the **Visualization** tab at the top of the application
2. The visualization will load showing the current Trie structure
3. Type in the search box to see real-time path highlighting

![Trie Visualization](images/trie-visualization.png)

### Understanding the Visualization

#### Visual Elements:
- **Nodes**: Circles representing characters in the Trie
- **Edges**: Lines connecting nodes, labeled with characters
- **Root Node**: The starting point (usually at the top or center)
- **End Nodes**: Nodes that complete valid words (often highlighted differently)
- **Path Highlighting**: Shows the route through the Trie for your current search

#### Node Information:
- **Character**: The letter or symbol stored in the node
- **Frequency**: How often words ending at this node are searched
- **Word Status**: Whether this node completes a valid word
- **Children Count**: Number of possible next characters

### Interactive Features

#### Real-time Path Tracing
- Type in the search box while viewing the visualization
- Watch as the path through the Trie is highlighted in real-time
- See which nodes are visited for your search query

#### Node Exploration
- Click on nodes to see detailed information
- Explore different branches of the Trie
- Understand how words share common prefixes

#### Zoom and Pan
- Use mouse wheel to zoom in/out
- Click and drag to pan around large Trie structures
- Reset view with the reset button

### Educational Content

#### Time Complexity Information
The visualization includes educational panels explaining:
- **Search Time**: O(L) where L is the length of your query
- **Memory Usage**: How the Trie uses memory efficiently
- **Comparison**: How Trie performance compares to other data structures

#### Algorithm Advantages
- **Fast Searches**: Consistent performance regardless of dataset size
- **Prefix Matching**: Excellent for autocomplete functionality
- **Memory Efficient**: Shares storage for common prefixes
- **Predictable**: Performance doesn't degrade with more data

## Advanced Features

### Keyboard Navigation

#### Search Box:
- **Tab**: Move focus to search box
- **Escape**: Clear search box and hide suggestions
- **Arrow Up/Down**: Navigate through suggestions
- **Enter**: Select highlighted suggestion
- **Backspace**: Delete characters and update suggestions

#### Visualization:
- **Arrow Keys**: Pan around the visualization
- **+/-**: Zoom in/out
- **Space**: Reset view to center
- **R**: Refresh visualization data

### Performance Monitoring

#### Response Time Display
- Watch the response time indicator (usually shown in milliseconds)
- Typical response times should be under 50ms
- Slower responses might indicate high server load

#### Cache Status
- Green indicator: Result served from cache (faster)
- Yellow indicator: Fresh result from server
- Red indicator: Error or timeout

### Customization Options

#### Search Preferences:
- **Suggestion Count**: Adjust how many suggestions to show (1-20)
- **Typo Tolerance**: Enable/disable fuzzy matching
- **Auto-select**: Automatically select first suggestion

#### Visualization Preferences:
- **Depth Limit**: Control how deep into the Trie to display
- **Node Size**: Adjust node size based on frequency
- **Color Scheme**: Choose different color themes
- **Animation Speed**: Control transition animations

## Performance Tips

### For Optimal Search Performance:

1. **Use Specific Queries**: More specific searches return faster results
2. **Avoid Very Short Queries**: Single characters might return many results
3. **Clear Browser Cache**: If experiencing slowness, clear your browser cache
4. **Check Network**: Ensure stable internet connection for best performance

### For Better Visualization Performance:

1. **Limit Depth**: Don't display the entire Trie at once for large datasets
2. **Use Prefix Filtering**: Focus on specific branches of the Trie
3. **Close Other Tabs**: Free up browser memory for better rendering
4. **Use Modern Browser**: Chrome, Firefox, or Safari work best

### Understanding Performance Metrics:

- **Response Time**: How long the server takes to process your search
- **Render Time**: How long your browser takes to display results
- **Cache Hit Rate**: Percentage of requests served from cache
- **Memory Usage**: How much memory the Trie structure uses

## Troubleshooting

### Common Issues and Solutions

#### No Suggestions Appearing
**Possible Causes:**
- Dataset not loaded
- Network connectivity issues
- Server not running

**Solutions:**
1. Refresh the page
2. Check browser console for errors
3. Verify server is running
4. Try a different search term

#### Slow Response Times
**Possible Causes:**
- Large dataset loading
- High server load
- Network latency

**Solutions:**
1. Wait for initial data loading to complete
2. Try shorter, more specific queries
3. Check network connection
4. Clear browser cache

#### Visualization Not Loading
**Possible Causes:**
- Browser compatibility issues
- JavaScript disabled
- Memory limitations

**Solutions:**
1. Use a modern browser (Chrome, Firefox, Safari)
2. Enable JavaScript
3. Close other browser tabs
4. Refresh the page

#### Incorrect Search Results
**Possible Causes:**
- Typo tolerance too aggressive
- Dataset issues
- Cache serving stale data

**Solutions:**
1. Disable typo tolerance temporarily
2. Try exact spelling
3. Clear application cache
4. Report the issue with specific examples

### Getting Help

If you encounter issues not covered here:

1. **Check Browser Console**: Press F12 and look for error messages
2. **Try Different Browser**: Test in Chrome, Firefox, or Safari
3. **Clear Cache**: Clear browser cache and cookies
4. **Restart Application**: Refresh the page or restart the server
5. **Report Issues**: Contact support with specific error details

### Browser Compatibility

**Fully Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Limited Support:**
- Internet Explorer (not recommended)
- Older mobile browsers

**Required Features:**
- JavaScript enabled
- Local storage available
- Modern CSS support
- WebGL for advanced visualizations

## Keyboard Shortcuts

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus search box |
| `Escape` | Clear search and hide suggestions |
| `Tab` | Navigate between interface elements |
| `F1` | Show help/user guide |
| `F5` | Refresh application |

### Search Box Shortcuts
| Shortcut | Action |
|----------|--------|
| `↑` | Move to previous suggestion |
| `↓` | Move to next suggestion |
| `Enter` | Select highlighted suggestion |
| `Escape` | Clear search box |
| `Ctrl/Cmd + A` | Select all text |

### Visualization Shortcuts
| Shortcut | Action |
|----------|--------|
| `+` or `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom to 100% |
| `Arrow Keys` | Pan visualization |
| `Space` | Center visualization |
| `R` | Refresh visualization data |
| `F` | Fit visualization to screen |

### Advanced Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Shift + D` | Toggle debug mode |
| `Ctrl/Cmd + Shift + P` | Show performance metrics |
| `Ctrl/Cmd + Shift + C` | Clear all caches |
| `Ctrl/Cmd + Shift + R` | Hard refresh (bypass cache) |

## Tips for Educators

### Using the Tool for Teaching

#### Computer Science Concepts:
- **Data Structures**: Demonstrate tree structures and their properties
- **Algorithm Complexity**: Show O(L) search time in practice
- **Memory Management**: Explain how Tries optimize memory usage
- **Caching**: Demonstrate the impact of caching on performance

#### Interactive Learning:
- Have students predict search results before typing
- Compare Trie performance with other search methods
- Explore how different datasets affect the Trie structure
- Analyze the relationship between word frequency and ranking

#### Assignments and Projects:
- Implement a simple Trie in their preferred programming language
- Analyze the memory usage of different data structures
- Create their own autocomplete system
- Optimize search algorithms for specific use cases

### Demonstration Scenarios

#### Basic Demonstration (5 minutes):
1. Show basic search functionality
2. Demonstrate real-time suggestions
3. Explain frequency-based ranking
4. Show typo tolerance feature

#### Advanced Demonstration (15 minutes):
1. All basic features
2. Trie visualization walkthrough
3. Performance metrics explanation
4. Algorithm complexity discussion
5. Interactive exploration of the data structure

#### Full Workshop (45 minutes):
1. Complete feature overview
2. Hands-on exploration by students
3. Algorithm implementation discussion
4. Performance analysis and optimization
5. Q&A and troubleshooting

---

This user guide should help you get the most out of the Auto-Complete Search Tool. Whether you're using it for practical search functionality or educational purposes, these features and tips will help you understand and effectively use the application.

For technical support or feature requests, please refer to the project documentation or contact the development team.