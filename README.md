# 🚀 Taskly - Multi-Tenant Real-Time Task Management System

## 📌 Overview

Taskly is a **multi-tenant, real-time task management platform** designed to simulate how modern SaaS systems operate at scale.

It supports **organization-based isolation, role-based access control, and real-time collaboration**, making it closer to a production-grade system than a basic CRUD application.

This project emphasizes not just features, but also **system design, scalability, and clean architecture**.

---

## 🧠 Key Highlights

* 🏢 **Multi-Tenant Architecture** — Data is strictly isolated per organization
* 🔐 **JWT-Based Authentication** — Stateless and scalable authentication system
* 👥 **Role-Based Access Control (RBAC)** — Admin / Leader / User permissions
* ⚡ **Real-Time Updates** — Powered by Socket.io with organization-level event broadcasting
* 📊 **Structured Backend Design** — Modular controllers, routes, and middleware
* 🧩 **Scalable Data Modeling** — MongoDB schemas aligned with query patterns
* 🔔 **Persistent Notifications System**
* 🎯 **Production-Oriented Thinking** — Includes security considerations and scalability planning

---

## 🏗️ Architecture

### Backend

* Node.js + Express
* MongoDB (Mongoose ODM)
* JWT Authentication
* Socket.io for real-time communication

### Frontend

* Next.js (Pages Router)
* REST API integration
* Local state with real-time synchronization via sockets

---

## 🔐 Authentication Flow

1. **Signup**

   * Creates a new Organization
   * The first user is assigned the `admin` role
   * A JWT is issued containing:

     ```
     { userId, organizationId, role, email }
     ```

2. **Login**

   * Password is verified using bcrypt
   * JWT is issued for session management

3. **Authorization**

   * Token is sent via `Authorization: Bearer <token>`
   * Middleware validates the token and injects user context

---

## 👥 Role-Based Access

| Role   | Permissions                                               |
| ------ | --------------------------------------------------------- |
| Admin  | Create users, assign roles, create projects, create tasks |
| Leader | Create projects and assign tasks                          |
| User   | View assigned tasks and update task status                |

> Note: "User" corresponds to "member" in UI terminology.

---

## 🏢 Multi-Tenant Isolation

* Every user belongs to an **organization**
* All queries are scoped by `organizationId`
* Data isolation is enforced at:

  * Project level
  * Task level (via project association)
  * User level

This ensures strict **data separation between organizations**.

---

## 📋 Task System

### Features

* Task creation (Admin / Leader)
* Assignment to users
* Priority levels: `low`, `medium`, `high`
* Status lifecycle:

  * `todo → in-progress → done`

### Constraints

* Only the assigned user can update task status
* Cross-organization access is restricted
* Notifications are generated on status updates

---

## ⚡ Real-Time System

* Users connect via Socket.io with JWT authentication
* Each user joins an organization-specific room:

  ```
  org_<organizationId>
  ```

### Events

* `task-created`
* `task-updated`
* `task-status-changed`

### Behavior

* Admins and Leaders receive all organization updates
* Users receive updates only for tasks assigned to them

---

## 🔔 Notifications

* Stored persistently in the database
* Triggered on:

  * Task status updates
* Designed for future extensions such as:

  * Email notifications
  * Activity feeds

---

## 🧩 Project Structure

```
backend/
  src/
    controllers/
    models/
    routes/
    middleware/
    utils/
    socket/

frontend/
  pages/
  utils/
  services/
```

---

## 📈 Scalability Considerations

### Planned Improvements

* Add `organizationId` to the Task model
* Introduce cursor-based pagination
* Integrate Redis for:

  * Caching
  * Socket scaling (adapter)
* Implement a job queue (BullMQ) for asynchronous processing
* Add database indexing based on query patterns

---

## 🧠 System Design Decisions

* **Stateless backend** → Enables easier horizontal scaling
* **Organization-based socket rooms** → Efficient real-time communication
* **RBAC model** → Simple and extensible access control
* **Separation of concerns** → Clean division of controllers, routes, and middleware

---

## 🚀 Setup Instructions

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env` file in the backend:

```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
PORT=5000
```

---

## 📌 Future Enhancements

* Audit logging system
* Organization-level activity feed
* Advanced RBAC (permission matrix)
* Analytics dashboard
* Soft delete support
* Email and push notifications
* API rate limiting
* Input validation (Zod/Joi)

---

## 💡 What This Project Demonstrates

This project demonstrates:

* Strong understanding of **backend architecture**
* Ability to design **multi-tenant systems**
* Awareness of **real-world scalability challenges**
* Practical implementation of **real-time systems**
* Thinking beyond CRUD towards **system design principles**

---

## ⭐ Final Note

This is not just a task manager — it is a **foundation for a scalable SaaS system**, built with clear design decisions and a strong focus on extensibility and improvement.
