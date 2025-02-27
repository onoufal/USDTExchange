import { Transaction } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";

interface TransactionDetailsProps {
  transaction: Transaction;
}

export function AdminTransactionDetails({ transaction }: TransactionDetailsProps) {
  const renderPaymentDetails = () => {
    if (transaction.type === "sell") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">CliQ Method:</span>
            <span className="font-medium">{transaction.cliqType === "number" ? "Phone Number" : "CliQ Alias"}</span>
          </div>
          {transaction.cliqType === "number" ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Phone Number:</span>
              <span className="font-medium font-mono">{transaction.cliqNumber}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">CliQ Alias:</span>
              <span className="font-medium">{transaction.cliqAlias}</span>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Payment Method:</span>
          <span className="font-medium">{transaction.paymentMethod}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Transaction Type:</span>
            <span className="font-medium capitalize">{transaction.type}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{transaction.amount} USDT</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rate:</span>
            <span className="font-medium">{transaction.rate} JOD</span>
          </div>
          {transaction.type === "sell" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Network:</span>
              <span className="font-medium uppercase">{transaction.network}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">Payment Details</h4>
          {renderPaymentDetails()}
        </div>
      </CardContent>
    </Card>
  );
}
