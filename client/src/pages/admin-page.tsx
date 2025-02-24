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

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [processingKycId, setProcessingKycId] = useState<number | null>(null);
  const [processingTxId, setProcessingTxId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<{ id: number; username: string } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [openPaymentDetails, setOpenPaymentDetails] = useState<number | null>(null);

  // Add new states for tracking approval success
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
    <div className="container mx-auto px-4 py-8">
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

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="users" className="flex-1 sm:flex-none">Users & KYC</TabsTrigger>
          <TabsTrigger value="transactions" className="flex-1 sm:flex-none">Transactions</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
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
                                <span className={`inline-flex items-center gap-1.5 ${
                                  user.kycStatus === 'approved' ? 'text-green-600 dark:text-green-500' : ''
                                }`}>
                                  {user.kycStatus}
                                  {user.kycStatus === 'approved' && <Check className="h-4 w-4" />}
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
          <Card>
            <CardHeader>
              <CardTitle>Transaction Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Payment Details</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {transactions?.map((tx) => {
                            const user = users?.find(u => u.id === tx.userId);
                            return (
                              <tr key={tx.id} className="transition-colors hover:bg-muted/50">
                                <td className="px-4 py-3 text-sm">{user?.username}</td>
                                <td className="px-4 py-3 text-sm capitalize">{tx.type}</td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="space-y-1">
                                    <p className="whitespace-nowrap">
                                      {tx.type === 'buy' ? (
                                        <>
                                          <span className="text-muted-foreground">Pay:</span> {tx.amount} JOD
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-muted-foreground">Send:</span> {tx.amount} USDT
                                        </>
                                      )}
                                    </p>
                                    <p className="whitespace-nowrap text-xs">
                                      {tx.type === 'buy' ? (
                                        <>
                                          <span className="text-muted-foreground">Receive:</span> {(Number(tx.amount) / Number(tx.rate)).toFixed(2)} USDT
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-muted-foreground">Receive:</span> {(Number(tx.amount) * Number(tx.rate)).toFixed(2)} JOD
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-flex items-center gap-1.5 capitalize ${tx.status === 'approved' ? 'text-green-600' : ''}`}>
                                    {tx.status}
                                    {tx.status === 'approved' && <Check className="h-4 w-4" />}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {tx.type === 'buy' && user?.usdtAddress && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs sm:text-sm">
                                        {user.usdtAddress.slice(0, 6)}...{user.usdtAddress.slice(-4)}
                                      </span>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => copyToClipboard(user.usdtAddress!)}
                                            >
                                              <Copy className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Copy USDT address</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  )}
                                  {tx.type === 'sell' && user && (
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
                                          <p><span className="font-medium">Bank:</span> {user.bankName}</p>
                                          <p className="flex items-center gap-1">
                                            <span className="font-medium whitespace-nowrap">Account Holder:</span>
                                            <span>{user.accountHolderName}</span>
                                          </p>
                                          <p className="flex items-center gap-1">
                                            <span className="font-medium whitespace-nowrap">IBAN:</span>
                                            <span className="font-mono">{user.bankIban}</span>
                                          </p>
                                          {user.cliqAlias && (
                                            <>
                                              <p className="flex items-center gap-1">
                                                <span className="font-medium whitespace-nowrap">CliQ Alias:</span>
                                                <span>{user.cliqAlias}</span>
                                              </p>
                                              <p className="flex items-center gap-1">
                                                <span className="font-medium whitespace-nowrap">CliQ Bank:</span>
                                                <span>{user.cliqBankName}</span>
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                </td>
                                <td className="px-4 py-3">
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
          <AdminPaymentSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}