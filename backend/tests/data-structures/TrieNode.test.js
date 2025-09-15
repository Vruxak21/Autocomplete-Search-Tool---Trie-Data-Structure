const TrieNode = require('../../src/data-structures/TrieNode');

describe('TrieNode', () => {
  let node;

  beforeEach(() => {
    node = new TrieNode('a');
  });

  describe('constructor', () => {
    test('should create a node with default values', () => {
      const defaultNode = new TrieNode();
      expect(defaultNode.character).toBeNull();
      expect(defaultNode.children).toBeInstanceOf(Map);
      expect(defaultNode.children.size).toBe(0);
      expect(defaultNode.isEndOfWord).toBe(false);
      expect(defaultNode.frequency).toBe(0);
      expect(defaultNode.word).toBeNull();
    });

    test('should create a node with specified character', () => {
      expect(node.character).toBe('a');
      expect(node.children).toBeInstanceOf(Map);
      expect(node.isEndOfWord).toBe(false);
      expect(node.frequency).toBe(0);
      expect(node.word).toBeNull();
    });
  });

  describe('hasChild', () => {
    test('should return false for non-existent child', () => {
      expect(node.hasChild('b')).toBe(false);
    });

    test('should return true for existing child', () => {
      node.addChild('b');
      expect(node.hasChild('b')).toBe(true);
    });
  });

  describe('getChild', () => {
    test('should return undefined for non-existent child', () => {
      expect(node.getChild('b')).toBeUndefined();
    });

    test('should return child node for existing child', () => {
      const childNode = node.addChild('b');
      expect(node.getChild('b')).toBe(childNode);
    });
  });

  describe('addChild', () => {
    test('should add a new child node', () => {
      const childNode = node.addChild('b');
      expect(childNode).toBeInstanceOf(TrieNode);
      expect(childNode.character).toBe('b');
      expect(node.hasChild('b')).toBe(true);
      expect(node.getChild('b')).toBe(childNode);
    });

    test('should add multiple children', () => {
      const childB = node.addChild('b');
      const childC = node.addChild('c');
      
      expect(node.children.size).toBe(2);
      expect(node.hasChild('b')).toBe(true);
      expect(node.hasChild('c')).toBe(true);
      expect(node.getChild('b')).toBe(childB);
      expect(node.getChild('c')).toBe(childC);
    });
  });

  describe('markAsEndOfWord', () => {
    test('should mark node as end of word with default frequency', () => {
      node.markAsEndOfWord('apple');
      
      expect(node.isEndOfWord).toBe(true);
      expect(node.word).toBe('apple');
      expect(node.frequency).toBe(1);
    });

    test('should mark node as end of word with custom frequency', () => {
      node.markAsEndOfWord('apple', 5);
      
      expect(node.isEndOfWord).toBe(true);
      expect(node.word).toBe('apple');
      expect(node.frequency).toBe(5);
    });
  });

  describe('incrementFrequency', () => {
    test('should increment frequency for end-of-word node', () => {
      node.markAsEndOfWord('apple', 3);
      node.incrementFrequency();
      
      expect(node.frequency).toBe(4);
    });

    test('should increment frequency by custom amount', () => {
      node.markAsEndOfWord('apple', 3);
      node.incrementFrequency(5);
      
      expect(node.frequency).toBe(8);
    });

    test('should not increment frequency for non-end-of-word node', () => {
      node.incrementFrequency();
      expect(node.frequency).toBe(0);
    });
  });

  describe('getChildCharacters', () => {
    test('should return empty array for node with no children', () => {
      expect(node.getChildCharacters()).toEqual([]);
    });

    test('should return array of child characters', () => {
      node.addChild('b');
      node.addChild('c');
      node.addChild('d');
      
      const characters = node.getChildCharacters();
      expect(characters).toHaveLength(3);
      expect(characters).toContain('b');
      expect(characters).toContain('c');
      expect(characters).toContain('d');
    });
  });

  describe('getChildCount', () => {
    test('should return 0 for node with no children', () => {
      expect(node.getChildCount()).toBe(0);
    });

    test('should return correct count for node with children', () => {
      node.addChild('b');
      node.addChild('c');
      expect(node.getChildCount()).toBe(2);
    });
  });
});