// Importing module
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import cartRoutes from './routes/cartRoutes';
import categoryRoutes from './routes/categoryRoutes';
import searchRoutes from './routes/searchRoutes';
import shippingRoutes from './routes/shippingRoutes';

const app = express();
const PORT:Number=3000;

// Middlewares
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Root Route
app.get('/', (req, res) => {
    res.send('Welcome to the TFootwera E-commerce API');
});

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/shipping', shippingRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});


// Server setup
app.listen(PORT,() => {
    console.log('The application is listening '
          + 'on port http://localhost:'+PORT);
})

