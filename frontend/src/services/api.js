/**
 * Frontend API client communicating with FastAPI backend.
 */

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  async getState() {
    const res = await fetch(`${API_BASE}/simulation/state`);
    if (!res.ok) throw new Error('Failed to fetch simulation state');
    return res.json();
  },

  async start() {
    const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
    return res.json();
  },

  async pause() {
    const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
    return res.json();
  },

  async resume() {
    const res = await fetch(`${API_BASE}/simulation/resume`, { method: 'POST' });
    return res.json();
  },

  async reset() {
    const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
    return res.json();
  },

  async updateConfig(config) {
    const res = await fetch(`${API_BASE}/simulation/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async setScenario(scenario) {
    const res = await fetch(`${API_BASE}/simulation/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    return res.json();
  },

  async getFuzzyDecision(inputs) {
    const res = await fetch(`${API_BASE}/controller/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
    });
    return res.json();
  },

  async startOptimization(config) {
    const res = await fetch(`${API_BASE}/optimization/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    return res.json();
  },

  async getOptimizationStatus() {
    const res = await fetch(`${API_BASE}/optimization/status`);
    return res.json();
  },

  async getOptimizationResult() {
    const res = await fetch(`${API_BASE}/optimization/result`);
    return res.json();
  },

  async applyOptimization() {
    const res = await fetch(`${API_BASE}/optimization/apply`, { method: 'POST' });
    return res.json();
  },

  async runComparison(scenario, duration = 120) {
    const res = await fetch(`${API_BASE}/comparison/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, duration }),
    });
    if (!res.ok) throw new Error('Benchmark comparison failed');
    return res.json();
  },

  async cancelOptimization() {
    const res = await fetch(`${API_BASE}/optimization/cancel`, { method: 'POST' });
    return res.json();
  },

  async getDecisionHistory() {
    const res = await fetch(`${API_BASE}/decision/history`);
    return res.json();
  },

  async getSchedulerState() {
    const res = await fetch(`${API_BASE}/scheduler/state`);
    return res.json();
  },

  async getMetrics() {
    const res = await fetch(`${API_BASE}/metrics`);
    return res.json();
  },
};
