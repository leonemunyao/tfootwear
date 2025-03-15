import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();


interface PesapalAuthResponse {
    token: string;
    expiryDate: string;
    status: string;
  }

// Interface for Pesapal payment response to define the expected response structure
interface PesapalPaymentResponse {
    order_tracking_id: string;
    redirect_url: string;
    status: string;
    merchant_reference: string;
  }

interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
  baseUrl: string;
}

const pesapalConfig: PesapalConfig = {
  consumerKey: process.env.PESAPAL_CONSUMER_KEY!,
  consumerSecret: process.env.PESAPAL_CONSUMER_SECRET!,
  callbackUrl: `${process.env.BACKEND_URL}/api/payments/callback`,
  baseUrl: process.env.PESAPAL_API_URL || 'https://pay.pesapal.com/v3'
};

// Create payment intent
router.post('/create-intent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    // Fetch order details
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { items: true }
    });

    if (!order || order.userId !== userId) {
       res.status(404).json({ error: 'Order not found' });
       return;
    }

    // Generate auth token for Pesapal
    const authResponse = await axios.post<PesapalAuthResponse>(`${pesapalConfig.baseUrl}/api/Auth/RequestToken`, {
      consumer_key: pesapalConfig.consumerKey,
      consumer_secret: pesapalConfig.consumerSecret
    });

    const token = authResponse.data.token;

    // Create payment request
    const paymentRequest = {
      id: `ORDER-${order.id}-${Date.now()}`,
      currency: 'KES',
      amount: order.total,
      description: `Payment for order #${order.id}`,
      callback_url: pesapalConfig.callbackUrl,
      notification_id: `NOTIFY-${order.id}`,
      billing_address: {
        email_address: req.user.email,
        phone_number: req.body.phoneNumber,
        country_code: 'KE',
        first_name: req.user.name,
        last_name: ''
      }
    };

    const paymentResponse = await axios.post<PesapalPaymentResponse>(
      `${pesapalConfig.baseUrl}/api/Transactions/SubmitOrderRequest`,
      paymentRequest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Store payment intent in database
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.total,
        status: 'pending',
        paymentIntentId: paymentResponse.data.order_tracking_id
      }
    });

     res.json({
      paymentUrl: paymentResponse.data.redirect_url,
      paymentId: payment.id
    });
    return;

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
    return;
  }
});

// Pesapal callback handler
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { orderTrackingId, status } = req.body;

    const payment = await prisma.payment.findFirst({
      where: { paymentIntentId: orderTrackingId },
      include: { order: true }
    });

    if (!payment) {
       res.status(404).json({ error: 'Payment not found' });
       return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: status.toLowerCase() }
    });

    // If payment is successful, update order status
    if (status.toLowerCase() === 'completed') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'paid' }
      });
    }

     res.json({ message: 'Payment status updated' });
     return;

  } catch (error) {
    console.error('Payment callback error:', error);
     res.status(500).json({ error: 'Failed to process payment callback' });
     return;
  }
});

// Get payment history for user
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: {
        order: {
          userId: userId
        }
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

     res.json(payments);
     return;

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
    return;
  }
});

export default router;