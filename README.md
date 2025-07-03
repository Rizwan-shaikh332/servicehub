# Service Hub Platform

A comprehensive service management platform with React frontend and Flask backend, featuring user management and dynamic pricing for LLR, DL, and DL print services.

## 🚀 Features

### Admin Portal
- Create users with auto-generated credentials
- Set individual pricing for services (LLR, DL, DL Print)
- View and manage all users
- No authentication required for admin access

### User Portal
- Secure login with provided credentials
- View personalized service pricing
- Professional dashboard interface
- Session management

## 🛠 Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS
- React Router
- Axios
- React Hot Toast

**Backend:**
- Python Flask
- MongoDB with PyMongo
- Flask-CORS
- Environment configuration

## 📁 Project Structure

```
service-hub/
├── frontend/           # React application
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── services/  # API services
│   │   └── ...
│   └── package.json
├── backend/           # Flask API server
│   ├── app.py        # Main application
│   ├── requirements.txt
│   └── .env          # Environment variables
└── README.md
```

## 🚀 Getting Started

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables in `.env`:
```
MONGO_URI=mongodb+srv://Junaid_Shaikh:Gulshan%40Junaid@cluster0.dgrgpxv.mongodb.net/servicehub
FLASK_DEBUG=True
```

4. Run the Flask server:
```bash
python app.py
```

Server will start at `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Application will start at `http://localhost:3000`

## 📋 Usage

1. **Access Admin Portal**: Navigate to `/admin` - no login required
2. **Create Users**: Use the admin dashboard to create users and get their credentials
3. **Set Prices**: Configure individual pricing for each user's services
4. **User Login**: Users can login at `/login` with provided credentials
5. **View Dashboard**: Users see their personalized pricing dashboard

## 🎨 Design Features

- Modern glassmorphism UI with backdrop blur effects
- Responsive design for all screen sizes
- Professional color scheme and typography
- Smooth animations and hover states
- Clean card-based layouts
- Toast notifications for user feedback

## 🔒 Security

- Secure user authentication
- Password protection for user accounts
- Session management with localStorage
- CORS configured for cross-origin requests

## 📊 Database Schema

**Users Collection:**
```javascript
{
  _id: ObjectId,
  name: String,
  loginId: String,
  password: String,
  prices: {
    llr: Number,
    dl: Number,
    dlPrint: Number
  },
  createdAt: Date
}
```

## 🔧 API Endpoints

### Admin Endpoints
- `POST /api/admin/create-user` - Create new user
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/set-prices` - Update user prices

### Authentication
- `POST /api/auth/login` - User login

### User Endpoints
- `GET /api/user/prices/:id` - Get user pricing

## 🚀 Deployment

The application is ready for production deployment with:
- Optimized build process
- Environment variable configuration
- Scalable architecture
- Professional UI/UX design

## 📝 License

This project is proprietary software developed for service management purposes.