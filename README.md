Civilytix Internship - Backend API

Complete backend system for geospatial data access with user authentication and payment validation.

Features
- User authentication
- Payment status validation
- Geospatial data APIs
- Request history logging
- MongoDB integration

API Endpoints
- `POST /api/data/region` - Get data for circular region
- `POST /api/data/path` - Get data for path corridor  
- `GET /api/user/history` - Get request history
- `GET /api/user/history/{requestId}` - Get specific result

Installation
1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Server runs on `http://localhost:5000`

## 📬 Testing
Use Postman with `user-id` header for authentication.
