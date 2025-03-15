import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface AddToCartRequest {
  productId: number;
  quantity: number;
}

// Add item to cart
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body as AddToCartRequest;
    const userId = req.user.id;

    // Validate input
    if (!productId || quantity < 1) {
       res.status(400).json({ error: 'Invalid product or quantity' });
       return;
    }

    // Check if product exists and has enough stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
    }

    if (product.stock < quantity) {
       res.status(400).json({ error: 'Insufficient stock' });
       return;
    }

    // Find or create user's cart
    let cart = await prisma.cart.findFirst({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId
      }
    });

    if (existingItem) {
      // Update quantity if item exists
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      // Add new item to cart
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity
        }
      });
    }

     res.status(201).json({ message: 'Item added to cart' });
     return;

  } catch (error) {
    console.error('Add to cart error:', error);
     res.status(500).json({ error: 'Failed to add item to cart' });
     return;
  }
});

// Get user's cart
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                stock: true
              }
            }
          }
        }
      }
    });

    if (!cart) {
       res.json({ items: [] });
       return;
    }

     res.json(cart);
     return;

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
    return;
  }
});

// Update item quantity
router.patch('/items/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (quantity < 1) {
       res.status(400).json({ error: 'Invalid quantity' });
       return;
    }

    // Verify item belongs to user's cart
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: parseInt(itemId),
        cart: {
          userId
        }
      },
      include: {
        product: true
      }
    });

    if (!cartItem) {
       res.status(404).json({ error: 'Cart item not found' });
       return;
    }

    // Check stock availability
    if (cartItem.product.stock < quantity) {
       res.status(400).json({ error: 'Insufficient stock' });
       return;
    }

    // Update quantity
    const updatedItem = await prisma.cartItem.update({
      where: { id: parseInt(itemId) },
      data: { quantity },
      include: {
        product: true
      }
    });

     res.json(updatedItem);
     return;

  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
    return;
  }
});

// Remove item from cart
router.delete('/items/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    // Verify item belongs to user's cart
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: parseInt(itemId),
        cart: {
          userId
        }
      }
    });

    if (!cartItem) {
       res.status(404).json({ error: 'Cart item not found' });
       return;
    }

    // Delete item
    await prisma.cartItem.delete({
      where: { id: parseInt(itemId) }
    });

     res.status(204).send();
     return;

  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
    return;
  }
});

export default router;
