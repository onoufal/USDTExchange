import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import TradeForm from "@/components/trade-form";
import KYCForm from "@/components/kyc-form";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const showKYCWarning = !user?.mobileVerified || user?.kycStatus !== "approved";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trading Section */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Trade USDT</CardTitle>
              <CardDescription>Buy or sell USDT for Jordanian Dinar (JOD)</CardDescription>
            </CardHeader>
            <CardContent>
              {showKYCWarning ? (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please complete mobile verification and KYC before trading
                  </AlertDescription>
                </Alert>
              ) : (
                <TradeForm />
              )}
            </CardContent>
          </Card>
        </div>

        {/* KYC & Status Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <KYCForm />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction History */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Rate</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((tx) => (
                  <tr key={tx.id} className="border-b">
                    <td className="py-2 capitalize">{tx.type}</td>
                    <td className="py-2">{tx.amount} {tx.type === 'buy' ? 'JOD' : 'USDT'}</td>
                    <td className="py-2">{tx.rate}</td>
                    <td className="py-2 capitalize">{tx.status}</td>
                    <td className="py-2">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
