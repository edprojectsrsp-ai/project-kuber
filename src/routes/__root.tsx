import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';
import { SessionGate } from '@/components/session-gate';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { PromptHost } from '@/components/text-prompt';
export const Route = createRootRoute({ component: () => <TooltipProvider delayDuration={200}><SessionGate><AppShell><Outlet/></AppShell></SessionGate><PromptHost/><Toaster position="bottom-right"/></TooltipProvider> });
