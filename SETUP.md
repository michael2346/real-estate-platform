# HomeConnect - Complete Setup Guide

This guide will help you set up and run the HomeConnect real estate platform with the backend.

## 📁 Project Structure

```
real-estate-platform/
├── index.html          # Home page
├── login.html          # Login/Register page
├── upload.html         # Property upload page
├── properties.html     # Property listings page
├── contact.html        # Contact page
├── styles.css          # Main stylesheet
├── backend/            # Backend folder
│   ├── server.js       # Main server file
│   ├── package.json    # Dependencies
│   ├── README.md       # Backend documentation
│   └── data/           # JSON database files
│       ├── users.json
│       └── properties.json
└── SETUP.md           # This file
```

## 🚀 Quick Start

### Step 1: Start the Backend Server

1. Open your terminal/command prompt
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```

3. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. You should see this message:
   ```
   🏠 HomeConnect Backend Server
   Server running on: http://localhost:3000
   ```

**Keep this terminal window open!** The server needs to run continuously.

### Step 2: Open the Frontend

You have two options:

#### Option A: Using VS Code Live Server (Recommended)
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. Your browser will open at `http://127.0.0.1:5500`

#### Option B: Direct File Open
1. Simply double-click `index.html`
2. It will open in your browser
3. Note: Some features may not work due to CORS restrictions

### Step 3: Test the Application

1. Go to **Login** page
2. Click **Register** tab
3. Fill in your details and create an account
4. You should be automatically logged in and redirected to the home page
5. Try listing a property on the **Upload** page
6. View properties on the **Properties** page

## 🔧 Backend API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | Create new account | No |
| `/api/auth/login` | POST | Login to account | No |
| `/api/auth/me` | GET | Get current user | Yes |
| `/api/properties` | GET | Get all properties | No |
| `/api/properties` | POST | Create property | Yes |
| `/api/properties/:id` | GET | Get single property | No |
| `/api/my-properties` | GET | Get user's properties | Yes |
| `/api/contact` | POST | Submit contact form | No |
| `/api/stats` | GET | Get platform stats | No |

## 📊 Database (JSON Files)

The backend uses simple JSON files for data storage:

- `backend/data/users.json` - Stores user accounts
- `backend/data/properties.json` - Stores property listings

You can view and edit these files directly if needed.

## 🔒 Authentication

The backend uses JWT (JSON Web Tokens) for authentication:

1. When you login/register, the server returns a token
2. This token is stored in your browser's localStorage
3. For protected routes, the token is sent in the Authorization header

## 🛠️ Troubleshooting

### "Unable to connect to server" error
- Make sure the backend server is running
- Check that the server is on port 3000
- Try refreshing the page

### "Email already registered" error
- The email is already in the database
- Use a different email or login with the existing one

### Changes not showing up
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Restart the backend server
- Check browser console for errors (F12)

### CORS errors
- Make sure you're using Live Server (not direct file open)
- Check that the backend CORS settings allow your frontend URL

## 📝 Customization

### Change the server port
Edit `backend/server.js` and change:
```javascript
const PORT = process.env.PORT || 3000;
```
to:
```javascript
const PORT = process.env.PORT || 5000; // or any port you prefer
```

### Change JWT Secret
For security, change the JWT secret in production:
```javascript
const JWT_SECRET = 'your-new-secret-key-here';
```

## 🚀 Deploying to Production

When you're ready to deploy:

1. **Backend**: Use a service like:
   - Heroku
   - Railway
   - Render
   - DigitalOcean

2. **Frontend**: Use a service like:
   - Netlify
   - Vercel
   - GitHub Pages

3. Update the `API_URL` in your frontend files to point to your deployed backend

## 📞 Need Help?

If you have any issues:
1. Check the browser console (F12) for errors
2. Check the backend terminal for server errors
3. Make sure all dependencies are installed
4. Verify the server is running on the correct port

## 🎓 Learning Resources

Since you're learning backend development, here are some helpful resources:

- **Express.js**: https://expressjs.com/
- **Node.js**: https://nodejs.org/
- **JWT**: https://jwt.io/introduction
- **bcrypt**: For password hashing

---

**Good luck with your learning journey! 🎉**
