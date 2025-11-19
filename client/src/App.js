import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import Home from './pages/Home';
import About from './pages/About';
import RegisteredUsers from './pages/RegisteredUsers';
import apiService from './services/apiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Main app content when user is authenticated
function MainApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Test API connection
      apiService.get('/api/health')
        .then(response => {
          setData(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('API connection failed:', error);
          setLoading(false);
        });
    }
  }, [isAuthenticated]);

  return (
    <div className="App">
      <Header user={user} />
      <main className="container">
        {loading ? (
          <div className="loading">Connecting to server...</div>
        ) : (
          <Routes>
            <Route path="/" element={<Home data={data} />} />
            <Route path="/about" element={<About />} />
            <Route path="/registered-users" element={<RegisteredUsers />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

// App wrapper with authentication
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

// Content component that handles login vs main app
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/reset-password" 
        element={<ResetPassword />} 
      />
      <Route 
        path="/*" 
        element={
          isAuthenticated ? <MainApp /> : <Login />
        } 
      />
    </Routes>
  );
}

export default App;