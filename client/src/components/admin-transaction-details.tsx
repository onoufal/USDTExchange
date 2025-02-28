import { Transaction } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";

interface TransactionDetailsProps {
  transaction: Transaction;
}

export function AdminTransactionDetails({ transaction }: TransactionDetailsProps) {
  const renderPaymentDetails = () => {
    if (transaction.type === "sell") {
      // First get the CliQ payment type
      const cliqPaymentType = transaction.cliqType === "number" ? "Phone Number" : "CliQ Alias";
      // Then get the corresponding value based on the type
      const cliqPaymentValue = transaction.cliqType === "number" 
        ? transaction.cliqNumber 
        : transaction.cliqAlias;

      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">CliQ Method:</span>
            <span className="font-medium">{cliqPaymentType}</span>
          </div>
          {cliqPaymentValue && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{cliqPaymentType}:</span>
              <span className="font-medium font-mono">{cliqPaymentValue}</span>
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