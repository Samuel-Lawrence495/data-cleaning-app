import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import './App.css';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { getCookie } from './utils/cookies'; // Adjust path if needed
import 'bootstrap/dist/css/bootstrap.min.css';

// --- Axios Global Configuration ---
const csrftoken = getCookie('csrftoken');

if (csrftoken) {
    axios.defaults.headers.common['X-CSRFToken'] = csrftoken;
    console.log("CSRF token set for Axios:", csrftoken);
} else {
    console.warn("CSRF token not found. POST/PUT/DELETE requests to Django might fail.");
}

// Ensure 'withCredentials' is true for all requests if relying on session cookies
axios.defaults.withCredentials = true;
// --- End Axios Global Configuration ---

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
