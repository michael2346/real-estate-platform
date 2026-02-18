const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const axios = require("axios");
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Data files
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PROPERTIES_FILE = path.join(__dirname, 'data', 'properties.json');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(PROPERTIES_FILE)) {
  fs.writeFileSync(PROPERTIES_FILE, JSON.stringify([], null, 2));
}

// Helper functions
const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
  
};
const UNLOCKS_FILE = path.join(__dirname, 'data', 'unlocks.json');

if (!fs.existsSync(UNLOCKS_FILE)) {
  fs.writeFileSync(UNLOCKS_FILE, JSON.stringify([], null, 2));
}

const readUnlocks = () => {
  try {
    const data = fs.readFileSync(UNLOCKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeUnlocks = (unlocks) => {
  fs.writeFileSync(UNLOCKS_FILE, JSON.stringify(unlocks, null, 2));
};



const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const readProperties = () => {
  try {
    const data = fs.readFileSync(PROPERTIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeProperties = (properties) => {
  fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(properties, null, 2));
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, userType, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !userType || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const users = readUsers();

    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: uuidv4(),
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      userType,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(newUser);
    writeUsers(users);

    // Generate token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = readUsers();

    // Find user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.userId);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// Initialize Paystack Payment (Unlock Seller Contact)
app.post("/api/payments/initialize", authenticateToken, async (req, res) => {
  try {
    const { propertyId, amount } = req.body;

    if (!propertyId || !amount) {
      return res.status(400).json({
        message: "propertyId and amount are required"
      });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        message: "PAYSTACK_SECRET_KEY is missing in environment variables"
      });
    }

    const user = req.user;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: Number(amount) * 100, // kobo
        metadata: {
          propertyId,
          userId: user.id,
          purpose: "unlock_contact"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error("Paystack initialize error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Unable to initialize payment" });
  }
});

// Verify Paystack Payment and Save Unlock
app.get("/api/payments/verify/:reference", authenticateToken, async (req, res) => {
  try {
    const reference = req.params.reference;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const paystackData = response.data;

    if (!paystackData.status) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const transaction = paystackData.data;

    // Must be successful
    if (transaction.status !== "success") {
      return res.status(400).json({
        message: "Payment not successful",
        transactionStatus: transaction.status
      });
    }

    const metadata = transaction.metadata || {};
    const propertyId = metadata.propertyId;

    if (!propertyId) {
      return res.status(400).json({ message: "Missing propertyId in metadata" });
    }

    // Save unlock record
    const unlocks = readUnlocks();

    const alreadyUnlocked = unlocks.find(
      (u) => u.userId === req.user.id && u.propertyId === propertyId
    );

    if (!alreadyUnlocked) {
      unlocks.push({
        id: uuidv4(),
        userId: req.user.id,
        propertyId,
        reference,
        amount: transaction.amount / 100,
        paidAt: new Date().toISOString()
      });

      writeUnlocks(unlocks);
    }

    return res.json({
      message: "Payment verified and contact unlocked",
      propertyId,
      reference
    });
  } catch (error) {
    console.error("Paystack verify error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Unable to verify payment" });
  }
});


    // Paystack transaction details
    const transaction = paystackData.data;

    if (transaction.status !== "success") {
      return res.status(400).json({
        message: "Payment not successful",
        transactionStatus: transaction.status
      });
    }

    const metadata = transaction.metadata || {};
    const propertyId = metadata.propertyId;

    if (!propertyId) {
      return res.status(400).json({ message: "Missing propertyId in metadata" });
    }

    // Save unlock record
    const unlocks = readUnlocks();

    const alreadyUnlocked = unlocks.find(
      (u) => u.userId === req.user.id && u.propertyId === propertyId
    );

    if (!alreadyUnlocked) {
      unlocks.push({
        id: uuidv4(),
        userId: req.user.id,
        propertyId,
        reference,
        amount: transaction.amount / 100,
        paidAt: new Date().toISOString()
      });

      writeUnlocks(unlocks);
    }

    return res.json({
      message: "Payment verified and contact unlocked",
      propertyId,
      reference
    });
  } catch (error) {
    console.error("Paystack verify error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Unable to verify payment" });
  }
});
// Check if user has unlocked a property contact
app.get("/api/unlocks/:propertyId", authenticateToken, (req, res) => {
  const propertyId = req.params.propertyId;

  const unlocks = readUnlocks();

  const unlocked = unlocks.some(
    (u) => u.userId === req.user.id && u.propertyId === propertyId
  );

  res.json({ unlocked });
});



// ============ PROPERTY ROUTES ============

