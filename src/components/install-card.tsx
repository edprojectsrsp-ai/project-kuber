import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallCard({ compact = false }: { compact?: boolean }) {
  const { canInstall, install, standalone } = useInstallPrompt();

  if (standalone) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Running as an app</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This phone or tablet has Store Ledger on the home screen. The register is shared across devices. Reconnect to save changes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold">Windows or Android</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Install Store Ledger on the home screen. It opens full-screen like any other app — no
              Play Store listing needed.
            </p>
          </div>
        </div>
        {canInstall ? (
          <Button
            className="w-full sm:w-fit"
            onClick={async () => {
              const ok = await install();
              if (ok) toast.success("Store Ledger is on the home screen");
            }}
          >
            Install Store Ledger
          </Button>
        ) : null}
        {compact ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open this register in Chrome on the phone.</li>
            <li>Tap the three dots, then Install app (or Add to Home screen).</li>
            <li>Open the Store Ledger icon. It runs without the browser bar.</li>
          </ol>
        ) : (
          <div className="grid gap-3 text-sm">
            <div>
              <p className="font-medium text-foreground">On Android (Chrome)</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Open this same register in Chrome — not Facebook, WhatsApp, or Gmail’s in-app browser.</li>
                <li>Tap the three dots at the top right.</li>
                <li>Tap Install app or Add to Home screen, then Install.</li>
                <li>Find Store Ledger on the home screen or in the app drawer and open it.</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-foreground">On Windows</p>
              <p className="mt-1 text-muted-foreground">
                In Chrome or Edge, use Install app in the address bar. That puts a Store Ledger
                shortcut on the desktop and Start menu.
              </p>
            </div>
            <p className="text-muted-foreground">
              Sign in from any device connected to the same server. Stock, requests and asset
              assignments are shared. An internet-hosted HTTPS address is needed for access from anywhere.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
