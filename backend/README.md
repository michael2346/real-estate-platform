# HomeConnect Backend API

This is the backend server for the HomeConnect real estate platform.

## Features

- ✅ User Registration & Login (with JWT authentication)
- ✅ Password hashing with bcrypt
- ✅ Property CRUD operations
- ✅ JSON file database (no setup required)
- ✅ CORS enabled for frontend connection

## Installation

1. Make sure you have Node.js installed (version 14 or higher)

2. Install dependencies:
```bash
npm install
```

## Running the Server

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login existing user |
| GET | `/api/auth/me` | Get current user (requires token) |

### Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | Get all properties |
| GET | `/api/properties/:id` | Get single property |
| POST | `/api/properties` | Create property (requires token) |
| PUT | `/api/properties/:id` | Update property (requires token) |
| DELETE | `/api/properties/:id` | Delete property (requires token) |
| GET | `/api/my-properties` | Get user's properties (requires token) |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Submit contact form |
| GET | `/api/stats` | Get platform statistics |

## Authentication

Most endpoints require a JWT token. Include it in the Authorization header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Data Storage

All data is stored in JSON files in the `/data` folder:
- `users.json` - User accounts
- `properties.json` - Property listings

## Testing the API

You can test the API using curl or Postman:

### Register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "07087008275",
    "userType": "buyer",
    "password": "password123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## Connecting Frontend

Update your frontend JavaScript to call these API endpoints instead of using localStorage.

Example:
```javascript
const API_URL = 'http://localhost:3000/api';

// Register
async function register(userData) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
}

// Login
async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
}
```