// Get all properties
app.get('/api/properties', (req, res) => {
  try {
    const properties = readProperties();
    
    // Filter by query params
    let filtered = properties;
    
    if (req.query.type) {
      filtered = filtered.filter(p => p.type === req.query.type);
    }
    if (req.query.listingType) {
      filtered = filtered.filter(p => p.listingType === req.query.listingType);
    }
    if (req.query.state) {
      filtered = filtered.filter(p => p.state === req.query.state);
    }
    if (req.query.maxPrice) {
      filtered = filtered.filter(p => p.price <= parseFloat(req.query.maxPrice));
    }

    res.json({ 
      count: filtered.length,
      properties: filtered 
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single property
app.get('/api/properties/:id', (req, res) => {
  try {
    const properties = readProperties();
    const property = properties.find(p => p.id === req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ property });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create property (protected)
app.post('/api/properties', authenticateToken, (req, res) => {
  try {
    const {
      title,
      type,
      listingType,
      price,
      location,
      state,
      bedrooms,
      bathrooms,
      size,
      description,
      images
    } = req.body;

    // Validation
    if (!title || !type || !listingType || !price || !location || !state || !description) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const users = readUsers();
    const owner = users.find(u => u.id === req.user.userId);

    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const properties = readProperties();

    const newProperty = {
      id: uuidv4(),
      title,
      type,
      listingType,
      price: parseFloat(price),
      location,
      state,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      size: size ? parseInt(size) : null,
      description,
      images: images || [],
      ownerId: owner.id,
      ownerName: `${owner.firstName} ${owner.lastName}`,
      ownerPhone: owner.phone,
      ownerEmail: owner.email,
      status: 'active',
      createdAt: new Date().toISOString(),
      views: 0
    };

    properties.push(newProperty);
    writeProperties(properties);

    res.status(201).json({
      message: 'Property listed successfully',
      property: newProperty
    });

  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update property (protected - owner only)
app.put('/api/properties/:id', authenticateToken, (req, res) => {
  try {
    const properties = readProperties();
    const propertyIndex = properties.findIndex(p => p.id === req.params.id);

    if (propertyIndex === -1) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = properties[propertyIndex];

    // Check if user is the owner
    if (property.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'You can only update your own properties' });
    }

    // Update fields
    const updatedProperty = {
      ...property,
      ...req.body,
      id: property.id, // Prevent ID change
      ownerId: property.ownerId, // Prevent owner change
      updatedAt: new Date().toISOString()
    };

    properties[propertyIndex] = updatedProperty;
    writeProperties(properties);

    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });

  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete property (protected - owner only)
app.delete('/api/properties/:id', authenticateToken, (req, res) => {
  try {
    const properties = readProperties();
    const propertyIndex = properties.findIndex(p => p.id === req.params.id);

    if (propertyIndex === -1) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = properties[propertyIndex];

    // Check if user is the owner
    if (property.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete your own properties' });
    }

    properties.splice(propertyIndex, 1);
    writeProperties(properties);

    res.json({ message: 'Property deleted successfully' });

  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's properties (protected)
app.get('/api/my-properties', authenticateToken, (req, res) => {
  try {
    const properties = readProperties();
    const userProperties = properties.filter(p => p.ownerId === req.user.userId);
    
    res.json({
      count: userProperties.length,
      properties: userProperties
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ CONTACT ROUTE ============

app.post('/api/contact', (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body;

    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    // In a real app, you would send an email here
    // For now, we'll just log it
    console.log('Contact form submission:', {
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      date: new Date().toISOString()
    });

    res.json({ message: 'Message sent successfully' });

  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ STATS ROUTE ============

app.get('/api/stats', (req, res) => {
  try {
    const users = readUsers();
    const properties = readProperties();

    res.json({
      totalUsers: users.length,
      totalProperties: properties.length,
      propertiesForSale: properties.filter(p => p.listingType === 'sale').length,
      propertiesForRent: properties.filter(p => p.listingType === 'rent').length
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'HomeConnect API is running',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (requires token)'
      },
      properties: {
        list: 'GET /api/properties',
        create: 'POST /api/properties (requires token)',
        get: 'GET /api/properties/:id',
        update: 'PUT /api/properties/:id (requires token)',
        delete: 'DELETE /api/properties/:id (requires token)',
        myProperties: 'GET /api/my-properties (requires token)'
      },
      contact: 'POST /api/contact',
      stats: 'GET /api/stats'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🏠 HomeConnect Backend Server                          ║
║                                                          ║
║   Server running on: http://localhost:${PORT}              ║
║                                                          ║
║   API Documentation: http://localhost:${PORT}/             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
app.get("/api/unlocks/:propertyId", authenticateToken, (req, res) => {
  const propertyId = req.params.propertyId;

  const unlocks = readUnlocks();

  const unlocked = unlocks.some(
    (u) => u.userId === req.user.id && u.propertyId === propertyId
  );

  res.json({ unlocked });
});
