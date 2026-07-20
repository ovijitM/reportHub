# Allen Pharma - Field Sales Digital Reporting System (ReportHub)

A modern, full-stack digital reporting and management system built for **Allen Pharma**. This platform enables Medical Promotion Officers (MPOs) to record daily field activities, doctor/chemist visits, product sales orders, and expense logs while giving Administrators real-time visibility, master data control, and automated PDF export capabilities.

---

## 🚀 Features

### 👨‍⚕️ Medical Promotion Officer (MPO) Portal
* **Sheet 1: Daily Product Orders & Sales Reporting**
  * Log daily chemist sales orders, quantities, unit prices, discounts, and payment terms.
  * Real-time calculation of total order values and net sales.
* **Sheet 2: Daily Doctor & Chemist Visit Logs**
  * Record doctor visits with specialty, call type (First Call / Follow-up), key products discussed, and sample/gift distributions.
  * Log chemist visits and order bookings.
* **Sheet 3: Daily Works, Tour Program & Expense Reports**
  * Track daily station categories (HQ, Ex-HQ, Outstation, Local) and work locations.
  * Log Travel Allowance (TA), Daily Allowance (DA), fare expenses, and official notes.
* **Interactive Dashboard & Summary**
  * View monthly progress, submission status, and lock window countdowns.

### 🛡️ Admin Dashboard & Management
* **Executive Overview**: High-level statistics, daily activity feeds, and system-wide monthly report summaries.
* **PDF Report Generation**: Download official monthly summary statements and field logs in clean, formatted PDF format.
* **Master Market Management**: Configure markets, territories, assigned doctors, and chemist databases.
* **MPO Account Management**: Add, update, activate/deactivate MPO user accounts and reset credentials.
* **Monthly Configurations & Lock Windows**: Assign monthly targets, configure allowances, and enforce strict locking windows for past entries.

---

## 🛠️ Tech Stack

* **Frontend**:
  * [React 18](https://react.dev/) & [Vite](https://vitejs.dev/)
  * [React Router v7](https://reactrouter.com/)
  * [Lucide React](https://lucide.dev/) (Modern UI Icons)
  * Custom Responsive Design System (CSS Variables)

* **Backend**:
  * [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
  * [MongoDB](https://www.mongodb.com/) & [Mongoose ORM](https://mongoosejs.com/)
  * [Redis](https://redis.io/) (Caching layer)
  * [JWT](https://jwt.io/) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (Authentication & Security)
  * [pdfmake](https://pdfmake.org/) (Server-side PDF generation)

* **DevOps & Deployment**:
  * [Docker](https://www.docker.com/) & Docker Compose
  * Nginx static file serving
  * Traefik Reverse Proxy with automated Let's Encrypt SSL/TLS

---

## 📁 Repository Structure

```text
Allen Pharma/
├── backend/
│   ├── src/
│   │   ├── models/         # Mongoose schemas (User, Market, FieldVisit, etc.)
│   │   ├── routes/         # Express API endpoints (Auth, Admin, Orders, PDF)
│   │   ├── services/       # Business logic (PDF Generator, Caching)
│   │   └── middleware/     # Auth and validation middleware
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Admin & MPO views (Sheet1, Sheet2, Sheet3, Overview)
│   │   └── utils/          # API helpers and mock data fallback
│   ├── Dockerfile
│   └── package.json
├── plans/                  # Project specifications and UI/UX design guides
├── docker-compose.yml       # Container orchestration (Backend, Frontend, Redis)
├── package.json            # Root workspace scripts
└── README.md
```

---

## 💻 Getting Started

### Prerequisites
* **Node.js**: v18 or higher
* **npm**: v9 or higher
* **MongoDB**: Local instance or MongoDB Atlas URI (Optional if running backend offline)
* **Redis**: Local or Docker instance (Optional for caching)

### Local Installation & Running

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ovijitM/reportHub.git
   cd reportHub
   ```

2. **Install Dependencies**
   ```bash
   # Install root concurrently runner
   npm install

   # Install Backend dependencies
   cd backend && npm install && cd ..

   # Install Frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/allen-pharma
   JWT_SECRET=your_super_secret_jwt_key
   LOCK_WINDOW_DAYS=7
   DEFAULT_ADMIN_PHONE=01700000000
   DEFAULT_ADMIN_PASSWORD=admin123
   DEFAULT_ADMIN_NAME=Super Admin
   REDIS_URL=redis://localhost:6379
   ```

4. **Start Development Servers**

   From the project root directory, run:
   ```bash
   npm run dev
   ```
   This command starts both the **Backend API** (port `5000`) and **Frontend Vite Server** (port `5173`) concurrently.

---

## 🐳 Docker Deployment

The project is fully dockerized and configured to run behind Traefik reverse proxy.

1. Ensure the `web` external Docker network exists:
   ```bash
   docker network create web
   ```

2. Launch all services:
   ```bash
   docker-compose up -d --build
   ```

The services configured in `docker-compose.yml` include:
* **Backend API**: Node.js container listening internally on port `5000`.
* **Frontend**: Nginx container serving Vite production build on port `80`.
* **Redis**: Redis Alpine instance for session/caching layer.

---

## 📜 License

Private repository for **Allen Pharma**. All rights reserved.
