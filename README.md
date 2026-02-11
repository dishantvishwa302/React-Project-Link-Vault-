# Secret Share App

A secure, full-stack application.
**Frontend**: React (Vite)
**Backend**: Express + MongoDB + Supabase

---

## 1. Setup

### A. Prerequisites
1.  **MongoDB Atlas**: Get connection string.
2.  **Supabase**: For storing the data on cloud

### B. Backend
1.  `cd backend`
2.  `npm install`
3.  Create `.env`:
    ```
    MONGO_URI=...
    SUPABASE_URL=...
    SUPABASE_KEY=...
    ```
4.  `node server.js` (Runs on port 5000)

### C. Frontend
1.  `cd frontend`
2.  `npm install` (Installs React and Vite)
3.  `npm run dev` (Runs on port 5173)
4.  Open browser link shown in terminal.

---

## 2. Architecture
*   **Vite**: Handles React build/dev server.
*   **Express**: Handles API and Cloud logic.
*   **Supabase**: Stores files.
*   **MongoDB**: Stores metadata.


# React-Project-Link-Vault-
