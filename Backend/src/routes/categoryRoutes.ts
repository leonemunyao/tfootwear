import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface CategoryRequest {
  name: string;
  description?: string;
}

// Create new category (Admin only)
router.post('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body as CategoryRequest;

    if (!name) {
       res.status(400).json({ error: 'Category name is required' });
       return;
    }

    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingCategory) {
      res.status(400).json({ error: 'Category already exists' });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name,
        ...(description && { description })
      }
    });

     res.status(201).json(category);
     return;

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
    return;
  }
});

// Get all categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

     res.json(categories);
     return;

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
    return;
  }
});

// Get products in category
router.get('/:id/products', async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          where: {
            stock: { gt: 0 } // Only in-stock products
          }
        }
      }
    });

    if (!category) {
       res.status(404).json({ error: 'Category not found' });
       return;
    }

     res.json(category);
     return;

  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ error: 'Failed to fetch category products' });
    return;
  }
});

// Update category (Admin only)
router.patch('/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    const updates = req.body as Partial<CategoryRequest>;

    if (updates.name) {
      // Check if new name conflicts with existing category
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: { equals: updates.name, mode: 'insensitive' },
          NOT: { id: categoryId }
        }
      });

      if (existingCategory) {
         res.status(400).json({ error: 'Category name already exists' });
         return;
      }
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: updates
    });

     res.json(category);
     return;

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
    return;
  }
});

// Delete category (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);

    // Check if category has products
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
       res.status(404).json({ error: 'Category not found' });
       return;
    }

    if (category._count.products > 0) {
        res.status(400).json({ 
        error: 'Cannot delete category with existing products',
        productCount: category._count.products
      });
      return;
    }

    await prisma.category.delete({
      where: { id: categoryId }
    });

     res.status(204).send();
     return;

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
    return;
  }
});

export default router;
