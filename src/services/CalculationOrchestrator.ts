import type {
  ExecutionContext,
  ExecutionFilters
} from '@/schema/calculation-schema.js';
import { registry } from '@/schema/registry.js';
import { calculationEngine } from './CalculationEngine.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('CalculationOrchestrator');

/**
 * Calculation Orchestrator
 * Handles batch calculation of multiple measures with dependency optimization
 * 
 * Features:
 * - Dependency graph analysis (including transitive dependencies)
 * - Topological sorting for optimal execution order
 * - Parallel execution of independent measures
 * - Shared dependency reuse
 */
export class CalculationOrchestrator {
  private engine = calculationEngine;

  /**
   * Execute multiple measures with dependency optimization
   * 
   * @param measureKeys - Array of measure keys to calculate
   * @param filters - Execution filters
   * @param context - Execution context
   * @returns Map of measure keys to calculated values
   */
  async executeBatch(
    measureKeys: string[],
    filters: ExecutionFilters = {},
    context: ExecutionContext = {}
  ): Promise<Record<string, number>> {
    if (measureKeys.length === 0) {
      return {};
    }

    // Validate all measure keys exist
    const missingMeasures: string[] = [];
    for (const key of measureKeys) {
      const measure = registry.get(key);
      if (!measure) {
        missingMeasures.push(key);
      }
    }
    
    if (missingMeasures.length > 0) {
      const error = new Error(`Measures not found in registry: ${missingMeasures.join(', ')}`);
      logger.error('Invalid measure keys in batch', {
        measureKeys,
        missingMeasures,
        context: { countryId: context.countryId, skuId: context.skuId, year: context.year, month: context.month }
      });
      throw error;
    }

    if (measureKeys.length === 1) {
      // Single measure - use engine directly
      const value = await this.engine.executeMeasure(measureKeys[0], filters, context);
      return { [measureKeys[0]]: value };
    }

    logger.debug('Executing batch calculation', {
      measureCount: measureKeys.length,
      measureKeys,
      hasFilters: Object.keys(filters).length > 0,
      context: { countryId: context.countryId, skuId: context.skuId, year: context.year, month: context.month }
    });

    try {
      // 1. Build complete dependency graph (including transitive)
      let dependencyGraph: Map<string, Set<string>>;
      try {
        dependencyGraph = registry.buildDependencyGraph(measureKeys);
      } catch (error) {
        logger.error('Failed to build dependency graph', {
          measureKeys,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
      
      logger.debug('Dependency graph built', {
        graphSize: dependencyGraph.size,
        dependencies: Array.from(dependencyGraph.entries()).map(([key, deps]) => ({
          measure: key,
          deps: Array.from(deps)
        }))
      });

      // 2. Topological sort for execution order
      let executionOrder: string[];
      try {
        executionOrder = registry.topologicalSort(dependencyGraph);
      } catch (error) {
        logger.error('Failed to perform topological sort', {
          measureKeys,
          graphSize: dependencyGraph.size,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
      
      logger.debug('Execution order determined', {
        executionOrder,
        totalMeasures: executionOrder.length
      });

      // 3. Group by dependency level for parallel execution
      let levels: string[][];
      try {
        levels = registry.groupByLevel(dependencyGraph, executionOrder);
      } catch (error) {
        logger.error('Failed to group measures by level', {
          measureKeys,
          executionOrder,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
      
      logger.debug('Measures grouped by level', {
        levelCount: levels.length,
        levels: levels.map((level, idx) => ({
          level: idx + 1,
          measures: level,
          canRunInParallel: level.length > 1
        }))
      });

      // 4. Execute levels sequentially, measures within level in parallel
      const results: Record<string, number> = {};
      const executionStartTime = Date.now();

      for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        const level = levels[levelIndex];
        const levelStartTime = Date.now();

        logger.debug(`Executing level ${levelIndex + 1}/${levels.length}`, {
          level: levelIndex + 1,
          measureCount: level.length,
          measures: level
        });

        // Execute all measures in this level in parallel
        await Promise.all(
          level.map(async (measureKey) => {
            // Skip if already calculated (shouldn't happen, but safety check)
            if (results[measureKey] !== undefined) {
              logger.debug(`Measure ${measureKey} already calculated, skipping`);
              return;
            }

            try {
              const value = await this.engine.executeMeasure(measureKey, filters, context);
              results[measureKey] = value;
              logger.debug(`Measure ${measureKey} calculated`, { value });
            } catch (error) {
              logger.error(`Failed to calculate measure ${measureKey}`, {
                measureKey,
                error: error.message,
                stack: error.stack
              });
              // Store error result (0 or NaN) to prevent blocking other measures
              results[measureKey] = NaN;
            }
          })
        );

        const levelDuration = Date.now() - levelStartTime;
        logger.debug(`Level ${levelIndex + 1} completed`, {
          level: levelIndex + 1,
          duration: `${levelDuration}ms`,
          measures: level,
          results: level.reduce((acc, key) => {
            acc[key] = results[key];
            return acc;
          }, {} as Record<string, number>)
        });
      }

      const totalDuration = Date.now() - executionStartTime;
      logger.debug('Batch calculation completed', {
        measureCount: measureKeys.length,
        totalMeasures: executionOrder.length,
        duration: `${totalDuration}ms`,
        requestedMeasures: measureKeys,
        calculatedMeasures: Object.keys(results),
        results: results
      });

      // Return only requested measures (filter out transitive dependencies that weren't requested)
      const requestedResults: Record<string, number> = {};
      for (const key of measureKeys) {
        if (results[key] !== undefined) {
          requestedResults[key] = results[key];
        }
      }

      return requestedResults;
    } catch (error) {
      // Extract all possible error information
      let errorMessage = 'Unknown error';
      let errorName = 'Error';
      let errorStack: string | undefined;
      
      if (error instanceof Error) {
        errorMessage = error.message || 'Error without message';
        errorName = error.name || 'Error';
        errorStack = error.stack;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try to extract message from error object
        errorMessage = (error as any).message || (error as any).error || String(error);
        errorName = (error as any).name || error?.constructor?.name || 'Error';
      } else {
        errorMessage = String(error);
      }
      
      // Log full error details
      logger.error('Batch calculation failed', {
        measureKeys,
        error: errorMessage,
        errorName,
        errorType: error?.constructor?.name,
        errorString: String(error),
        errorObject: error,
        stack: errorStack,
        context: { countryId: context.countryId, skuId: context.skuId, year: context.year, month: context.month }
      });
      
      // Also log to console for debugging with full error details - this will definitely show up
      console.group('❌ [CalculationOrchestrator] Batch calculation error');
      console.error('Measure Keys:', measureKeys);
      console.error('Error Message:', errorMessage);
      console.error('Error Name:', errorName);
      console.error('Error Type:', error?.constructor?.name);
      console.error('Error String:', String(error));
      console.error('Error Stack:', errorStack);
      console.error('Full Error Object:', error);
      try {
        console.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error('Could not stringify error:', e);
      }
      console.error('Context:', context);
      console.groupEnd();
      
      throw error;
    }
  }

  /**
   * Execute a single measure (convenience method that uses orchestrator)
   * This ensures consistent behavior and allows for future optimizations
   */
  async executeMeasure(
    measureKey: string,
    filters: ExecutionFilters = {},
    context: ExecutionContext = {}
  ): Promise<number> {
    const results = await this.executeBatch([measureKey], filters, context);
    return results[measureKey] ?? 0;
  }

  /**
   * Get dependency graph for a set of measures
   * Useful for debugging and visualization
   */
  getDependencyGraph(measureKeys: string[]): Map<string, Set<string>> {
    return registry.buildDependencyGraph(measureKeys);
  }

  /**
   * Get execution plan for a set of measures
   * Returns the execution order and level grouping
   */
  getExecutionPlan(measureKeys: string[]): {
    executionOrder: string[];
    levels: string[][];
    graph: Map<string, Set<string>>;
  } {
    const graph = registry.buildDependencyGraph(measureKeys);
    const executionOrder = registry.topologicalSort(graph);
    const levels = registry.groupByLevel(graph, executionOrder);

    return {
      executionOrder,
      levels,
      graph
    };
  }
}

// Export singleton instance
export const calculationOrchestrator = new CalculationOrchestrator();
