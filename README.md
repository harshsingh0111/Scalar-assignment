This repository was migrated from @harshranjan0522 due to account reset.
Fork the repo and download the zipped file.
Unzip the file and open with any compiler (VS Code preffered).

Software Requirement-
Node.js (v18+ recommended)
MySQL Server
Git (optional)

1. Clone/Create Project
   git clone <your-repo-link>
   cd trello-clone
2. Open MySQL
   mysql -u root -p
3. Create Database
   CREATE DATABASE trello_clone;
   USE trello_clone;
4. Backend
   cd backend
   npm init -y
   npm install express mysql2 cors dotenv
5. Create .env file
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=trello_clone
   PORT=5000
6. Run Backend
   node src/server.js
7. Frontend
   cd frontend
   npm create vite@latest
   npm install
   npm install axios @hello-pangea/dnd
   npm run dev

Tech Stack - React.js, Node.js, MySQL 
Deployed Using - Vercel, Railway
