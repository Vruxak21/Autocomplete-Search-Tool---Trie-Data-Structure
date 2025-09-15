const mongoDBService = require('./MongoDBService');
const crypto = require('crypto');

/**
 * Service for tracking and analyzing search usage patterns
 * Stores search queries, response times, and user interactions
 */
class SearchAnalyticsService {
  constructor() {
    this.COLLECTION_NAME = 'search_analytics';
  }

  /**
   * Records a search query and its results
   * @param {Object} searchData - Search data to record
   * @param {string} searchData.query - Search query
   * @param {number} searchData.responseTime - Response time in milliseconds
   * @param {number} searchData.resultCount - Number of results returned
   * @param {string} searchData.userSession - User session identifier
   * @param {string} searchData.selectedSuggestion - Selected suggestion (if any)
   * @param {Object} searchData.metadata - Additional metadata
   * @returns {Promise<Object>} Recorded analytics entry
   */
  async recordSearch(searchData) {
    try {
      const {
        query,
        responseTime,
        resultCount,
        userSession,
        selectedSuggestion = null,
        metadata = {}
      } = searchData;

      // Validate required fields
      if (!query || typeof query !== 'string') {
        throw new Error('Query is required and must be a string');
      }

      if (typeof responseTime !== 'number' || responseTime < 0) {
        throw new Error('Response time must be a non-negative number');
      }

      if (typeof resultCount !== 'number' || resultCount < 0) {
        throw new Error('Result count must be a non-negative number');
      }

      const analyticsEntry = {
        _id: crypto.randomUUID(),
        query: query.toLowerCase().trim(),
        originalQuery: query,
        responseTime,
        resultCount,
        userSession: userSession || 'anonymous',
        selectedSuggestion,
        timestamp: new Date(),
        queryLength: query.length,
        hasResults: resultCount > 0,
        metadata: {
          userAgent: metadata.userAgent || null,
          ipAddress: metadata.ipAddress || null,
          referer: metadata.referer || null,
          ...metadata
        }
      };

      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);
      const result = await collection.insertOne(analyticsEntry);

      return {
        success: true,
        id: result.insertedId,
        entry: analyticsEntry
      };

    } catch (error) {
      console.error('Error recording search analytics:', error);
      throw new Error(`Failed to record search: ${error.message}`);
    }
  }

  /**
   * Records when a user selects a suggestion
   * @param {Object} selectionData - Selection data
   * @param {string} selectionData.query - Original search query
   * @param {string} selectionData.selectedSuggestion - Selected suggestion
   * @param {string} selectionData.userSession - User session identifier
   * @param {number} selectionData.selectionIndex - Index of selected suggestion
   * @returns {Promise<Object>} Recorded selection entry
   */
  async recordSuggestionSelection(selectionData) {
    try {
      const {
        query,
        selectedSuggestion,
        userSession,
        selectionIndex = -1
      } = selectionData;

      const selectionEntry = {
        _id: crypto.randomUUID(),
        type: 'suggestion_selection',
        query: query.toLowerCase().trim(),
        originalQuery: query,
        selectedSuggestion,
        selectionIndex,
        userSession: userSession || 'anonymous',
        timestamp: new Date()
      };

      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);
      const result = await collection.insertOne(selectionEntry);

      return {
        success: true,
        id: result.insertedId,
        entry: selectionEntry
      };

    } catch (error) {
      console.error('Error recording suggestion selection:', error);
      throw new Error(`Failed to record selection: ${error.message}`);
    }
  }

  /**
   * Gets popular search queries within a time range
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for analysis
   * @param {Date} options.endDate - End date for analysis
   * @param {number} options.limit - Maximum number of results
   * @returns {Promise<Array<Object>>} Popular queries with counts
   */
  async getPopularQueries(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        endDate = new Date(),
        limit = 50
      } = options;

      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);
      
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            query: { $ne: '' }
          }
        },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            avgResultCount: { $avg: '$resultCount' },
            lastSearched: { $max: '$timestamp' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            query: '$_id',
            count: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            avgResultCount: { $round: ['$avgResultCount', 0] },
            lastSearched: 1,
            _id: 0
          }
        }
      ];

      return await collection.aggregate(pipeline).toArray();

    } catch (error) {
      console.error('Error getting popular queries:', error);
      throw new Error(`Failed to get popular queries: ${error.message}`);
    }
  }

  /**
   * Gets search performance metrics
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for analysis
   * @param {Date} options.endDate - End date for analysis
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate = new Date()
      } = options;

      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);
      
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSearches: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            minResponseTime: { $min: '$responseTime' },
            avgResultCount: { $avg: '$resultCount' },
            searchesWithResults: {
              $sum: { $cond: [{ $gt: ['$resultCount', 0] }, 1, 0] }
            },
            searchesWithoutResults: {
              $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            totalSearches: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            maxResponseTime: 1,
            minResponseTime: 1,
            avgResultCount: { $round: ['$avgResultCount', 2] },
            searchesWithResults: 1,
            searchesWithoutResults: 1,
            successRate: {
              $round: [
                { $multiply: [
                  { $divide: ['$searchesWithResults', '$totalSearches'] },
                  100
                ]},
                2
              ]
            },
            _id: 0
          }
        }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      
      return result[0] || {
        totalSearches: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        avgResultCount: 0,
        searchesWithResults: 0,
        searchesWithoutResults: 0,
        successRate: 0
      };

    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  /**
   * Gets search trends over time
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for analysis
   * @param {Date} options.endDate - End date for analysis
   * @param {string} options.interval - Time interval ('hour', 'day', 'week')
   * @returns {Promise<Array<Object>>} Search trends data
   */
  async getSearchTrends(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        endDate = new Date(),
        interval = 'day'
      } = options;

      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);
      
      // Define date grouping based on interval
      let dateGroup;
      switch (interval) {
        case 'hour':
          dateGroup = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          };
          break;
        case 'week':
          dateGroup = {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          };
          break;
        default: // day
          dateGroup = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          };
      }

      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: dateGroup,
            searchCount: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            uniqueQueries: { $addToSet: '$query' }
          }
        },
        {
          $project: {
            date: '$_id',
            searchCount: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            uniqueQueryCount: { $size: '$uniqueQueries' },
            _id: 0
          }
        },
        {
          $sort: { 'date.year': 1, 'date.month': 1, 'date.day': 1, 'date.hour': 1 }
        }
      ];

      return await collection.aggregate(pipeline).toArray();

    } catch (error) {
      console.error('Error getting search trends:', error);
      throw new Error(`Failed to get search trends: ${error.message}`);
    }
  }

  /**
   * Gets analytics for a specific query
   * @param {string} query - Query to analyze
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query analytics
   */
  async getQueryAnalytics(query, options = {}) {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Query is required and must be a string');
      }

      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate = new Date()
      } = options;

      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);
      const normalizedQuery = query.toLowerCase().trim();

      const pipeline = [
        {
          $match: {
            query: normalizedQuery,
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSearches: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            avgResultCount: { $avg: '$resultCount' },
            firstSearched: { $min: '$timestamp' },
            lastSearched: { $max: '$timestamp' },
            selections: {
              $push: {
                $cond: [
                  { $ne: ['$selectedSuggestion', null] },
                  '$selectedSuggestion',
                  '$$REMOVE'
                ]
              }
            }
          }
        },
        {
          $project: {
            totalSearches: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            avgResultCount: { $round: ['$avgResultCount', 2] },
            firstSearched: 1,
            lastSearched: 1,
            selectionCount: { $size: '$selections' },
            _id: 0
          }
        }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      
      return result[0] || {
        totalSearches: 0,
        avgResponseTime: 0,
        avgResultCount: 0,
        firstSearched: null,
        lastSearched: null,
        selectionCount: 0
      };

    } catch (error) {
      console.error('Error getting query analytics:', error);
      throw new Error(`Failed to get query analytics: ${error.message}`);
    }
  }

  /**
   * Cleans up old analytics data
   * @param {number} daysToKeep - Number of days of data to keep
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);

      const result = await collection.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        cutoffDate
      };

    } catch (error) {
      console.error('Error cleaning up old analytics data:', error);
      throw new Error(`Failed to cleanup old data: ${error.message}`);
    }
  }

  /**
   * Gets overall analytics statistics
   * @returns {Promise<Object>} Overall statistics
   */
  async getOverallStats() {
    try {
      const collection = mongoDBService.getCollection(this.COLLECTION_NAME);

      const [totalCount, recentCount] = await Promise.all([
        collection.countDocuments(),
        collection.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ]);

      return {
        totalSearches: totalCount,
        searchesLast24Hours: recentCount,
        collectionName: this.COLLECTION_NAME
      };

    } catch (error) {
      console.error('Error getting overall stats:', error);
      return {
        totalSearches: 0,
        searchesLast24Hours: 0,
        error: error.message
      };
    }
  }
}

module.exports = SearchAnalyticsService;