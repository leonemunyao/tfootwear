import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

// Create New Product
router.post('/', async (req, res) => {
    const { name, price, description, imageUrl, stock } = req.body;
    const product = await prisma.product.create({
        data: {name, price, description, imageUrl, stock},
    });
    res.status(201).json(product);
});


export default router;
