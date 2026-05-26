import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'

let savedMac = localStorage.getItem('user_mac');
if (savedMac) {
  let cleanMac = savedMac.trim().toUpperCase().replace(/[-_]/g, ':');
  if (/^[0-9A-Z]{12}$/.test(cleanMac)) {
    cleanMac = cleanMac.match(/.{1,2}/g).join(':');
  }
  // Remove any remaining invalid characters (forbidden in Firebase keys)
  cleanMac = cleanMac.replace(/[.#$\[\]]/g, '');
  if (savedMac !== cleanMac) {
    localStorage.setItem('user_mac', cleanMac);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
