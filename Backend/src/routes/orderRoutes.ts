// Handle order creation and processing

import express, { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, isAdmin } from '../middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// Interface for order creation
interface CreateOrderRequest {
  userId: number;
  items: {
    productId: number;
    quantity: number;
  }[];
}

// Create new order (authenticated users)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { items } = req.body as CreateOrderRequest;
    const userId = req.user.id; // From auth middleware

    // Calculate total price
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        res.status(404).json({ error: `Product ${item.productId} not found` });
        return;
      }

      if (product.stock < item.quantity) {
        res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
        return;
      }

      total += product.price * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: 'pending',
        items: {
          create: orderItems
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json(order);
    return;
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
    return;
  }
});

// Get all orders (admin only)
router.get('/all', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });
    res.json(orders);
    return;
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
    return;
  }
});

// Get specific order by ID (admin or order owner)
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Check if user is admin or order owner
    if (!req.user.isAdmin && order.userId !== req.user.id) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    res.json(order);
    return;
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
    return;
  }
});

// Get user's orders (authenticated user)
router.get('/my-orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(orders);
    return;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
    return;
  }
});

// Update order status (admin only)
router.patch('/:id/status', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const orderId = parseInt(req.params.id);

    if (!['pending', 'shipped', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    res.json(order);
    return;
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
    return ;
  }
});

// Delete order (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    await prisma.order.delete({
      where: { id: orderId }
    });
    res.status(204).send();
    return;
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
    return;
  }
});

export default router;
