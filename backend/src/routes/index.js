/**
 * Main routes index file
 * Exports all API route modules
 */

const searchRoutes = require('./search');
const trieRoutes = require('./trie');
const performanceRoutes = require('./performance');

module.exports = {
  searchRoutes,
  trieRoutes,
  performanceRoutes
};