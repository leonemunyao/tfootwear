import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

interface ProductRequest {
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  stock: number;
  categoryId: number;
}

type ProductRequestType = Request<{}, any, ProductRequest>;

// Get all products
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Fetching all products...');
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products...', error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Create New Product
router.post( '/', async (req: Request<{}, any, ProductRequest>, res: Response ) => {
  try {
    console.log('Creating a new product...', req.body);
    const { name, price, description, imageUrl, stock, categoryId } = req.body;

    // Validating the required fields
    if (!name || !price || !description || !imageUrl || stock === undefined || !categoryId) {
        res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'price', 'description', 'imageUrl', 'stock', 'categoryId'],
        received: req.body 
      });
      return;
    }

    // Validating data types
    if (typeof price !== 'number' || typeof stock !== 'number') {
        res.status(400).json({
        error: 'Invalid data types',
        expected: {
          price: 'float',
          stock: 'number',
          categoryId: 'number'
        },
        received: {
          price: typeof price,
          stock: typeof stock,
          categoryId: typeof categoryId
        }
      });
      return;
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
       res.status(400).json({ error: 'Category not found' });
       return;
    }

    const product = await prisma.product.create({
        data: {
          name,
          price,
          description,
          imageUrl,
          stock,
          categoryId
        },
        include: {
          category: true
        }
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product...', error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// Get a product by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    console.log('Fetching product by id...');
    const { id } = req.params;
    const product = await prisma.product.findUnique({
        where: { id: parseInt(id) },
    });
    res.json(product);
  } catch (error) {
    console.error('Error fetching product by id...', error);
    res.status(404).json({ error: 'Product not found.' });
    }
});

// Update entire product by id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    console.log('Updating product...');
    const { id } = req.params;
    const { name, price, description, imageUrl, stock } = req.body;
    const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: { name, price, description, imageUrl, stock },
    });
    res.json(product);
  } catch (error) {
    console.error('Error updating product...', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// Update specific product details by id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    console.log('Updating product...');
    const { id } = req.params;
    const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: req.body,
    });
    res.json(product);
  } catch (error) {
    console.error('Error updating product...', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// Delete a product by id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    console.log('Deleting product...');
    const { id } = req.params;
    const product = await prisma.product.delete({
        where: { id: parseInt(id) },
    });
    res.json(product);
  } catch (error) {
    console.error('Error deleting product...', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// Delete all products
router.delete('/', async (req: Request, res: Response) => {
  try {
    console.log('Deleting all products...');
    const products = await prisma.product.deleteMany();
    res.json(products);
  } catch (error) {
    console.error('Error deleting products...', error);
    res.status(500).json({ error: 'Failed to delete products.' });
  }
});


export default router;
