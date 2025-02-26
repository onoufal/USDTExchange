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
      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Your trusted platform for USDT-JOD exchange
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - KYC & Status Section - Move to top on mobile */}
          <div className="lg:order-2 lg:col-span-4 space-y-6">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Verification Status</CardTitle>
                <CardDescription>Complete verification to start trading</CardDescription>
              </CardHeader>
              <CardContent>
                <KYCForm />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:order-1 lg:col-span-8 space-y-6">
            {/* Trading Card */}
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Trade USDT
                </CardTitle>
                <CardDescription>Buy or sell USDT for Jordanian Dinar (JOD)</CardDescription>
              </CardHeader>
              <CardContent>
                {showKYCWarning ? (
                  <Alert variant="warning" className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5" />
                    <AlertDescription className="ml-6 text-base font-medium">
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
                <CardTitle className="text-xl sm:text-2xl">Recent Transactions</CardTitle>
                <CardDescription>View and track your USDT trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden rounded-lg border bg-card dark:bg-card/50">
                      <table className="min-w-full divide-y divide-border dark:divide-border/50">
                        <thead>
                          <tr className="bg-muted/50 dark:bg-muted/20">
                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium text-muted-foreground dark:text-muted-foreground/70">Type</th>
                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium text-muted-foreground dark:text-muted-foreground/70 hidden sm:table-cell">Amount</th>
                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium text-muted-foreground dark:text-muted-foreground/70 hidden sm:table-cell">Rate</th>
                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium text-muted-foreground dark:text-muted-foreground/70">Status</th>
                            <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium text-muted-foreground dark:text-muted-foreground/70 hidden sm:table-cell">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border/50">
                          {sortTransactions(transactions)?.map((tx) => (
                            <tr key={tx.id} className="hover:bg-muted/50 dark:hover:bg-muted/10 transition-colors">
                              <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                                <span className={tx.type === 'buy' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-sm hidden sm:table-cell">
                                <div className="space-y-1">
                                  <p className="font-mono">
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
                                  <p className="text-xs font-mono">
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
                              <td className="whitespace-nowrap px-4 py-4 text-sm font-mono hidden sm:table-cell">{tx.rate}</td>
                              <td className="whitespace-nowrap px-4 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  tx.status === 'approved'
                                    ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                    : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                                }`}>
                                  {tx.status}
                                </span>
                                {/* Mobile-only amount display */}
                                <div className="mt-1 sm:hidden">
                                  <p className="font-mono text-sm">
                                    {tx.type === 'buy' ? `${tx.amount} JOD → ${(Number(tx.amount) / Number(tx.rate)).toFixed(2)} USDT` : 
                                    `${tx.amount} USDT → ${(Number(tx.amount) * Number(tx.rate)).toFixed(2)} JOD`}
                                  </p>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">
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
        </div>
      </div>
    </div>
  );
}