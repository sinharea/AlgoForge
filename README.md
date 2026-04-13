# AlgoForge

Repository: https://github.com/sinharea/AlgoForge

AlgoForge is a full-stack coding platform built using the MERN stack that allows users to practice Data Structures and Algorithms, execute code in real time, and track their progress through analytics.

It provides a LeetCode-like environment with problem filtering, automated test case evaluation, and a personalized performance dashboard.

---

## Tech Stack

Frontend
- React.js
- Axios
- CSS / Tailwind

Backend
- Node.js
- Express.js
- MongoDB (Mongoose)

Authentication
- JWT-based authentication
- Role-based access (User/Admin)

Integration
- Real-time multi-language code execution API
- Automated test case validation

---

## Features

### User
- Secure Signup/Login
- Solve coding problems in multiple languages
- Real-time code execution
- Automatic test case evaluation
- Submission history tracking
- Performance analytics

### Problem Management
- Create, Read, Update, Delete problems
- Difficulty levels: Easy / Medium / Hard
- Topic-wise filtering
- User submission tracking

### Dashboard
- Total problems solved
- Difficulty-wise breakdown
- Topic-wise progress

### Admin
- Add, update, and delete problems
- Manage test cases
- Role-based system access

---

## Project Structure

AlgoForge/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
│
├── frontend/
│   ├── public/
│   └── src/
│
├── docker-compose.yml
├── package-lock.json
└── README.md

---

## Installation and Setup

### 1. Clone the Repository

git clone https://github.com/sinharea/AlgoForge.git  
cd AlgoForge

---

### 2. Backend Setup

cd backend  
npm install  

Create a .env file inside backend:

PORT=5000  
MONGO_URI=your_mongodb_connection_string  
JWT_SECRET=your_jwt_secret  
CODE_EXEC_API=your_code_execution_api_url  

Start backend:

npm start

---

### 3. Frontend Setup

cd ../frontend  
npm install  
npm start  

Frontend runs at: http://localhost:3000

---

## Code Execution Flow

1. User writes code  
2. Code is sent to backend  
3. Backend sends it to execution API  
4. Output is compared with test cases  
5. Result is stored in MongoDB  

---

## Future Improvements

- Contest mode
- Leaderboard
- Company-wise problem sets
- Discussion forum
- Docker optimization
- CI/CD pipeline

---

## Author

Rea Sinha  
B.Tech CSE, IIIT Guwahati  
GitHub: https://github.com/sinharea
