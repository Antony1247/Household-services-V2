# Household Services Application - V2

A multi-user web application built to provide comprehensive home servicing and solutions. The platform connects customers with verified service professionals and includes admin-level control and monitoring for efficient service management.

##  Features

###  Core Functionalities
- **Role-Based Access Control (RBAC)**:
  - Admin (superuser, no registration)
  - Service Professionals
  - Customers

- **Admin Dashboard**:
  - Manage and monitor all users
  - Approve/reject service professionals
  - block/unblock all user types
  - Create, update, and delete services
  - Search services
  - Trigger CSV exports of service data

- **Customer Portal**:
  - Register/Login
  - Search services
  - Create, edit service requests
  - Post service reviews

- **Service Professional Portal**:
  - Register/Login
  - Accept/Reject assigned service requests
  - Mark services as completed
  - Export closed service requests as CSV

### 🔄 Batch Jobs (Celery + Redis)
- **Daily Reminder Job**: Alerts inactive service professionals about pending requests via email.
- **Monthly Activity Report**: HTML-based report emailed to customers.
- **CSV Export**: Admin-triggered export of service request data.

### ⚙️ Tech Stack
- **Backend**: Flask (Python)
- **Frontend**: VueJS + Bootstrap
- **Database**: SQLite
- **Caching & Scheduled Job**: Redis + Celery
- **Email/Alerts**: SMTP (Configurable)


## Setup Instructions

### 1. Clone the Repo
```bash
git clone https://github.com/your-username/household-services-app.git
cd household-services-app
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate
```

### 3. Start Redis Server
```bash
redis-server
```
### 4. Start Flask App
```bash
python main.py
```
### 5. Run Celery Workers (in a new terminal)
```bash
celery -A main.celery worker --loglevel=info
```

### 5. Run Scheduled Tasks
```bash
celery -A main.celery beat --loglevel=info
```

## Demo Credentials
```bash
username: admin
password: admin123
```


