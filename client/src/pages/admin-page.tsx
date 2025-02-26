import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Transaction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { PaymentProofModal } from "@/components/payment-proof-modal";
import { useState } from "react";
import { Eye, Copy, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import AdminPaymentSettings from "@/components/admin-payment-settings";

function sortTransactions(transactions: Transaction[] = []) {
  const pendingTransactions = transactions
    .filter(tx => tx.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const approvedTransactions = transactions
    .filter(tx => tx.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return [...pendingTransactions, ...approvedTransactions];
}

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [processingKycId, setProcessingKycId] = useState<number | null>(null);
  const [processingTxId, setProcessingTxId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<{ id: number; username: string } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [openPaymentDetails, setOpenPaymentDetails] = useState<number | null>(null);

  const [approvedKycIds, setApprovedKycIds] = useState<number[]>([]);
  const [approvedTxIds, setApprovedTxIds] = useState<number[]>([]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
      toast({
        description: "Address copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 5000
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    refetchInterval: 5000
  });

  const approveTransactionMutation = useMutation({
    mutationFn: async (txId: number) => {
      setProcessingTxId(txId);
      try {
        const res = await apiRequest("POST", `/api/admin/approve-transaction/${txId}`);
        if (!res.ok) {
          throw new Error("Failed to approve transaction");
        }
        return res.json();
      } catch (error) {
        console.error('Transaction approval error:', error);
        setProcessingTxId(null);
        throw error;
      }
    },
    onSuccess: (_, txId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setProcessingTxId(null);
      setApprovedTxIds(prev => [...prev, txId]);
      if (openPaymentDetails === txId) {
        setOpenPaymentDetails(null);
      }
      toast({
        title: "Transaction Approved",
        description: "Transaction has been approved successfully",
      });
    },
    onError: (error: Error) => {
      setProcessingTxId(null);
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveKYCMutation = useMutation({
    mutationFn: async (userId: number) => {
      setProcessingKycId(userId);
      try {
        const res = await apiRequest("POST", `/api/admin/approve-kyc/${userId}`);
        if (!res.ok) {
          throw new Error("Failed to approve KYC");
        }
        return res.json();
      } catch (error) {
        console.error('KYC approval error:', error);
        setProcessingKycId(null);
        throw error;
      }
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setProcessingKycId(null);
      setApprovedKycIds(prev => [...prev, userId]);
      toast({
        title: "KYC Approved",
        description: "User KYC has been approved successfully",
      });
    },
    onError: (error: Error) => {
      setProcessingKycId(null);
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <DocumentPreviewModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          userId={selectedUser?.id || null}
          username={selectedUser?.username || ''}
        />
        <PaymentProofModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transactionId={selectedTransaction?.id || null}
          username={selectedTransaction?.username || ''}
        />

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage users, transactions, and platform settings
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full space-y-6">
          <TabsList className="w-full sm:w-auto inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <TabsTrigger value="users" className="flex-1 sm:flex-none">Users & KYC</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 sm:flex-none">Transactions</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden rounded-lg border bg-background/50">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr className="bg-muted/50">
                              <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium">Username</th>
                              <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium hidden sm:table-cell">Full Name</th>
                              <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium hidden sm:table-cell">Mobile</th>
                              <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium">KYC Status</th>
                              <th scope="col" className="px-4 py-3.5 text-left text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-background">
                            {users?.map((user) => (
                              <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                <td className="whitespace-nowrap px-4 py-4 text-sm">{user.username}</td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm hidden sm:table-cell">{user.fullName}</td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm hidden sm:table-cell">{user.mobileNumber || 'Not verified'}</td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    user.kycStatus === 'approved'
                                      ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                      : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                                  }`}>
                                    {user.kycStatus}
                                    {user.kycStatus === 'approved' && <Check className="h-3 w-3" />}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    {user.kycDocument && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedUser({ id: user.id, username: user.username })}
                                        className="inline-flex items-center"
                                      >
                                        <Eye className="h-4 w-4 mr-1.5" />
                                        View Doc
                                      </Button>
                                    )}
                                    {user.kycDocument && user.kycStatus === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant={approvedKycIds.includes(user.id) ? "outline" : "default"}
                                        onClick={() => approveKYCMutation.mutate(user.id)}
                                        disabled={processingKycId === user.id || approvedKycIds.includes(user.id)}
                                        className="inline-flex items-center transition-all duration-200"
                                      >
                                        {processingKycId === user.id ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                            Processing...
                                          </>
                                        ) : approvedKycIds.includes(user.id) ? (
                                          <>
                                            <Check className="h-4 w-4 mr-1.5" />
                                            Approved
                                          </>
                                        ) : (
                                          "Approve"
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Transaction Management</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden rounded-lg border bg-background/50">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">User</th>
                              <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                              <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Payment Method</th>
                              <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Payment Details</th>
                              <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {sortTransactions(transactions)?.map((tx) => {
                              const user = users?.find(u => u.id === tx.userId);
                              return (
                                <tr key={tx.id} className="transition-colors hover:bg-muted/50">
                                  <td className="px-4 py-4 text-sm">{user?.username}</td>
                                  <td className="px-4 py-4 text-sm capitalize">
                                    <span className={tx.type === 'buy' ? 'text-green-600' : 'text-blue-600'}>
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-sm">
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
                                  <td className="px-4 py-4 text-sm capitalize whitespace-nowrap">
                                    {tx.type === 'buy' ? (
                                      <div className="flex items-center gap-1">
                                        {tx.paymentMethod === 'cliq' ? (
                                          <span>CliQ Payment</span>
                                        ) : (
                                          <span>Mobile Wallet</span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        {tx.network ? (
                                          <span>{tx.network.toUpperCase()} Network</span>
                                        ) : (
                                          <span className="text-red-500">Network not specified</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-sm">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      tx.status === 'approved'
                                        ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                        : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                                    }`}>
                                      {tx.status}
                                      {tx.status === 'approved' && <Check className="h-3 w-3" />}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-sm">
                                    {tx.type === 'buy' ? (
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs sm:text-sm">
                                          {user?.usdtAddress ? (
                                            <>
                                              {user.usdtAddress.slice(0, 6)}...{user.usdtAddress.slice(-4)}
                                            </>
                                          ) : (
                                            'No USDT address set'
                                          )}
                                        </span>
                                        {user?.usdtAddress && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => copyToClipboard(user.usdtAddress!)}
                                                >
                                                  {copiedAddress === user.usdtAddress ? (
                                                    <Check className="h-4 w-4" />
                                                  ) : (
                                                    <Copy className="h-4 w-4" />
                                                  )}
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Copy USDT address</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </div>
                                    ) : (
                                      <Collapsible
                                        open={openPaymentDetails === tx.id}
                                        onOpenChange={(open) => setOpenPaymentDetails(open ? tx.id : null)}
                                      >
                                        <CollapsibleTrigger asChild>
                                          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs sm:text-sm">
                                            View Payment Details
                                            {openPaymentDetails === tx.id ? (
                                              <ChevronUp className="h-4 w-4" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-2 mt-2">
                                          <div className="text-xs sm:text-sm space-y-1 bg-muted/50 p-2 rounded-md">
                                            {user?.cliqAlias && (
                                              <div className="flex items-center justify-between">
                                                <p className="flex items-center gap-1">
                                                  <span className="font-medium whitespace-nowrap">CliQ Alias:</span>
                                                  <span className="truncate mr-2">{user.cliqAlias}</span>
                                                </p>
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => copyToClipboard(user.cliqAlias!)}
                                                      >
                                                        {copiedAddress === user.cliqAlias ? (
                                                          <Check className="h-4 w-4" />
                                                        ) : (
                                                          <Copy className="h-4 w-4" />
                                                        )}
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>Copy CliQ Alias</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              </div>
                                            )}
                                            <p className="flex items-center gap-1">
                                              <span className="font-medium whitespace-nowrap">Account Holder:</span>
                                              <span>{user?.accountHolderName}</span>
                                            </p>
                                            <p className="flex items-center gap-1">
                                              <span className="font-medium whitespace-nowrap">Bank:</span>
                                              <span>{user?.bankName}</span>
                                            </p>
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    {tx.status === 'pending' && (
                                      <div className="flex flex-col sm:flex-row gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setSelectedTransaction({
                                            id: tx.id,
                                            username: user?.username || ''
                                          })}
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          <span className="hidden sm:inline">View</span> Proof
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={approvedTxIds.includes(tx.id) ? "outline" : "default"}
                                          onClick={() => approveTransactionMutation.mutate(tx.id)}
                                          disabled={processingTxId === tx.id || approvedTxIds.includes(tx.id)}
                                          className="transition-all duration-200"
                                        >
                                          {processingTxId === tx.id ? (
                                            <>
                                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                              Processing...
                                            </>
                                          ) : approvedTxIds.includes(tx.id) ? (
                                            <>
                                              <Check className="h-4 w-4 mr-2" />
                                              Approved
                                            </>
                                          ) : (
                                            "Approve"
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Payment Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminPaymentSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}