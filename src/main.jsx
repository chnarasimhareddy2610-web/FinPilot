import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { FinanceProvider } from './store/FinanceProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FinanceProvider>
        <App />
      </FinanceProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
