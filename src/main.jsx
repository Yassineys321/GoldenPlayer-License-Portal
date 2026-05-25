import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'

let savedMac = localStorage.getItem('user_mac');
if (savedMac) {
  const safeMac = savedMac.replace(/[.#$\[\]]/g, '_');
  if (savedMac !== safeMac) {
    localStorage.setItem('user_mac', safeMac);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
