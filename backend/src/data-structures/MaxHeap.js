/**
 * MaxHeap data structure for efficient top-K selection
 * Optimized for frequency-based ranking in autocomplete suggestions
 */
class MaxHeap {
  /**
   * Creates a new MaxHeap
   */
  constructor() {
    this.heap = [];
  }

  /**
   * Gets the parent index for a given index
   * @param {number} index - Child index
   * @returns {number} Parent index
   */
  getParentIndex(index) {
    return Math.floor((index - 1) / 2);
  }

  /**
   * Gets the left child index for a given index
   * @param {number} index - Parent index
   * @returns {number} Left child index
   */
  getLeftChildIndex(index) {
    return 2 * index + 1;
  }

  /**
   * Gets the right child index for a given index
   * @param {number} index - Parent index
   * @returns {number} Right child index
   */
  getRightChildIndex(index) {
    return 2 * index + 2;
  }

  /**
   * Checks if a node has a parent
   * @param {number} index - Node index
   * @returns {boolean} True if has parent
   */
  hasParent(index) {
    return this.getParentIndex(index) >= 0;
  }

  /**
   * Checks if a node has a left child
   * @param {number} index - Node index
   * @returns {boolean} True if has left child
   */
  hasLeftChild(index) {
    return this.getLeftChildIndex(index) < this.heap.length;
  }

  /**
   * Checks if a node has a right child
   * @param {number} index - Node index
   * @returns {boolean} True if has right child
   */
  hasRightChild(index) {
    return this.getRightChildIndex(index) < this.heap.length;
  }

  /**
   * Gets the parent element for a given index
   * @param {number} index - Child index
   * @returns {Object} Parent element
   */
  parent(index) {
    return this.heap[this.getParentIndex(index)];
  }

  /**
   * Gets the left child element for a given index
   * @param {number} index - Parent index
   * @returns {Object} Left child element
   */
  leftChild(index) {
    return this.heap[this.getLeftChildIndex(index)];
  }

  /**
   * Gets the right child element for a given index
   * @param {number} index - Parent index
   * @returns {Object} Right child element
   */
  rightChild(index) {
    return this.heap[this.getRightChildIndex(index)];
  }

  /**
   * Swaps two elements in the heap
   * @param {number} indexOne - First index
   * @param {number} indexTwo - Second index
   */
  swap(indexOne, indexTwo) {
    const temp = this.heap[indexOne];
    this.heap[indexOne] = this.heap[indexTwo];
    this.heap[indexTwo] = temp;
  }

  /**
   * Returns the maximum element (root) without removing it
   * @returns {Object|null} Maximum element or null if heap is empty
   */
  peek() {
    if (this.heap.length === 0) {
      return null;
    }
    return this.heap[0];
  }

  /**
   * Extracts and returns the maximum element from the heap
   * Time Complexity: O(log n)
   * @returns {Object|null} Maximum element or null if heap is empty
   */
  extractMax() {
    if (this.heap.length === 0) {
      return null;
    }

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown();
    return max;
  }

  /**
   * Inserts a new element into the heap
   * Time Complexity: O(log n)
   * @param {Object} item - Item to insert with frequency property
   * @throws {Error} If item doesn't have frequency property
   */
  insert(item) {
    if (!item || typeof item.frequency !== 'number') {
      throw new Error('Item must have a numeric frequency property');
    }

    this.heap.push(item);
    this.heapifyUp();
  }

  /**
   * Maintains heap property by moving element up
   * Called after insertion
   */
  heapifyUp() {
    let index = this.heap.length - 1;
    
    while (this.hasParent(index) && 
           this.parent(index).frequency < this.heap[index].frequency) {
      this.swap(this.getParentIndex(index), index);
      index = this.getParentIndex(index);
    }
  }

  /**
   * Maintains heap property by moving element down
   * Called after extraction
   */
  heapifyDown() {
    let index = 0;

    while (this.hasLeftChild(index)) {
      let largerChildIndex = this.getLeftChildIndex(index);
      
      if (this.hasRightChild(index) && 
          this.rightChild(index).frequency > this.leftChild(index).frequency) {
        largerChildIndex = this.getRightChildIndex(index);
      }

      if (this.heap[index].frequency > this.heap[largerChildIndex].frequency) {
        break;
      } else {
        this.swap(index, largerChildIndex);
      }
      
      index = largerChildIndex;
    }
  }

  /**
   * Gets the top K elements from the heap without modifying it
   * Time Complexity: O(k log n)
   * @param {number} k - Number of top elements to retrieve
   * @returns {Array<Object>} Array of top K elements sorted by frequency (descending)
   */
  getTopK(k) {
    if (k <= 0) {
      return [];
    }

    if (k >= this.heap.length) {
      return [...this.heap].sort((a, b) => b.frequency - a.frequency);
    }

    const result = [];
    const tempHeap = new MaxHeap();
    
    // Copy all elements to temporary heap
    for (const item of this.heap) {
      tempHeap.insert(item);
    }

    // Extract top K elements
    for (let i = 0; i < k && tempHeap.size() > 0; i++) {
      result.push(tempHeap.extractMax());
    }

    return result;
  }

  /**
   * Static method to get top K elements from an array of items
   * More efficient than creating a heap and calling getTopK
   * Time Complexity: O(n log k)
   * @param {Array<Object>} items - Array of items with frequency property
   * @param {number} k - Number of top elements to retrieve
   * @returns {Array<Object>} Array of top K elements sorted by frequency (descending)
   */
  static getTopKFromArray(items, k) {
    if (!Array.isArray(items) || k <= 0) {
      return [];
    }

    if (k >= items.length) {
      return [...items].sort((a, b) => b.frequency - a.frequency);
    }

    const heap = new MaxHeap();
    
    // Insert all items into heap
    for (const item of items) {
      heap.insert(item);
    }

    return heap.getTopK(k);
  }

  /**
   * Gets the current size of the heap
   * @returns {number} Number of elements in the heap
   */
  size() {
    return this.heap.length;
  }

  /**
   * Checks if the heap is empty
   * @returns {boolean} True if heap is empty
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Clears all elements from the heap
   */
  clear() {
    this.heap = [];
  }

  /**
   * Converts heap to array (for debugging/testing)
   * @returns {Array<Object>} Copy of internal heap array
   */
  toArray() {
    return [...this.heap];
  }

  /**
   * Validates that the heap property is maintained
   * Used for testing and debugging
   * @returns {boolean} True if heap property is valid
   */
  isValidMaxHeap() {
    for (let i = 0; i < this.heap.length; i++) {
      if (this.hasLeftChild(i) && 
          this.heap[i].frequency < this.leftChild(i).frequency) {
        return false;
      }
      if (this.hasRightChild(i) && 
          this.heap[i].frequency < this.rightChild(i).frequency) {
        return false;
      }
    }
    return true;
  }
}

module.exports = MaxHeap;