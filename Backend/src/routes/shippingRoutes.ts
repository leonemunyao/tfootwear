import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface ShippingDetailsRequest {
  orderId: number;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  status: 'pending' | 'shipped' | 'delivered' | 'failed';
}

// Add shipping details
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const shippingDetails = req.body as ShippingDetailsRequest;
    const userId = req.user.id;

    // Verify order belongs to user or user is admin
    const order = await prisma.order.findUnique({
      where: { id: shippingDetails.orderId }
    });

    if (!order || (order.userId !== userId && !req.user.isAdmin)) {
       res.status(404).json({ error: 'Order not found' });
       return;
    }

    const shipping = await prisma.shipping.create({
      data: {
        orderId: shippingDetails.orderId,
        address: shippingDetails.address,
        city: shippingDetails.city,
        postalCode: shippingDetails.postalCode,
        phone: shippingDetails.phone,
        trackingNumber: shippingDetails.trackingNumber,
        estimatedDelivery: shippingDetails.estimatedDelivery,
        status: shippingDetails.status || 'pending'
      }
    });

     res.status(201).json(shipping);
     return;

  } catch (error) {
    console.error('Create shipping error:', error);
    res.status(500).json({ error: 'Failed to create shipping details' });
    return;
  }
});

// Get shipping details for an order
router.get('/:orderId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const shipping = await prisma.shipping.findFirst({
      where: {
        orderId: parseInt(orderId),
        order: {
          OR: [
            { userId },
            { userId: req.user.isAdmin ? undefined : userId }
          ]
        }
      },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!shipping) {
       res.status(404).json({ error: 'Shipping details not found' });
       return;
    }

    res.json(shipping);
    return;

  } catch (error) {
    console.error('Get shipping error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping details' });
    return;
  }
});

// Update shipping details (Admin only)
router.patch('/:orderId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const updates = req.body as Partial<ShippingDetailsRequest>;

    const shipping = await prisma.shipping.findFirst({
      where: { orderId: parseInt(orderId) }
    });

    if (!shipping) {
       res.status(404).json({ error: 'Shipping details not found' });
       return;
    }

    const updatedShipping = await prisma.shipping.update({
      where: { id: shipping.id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

     res.json(updatedShipping);
     return;

  } catch (error) {
    console.error('Update shipping error:', error);
    res.status(500).json({ error: 'Failed to update shipping details' });
    return;
  }
});

// Delete shipping details (Admin only)
router.delete('/:orderId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const shipping = await prisma.shipping.findFirst({
      where: { orderId: parseInt(orderId) }
    });

    if (!shipping) {
       res.status(404).json({ error: 'Shipping details not found' });
       return;
    }

    await prisma.shipping.delete({
      where: { id: shipping.id }
    });

    res.status(204).send();
    return;

  } catch (error) {
    console.error('Delete shipping error:', error);
    res.status(500).json({ error: 'Failed to delete shipping details' });
    return;
  }
});

export default router;
