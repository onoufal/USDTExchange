import request from 'supertest';
import express from 'express';
import { storage } from '../storage';
import { setupAuth } from '../auth';

const app = express();
app.use(express.json());
setupAuth(app);

describe('Authentication', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    email: 'test@example.com',
    isVerified: true,
    role: 'user',
    createdAt: new Date(),
  };

  describe('POST /api/login', () => {
    it('should authenticate valid credentials', async () => {
      // Mock storage to return our test user
      (storage.getUserByUsername as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'testuser',
          password: 'correctpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      (storage.getUserByUsername as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'wronguser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject unverified users', async () => {
      (storage.getUserByUsername as jest.Mock).mockResolvedValue({
        ...mockUser,
        isVerified: false
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'testuser',
          password: 'correctpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('verify your email');
    });
  });

  describe('GET /api/user', () => {
    it('should return user data for authenticated users', async () => {
      const authenticatedRequest = request(app).get('/api/user');
      // Simulate an authenticated session
      authenticatedRequest.set('Cookie', ['connect.sid=test-session']);
      
      const response = await authenticatedRequest;
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/user');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
