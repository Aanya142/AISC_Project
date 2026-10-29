import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

export function useSimulation() {
  const [state, setState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const pollRef = useRef(null);

  const fetchState = useCallback(async () => {
    try {
      const data = await api.getState();
      setState(data);
      setIsConnected(true);
      setError(null);
    } catch {
      setIsConnected(false);
      setError('Cannot connect to backend. Make sure the FastAPI server is running on port 8000.');
    }
  }, []);

  useEffect(() => {
    fetchState();
    pollRef.current = setInterval(fetchState, 300);
    return () => clearInterval(pollRef.current);
  }, [fetchState]);

  const wrap = (fn) => async (...args) => {
    try { await fn(...args); await fetchState(); }
    catch (e) { setError(e.message); }
  };

  const actions = {
    start:               wrap(() => api.start()),
    pause:               wrap(() => api.pause()),
    resume:              wrap(() => api.resume()),
    reset:               wrap(() => api.reset()),
    setScenario:         wrap((s) => api.setScenario(s)),
    updateConfig:        wrap((cfg) => api.updateConfig(cfg)),
    setMode:             wrap((mode) => api.updateConfig({ mode })),
    startOptimization:   wrap((cfg) => api.startOptimization(cfg)),
    cancelOptimization:  wrap(() => api.cancelOptimization()),
    applyOptimization:   wrap(() => api.applyOptimization()),
    runComparison: async (scenario, duration = 120) => {
      setComparisonLoading(true);
      try {
        const result = await api.runComparison(scenario, duration);
        setComparisonResult(result);
      } catch (e) { setError(e.message); }
      finally { setComparisonLoading(false); }
    },
  };

  return { state, isConnected, error, comparisonResult, comparisonLoading, actions };
}
