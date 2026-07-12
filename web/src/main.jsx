import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

console.log('📦 main.jsx executing...');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
})

console.log('🔍 Looking for root element...');
const rootElement = document.getElementById('root');
console.log('✅ Root element found:', rootElement);

if (!rootElement) {
  console.error('❌ No root element found!');
  document.body.innerHTML = '<div style="padding:20px;background:#fee;color:#c00"><h1>Error: Root element not found</h1></div>';
} else {
  console.log('🎨 Creating React root...');
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </QueryClientProvider>
    </StrictMode>,
  )
  console.log('✅ React app rendered');
}
