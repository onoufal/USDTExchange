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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Welcome Section */}
        <div className="mb-12 relative">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Welcome back, {user.fullName}
            </h1>
            <p className="text-lg sm:text-xl text-foreground/80 leading-relaxed">
              Your trusted platform for USDT-JOD exchange
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-primary/3 rounded-full blur-2xl -z-10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* Trading Card */}
            <Card className="border border-border/40 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-xl overflow-hidden transition-shadow hover:shadow-xl">
              <CardHeader className="space-y-3 p-6 border-b border-border/40">
                <CardTitle asChild>
                  <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent tracking-tight">
                    Trade USDT
                  </h2>
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-foreground/80">
                  Buy or sell USDT for Jordanian Dinar (JOD)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
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
            <Card className="border border-border/40 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-xl overflow-hidden transition-shadow hover:shadow-xl">
              <CardHeader className="p-6 border-b border-border/40">
                <CardTitle asChild>
                  <h2 className="text-2xl font-bold tracking-tight">Recent Transactions</h2>
                </CardTitle>
                <CardDescription className="text-base text-foreground/80">
                  View and track your USDT trades
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto -mx-6">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden rounded-lg border border-border/40 bg-background/50">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr className="bg-muted/50">
                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/70">Type</th>
                            <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/70">Amount</th>
                            <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/70">Rate</th>
                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/70">Status</th>
                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/70">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {sortTransactions(transactions)?.map((tx) => (
                            <tr key={tx.id} className="hover:bg-muted/50 transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium capitalize">
                                <span className={tx.type === 'buy' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="space-y-1.5">
                                  <p className="font-mono text-sm">
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
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {tx.type === 'buy' ? (
                                      <>
                                        <span>Receive:</span>{' '}
                                        <span className="font-medium">
                                          {(Number(tx.amount) / Number(tx.rate)).toFixed(2)} USDT
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Receive:</span>{' '}
                                        <span className="font-medium">
                                          {(Number(tx.amount) * Number(tx.rate)).toFixed(2)} JOD
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm">{tx.rate}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  tx.status === 'approved'
                                    ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                    : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {(!transactions || transactions.length === 0) && (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
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

          {/* Sidebar - KYC & Status Section */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="border border-border/40 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-xl overflow-hidden transition-shadow hover:shadow-xl sticky top-6">
              <CardHeader className="p-6 border-b border-border/40">
                <CardTitle asChild>
                  <h2 className="text-2xl font-bold tracking-tight">Verification Status</h2>
                </CardTitle>
                <CardDescription className="text-base text-foreground/80">
                  Complete verification to start trading
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <KYCForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}