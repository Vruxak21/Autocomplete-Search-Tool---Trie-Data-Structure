# Database Seed Script Guide

## Overview

The seed script (`scripts/seed.js`) is a comprehensive command-line tool for initializing the autocomplete search database with sample data. It supports multiple datasets, data validation, duplicate detection, progress reporting, and cleanup operations.

## Quick Start

```bash
# Basic seeding with default options
npm run seed

# Force seed with specific datasets
npm run seed:force

# Seed with sample data only
npm run seed:sample

# Or run directly
node scripts/seed.js --datasets cities,products
```

## Command Line Options

### Basic Options

| Option | Description | Default |
|--------|-------------|---------|
| `--force` | Force seed even if data already exists | `false` |
| `--no-backup` | Skip backing up existing data | `false` |
| `--no-validate` | Skip data validation after seeding | `false` |
| `--help` | Show help message and exit | - |

### Advanced Options

| Option | Description | Default |
|--------|-------------|---------|
| `--no-progress` | Disable progress reporting during loading | `false` |
| `--no-duplicate-detection` | Skip duplicate detection during seeding | `false` |
| `--cleanup` | Clean up temporary files and old backups | `false` |
| `--reset` | Reset database (delete all data) before seeding | `false` |
| `--datasets <list>` | Comma-separated list of datasets to load | `cities,products,movies,sample` |

## Dataset Options

### Available Datasets

| Dataset | Description | Approximate Size | File |
|---------|-------------|------------------|------|
| `cities` | World cities dataset | ~47,000 entries | `worldcities.csv` |
| `products` | Flipkart e-commerce products | ~20,000 entries | `flipkart_com-ecommerce_sample.csv` |
| `movies` | Movie titles dataset | ~85,000 entries | `Movie.tsv` |
| `sample` | Small sample dataset for testing | ~75 entries | Built-in |
| `mixed` | Combination of all available datasets | Variable | Multiple files |

### Dataset Selection

```bash
# Single dataset
node scripts/seed.js --datasets cities

# Multiple datasets
node scripts/seed.js --datasets cities,products,sample

# All available datasets
node scripts/seed.js --datasets mixed

# Sample data only (for testing)
node scripts/seed.js --datasets sample
```

## Usage Examples

### Development Workflow

```bash
# Initial setup with all datasets
node scripts/seed.js --datasets mixed

# Quick test with sample data
node scripts/seed.js --datasets sample --no-backup

# Reset and reload with cities only
node scripts/seed.js --reset --datasets cities

# Force reload with progress reporting
node scripts/seed.js --force --datasets products,movies
```

### Production Setup

```bash
# Production seeding with validation and backup
node scripts/seed.js --datasets cities,products --cleanup

# Performance-focused seeding
node scripts/seed.js --datasets cities --no-progress --no-duplicate-detection
```

### Maintenance Operations

```bash
# Clean up old backups and temporary files
node scripts/seed.js --cleanup --datasets sample

# Reset database completely
node scripts/seed.js --reset --datasets mixed

# Validate existing data without reseeding
node scripts/seed.js --datasets sample --force --no-backup
```

## Features

### 1. Data Validation

The script performs comprehensive validation after seeding:

- **Basic Validation**: Ensures data was loaded correctly
- **Search Tests**: Tests search functionality with various queries
- **Performance Tests**: Measures search response times
- **Data Integrity**: Validates duplicate detection and record counts

### 2. Duplicate Detection

When enabled (default), the script:
- Tracks previously inserted words (case-insensitive)
- Skips duplicate entries during loading
- Reports duplicate statistics in the summary

### 3. Progress Reporting

Real-time progress reporting includes:
- Current progress (items processed / total items)
- Percentage completion
- Processing rate (items per second)
- Estimated time to completion (ETA)

### 4. Backup and Recovery

Automatic backup features:
- Creates timestamped backups of existing collections
- Preserves data before overwriting
- Supports backup cleanup (removes backups older than 7 days)

### 5. Cleanup Operations

Cleanup functionality includes:
- Removal of old backup collections (>7 days)
- Cleanup of temporary files
- Database optimization after seeding

## Configuration

### Environment Variables

The script respects the following environment variables:

```bash
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=autocomplete-search

# Application settings
NODE_ENV=development
MAX_SUGGESTIONS=5
SEARCH_TIMEOUT_MS=100
```

### Dataset File Locations

