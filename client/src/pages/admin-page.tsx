import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Transaction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { useState } from "react";
import { Eye } from "lucide-react";

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [processingKycId, setProcessingKycId] = useState<number | null>(null);

  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 5000 // Refresh every 5 seconds to keep status updated
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {transactions?.map((tx) => {
                          const user = users?.find(u => u.id === tx.userId);
                          return (
                            <tr key={tx.id}>
                              <td className="px-4 py-3 text-sm">{user?.username}</td>
                              <td className="px-4 py-3 text-sm capitalize">{tx.type}</td>
                              <td className="px-4 py-3 text-sm">{tx.amount} {tx.type === 'buy' ? 'JOD' : 'USDT'}</td>
                              <td className="px-4 py-3 text-sm capitalize">{tx.status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}