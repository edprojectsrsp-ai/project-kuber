import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { getRouter } from './router';
import { toast } from 'sonner';
import './styles.css';
const router = getRouter();
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
window.addEventListener('unhandledrejection', e => { e.preventDefault(); toast.error(e.reason?.message || 'The action could not be saved.'); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>);
