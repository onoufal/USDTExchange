import { TransactionService } from '../services/transaction.service';
import { storage } from '../storage';
import { createNotification } from '../services/notification.service';

// Mock dependencies
jest.mock('../storage');
jest.mock('../services/notification.service');

describe('TransactionService', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    cliqType: 'alias',
    cliqAlias: 'test_alias',
    cliqNumber: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    const validBuyData = {
      type: 'buy',
      amount: '100',
      rate: 0.71,
      paymentMethod: 'cliq'
    };

    it('should create a buy transaction successfully', async () => {
      const mockTransaction = {
        id: 1,
        ...validBuyData,
        userId: mockUser.id,
        status: 'pending',
        createdAt: expect.any(Date)
      };

      (storage.createTransaction as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await TransactionService.createTransaction(
        mockUser.id,
        validBuyData,
        'proof.jpg',
        mockUser as any
      );

      expect(result).toEqual(mockTransaction);
      expect(storage.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          type: 'buy',
          amount: '100',
          status: 'pending'
        })
      );
    });

    it('should validate CliQ settings for sell orders', async () => {
      const sellData = {
        type: 'sell',
        amount: '100',
        rate: 0.71,
        network: 'TRC20'
      };

      // Test with missing CliQ settings
      await expect(
        TransactionService.createTransaction(
          mockUser.id,
          sellData,
          'proof.jpg',
          { ...mockUser, cliqType: null, cliqAlias: null } as any
        )
      ).rejects.toThrow('CliQ settings must be configured');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        type: 'invalid',
        amount: -100
      };

      await expect(
        TransactionService.createTransaction(
          mockUser.id,
          invalidData,
          'proof.jpg',
          mockUser as any
        )
      ).rejects.toThrow();
    });
  });

  describe('approveTransaction', () => {
    it('should approve transaction and create notification', async () => {
      const mockTransaction = {
        id: 1,
        userId: mockUser.id,
        type: 'buy',
        amount: '100',
        status: 'approved'
      };

      (storage.approveTransaction as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await TransactionService.approveTransaction(1, mockUser.id);

      expect(result).toEqual(mockTransaction);
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          type: 'order_approved'
        })
      );
    });
  });
});
