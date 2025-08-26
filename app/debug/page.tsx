"use client";

import React, { useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSupabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/supabase');
      const data = await response.json();
      setResult({ type: 'supabase', data });
    } catch (error) {
      setResult({ type: 'error', data: error });
    }
    setLoading(false);
  };

  const testPipeline = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    
    const formData = new FormData(event.currentTarget);
    
    try {
      const response = await fetch('/api/debug/pipeline', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult({ type: 'pipeline', data });
    } catch (error) {
      setResult({ type: 'error', data: error });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Debug Tools</h1>
      
      <div className="space-y-8">
        {/* Supabase Test */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Test Supabase Connection</h2>
            <button 
              className="btn btn-primary" 
              onClick={testSupabase}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test Supabase'}
            </button>
          </div>
        </div>

        {/* Pipeline Test */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Test Processing Pipeline</h2>
            <form onSubmit={testPipeline} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Select an image file</span>
                </label>
                <input 
                  type="file" 
                  name="file" 
                  accept="image/*" 
                  className="file-input file-input-bordered w-full max-w-xs" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-secondary"
                disabled={loading}
              >
                {loading ? 'Testing Pipeline...' : 'Test Pipeline'}
              </button>
            </form>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">
                Results: {result.type}
                {result.data?.status === 'success' && (
                  <div className="badge badge-success">Success</div>
                )}
                {result.data?.status === 'error' && (
                  <div className="badge badge-error">Error</div>
                )}
              </h2>
              <pre className="bg-base-200 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
