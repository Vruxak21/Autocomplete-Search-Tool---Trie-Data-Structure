/**
 * Tests for the database seed script
 */

const { DatabaseSeeder, ArgumentParser, SAMPLE_DATA } = require('../../scripts/seed');

describe('Database Seed Script', () => {
  describe('ArgumentParser', () => {
    test('should parse basic arguments correctly', () => {
      const args = ['node', 'seed.js', '--force', '--datasets', 'cities,sample'];
      const options = ArgumentParser.parse(args);
      
      expect(options.force).toBe(true);
      expect(options.datasets).toEqual(['cities', 'sample']);
    });

    test('should parse advanced arguments correctly', () => {
      const args = ['node', 'seed.js', '--reset', '--cleanup', '--no-progress', '--no-duplicate-detection'];
      const options = ArgumentParser.parse(args);
      
      expect(options.reset).toBe(true);
      expect(options.cleanup).toBe(true);
      expect(options.progress).toBe(false);
      expect(options.duplicateDetection).toBe(false);
      expect(options.force).toBe(true); // Reset implies force
    });

    test('should handle unknown arguments gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const args = ['node', 'seed.js', '--unknown-option'];
      
      ArgumentParser.parse(args);
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown option: --unknown-option');
      consoleSpy.mockRestore();
    });
  });

  describe('DatabaseSeeder', () => {
    let seeder;
    const mockOptions = {
      datasets: ['sample'],
      force: false,
      backup: true,
      validate: true,
      cleanup: false,
      reset: false,
      progress: true,
      duplicateDetection: true
    };

    beforeEach(() => {
      seeder = new DatabaseSeeder(mockOptions);
    });

    test('should initialize with correct options', () => {
      expect(seeder.options).toEqual(mockOptions);
      expect(seeder.duplicateTracker).toBeInstanceOf(Set);
      expect(seeder.stats.startTime).toBeDefined();
      expect(seeder.stats.recordsLoaded).toBe(0);
      expect(seeder.stats.duplicatesSkipped).toBe(0);
    });

    test('should find dataset files in correct order', async () => {
      const filePath = await seeder.findDatasetFile('nonexistent.csv');
      expect(filePath).toBeNull();
    });

    test('should handle duplicate detection correctly', () => {
      seeder.duplicateTracker.add('test');
      expect(seeder.duplicateTracker.has('test')).toBe(true);
      expect(seeder.duplicateTracker.has('TEST')).toBe(false);
    });
  });

  describe('Sample Data', () => {
    test('should have valid sample data structure', () => {
      expect(Array.isArray(SAMPLE_DATA)).toBe(true);
      expect(SAMPLE_DATA.length).toBeGreaterThan(0);
      
      SAMPLE_DATA.forEach(item => {
        expect(item).toHaveProperty('word');
        expect(item).toHaveProperty('frequency');
        expect(typeof item.word).toBe('string');
        expect(typeof item.frequency).toBe('number');
        expect(item.word.length).toBeGreaterThan(0);
        expect(item.frequency).toBeGreaterThan(0);
      });
    });

    test('should have unique words in sample data', () => {
      const words = SAMPLE_DATA.map(item => item.word.toLowerCase());
      const uniqueWords = new Set(words);
      expect(uniqueWords.size).toBe(words.length);
    });

    test('should have reasonable frequency values', () => {
      const frequencies = SAMPLE_DATA.map(item => item.frequency);
      const minFreq = Math.min(...frequencies);
      const maxFreq = Math.max(...frequencies);
      
      expect(minFreq).toBeGreaterThan(0);
      expect(maxFreq).toBeLessThan(200); // Reasonable upper bound
    });
  });

  describe('Progress Reporting', () => {
    test('should create progress reporter with correct settings', () => {
      const testOptions = {
        datasets: ['sample'],
        force: false,
        backup: true,
        validate: true,
        cleanup: false,
        reset: false,
        progress: true,
        duplicateDetection: true
      };
      
      const seederWithProgress = new DatabaseSeeder({ ...testOptions, progress: true });
      expect(seederWithProgress.progressReporter).toBeDefined();
      
      const seederWithoutProgress = new DatabaseSeeder({ ...testOptions, progress: false });
      expect(seederWithoutProgress.progressReporter).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should validate dataset options', () => {
      const validDatasets = ['cities', 'products', 'movies', 'sample', 'mixed'];
      const testOptions = {
        datasets: ['sample'],
        force: false,
        backup: true,
        validate: true,
        cleanup: false,
        reset: false,
        progress: true,
        duplicateDetection: true
      };
      
      validDatasets.forEach(dataset => {
        const options = { ...testOptions, datasets: [dataset] };
        const testSeeder = new DatabaseSeeder(options);
        expect(testSeeder.options.datasets).toContain(dataset);
      });
    });

    test('should handle boolean options correctly', () => {
      const booleanOptions = ['force', 'backup', 'validate', 'cleanup', 'reset', 'progress', 'duplicateDetection'];
      const baseOptions = {
        datasets: ['sample'],
        force: false,
        backup: true,
        validate: true,
        cleanup: false,
        reset: false,
        progress: true,
        duplicateDetection: true
      };
      
      booleanOptions.forEach(option => {
        const trueOptions = { ...baseOptions, [option]: true };
        const falseOptions = { ...baseOptions, [option]: false };
        
        const seederTrue = new DatabaseSeeder(trueOptions);
        const seederFalse = new DatabaseSeeder(falseOptions);
        
        expect(seederTrue.options[option]).toBe(true);
        expect(seederFalse.options[option]).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    test('should initialize error tracking correctly', () => {
      const testOptions = {
        datasets: ['sample'],
        force: false,
        backup: true,
        validate: true,
        cleanup: false,
        reset: false,
        progress: true,
        duplicateDetection: true
      };
      const testSeeder = new DatabaseSeeder(testOptions);
      expect(testSeeder.stats.errors).toEqual([]);
      expect(Array.isArray(testSeeder.stats.errors)).toBe(true);
    });

    test('should track cleanup actions', () => {
      const testOptions = {
        datasets: ['sample'],
        force: false,
        backup: true,
        validate: true,
        cleanup: false,
        reset: false,
        progress: true,
        duplicateDetection: true
      };
      const testSeeder = new DatabaseSeeder(testOptions);
      expect(testSeeder.stats.cleanupActions).toEqual([]);
      expect(Array.isArray(testSeeder.stats.cleanupActions)).toBe(true);
    });
  });
});