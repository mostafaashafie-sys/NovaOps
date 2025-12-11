/**
 * ============================================================================
 * REACT HOOKS FOR LOGGING SYSTEM
 * ============================================================================
 * 
 * Provides React-specific hooks for:
 * - Component render tracking
 * - Effect logging
 * - Performance monitoring
 * - User action tracking
 * - Form logging
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import logger from '@/services/LoggerService';

// ============================================================================
// useLogger - Get a namespaced logger for a component
// ============================================================================

export function useLogger(namespace) {
  return useMemo(() => logger.createLogger(namespace), [namespace]);
}

// ============================================================================
// useLogRender - Log component renders
// ============================================================================

export function useLogRender(componentName, props = {}) {
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    renderCount.current += 1;

    // Determine what changed
    const changedProps = Object.keys(props).filter(
      key => prevProps.current[key] !== props[key]
    );

    logger.render.component(componentName, changedProps.length > 0 ? 'Props changed' : 'Re-render', {
      renderCount: renderCount.current,
      changedProps: changedProps.length > 0 ? changedProps : undefined,
    });

    prevProps.current = props;
  });

  return renderCount.current;
}

// ============================================================================
// useLogMount - Log component mount/unmount
// ============================================================================

export function useLogMount(componentName, data = {}) {
  useEffect(() => {
    logger.render.mount(componentName, data);

    return () => {
      logger.render.unmount(componentName, data);
    };
  }, [componentName]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ============================================================================
// useLogEffect - Log effect execution
// ============================================================================

export function useLogEffect(effectName, effect, deps = []) {
  useEffect(() => {
    logger.render.effect(effectName, deps);
    return effect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// ============================================================================
// useLogState - Log state changes
// ============================================================================

export function useLogState(stateName, state, setState) {
  const prevState = useRef(state);

  useEffect(() => {
    if (prevState.current !== state) {
      logger.state.change(stateName, prevState.current, state);
      prevState.current = state;
    }
  }, [stateName, state]);

  const setStateWithLogging = useCallback((newValue) => {
    const actualNewValue = typeof newValue === 'function' ? newValue(prevState.current) : newValue;
    logger.state.change(stateName, prevState.current, actualNewValue);
    setState(newValue);
  }, [stateName, setState]);

  return [state, setStateWithLogging];
}

// ============================================================================
// useLogCallback - Log callback invocations
// ============================================================================

export function useLogCallback(name, callback, deps = []) {
  return useCallback((...args) => {
    logger.debug(`Callback invoked: ${name}`, { args: args.length });
    return callback(...args);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// ============================================================================
// useLogPerformance - Measure component performance
// ============================================================================

export function useLogPerformance(componentName) {
  const mountTime = useRef(performance.now());
  const renderTimes = useRef([]);

  useEffect(() => {
    const renderTime = performance.now() - mountTime.current;
    renderTimes.current.push(renderTime);

    logger.perf.end(`${componentName}:render`, {
      renderTime,
      avgRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length,
    });

    mountTime.current = performance.now();
  });

  useEffect(() => {
    logger.perf.start(`${componentName}:mount`);

    return () => {
      logger.perf.end(`${componentName}:mount`);
      logger.perf.info(`${componentName} performance summary`, {
        totalRenders: renderTimes.current.length,
        avgRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length,
      });
    };
  }, [componentName]);

  return {
    getRenderCount: () => renderTimes.current.length,
    getAvgRenderTime: () => renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length,
  };
}

// ============================================================================
// useLogAsync - Log async operations
// ============================================================================

export function useLogAsync(operationName) {
  const run = useCallback(async (asyncFn, data = {}) => {
    logger.perf.start(operationName, data);
    
    try {
      const result = await asyncFn();
      logger.perf.end(operationName, { success: true });
      return result;
    } catch (error) {
      logger.perf.end(operationName, { success: false, error: error.message });
      logger.error(`${operationName} failed`, error, data);
      throw error;
    }
  }, [operationName]);

  return run;
}

// ============================================================================
// useLogUserAction - Track user actions
// ============================================================================

export function useLogUserAction() {
  const logClick = useCallback((target, data = {}) => {
    logger.user.click(target, data);
  }, []);

  const logInput = useCallback((field, value, data = {}) => {
    logger.user.input(field, { value: typeof value === 'string' ? `${value.slice(0, 50)}...` : value, ...data });
  }, []);

  const logAction = useCallback((type, target, data = {}) => {
    logger.user.action(type, target, data);
  }, []);

  const logSearch = useCallback((query, resultCount, data = {}) => {
    logger.user.search(query, resultCount, data);
  }, []);

  const logFilter = useCallback((filters, data = {}) => {
    logger.user.filter(filters, data);
  }, []);

  return {
    logClick,
    logInput,
    logAction,
    logSearch,
    logFilter,
  };
}

// ============================================================================
// useLogForm - Log form interactions
// ============================================================================

export function useLogForm(formName) {
  const fieldChanges = useRef({});

  const logFieldChange = useCallback((fieldName, value) => {
    fieldChanges.current[fieldName] = { 
      changed: true, 
      timestamp: new Date().toISOString() 
    };
    logger.trace(`Form field changed: ${formName}.${fieldName}`);
  }, [formName]);

  const logSubmit = useCallback((values) => {
    logger.user.formSubmit(formName, {
      fieldsChanged: Object.keys(fieldChanges.current),
      fieldCount: Object.keys(values).length,
    });
    fieldChanges.current = {};
  }, [formName]);

  const logValidationError = useCallback((errors) => {
    logger.user.formError(formName, errors);
  }, [formName]);

  const logReset = useCallback(() => {
    logger.debug(`Form reset: ${formName}`);
    fieldChanges.current = {};
  }, [formName]);

  return {
    logFieldChange,
    logSubmit,
    logValidationError,
    logReset,
  };
}

// ============================================================================
// useLogNavigation - Track navigation
// ============================================================================

export function useLogNavigation() {
  const previousPath = useRef(typeof window !== 'undefined' ? window.location.pathname : '');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNavigation = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== previousPath.current) {
        logger.user.navigate(previousPath.current, currentPath);
        previousPath.current = currentPath;
      }
    };

    window.addEventListener('popstate', handleNavigation);
    
    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleNavigation();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleNavigation();
    };

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  const logNavigate = useCallback((to, data = {}) => {
    if (typeof window !== 'undefined') {
      logger.user.navigate(window.location.pathname, to, data);
    }
  }, []);

  return { logNavigate };
}

// ============================================================================
// useLogDataFetch - Log data fetching
// ============================================================================

export function useLogDataFetch(queryKey) {
  const log = useMemo(() => logger.createLogger(`Query:${Array.isArray(queryKey) ? queryKey.join(':') : queryKey}`), [queryKey]);

  const logStart = useCallback((params = {}) => {
    logger.perf.start(`query:${queryKey}`, params);
    log.debug('Fetching data', params);
  }, [queryKey, log]);

  const logSuccess = useCallback((data, params = {}) => {
    logger.perf.end(`query:${queryKey}`, { success: true, ...params });
    log.debug('Data fetched successfully', {
      recordCount: Array.isArray(data) ? data.length : 1,
      ...params,
    });
  }, [queryKey, log]);

  const logError = useCallback((error, params = {}) => {
    logger.perf.end(`query:${queryKey}`, { success: false, error: error.message });
    log.error('Data fetch failed', error, params);
  }, [queryKey, log]);

  const logRefetch = useCallback((reason, params = {}) => {
    log.debug('Refetching data', { reason, ...params });
  }, [log]);

  return {
    logStart,
    logSuccess,
    logError,
    logRefetch,
    logger: log,
  };
}

// ============================================================================
// useLogMutation - Log data mutations
// ============================================================================

export function useLogMutation(mutationName) {
  const log = useMemo(() => logger.createLogger(`Mutation:${mutationName}`), [mutationName]);

  const logStart = useCallback((variables = {}) => {
    logger.perf.start(`mutation:${mutationName}`, variables);
    log.info('Starting mutation', variables);
  }, [mutationName, log]);

  const logSuccess = useCallback((data, variables = {}) => {
    logger.perf.end(`mutation:${mutationName}`, { success: true });
    log.info('Mutation successful', { result: data, variables });
  }, [mutationName, log]);

  const logError = useCallback((error, variables = {}) => {
    logger.perf.end(`mutation:${mutationName}`, { success: false, error: error.message });
    log.error('Mutation failed', error, { variables });
  }, [mutationName, log]);

  return {
    logStart,
    logSuccess,
    logError,
    logger: log,
  };
}

// ============================================================================
// useLogError - Error boundary logging hook
// ============================================================================

export function useLogError(componentName) {
  const logError = useCallback((error, errorInfo = {}) => {
    logger.error(`Error in ${componentName}`, error, {
      component: componentName,
      componentStack: errorInfo.componentStack,
    });
  }, [componentName]);

  return logError;
}

// ============================================================================
// useLogSession - Session management
// ============================================================================

export function useLogSession() {
  const setUser = useCallback((user) => {
    logger.session.setUser(user);
    logger.info('User session started', { userId: user.id, role: user.role });
  }, []);

  const setContext = useCallback((key, value) => {
    logger.session.setContext(key, value);
    logger.debug('Session context updated', { key, value });
  }, []);

  const getSession = useCallback(() => {
    return logger.session.getContext();
  }, []);

  return {
    setUser,
    setContext,
    getSession,
  };
}

export default {
  useLogger,
  useLogRender,
  useLogMount,
  useLogEffect,
  useLogState,
  useLogCallback,
  useLogPerformance,
  useLogAsync,
  useLogUserAction,
  useLogForm,
  useLogNavigation,
  useLogDataFetch,
  useLogMutation,
  useLogError,
  useLogSession,
};

