import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = require("express").Router();
const prisma = new PrismaClient();

// Get all users (Admin only)
router.get('/users', authenticateToken, isAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orders: {
          select: {
            _count: true
          }
        }
      }
    });

    res.json(users);
    return;
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
    return;
  }
});

// Update user role (Admin only)
router.patch('/users/:id/role', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!['admin', 'customer'].includes(role)) {
       res.status(400).json({ error: 'Invalid role' });
       return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    res.json(user);
    return;
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
    return;
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: true
      }
    });

    if (!user) {
       res.status(404).json({ error: 'User not found' });
       return;
    }

    // Prevent deleting users with orders
    if (user.orders.length > 0) {
        res.status(400).json({
        error: 'Cannot delete user with existing orders',
        orderCount: user.orders.length
      });
      return;
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(204).send();
    return;
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
    return;
  }
});

// Get all orders (Admin only)
router.get('/orders', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = status ? { status: status as string } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
        },
        skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      orders,
      metadata: {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
    return;
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
    return;
  }
});

// Update order status (Admin only)
router.patch('/orders/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
       res.status(400).json({ error: 'Invalid order status' });
       return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    // You could add email notification here
    // await sendOrderStatusUpdateEmail(order.user.email, order.status);

    res.json(order);
    return;
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
    return;
  }
});

export default router;
