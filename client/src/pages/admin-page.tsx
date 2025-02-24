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
import { Eye, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [processingKycId, setProcessingKycId] = useState<number | null>(null);
  const [processingTxId, setProcessingTxId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<{ id: number; username: string } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [openPaymentDetails, setOpenPaymentDetails] = useState<number | null>(null);

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
      toast({
        title: "Transaction Approved",
        description: "Transaction has been approved and loyalty points awarded",
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
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-4">Loading users...</div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Username</th>
                            <th className="px-4 py-3 text-left text-sm font-medium hidden sm:table-cell">Full Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium hidden sm:table-cell">Mobile</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">KYC Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {users?.map((user) => (
                            <tr key={user.id}>
                              <td className="px-4 py-3 text-sm">{user.username}</td>
                              <td className="px-4 py-3 text-sm hidden sm:table-cell">{user.fullName}</td>
                              <td className="px-4 py-3 text-sm hidden sm:table-cell">{user.mobileNumber || 'Not verified'}</td>
                              <td className="px-4 py-3 text-sm capitalize">{user.kycStatus}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  {user.kycDocument && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedUser({ id: user.id, username: user.username })}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">View</span> Doc
                                    </Button>
                                  )}
                                  {user.kycDocument && user.kycStatus === 'pending' && (
                                    <Button
                                      size="sm"
                                      onClick={() => approveKYCMutation.mutate(user.id)}
                                      disabled={processingKycId === user.id}
                                    >
                                      {processingKycId === user.id ? 'Approving...' : 'Approve'}
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
                <div className="text-center py-4">Loading transactions...</div>
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
                              <tr key={tx.id}>
                                <td className="px-4 py-3 text-sm">{user?.username}</td>
                                <td className="px-4 py-3 text-sm capitalize">{tx.type}</td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">{tx.amount} {tx.type === 'buy' ? 'JOD' : 'USDT'}</td>
                                <td className="px-4 py-3 text-sm capitalize">{tx.status}</td>
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
                                          View CliQ Details
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
                                            <span className="font-medium whitespace-nowrap">CliQ {user.cliqType === 'alias' ? 'Alias' : 'Number'}:</span>
                                            <span className="font-mono">
                                              {user.cliqType === 'alias' ? user.cliqAlias : user.cliqNumber}
                                            </span>
                                            {user.cliqType === 'alias' && user.cliqAlias && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => copyToClipboard(user.cliqAlias!)}
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </p>
                                          <p className="break-words"><span className="font-medium">Account Holder:</span> {user.accountHolderName}</p>
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
                                        onClick={() => approveTransactionMutation.mutate(tx.id)}
                                        disabled={processingTxId === tx.id}
                                      >
                                        {processingTxId === tx.id ? 'Approving...' : 'Approve'}
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
      </Tabs>
    </div>
  );
}