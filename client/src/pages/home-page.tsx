import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import TradeForm from "@/components/trade-form";
import KYCForm from "@/components/kyc-form";
import WalletSettings from "@/components/wallet-settings";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";

export default function HomePage() {
  // All hooks at the top
  const { user } = useAuth();
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 5000 // Refresh every 5 seconds to keep status updated
  });

  // All derived state after hooks
  const showKYCWarning = user && (!user.mobileVerified || user.kycStatus !== "approved");

  // Return null or loading state if no user
  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Welcome, {user.fullName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Trading Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg sm:text-xl">Trade USDT</CardTitle>
              <CardDescription className="text-sm">Buy or sell USDT for Jordanian Dinar (JOD)</CardDescription>
            </CardHeader>
            <CardContent>
              {showKYCWarning ? (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Please complete mobile verification and KYC before trading
                  </AlertDescription>
                </Alert>
              ) : (
                <TradeForm />
              )}
            </CardContent>
          </Card>
        </div>

        {/* KYC & Status Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <KYCForm />
            </CardContent>
          </Card>

          {/* Wallet Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">USDT Wallet</CardTitle>
              <CardDescription>Set your USDT receiving address</CardDescription>
            </CardHeader>
            <CardContent>
              <WalletSettings />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction History */}
      <Card className="mt-4 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-2 text-left text-xs sm:text-sm font-medium">Type</th>
                      <th className="px-4 py-2 text-left text-xs sm:text-sm font-medium">Amount</th>
                      <th className="px-4 py-2 text-left text-xs sm:text-sm font-medium">Rate</th>
                      <th className="px-4 py-2 text-left text-xs sm:text-sm font-medium">Status</th>
                      <th className="px-4 py-2 text-left text-xs sm:text-sm font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions?.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/50">
                        <td className="px-4 py-2 text-xs sm:text-sm capitalize">{tx.type}</td>
                        <td className="px-4 py-2 text-xs sm:text-sm">{tx.amount} {tx.type === 'buy' ? 'JOD' : 'USDT'}</td>
                        <td className="px-4 py-2 text-xs sm:text-sm">{tx.rate}</td>
                        <td className="px-4 py-2 text-xs sm:text-sm capitalize">{tx.status}</td>
                        <td className="px-4 py-2 text-xs sm:text-sm">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-sm text-muted-foreground">
                          No transactions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}