import React, { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setMessage(data.message);
        setTimestamp(data.timestamp);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container text-center mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body">
              <h1 className="card-title mb-4">StockPicker</h1>
              {loading && (
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
              {error && (
                <div className="alert alert-danger" role="alert">
                  Error: {error}
                </div>
              )}
              {message && (
                <>
                  <p className="lead" data-testid="hello-message">
                    {message}
                  </p>
                  {timestamp && (
                    <p className="text-muted small" data-testid="timestamp">
                      Last updated: {new Date(timestamp).toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
