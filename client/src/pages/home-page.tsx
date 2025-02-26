import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import TradeForm from "@/components/trade-form";
import KYCForm from "@/components/kyc-form";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";

function sortTransactions(transactions: Transaction[] = []) {
  const pendingTransactions = transactions
    .filter(tx => tx.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const approvedTransactions = transactions
    .filter(tx => tx.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return [...pendingTransactions, ...approvedTransactions];
}

export default function HomePage() {
  const { user } = useAuth();
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 5000
  });

  const showKYCWarning = user && (!user.mobileVerified || user.kycStatus !== "approved");

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-muted-foreground">
            Your trusted platform for USDT-JOD exchange
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  Trade USDT
                </CardTitle>
                <CardDescription className="text-base">
                  Buy or sell USDT for Jordanian Dinar (JOD)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showKYCWarning ? (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-base font-medium">
                      Please complete mobile verification and KYC before trading
                    </AlertDescription>
                  </Alert>
                ) : (
                  <TradeForm />
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden rounded-lg border bg-background/50">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Rate</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {sortTransactions(transactions)?.map((tx) => (
                            <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium capitalize">
                                <span className={tx.type === 'buy' ? 'text-green-600' : 'text-blue-600'}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="space-y-1">
                                  <p className="whitespace-nowrap font-mono">
                                    {tx.type === 'buy' ? (
                                      <>
                                        <span className="text-muted-foreground font-normal">Pay:</span>{' '}
                                        <span className="font-medium">{tx.amount} JOD</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-muted-foreground font-normal">Send:</span>{' '}
                                        <span className="font-medium">{tx.amount} USDT</span>
                                      </>
                                    )}
                                  </p>
                                  <p className="whitespace-nowrap text-xs font-mono">
                                    {tx.type === 'buy' ? (
                                      <>
                                        <span className="text-muted-foreground">Receive:</span>{' '}
                                        <span className="font-medium">
                                          {(Number(tx.amount) / Number(tx.rate)).toFixed(2)} USDT
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-muted-foreground">Receive:</span>{' '}
                                        <span className="font-medium">
                                          {(Number(tx.amount) * Number(tx.rate)).toFixed(2)} JOD
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-mono">{tx.rate}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  tx.status === 'approved' 
                                    ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                    : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {(!transactions || transactions.length === 0) && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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

          {/* KYC & Status Section */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Verification Status</CardTitle>
              </CardHeader>
              <CardContent>
                <KYCForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}