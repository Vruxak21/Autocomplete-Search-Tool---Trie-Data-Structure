// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts for the first time

// Switch to the autocomplete-search database
db = db.getSiblingDB('autocomplete-search');

// Create application user with read/write permissions
db.createUser({
  user: 'app_user',
  pwd: 'app_password_change_in_production',
  roles: [
    {
      role: 'readWrite',
      db: 'autocomplete-search'
    }
  ]
});

// Create collections with indexes for better performance
db.createCollection('trie_backup');
db.createCollection('search_analytics');

// Create indexes for better query performance
db.trie_backup.createIndex({ "nodeId": 1 }, { unique: true });
db.trie_backup.createIndex({ "parentId": 1 });
db.trie_backup.createIndex({ "character": 1 });
db.trie_backup.createIndex({ "isEndOfWord": 1 });
db.trie_backup.createIndex({ "updatedAt": 1 });

db.search_analytics.createIndex({ "timestamp": 1 });
db.search_analytics.createIndex({ "query": 1 });
db.search_analytics.createIndex({ "responseTime": 1 });
db.search_analytics.createIndex({ "userSession": 1 });

print('Database initialization completed successfully');