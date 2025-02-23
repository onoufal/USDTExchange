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

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
  });

  const approveKYCMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/approve-kyc/${userId}`);
      if (!res.ok) {
        throw new Error("Failed to approve KYC");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "KYC Approved",
        description: "User KYC has been approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DocumentPreviewModal 
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        userId={selectedUser?.id || null}
        username={selectedUser?.username || ''}
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users & KYC</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Username</th>
                      <th className="text-left py-2">Full Name</th>
                      <th className="text-left py-2">Mobile</th>
                      <th className="text-left py-2">KYC Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-2">{user.username}</td>
                        <td className="py-2">{user.fullName}</td>
                        <td className="py-2">{user.mobileNumber || 'Not verified'}</td>
                        <td className="py-2 capitalize">{user.kycStatus}</td>
                        <td className="py-2 space-x-2">
                          {user.kycDocument && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUser({ id: user.id, username: user.username })}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Document
                              </Button>
                              {user.kycStatus === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => approveKYCMutation.mutate(user.id)}
                                  disabled={approveKYCMutation.isPending}
                                >
                                  {approveKYCMutation.isPending ? 'Approving...' : 'Approve KYC'}
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">User</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions?.map((tx) => {
                      const user = users?.find(u => u.id === tx.userId);
                      return (
                        <tr key={tx.id} className="border-b">
                          <td className="py-2">{user?.username}</td>
                          <td className="py-2 capitalize">{tx.type}</td>
                          <td className="py-2">{tx.amount} {tx.type === 'buy' ? 'JOD' : 'USDT'}</td>
                          <td className="py-2 capitalize">{tx.status}</td>
                          <td className="py-2">
                            {tx.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement transaction approval
                                }}
                                disabled={false}
                              >
                                Approve
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}