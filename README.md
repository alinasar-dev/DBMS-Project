# 🏫 Campus Maintenance Management System (CMMS)

A full-stack web application for managing campus maintenance complaints and staff assignments.

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS (Vanilla), JavaScript |
| Backend | Node.js + Express |
| Database | MySQL |
| Icons | Feather Icons |
| Font | Inter (Google Fonts) |

## ✨ Features

- **Role-based login** — Separate dashboards for Students, Staff, and Admin
- **Student** — Register, submit maintenance complaints, track status
- **Admin** — View all complaints, assign to staff, delete tickets, manage staff directory
- **Staff** — View assigned tasks and mark them as Resolved
- **Dark/Light theme** — Smooth 0.5s transition, LeetCode-inspired design with green accent
- **Real-time persistence** — All data stored in MySQL via REST API

## 🗄️ Database Schema

5 relational tables: `Students`, `Administrators`, `Maintenance_Staff`, `Complaints`, `Assignments`

## ⚙️ Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- MySQL (local or cloud)

### 2. Clone the repository
```bash
git clone https://github.com/alinasar-dev/DBMS-Project.git
cd DBMS-Project
```

### 3. Install dependencies
```bash
npm install
```

### 4. Set up the database
- Open MySQL Workbench (or any MySQL client)
- Run `database/schema.sql` to create the database, tables and seed data

### 5. Configure environment
Create a `.env` file in the project root:
```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cmms_db
PORT=3000
```

### 6. Start the server
```bash
node server.js
```

Open your browser at: **http://localhost:3000/index.html**

## 🔑 Default Credentials (from seed data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@campus.edu | 123 |
| Staff (Mike) | mike@campus.edu | 123 |
| Staff (Sarah) | sarah@campus.edu | 123 |
| Student | Register via the app | — |

> ⚠️ Change these passwords before deploying to production.

## 👨‍💻 Developer

- **GitHub:** [alinasar-dev](https://github.com/alinasar-dev)
- **Email:** alinasar@gmail.com

## 📄 License

MIT License — free to use and modify.