The script searches for dataset files in the following order:

1. `../data/` directory (relative to backend)
2. `../../` directory (project root)
3. Current working directory

## Output and Logging

### Progress Output

```
[PROGRESS] Loading cities data: 25000/47000 (53.2%) - 1250.5 items/sec - ETA: 18s
```

### Summary Report

```
[SEED] Seeding Summary:
  Duration: 45230ms (45.23s)
  Datasets processed: 3
  Records loaded: 152847
  Duplicates skipped: 1205
  Trie words: 151642
  Trie nodes: 892456
  Errors: 0
  Cleanup actions: 2

[SEED] Validation Results:
  Search tests passed: 7
  Average search time: 12.45ms
  Performance requirement met: ✓

[SEED] Configuration:
  Datasets: cities,products,movies
  Force mode: false
  Backup enabled: true
  Validation enabled: true
  Progress reporting: true
  Duplicate detection: true
  Cleanup enabled: true
  Reset mode: false
```

## Error Handling

The script handles various error scenarios:

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Dataset file not found` | Missing CSV/TSV files | Ensure dataset files are in the correct location |
| `MongoDB connection failed` | Database not running | Start MongoDB service |
| `No data was loaded into Trie` | All datasets failed to load | Check dataset file formats and permissions |
| `Bootstrap timeout` | Loading took too long | Use smaller datasets or increase timeout |

### Error Recovery

- Failed dataset loading continues with remaining datasets
- Database connection failures are logged but don't stop the process
- Validation failures are reported but don't prevent completion

## Performance Considerations

### Large Datasets

For datasets with >100k entries:
- Use `--no-progress` to reduce console output overhead
- Consider `--no-duplicate-detection` for faster loading
- Ensure sufficient memory (recommend 4GB+ for large datasets)

### Memory Usage

Typical memory usage by dataset:
- Sample: <10MB
- Cities: ~50MB
- Products: ~30MB
- Movies: ~100MB
- Mixed: ~200MB

### Optimization Tips

1. **Use specific datasets**: Only load datasets you need
2. **Disable unnecessary features**: Use `--no-progress` and `--no-duplicate-detection` for speed
3. **Skip validation**: Use `--no-validate` for faster seeding in development
4. **Regular cleanup**: Use `--cleanup` periodically to maintain database performance

## Troubleshooting

### Common Issues

1. **Script hangs during loading**
   - Check MongoDB connection
   - Verify dataset file accessibility
   - Monitor memory usage

2. **Validation fails**
   - Check if data was actually loaded
   - Verify Trie structure integrity
   - Review error messages in summary

3. **Performance issues**
   - Use smaller datasets for testing
   - Disable progress reporting
   - Check system resources

### Debug Mode

For detailed debugging, set environment variables:

```bash
DEBUG=* node scripts/seed.js --datasets sample
NODE_ENV=development node scripts/seed.js --datasets cities
```

## Integration

### NPM Scripts

The seed script integrates with the following NPM scripts:

```json
{
  "seed": "node scripts/seed.js",
  "seed:force": "node scripts/seed.js --force",
  "seed:sample": "node scripts/seed.js --datasets sample",
  "seed:reset": "node scripts/seed.js --reset --datasets mixed",
  "seed:cleanup": "node scripts/seed.js --cleanup --datasets sample"
}
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Seed Database
  run: |
    npm run seed:sample
    npm run test:integration
```

### Docker Integration

Example Dockerfile commands:

```dockerfile
# Copy datasets
COPY data/ ./data/

# Seed database
RUN npm run seed:sample
```

## API Reference

### DatabaseSeeder Class

The main seeder class with the following methods:

- `seed()`: Main seeding process
- `loadDatasets()`: Load specified datasets
- `validateData()`: Validate loaded data
- `performCleanup()`: Clean up resources
- `resetDatabase()`: Reset database collections

### ProgressReporter Class

Progress reporting utility:

- `report(current, total, operation)`: Report progress
- `finish(operation)`: Complete progress reporting

### ArgumentParser Class

Command-line argument parsing:

- `parse(args)`: Parse command line arguments
- `printHelp()`: Display help information

## Contributing

When modifying the seed script:

1. Maintain backward compatibility with existing options
2. Add comprehensive error handling for new features
3. Update this documentation
4. Add tests for new functionality
5. Follow the existing code style and patterns

## License

This seed script is part of the autocomplete search tool project and follows the same license terms.