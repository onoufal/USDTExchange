import { Transaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { AdminTransactionDetails } from "./admin-transaction-details";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AdminTransactionListProps {
  transactions: Transaction[];
  onApprove: (transactionId: number) => void;
}

export function AdminTransactionList({ transactions, onApprove }: AdminTransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">
                {transaction.type === "sell" ? "Sell USDT" : "Buy USDT"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Amount: {transaction.amount} USDT at {transaction.rate} JOD
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransaction(transaction)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              {transaction.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => onApprove(transaction.id)}
                >
                  Approve
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <AdminTransactionDetails transaction={selectedTransaction} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
