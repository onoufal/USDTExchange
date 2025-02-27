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

// Update cardStyles to enhance accessibility
const cardStyles = {
  base: "border-0 shadow-lg bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-card/40 transition-all duration-200 hover:shadow-xl hover:bg-card/60 dark:hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  contentPadding: "p-6 sm:p-7", // Maintains large touch targets
  headerPadding: "px-6 sm:px-7 py-6", // Consistent with content padding
  iconWrapper: "w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 dark:group-hover:bg-primary/30",
  link: "min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group focus-visible:ring-offset-2",
  // Typography with enhanced contrast
  heading: "text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent dark:from-primary dark:to-primary/90",
  subheading: "text-base sm:text-lg text-foreground dark:text-foreground/90",
  cardTitle: "text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary transition-all duration-300 dark:from-primary dark:to-primary/90",
  cardDescription: "text-sm text-foreground/90 dark:text-foreground/80 mt-2",
  sectionTitle: "text-xl sm:text-2xl font-semibold tracking-tight",
};

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
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
        {/* Welcome Section - Updated typography */}
        <div className="animate-fade-up [--animation-delay:0ms]">
          <h1 className={cardStyles.heading}>
            Welcome back, {user.fullName}
          </h1>
          <p className={cardStyles.subheading}>
            Your trusted platform for USDT-JOD exchange
          </p>
        </div>

        {/* Quick Actions Grid - Updated typography */}
        <section aria-labelledby="quick-actions-heading" className="py-2">
          <h2 id="quick-actions-heading" className="sr-only">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <Link 
              href="#trade-form" 
              className={`${cardStyles.link} animate-fade-up [--animation-delay:100ms]`}
              aria-label="Start Trading USDT"
            >
              <Card className={`${cardStyles.base} group-hover:border-primary/20`}>
                <CardContent className={`${cardStyles.contentPadding} flex items-center gap-5`}>
                  <div className={cardStyles.iconWrapper}>
                    <CreditCard className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={cardStyles.cardTitle}>Start Trading</h3>
                    <p className={cardStyles.cardDescription}>Buy or sell USDT instantly</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link 
              href="/settings" 
              className={`${cardStyles.link} animate-fade-up [--animation-delay:200ms]`}
              aria-label="Manage Payment Methods"
            >
              <Card className={`${cardStyles.base} group-hover:border-primary/20`}>
                <CardContent className={`${cardStyles.contentPadding} flex items-center gap-5`}>
                  <div className={cardStyles.iconWrapper}>
                    <Settings className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={cardStyles.cardTitle}>Payment Methods</h3>
                    <p className={cardStyles.cardDescription}>Manage your payment options</p>
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
              <Card className={`${cardStyles.base} group-hover:border-primary/20 w-full`}>
                <CardContent className={`${cardStyles.contentPadding} flex items-center gap-5`}>
                  <div className={cardStyles.iconWrapper}>
                    <Share2 className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={cardStyles.cardTitle}>Refer a Friend</h3>
                    <p className={cardStyles.cardDescription}>Earn rewards for referrals</p>
                  </div>
                </CardContent>
              </Card>
            </Button>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Main Trading and Transactions Column */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            {/* Trading Section */}
            <section aria-labelledby="trade-section-title">
              <Card className={`${cardStyles.base} animate-fade-up [--animation-delay:400ms]`}>
                <CardHeader className={cardStyles.headerPadding}>
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
                    <h2 
                      id="trade-section-title" 
                      className={cardStyles.sectionTitle}
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
                  <CardDescription className="text-base text-muted-foreground/90 mt-2">
                    Buy or sell USDT for Jordanian Dinar (JOD)
                  </CardDescription>
                </CardHeader>
                <CardContent id="trade-form" className={`${cardStyles.contentPadding} space-y-6`}>
                  {showKYCWarning ? (
                    <div className="rounded-lg border border-warning bg-warning/10 p-4 sm:p-6">
                      <Alert variant="warning" className="flex items-center gap-3 border-none bg-transparent p-0">
                        <AlertCircle className="h-5 w-5 text-warning-foreground shrink-0" aria-hidden="true" />
                        <AlertDescription className="text-base font-medium text-warning-foreground">
                          Please complete mobile verification and KYC before trading
                        </AlertDescription>
                      </Alert>
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-warning-foreground hover:bg-warning/20"
                          onClick={() => document.getElementById('verification-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Complete Verification
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <TradeForm />
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Transaction History */}
            <section aria-labelledby="transactions-section-title">
              <Card className={`${cardStyles.base} animate-fade-up [--animation-delay:500ms]`}>
                <CardHeader className={cardStyles.headerPadding}>
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-primary" aria-hidden="true" />
                    <h2 
                      id="transactions-section-title" 
                      className={cardStyles.sectionTitle}
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
                  <CardDescription className="text-base text-muted-foreground/90 mt-2">
                    View and track your USDT trades
                  </CardDescription>
                </CardHeader>
                <CardContent className={cardStyles.contentPadding}>
                  {/* Scrollable table wrapper */}
                  <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden rounded-lg border bg-card dark:bg-card/50">
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
          <div className="lg:col-span-4 space-y-6 sm:space-y-8 animate-fade-left [--animation-delay:200ms]">
            <section aria-labelledby="verification-section-title" id="verification-section">
              <Card className={cardStyles.base}>
                <CardHeader className={cardStyles.headerPadding}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
                    <h2 
                      id="verification-section-title" 
                      className={cardStyles.sectionTitle}
                    >
                      Verification Status
                    </h2>
                  </div>
                  <CardDescription className="text-base text-muted-foreground/90 mt-2">
                    Complete verification to start trading
                  </CardDescription>
                </CardHeader>
                <CardContent className={cardStyles.contentPadding}>
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