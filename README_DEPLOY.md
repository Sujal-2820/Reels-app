# Deployment Guide

This guide explains how to deploy the Reels App to **Render** (Backend) and **Vercel** (Frontend).

## 1. Backend Deployment (Render)

### Steps:
1.  **Create a New Web Service** on Render.
2.  **Connect your GitHub Repository**.
3.  **Root Directory:** Set to `reels-app/backend`.
4.  **Runtime:** `Node`.
5.  **Build Command:** `npm install`
6.  **Start Command:** `node server.js`
7.  **Environment Variables:**
    *   `PORT`: `5000` (or leave default, Render will handle it)
    *   `NODE_ENV`: `production`
    *   `FRONTEND_URL`: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
    *   `JWT_SECRET`: A random secure string
    *   `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
    *   `CLOUDINARY_API_KEY`: Your Cloudinary API key
    *   `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
    *   `FIREBASE_SERVICE_ACCOUNT`: The contents of your `serviceAccountKey.json` as a single-line JSON string.
        *   *Tip: In terminal, run `cat serviceAccountKey.json | jq -c .` or use an online JSON to single-line converter.*

## 2. Frontend Deployment (Vercel)

### Steps:
1.  **Create a New Project** on Vercel.
2.  **Connect your GitHub Repository**.
3.  **Root Directory:** Set to `reels-app/frontend`.
4.  **Framework Preset:** `Vite`.
5.  **Build Command:** `npm run build`
6.  **Output Directory:** `dist`
7.  **Environment Variables:**
    *   `VITE_API_URL`: Your Render backend URL (e.g., `https://your-backend.onrender.com/api`)
    *   `VITE_FIREBASE_API_KEY`: Your Firebase client API Key
    *   `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth Domain
    *   `VITE_FIREBASE_PROJECT_ID`: Your Firebase Project ID
    *   `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage Bucket
    *   `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging Sender ID
    *   `VITE_FIREBASE_APP_ID`: Your Firebase App ID

### Notes:
-   The `vercel.json` file in `frontend/` handles SPA routing to ensure `index.html` is served for all routes.
-   Ensure you have configured **CORS** in the backend by setting the `FRONTEND_URL` environment variable correctly.
