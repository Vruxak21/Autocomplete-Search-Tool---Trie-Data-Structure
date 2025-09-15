# Backend Scripts

This directory contains utility scripts for the autocomplete search backend.

## Available Scripts

### seed.js - Database Seed Script

A comprehensive command-line tool for initializing the database with sample data.

**Quick Start:**
```bash
# Basic seeding
npm run seed

# Seed with sample data only
npm run seed:sample

# Force seed with specific datasets
npm run seed:force

# Reset database and load mixed datasets
npm run seed:reset
```

**Features:**
- ✅ Multiple dataset support (cities, products, movies, sample, mixed)
- ✅ Data validation and duplicate detection
- ✅ Progress reporting for large datasets
- ✅ Backup and cleanup functionality
- ✅ Reset and force options for development
- ✅ Comprehensive error handling and logging

**Documentation:** See [SEED_SCRIPT_GUIDE.md](../docs/SEED_SCRIPT_GUIDE.md) for detailed usage instructions.

### bootstrap.js - Application Bootstrap Script

Handles application initialization and startup configuration.

**Usage:**
```bash
npm run bootstrap
```

**Features:**
- ✅ Environment configuration validation
- ✅ Database connection setup
- ✅ Trie initialization and dataset loading
- ✅ Performance monitoring and startup logging
- ✅ Graceful error handling and recovery

## Prerequisites

Before running the scripts, ensure you have:

1. **Node.js** (v18+)
2. **MongoDB** (optional, for persistence)
3. **Dataset files** in the `data/` directory

## Environment Setup

Create a `.env` file in the backend directory:

```bash
# Required
NODE_ENV=development
PORT=3001

# Optional (for persistence)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=autocomplete-search

# Optional (performance tuning)
MAX_SUGGESTIONS=5
SEARCH_TIMEOUT_MS=100
TRIE_BACKUP_INTERVAL_MS=300000
```

## Dataset Files

Place dataset files in the `data/` directory:

- `worldcities.csv` - World cities dataset
- `flipkart_com-ecommerce_sample.csv` - E-commerce products
- `Movie.tsv` - Movie titles dataset

## Common Use Cases

### Development Setup
```bash
# Initial setup with sample data
npm run seed:sample

# Full setup with all datasets
npm run seed:mixed

# Reset and reload during development
npm run seed:reset
```

### Testing
```bash
# Quick test setup
npm run seed:sample --no-backup --no-validate

# Performance testing setup
npm run seed:cities --no-progress --no-duplicate-detection
```

### Production
```bash
# Production seeding with validation
npm run seed:mixed --cleanup

# Maintenance cleanup
npm run seed:cleanup
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file
   - Scripts can run without MongoDB (in-memory only)

2. **Dataset Files Not Found**
   - Verify files are in the correct location
   - Check file permissions
   - Use `--datasets sample` for testing without files

3. **Memory Issues with Large Datasets**
   - Use `--no-progress` to reduce overhead
   - Process datasets individually
   - Increase Node.js memory limit: `node --max-old-space-size=4096`

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npm run seed:sample
NODE_ENV=development npm run seed:cities
```

## Script Integration

### NPM Scripts

All scripts are integrated with package.json:

```json
{
  "scripts": {
    "seed": "node scripts/seed.js",
    "seed:sample": "node scripts/seed.js --datasets sample",
    "seed:force": "node scripts/seed.js --force",
    "seed:reset": "node scripts/seed.js --reset --datasets mixed",
    "seed:cleanup": "node scripts/seed.js --cleanup --datasets sample",
    "bootstrap": "node scripts/bootstrap.js"
  }
}
```

### CI/CD Integration

Example workflow:
```yaml
- name: Setup Database
  run: |
    npm run seed:sample
    npm run test:integration
```

## Contributing

When adding new scripts:

1. Follow the existing patterns and error handling
2. Add comprehensive help documentation
3. Include unit tests in `tests/scripts/`
4. Update this README with usage examples
5. Ensure backward compatibility