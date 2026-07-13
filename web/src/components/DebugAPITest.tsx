import React, { useState } from 'react';

export default function DebugAPITest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('[DEBUG API TEST] Token exists:', !!token);
      
      const response = await fetch(`https://ayu-disha.onrender.com/api/clinician${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[DEBUG API TEST] Response status:', response.status);
      console.log('[DEBUG API TEST] Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[DEBUG API TEST] Error response:', errorText);
        setResult({ error: `HTTP ${response.status}: ${errorText}` });
        return;
      }
      
      const data = await response.json();
      console.log('[DEBUG API TEST] Success data:', data);
      setResult({ success: data });
    } catch (error) {
      console.log('[DEBUG API TEST] Fetch error:', error);
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid red', 
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <h4>DEBUG API TEST</h4>
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={() => testAPI('/my-patients')} 
          disabled={loading}
          style={{ marginRight: '5px', padding: '5px' }}
        >
          Test My Patients
        </button>
        <button 
          onClick={() => testAPI('/debug/current-user')} 
          disabled={loading}
          style={{ padding: '5px' }}
        >
          Test Debug
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {result && (
        <div style={{ 
          background: result.error ? '#ffeeee' : '#eeffee', 
          padding: '5px', 
          fontSize: '10px',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}