import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  size?: string;
  inStock?: boolean;
  sortBy?: 'price' | 'name' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

// Search products with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      q: searchQuery,
      minPrice,
      maxPrice,
      category,
      size,
      inStock,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    // Build where clause
    const where: any = {};

    // Search by name
    if (searchQuery) {
      where.OR = [
        {
          name: {
            contains: searchQuery as string,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: searchQuery as string,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    // Category
    if (category) {
      where.category = category;
    }

    // Size
    if (size) {
      where.sizes = {
        some: {
          size: size
        }
      };
    }

    // Stock status
    if (inStock === 'true') {
      where.stock = {
        gt: 0
      };
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Build sort object
    const orderBy: any = {};
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder;
        break;
      case 'newest':
        orderBy.createdAt = sortOrder;
        break;
      default:
        orderBy.name = sortOrder;
    }

    // Execute search query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: Number(limit),
        include: {
          sizes: true,
          category: true
        }
      }),
      prisma.product.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    const hasNextPage = Number(page) < totalPages;
    const hasPreviousPage = Number(page) > 1;

    res.json({
      products,
      metadata: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });
    return;

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
    return;
  }
});

// Get available filters
router.get('/filters', async (_req: Request, res: Response) => {
  try {
    const [categories, sizes, priceRange] = await Promise.all([
      prisma.category.findMany(),
      prisma.size.findMany(),
      prisma.product.aggregate({
        _min: {
          price: true
        },
        _max: {
          price: true
        }
      })
    ]);

    res.json({
      categories,
      sizes,
      priceRange: {
        min: priceRange._min.price,
        max: priceRange._max.price
      }
    });
    return;

  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
    return;
  }
});

export default router;
