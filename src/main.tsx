import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './global.css'
import App from './App.tsx'
import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const SENTRY_ENV = import.meta.env.VITE_SENTRY_ENV as string | undefined

if (SENTRY_DSN && SENTRY_ENV){
    Sentry.init({
        dsn: SENTRY_DSN,
        sendDefaultPii: true,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 1.0,
        environment: SENTRY_ENV,
        tracePropagationTargets: [
            "localhost",
            /^\/api\//,
        ]
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <>
        <App />
      </>
  </StrictMode>,
)
