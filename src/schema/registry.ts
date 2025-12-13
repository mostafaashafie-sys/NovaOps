import type { CalculationMeasure } from './calculation-schema.js';
import { validateMeasure, validateAllMeasures, detectCircularDependencies } from './validator.js';
import { measures as defaultMeasures } from './measures/index.js';

/**
 * Measure Registry
 * Central registry for all calculation measures
 */
class MeasureRegistry {
  private measures: Map<string, CalculationMeasure> = new Map();
  private initialized = false;
  private isInitializing = false;

  /**
   * Initialize registry with default measures
   */
  initialize() {
    if (this.initialized) {
      return;
    }
    
    // Prevent re-entrant initialization
    if (this.isInitializing) {
      console.warn('[Registry] Initialization already in progress, skipping...');
      return;
    }
    
    this.isInitializing = true;

    try {
      console.log('[Registry] Starting initialization...');
      console.log('[Registry] Total measures to register:', Object.keys(defaultMeasures).length);
      
      // Register default measures
      let registeredCount = 0;
      for (const [key, measure] of Object.entries(defaultMeasures)) {
        try {
          console.log(`[Registry] Registering measure: ${key}`);
          this.register(measure);
          registeredCount++;
        } catch (registerError) {
          console.error(`[Registry] Failed to register measure "${key}":`, registerError);
          throw new Error(`Failed to register measure "${key}": ${registerError?.message || String(registerError)}`);
        }
      }
      console.log(`[Registry] Successfully registered ${registeredCount} measures`);

      // Validate all measures (check for circular dependencies across all measures)
      // Use skipInitialization=true to prevent recursion since we're already initializing
      console.log('[Registry] Checking for circular dependencies...');
      const allMeasuresMap = this.getAllMeasuresMap(true);
      for (const [key, measure] of Object.entries(allMeasuresMap)) {
        const cycle = detectCircularDependencies(allMeasuresMap, key);
        if (cycle) {
          console.error(`[Registry] Circular dependency detected for "${key}":`, cycle);
          throw new Error(`Circular dependency detected for measure "${key}": ${cycle.join(' -> ')}`);
        }
      }
      console.log('[Registry] No circular dependencies found');

      // Run full validation (skip initialization check to prevent recursion)
      console.log('[Registry] Running full validation...');
      const validation = this.validateAll(true);
      if (!validation.valid) {
        console.error('[Registry] Validation errors:', validation.errors);
        throw new Error(`Invalid measures detected: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      console.log('[Registry] Validation passed');

      this.initialized = true;
      this.isInitializing = false;
      console.log('[Registry] Initialization complete');
    } catch (error) {
      // Reset state on error
      console.error('[Registry] Initialization failed:', error);
      console.error('[Registry] Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      this.measures.clear();
      this.initialized = false;
      this.isInitializing = false;
      throw error;
    }
  }

  /**
   * Register a measure
   */
  register(measure: CalculationMeasure): void {
    const validation = validateMeasure(measure);
    if (!validation.valid) {
      throw new Error(
        `Invalid measure "${measure.key}": ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Check for circular dependencies
    // Build measures map without triggering initialization to avoid infinite recursion
    const allMeasures: Record<string, CalculationMeasure> = {};
    // Add already registered measures
    this.measures.forEach((m, key) => {
      allMeasures[key] = m;
    });
    // Add the measure being registered
    allMeasures[measure.key] = measure;
    
    // Check for circular dependencies
    const cycle = detectCircularDependencies(allMeasures, measure.key);
    if (cycle) {
      throw new Error(`Circular dependency detected for measure "${measure.key}": ${cycle.join(' -> ')}`);
    }

    this.measures.set(measure.key, measure);
  }

  /**
   * Get a measure by key
   */
  get(key: string): CalculationMeasure | undefined {
    if (!this.initialized) {
      this.initialize();
    }
    return this.measures.get(key);
  }

  /**
   * Check if a measure exists
   */
  has(key: string): boolean {
    if (!this.initialized) {
      this.initialize();
    }
    return this.measures.has(key);
  }

  /**
   * Get all measures as an array
   */
  getAll(): CalculationMeasure[] {
    if (!this.initialized) {
      this.initialize();
    }
    return Array.from(this.measures.values());
  }

  /**
   * Get all measures as a map
   * @param skipInitialization - If true, skip auto-initialization (used during initialization to prevent recursion)
   */
  getAllMeasuresMap(skipInitialization = false): Record<string, CalculationMeasure> {
    if (!skipInitialization && !this.initialized) {
      this.initialize();
    }
    const result: Record<string, CalculationMeasure> = {};
    this.measures.forEach((measure, key) => {
      result[key] = measure;
    });
    return result;
  }

  /**
   * Get all measure keys
   */
  getKeys(): string[] {
    if (!this.initialized) {
      this.initialize();
    }
    return Array.from(this.measures.keys());
  }

  /**
   * Validate a specific measure
   */
  validate(key: string) {
    const measure = this.get(key);
    if (!measure) {
      return {
        valid: false,
        errors: [{ path: key, message: 'Measure not found' }]
      };
    }
    return validateMeasure(measure);
  }

  /**
   * Validate all registered measures
   */
  validateAll(skipInitialization = false) {
    if (!skipInitialization && !this.initialized) {
      this.initialize();
    }
    // Use skipInitialization=true to prevent recursion
    return validateAllMeasures(this.getAllMeasuresMap(true));
  }

  /**
   * Get measure catalog (summary of all measures)
   */
  getCatalog() {
    if (!this.initialized) {
      this.initialize();
    }

    return this.getAll().map(measure => ({
      key: measure.key,
      name: measure.name,
      description: measure.description,
      componentCount: measure.components.length,
      category: measure.metadata?.category,
      unit: measure.metadata?.unit,
      dependencies: this.getMeasureDependencies(measure.key)
    }));
  }

  /**
   * Get dependencies for a measure (direct only)
   */
  getDirectDependencies(measureKey: string): string[] {
    const measure = this.get(measureKey);
    if (!measure) {
      return [];
    }

    const dependencies = new Set<string>();
    for (const component of measure.components) {
      if (component.source.type === 'measure' && component.source.measureKey) {
        dependencies.add(component.source.measureKey);
      }
    }
    return Array.from(dependencies);
  }

  /**
   * Get dependencies for a measure (including transitive)
   */
  getMeasureDependencies(measureKey: string): string[] {
    const measure = this.get(measureKey);
    if (!measure) {
      return [];
    }

    const dependencies = new Set<string>();
    
    const collectDependencies = (m: CalculationMeasure) => {
      for (const component of m.components) {
        if (component.source.type === 'measure' && component.source.measureKey) {
          dependencies.add(component.source.measureKey);
          const depMeasure = registry.get(component.source.measureKey);
          if (depMeasure) {
            collectDependencies(depMeasure);
          }
        }
      }
    };

    collectDependencies(measure);
    return Array.from(dependencies);
  }

  /**
   * Build dependency graph for multiple measures (including transitive)
   * Returns a Map where keys are measure keys and values are sets of their dependencies
   */
  buildDependencyGraph(measureKeys: string[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    const visited = new Set<string>();
    const missingMeasures: string[] = [];

    const collectDeps = (key: string) => {
      if (visited.has(key)) return;
      visited.add(key);

      const measure = this.get(key);
      if (!measure) {
        if (!missingMeasures.includes(key)) {
          missingMeasures.push(key);
        }
        return;
      }

      const deps = new Set<string>();
      for (const component of measure.components) {
        if (component.source.type === 'measure' && component.source.measureKey) {
          const depKey = component.source.measureKey;
          deps.add(depKey);
          collectDeps(depKey); // Recursive for transitive
        }
      }

      graph.set(key, deps);
    };

    measureKeys.forEach(collectDeps);
    
    if (missingMeasures.length > 0) {
      throw new Error(`Measures not found in registry: ${missingMeasures.join(', ')}`);
    }
    
    return graph;
  }

  /**
   * Topological sort of measures based on dependency graph
   * Returns measures in execution order (dependencies first)
   */
  topologicalSort(graph: Map<string, Set<string>>): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (key: string) => {
      if (visiting.has(key)) {
        const cycle = Array.from(visiting).concat(key);
        throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
      }
      if (visited.has(key)) return;

      visiting.add(key);
      const deps = graph.get(key) || new Set();
      for (const dep of Array.from(deps)) {
        visit(dep);
      }
      visiting.delete(key);
      visited.add(key);
      sorted.push(key);
    };

    for (const key of Array.from(graph.keys())) {
      if (!visited.has(key)) {
        visit(key);
      }
    }

    return sorted;
  }

  /**
   * Group measures by dependency level for parallel execution
   * Returns array of arrays, where each inner array contains measures that can run in parallel
   */
  groupByLevel(graph: Map<string, Set<string>>, executionOrder: string[]): string[][] {
    const levels: string[][] = [];
    const processed = new Set<string>();

    for (const measureKey of executionOrder) {
      const deps = graph.get(measureKey) || new Set();
      
      // Check if all dependencies have been processed
      const allDepsProcessed = deps.size === 0 || Array.from(deps).every(dep => processed.has(dep));

      if (allDepsProcessed) {
        // Find the earliest level where all dependencies are satisfied
        // Dependencies must be in earlier levels (not in the same level)
        let targetLevelIndex = -1;
        
        if (deps.size === 0) {
          // No dependencies - can go in first level
          if (levels.length === 0) {
            levels.push([measureKey]);
          } else {
            levels[0].push(measureKey);
          }
        } else {
          // Has dependencies - find the earliest level where all deps are in earlier levels
          for (let i = 0; i < levels.length; i++) {
            // Check if any dependency is in this level or later (if so, we need a later level)
            let hasDepInThisOrLaterLevel = false;
            for (let j = i; j < levels.length; j++) {
              if (levels[j].some(key => deps.has(key))) {
                hasDepInThisOrLaterLevel = true;
                break;
              }
            }
            
            if (!hasDepInThisOrLaterLevel) {
              // Check if all deps are in levels before this one
              const allDepsInEarlierLevels = Array.from(deps).every(dep => {
                for (let j = 0; j < i; j++) {
                  if (levels[j].includes(dep)) return true;
                }
                return false;
              });
              
              if (allDepsInEarlierLevels) {
                targetLevelIndex = i;
                break;
              }
            }
          }

          // If no suitable level found, create a new one
          if (targetLevelIndex === -1) {
            levels.push([measureKey]);
          } else {
            levels[targetLevelIndex].push(measureKey);
          }
        }
        
        processed.add(measureKey);
      } else {
        // This shouldn't happen if topologicalSort worked correctly
        // But handle it gracefully by creating a new level
        const unprocessedDeps = Array.from(deps).filter(dep => !processed.has(dep));
        console.warn(`Measure ${measureKey} has unprocessed dependencies: ${unprocessedDeps.join(', ')}, creating new level`);
        levels.push([measureKey]);
        processed.add(measureKey);
      }
    }

    // Safety check: ensure all measures in executionOrder are processed
    const unprocessed = executionOrder.filter(key => !processed.has(key));
    if (unprocessed.length > 0) {
      console.warn(`Some measures were not processed: ${unprocessed.join(', ')}`);
      // Add unprocessed measures to a new level
      levels.push(unprocessed);
    }

    return levels;
  }

  /**
   * Clear all measures (for testing)
   */
  clear() {
    this.measures.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const registry = new MeasureRegistry();

// Export convenience functions
export function getMeasure(key: string): CalculationMeasure | undefined {
  return registry.get(key);
}

export function getAllMeasures(): CalculationMeasure[] {
  return registry.getAll();
}

export function getMeasureKeys(): string[] {
  return registry.getKeys();
}

export function registerMeasure(measure: CalculationMeasure): void {
  registry.register(measure);
}

export function getMeasureCatalog() {
  return registry.getCatalog();
}
