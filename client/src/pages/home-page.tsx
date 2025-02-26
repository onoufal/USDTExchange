import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  HelpCircle,
  Receipt,
  ArrowUp,
  CreditCard,
  Share2,
  Settings,
  FileText,
  ClipboardList,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TradeForm from "@/components/trade-form";
import KYCForm from "@/components/kyc-form";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { Link } from "wouter";

// Helper function to sort transactions by status and date
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
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 animate-fade-up [--animation-delay:0ms]">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            Your trusted platform for USDT-JOD exchange
          </p>
        </div>

        {/* Quick Actions Section */}
        <section aria-labelledby="quick-actions-heading" className="mb-6 sm:mb-8">
          <h2 id="quick-actions-heading" className="sr-only">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link 
              href="#trade-form" 
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-transform hover:scale-[1.02] duration-300 animate-fade-up [--animation-delay:100ms]"
              aria-label="Start Trading USDT"
            >
              <Card className="border-0 shadow-lg bg-card/50 dark:bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/40 transition-all duration-200 hover:shadow-xl hover:bg-card/60 dark:hover:bg-card/50">
                <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 dark:group-hover:bg-primary/30">
                    <CreditCard className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Start Trading</h3>
                    <p className="text-sm text-muted-foreground">Buy or sell USDT instantly</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link 
              href="/settings" 
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-transform hover:scale-[1.02] duration-300 animate-fade-up [--animation-delay:200ms]"
              aria-label="Manage Payment Methods"
            >
              <Card className="border-0 shadow-lg bg-card/50 dark:bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/40 transition-all duration-200 hover:shadow-xl hover:bg-card/60 dark:hover:bg-card/50">
                <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 dark:group-hover:bg-primary/30">
                    <Settings className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Payment Methods</h3>
                    <p className="text-sm text-muted-foreground">Manage your payment options</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Button 
              asChild 
              variant="ghost" 
              className="p-0 h-auto hover:bg-transparent animate-fade-up [--animation-delay:300ms]"
              aria-label="Learn about our referral program"
            >
              <Card className="border-0 shadow-lg bg-card/50 dark:bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/40 transition-all duration-200 hover:shadow-xl hover:bg-card/60 dark:hover:bg-card/50 w-full">
                <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 dark:group-hover:bg-primary/30">
                    <Share2 className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Refer a Friend</h3>
                    <p className="text-sm text-muted-foreground">Earn rewards for referrals</p>
                  </div>
                </CardContent>
              </Card>
            </Button>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Main Trading and Transactions Column */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Trading Section */}
            <section aria-labelledby="trade-section-title">
              <Card className="border-0 shadow-lg bg-card/50 dark:bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/40 transition-all duration-200 hover:shadow-xl hover:bg-card/60 dark:hover:bg-card/50 animate-fade-up [--animation-delay:400ms]">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
                    <h2 
                      id="trade-section-title" 
                      className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
                    >
                      Trade USDT
                    </h2>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Trading information"
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center" className="p-3 max-w-xs">
                          <p className="text-sm">
                            Exchange USDT for JOD or vice versa at competitive rates. Trades are processed within 24 hours after verification.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground/90">
                    Buy or sell USDT for Jordanian Dinar (JOD)
                  </CardDescription>
                </CardHeader>
                <CardContent id="trade-form" className="px-4 sm:px-6 pb-4 sm:pb-6">
                  {showKYCWarning ? (
                    <Alert variant="warning" className="flex items-center gap-3">
                      <div className="shrink-0">
                        <AlertCircle className="h-5 w-5 text-warning-foreground" aria-hidden="true" />
                      </div>
                      <AlertDescription className="text-sm sm:text-base font-medium">
                        Please complete mobile verification and KYC before trading
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <TradeForm />
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Transaction History Section */}
            <section aria-labelledby="transactions-section-title">
              <Card className="border-0 shadow-lg bg-card/50 dark:bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/40 transition-all duration-200 hover:shadow-xl hover:bg-card/60 dark:hover:bg-card/50 animate-fade-up [--animation-delay:500ms]">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" aria-hidden="true" />
                    <h2 
                      id="transactions-section-title" 
                      className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight"
                    >
                      Recent Transactions
                    </h2>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Transaction status information"
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center" className="p-3 max-w-xs">
                          <p className="text-sm">
                            Track your trades here. Pending trades are being processed, while approved trades have been completed successfully.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground/90">
                    View and track your USDT trades
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  {/* Scrollable table wrapper */}
                  <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden rounded-lg border border-border/40 bg-card dark:bg-card/50">
                        <table 
                          className="min-w-full divide-y divide-border dark:divide-border/50"
                          aria-label="Transaction history"
                        >
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
                            {(!transactions || transactions.length === 0) ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-12 text-center">
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                                      <Receipt className="w-6 h-6 text-muted-foreground/60" aria-hidden="true" />
                                    </div>
                                    <div className="max-w-[220px] space-y-1">
                                      <p className="text-base font-medium text-muted-foreground">No transactions yet</p>
                                      <p className="text-sm text-muted-foreground/80">Your trading history will appear here</p>
                                    </div>
                                    {user.kycStatus === "approved" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
                                        onClick={() => document.getElementById('trade-form')?.scrollIntoView({ behavior: 'smooth' })}
                                      >
                                        <ArrowUp className="w-4 h-4 mr-2" aria-hidden="true" />
                                        Start Trading
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              sortTransactions(transactions)?.map((tx) => (
                                <tr key={tx.id} className="hover:bg-muted/50 dark:hover:bg-muted/10 transition-colors">
                                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                                    <span className={tx.type === 'buy' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
                                      {tx.type === 'buy' ? 'Buy' : 'Sell'}
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
                                  <td className="whitespace-nowrap px-4 py-4 font-mono text-sm hidden sm:table-cell">{tx.rate}</td>
                                  <td className="whitespace-nowrap px-4 py-4">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <span 
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                              tx.status === 'approved'
                                                ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                                : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                                            }`}
                                            aria-label={`Transaction status: ${tx.status}`}
                                          >
                                            {tx.status === 'approved' ? 'Approved' : 'Pending'}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="p-2">
                                          <p className="text-xs">
                                            {tx.status === 'approved'
                                              ? 'Transaction completed successfully'
                                              : 'Transaction is being processed'}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {/* Mobile-only amount display */}
                                    <div className="mt-1 sm:hidden">
                                      <p className="font-mono text-sm">
                                        {tx.type === 'buy' 
                                          ? `${tx.amount} JOD → ${(Number(tx.amount) / Number(tx.rate)).toFixed(2)} USDT`
                                          : `${tx.amount} USDT → ${(Number(tx.amount) * Number(tx.rate)).toFixed(2)} JOD`}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                                    {new Date(tx.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar - Verification Status */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6 animate-fade-left [--animation-delay:200ms]">
            <section aria-labelledby="verification-section-title">
              <Card className="border-0 shadow-lg bg-card/50 dark:bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/40 transition-all duration-200 hover:shadow-xl hover:bg-card/60 dark:hover:bg-card/50">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
                    <h2 
                      id="verification-section-title" 
                      className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight"
                    >
                      Verification Status
                    </h2>
                  </div>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground/90">
                    Complete verification to start trading
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <KYCForm />
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}