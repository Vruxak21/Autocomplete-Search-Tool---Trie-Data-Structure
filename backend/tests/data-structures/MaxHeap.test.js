const { MaxHeap } = require('../../src/data-structures');

describe('MaxHeap', () => {
  let heap;

  beforeEach(() => {
    heap = new MaxHeap();
  });

  describe('constructor', () => {
    test('should create an empty heap', () => {
      expect(heap.size()).toBe(0);
      expect(heap.isEmpty()).toBe(true);
      expect(heap.peek()).toBeNull();
    });
  });

  describe('insert', () => {
    test('should insert a single item', () => {
      const item = { word: 'hello', frequency: 5 };
      heap.insert(item);
      
      expect(heap.size()).toBe(1);
      expect(heap.isEmpty()).toBe(false);
      expect(heap.peek()).toEqual(item);
    });

    test('should insert multiple items and maintain max heap property', () => {
      const items = [
        { word: 'hello', frequency: 5 },
        { word: 'world', frequency: 10 },
        { word: 'test', frequency: 3 },
        { word: 'heap', frequency: 8 }
      ];

      items.forEach(item => heap.insert(item));

      expect(heap.size()).toBe(4);
      expect(heap.peek().frequency).toBe(10); // Maximum should be at root
      expect(heap.isValidMaxHeap()).toBe(true);
    });

    test('should handle items with same frequency', () => {
      const items = [
        { word: 'hello', frequency: 5 },
        { word: 'world', frequency: 5 },
        { word: 'test', frequency: 5 }
      ];

      items.forEach(item => heap.insert(item));

      expect(heap.size()).toBe(3);
      expect(heap.peek().frequency).toBe(5);
      expect(heap.isValidMaxHeap()).toBe(true);
    });

    test('should throw error for invalid items', () => {
      expect(() => heap.insert(null)).toThrow('Item must have a numeric frequency property');
      expect(() => heap.insert({})).toThrow('Item must have a numeric frequency property');
      expect(() => heap.insert({ word: 'test' })).toThrow('Item must have a numeric frequency property');
      expect(() => heap.insert({ frequency: 'invalid' })).toThrow('Item must have a numeric frequency property');
    });

    test('should handle zero and negative frequencies', () => {
      const items = [
        { word: 'zero', frequency: 0 },
        { word: 'negative', frequency: -1 },
        { word: 'positive', frequency: 5 }
      ];

      items.forEach(item => heap.insert(item));

      expect(heap.size()).toBe(3);
      expect(heap.peek().frequency).toBe(5);
      expect(heap.isValidMaxHeap()).toBe(true);
    });
  });

  describe('extractMax', () => {
    test('should return null for empty heap', () => {
      expect(heap.extractMax()).toBeNull();
    });

    test('should extract single item', () => {
      const item = { word: 'hello', frequency: 5 };
      heap.insert(item);
      
      const extracted = heap.extractMax();
      expect(extracted).toEqual(item);
      expect(heap.size()).toBe(0);
      expect(heap.isEmpty()).toBe(true);
    });

    test('should extract items in descending frequency order', () => {
      const items = [
        { word: 'low', frequency: 3 },
        { word: 'high', frequency: 10 },
        { word: 'medium', frequency: 7 },
        { word: 'highest', frequency: 15 },
        { word: 'lowest', frequency: 1 }
      ];

      items.forEach(item => heap.insert(item));

      const extracted = [];
      while (!heap.isEmpty()) {
        extracted.push(heap.extractMax());
      }

      const frequencies = extracted.map(item => item.frequency);
      expect(frequencies).toEqual([15, 10, 7, 3, 1]);
    });

    test('should maintain heap property after extractions', () => {
      const items = [
        { word: 'a', frequency: 5 },
        { word: 'b', frequency: 10 },
        { word: 'c', frequency: 3 },
        { word: 'd', frequency: 8 },
        { word: 'e', frequency: 12 },
        { word: 'f', frequency: 6 }
      ];

      items.forEach(item => heap.insert(item));

      // Extract a few items and check heap property is maintained
      heap.extractMax(); // Remove 12
      expect(heap.isValidMaxHeap()).toBe(true);
      expect(heap.peek().frequency).toBe(10);

      heap.extractMax(); // Remove 10
      expect(heap.isValidMaxHeap()).toBe(true);
      expect(heap.peek().frequency).toBe(8);
    });
  });

  describe('getTopK', () => {
    beforeEach(() => {
      const items = [
        { word: 'first', frequency: 10 },
        { word: 'second', frequency: 8 },
        { word: 'third', frequency: 6 },
        { word: 'fourth', frequency: 4 },
        { word: 'fifth', frequency: 2 }
      ];
      items.forEach(item => heap.insert(item));
    });

    test('should return top K items without modifying heap', () => {
      const originalSize = heap.size();
      const top3 = heap.getTopK(3);

      expect(top3).toHaveLength(3);
      expect(top3[0].frequency).toBe(10);
      expect(top3[1].frequency).toBe(8);
      expect(top3[2].frequency).toBe(6);
      expect(heap.size()).toBe(originalSize); // Heap should be unchanged
    });

    test('should return all items when K is larger than heap size', () => {
      const top10 = heap.getTopK(10);
      expect(top10).toHaveLength(5);
      
      const frequencies = top10.map(item => item.frequency);
      expect(frequencies).toEqual([10, 8, 6, 4, 2]);
    });

    test('should return empty array for K <= 0', () => {
      expect(heap.getTopK(0)).toEqual([]);
      expect(heap.getTopK(-1)).toEqual([]);
    });

    test('should handle K = 1', () => {
      const top1 = heap.getTopK(1);
      expect(top1).toHaveLength(1);
      expect(top1[0].frequency).toBe(10);
    });
  });

  describe('getTopKFromArray static method', () => {
    const testItems = [
      { word: 'apple', frequency: 15 },
      { word: 'banana', frequency: 8 },
      { word: 'cherry', frequency: 12 },
      { word: 'date', frequency: 5 },
      { word: 'elderberry', frequency: 20 },
      { word: 'fig', frequency: 3 }
    ];

    test('should return top K items from array', () => {
      const top3 = MaxHeap.getTopKFromArray(testItems, 3);
      
      expect(top3).toHaveLength(3);
      expect(top3[0].frequency).toBe(20);
      expect(top3[1].frequency).toBe(15);
      expect(top3[2].frequency).toBe(12);
    });

    test('should handle empty array', () => {
      const result = MaxHeap.getTopKFromArray([], 5);
      expect(result).toEqual([]);
    });

    test('should handle null/undefined array', () => {
      const result1 = MaxHeap.getTopKFromArray(null, 5);
      const result2 = MaxHeap.getTopKFromArray(undefined, 5);
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    test('should return all items when K >= array length', () => {
      const result = MaxHeap.getTopKFromArray(testItems, 10);
      expect(result).toHaveLength(6);
      
      const frequencies = result.map(item => item.frequency);
      expect(frequencies).toEqual([20, 15, 12, 8, 5, 3]);
    });

    test('should return empty array for K <= 0', () => {
      expect(MaxHeap.getTopKFromArray(testItems, 0)).toEqual([]);
      expect(MaxHeap.getTopKFromArray(testItems, -1)).toEqual([]);
    });
  });

  describe('heap property validation', () => {
    test('should maintain heap property with random insertions', () => {
      const frequencies = [15, 3, 8, 12, 1, 20, 7, 9, 4, 11];
      
      frequencies.forEach((freq, index) => {
        heap.insert({ word: `word${index}`, frequency: freq });
      });

      expect(heap.isValidMaxHeap()).toBe(true);
      expect(heap.size()).toBe(10);
    });

    test('should maintain heap property after mixed operations', () => {
      // Insert items
      [5, 10, 3, 8, 15, 1].forEach((freq, index) => {
        heap.insert({ word: `word${index}`, frequency: freq });
      });

      expect(heap.isValidMaxHeap()).toBe(true);

      // Extract some items
      heap.extractMax();
      heap.extractMax();
      expect(heap.isValidMaxHeap()).toBe(true);

      // Insert more items
      heap.insert({ word: 'new1', frequency: 12 });
      heap.insert({ word: 'new2', frequency: 2 });
      expect(heap.isValidMaxHeap()).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle large numbers', () => {
      const largeItem = { word: 'large', frequency: Number.MAX_SAFE_INTEGER };
      const smallItem = { word: 'small', frequency: 1 };
      
      heap.insert(smallItem);
      heap.insert(largeItem);
      
      expect(heap.peek()).toEqual(largeItem);
      expect(heap.isValidMaxHeap()).toBe(true);
    });

    test('should handle floating point frequencies', () => {
      const items = [
        { word: 'a', frequency: 3.14 },
        { word: 'b', frequency: 2.71 },
        { word: 'c', frequency: 1.41 }
      ];

      items.forEach(item => heap.insert(item));
      
      expect(heap.peek().frequency).toBe(3.14);
      expect(heap.isValidMaxHeap()).toBe(true);
    });
  });

  describe('utility methods', () => {
    test('should clear heap', () => {
      heap.insert({ word: 'test', frequency: 5 });
      heap.insert({ word: 'test2', frequency: 10 });
      
      expect(heap.size()).toBe(2);
      
      heap.clear();
      
      expect(heap.size()).toBe(0);
      expect(heap.isEmpty()).toBe(true);
      expect(heap.peek()).toBeNull();
    });

    test('should convert to array', () => {
      const items = [
        { word: 'a', frequency: 5 },
        { word: 'b', frequency: 10 },
        { word: 'c', frequency: 3 }
      ];

      items.forEach(item => heap.insert(item));
      
      const array = heap.toArray();
      expect(array).toHaveLength(3);
      expect(array[0].frequency).toBe(10); // Root should be maximum
    });
  });
});