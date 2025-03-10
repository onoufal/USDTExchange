import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import WalletSettings from "@/components/wallet-settings";
import CliqSettings from "@/components/cliq-settings";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <div className="space-y-6">
        {/* USDT Wallet Settings */}
        <WalletSettings />

        {/* CliQ Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>CliQ Account Settings</CardTitle>
            <CardDescription>Set your CliQ details for receiving payments</CardDescription>
          </CardHeader>
          <CardContent>
            <CliqSettings />
          </CardContent>
        </Card>

        {/* Show alerts if settings are missing */}
        {(!user.usdtAddress || !user.cliqAlias && !user.cliqNumber) && (
          <Alert variant="default" className="bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <AlertDescription className="text-sm space-y-2">
                {!user.usdtAddress && (
                  <div>Please set your USDT wallet address to receive USDT from buy orders.</div>
                )}
                {!user.cliqAlias && !user.cliqNumber && (
                  <div>Please set your CliQ account details to receive JOD from sell orders.</div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>
    </div>
  );
}