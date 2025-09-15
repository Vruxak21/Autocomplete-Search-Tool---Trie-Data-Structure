/**
 * TrieNode represents a single node in the Trie data structure
 * Each node contains a character, references to child nodes, and metadata
 */
class TrieNode {
  /**
   * Creates a new TrieNode
   * @param {string} character - The character stored in this node
   */
  constructor(character = null) {
    this.character = character;
    this.children = new Map(); // Map<string, TrieNode> for efficient lookups
    this.isEndOfWord = false; // Marks if this node represents the end of a complete word
    this.frequency = 0; // Usage frequency for ranking suggestions
    this.word = null; // Complete word (only set for end-of-word nodes)
  }

  /**
   * Checks if this node has a child with the given character
   * @param {string} char - Character to check for
   * @returns {boolean} True if child exists
   */
  hasChild(char) {
    return this.children.has(char);
  }

  /**
   * Gets the child node for the given character
   * @param {string} char - Character to get child for
   * @returns {TrieNode|undefined} Child node or undefined if not found
   */
  getChild(char) {
    return this.children.get(char);
  }

  /**
   * Adds a child node for the given character
   * @param {string} char - Character for the new child
   * @returns {TrieNode} The newly created child node
   */
  addChild(char) {
    const childNode = new TrieNode(char);
    this.children.set(char, childNode);
    return childNode;
  }

  /**
   * Marks this node as the end of a word and sets metadata
   * @param {string} word - The complete word
   * @param {number} frequency - Initial frequency count
   */
  markAsEndOfWord(word, frequency = 1) {
    this.isEndOfWord = true;
    this.word = word;
    this.frequency = frequency;
  }

  /**
   * Increments the frequency counter for this word
   * @param {number} increment - Amount to increment by (default: 1)
   */
  incrementFrequency(increment = 1) {
    if (this.isEndOfWord) {
      this.frequency += increment;
    }
  }

  /**
   * Gets all child characters
   * @returns {string[]} Array of child characters
   */
  getChildCharacters() {
    return Array.from(this.children.keys());
  }

  /**
   * Gets the number of children
   * @returns {number} Number of child nodes
   */
  getChildCount() {
    return this.children.size;
  }
}

module.exports = TrieNode;