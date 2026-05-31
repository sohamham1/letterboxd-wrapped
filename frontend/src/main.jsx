import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const cfAnalyticsToken = import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN
const isProd = import.meta.env.PROD

if (isProd && cfAnalyticsToken && typeof document !== 'undefined') {
    const script = document.createElement('script')
    script.defer = true
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: cfAnalyticsToken }))
    document.head.appendChild(script)
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
