# AWS EC2 Deployment Standard Operating Procedure (SOP)

This guide provides a step-by-step process to deploy a MERN stack application (MongoDB, Express, React, Node.js) on an AWS EC2 instance. This SOP is designed to be generic so it can be applied to **this project (`inplay`)** as well as **future projects**.

---

## 🏗️ 1. Code Preparation (Before Deployment)

Before moving code to the server, ensure your project is ready for a production environment.

### A. Frontend Changes (`frontend/`)
1.  **API URL Handling**:
    *   **Do not hardcode `http://localhost:5000`**.
    *   Use **Environment Variables**. Create a `.env` file in your frontend root (local) and `.env.production` for build.
    *   **Vite**: Use `VITE_API_URL=/api` (relative path if using Nginx reverse proxy) or the full domain `https://api.yourdomain.com`.
    *   *Example (`src/config.js` or `api.js`):*
        ```javascript
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        export default API_BASE_URL;
        ```

2.  **Build Check**:
    *   Run `npm run build` locally to ensure there are no errors.
    *   This will create a `dist/` folder. **Do not upload `dist/` or `node_modules/` to Git.** `dist/` will be generated on the server.

### B. Backend Changes (`backend/`)
1.  **Port Configuration**:
    *   Ensure your server listens on a dynamic port using `process.env.PORT`.
    *   *Example (`server.js`):*
        ```javascript
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
        ```
2.  **Environment Variables**:
    *   Do not commit `.env` files to GitHub.
    *   List all required keys in a `.env.example` file (e.g., `MONGO_URI`, `JWT_SECRET`, `PORT`, `RAZORPAY_KEY_ID`).

---

## ☁️ 2. AWS EC2 Setup

1.  **Launch Instance**:
    *   **OS**: Ubuntu Server 22.04 LTS (Recommended) or 24.04 LTS.
    *   **Instance Type**: `t2.micro` (Free tier eligible) or higher depending on traffic.
    *   **Key Pair**: Create and download a `.pem` key pair (e.g., `my-project-key.pem`).
    *   **Security Group**: Allow Inbound traffic for:
        *   SSH (Port 22) - My IP (for security)
        *   HTTP (Port 80) - Anywhere
        *   HTTPS (Port 443) - Anywhere

2.  **Connect to Instance**:
    *   Open Terminal (Mac/Linux) or Git Bash/PowerShell (Windows).
    *   Set permissions (if on Mac/Linux): `chmod 400 key.pem`
    *   Connect:
        ```bash
        ssh -i "path/to/key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
        ```

---

## 🛠️ 3. Server Configuration (Run only once per server)

Run these commands on your EC2 terminal to set up the environment.

### A. Update & Install Essentials
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl unzip build-essential
```

### B. Install Node.js (Latest LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Verify
node -v
npm -v
```

### C. Install PM2 (Process Manager)
PM2 keeps your backend running 24/7.
```bash
sudo npm install -g pm2
```

### D. Install Nginx (Web Server)
Nginx will serve the frontend and route API requests to the backend.
```bash
sudo apt install -y nginx
```

---

## 📂 4. Project Deployment Steps

### A. Setup Folder Structure
We will store the app in `/var/www/`.

1.  **Navigate to directory**:
    ```bash
    cd /var/www/
    ```
2.  **Clone Repository**:
    ```bash
    # Replace with your actual Git URL
    sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git my-app
    ```
3.  **Fix Permissions** (So `ubuntu` user can edit without `sudo`):
    ```bash
    sudo chown -R ubuntu:ubuntu /var/www/my-app
    ```

### B. Backend Setup
1.  Navigate to backend folder:
    ```bash
    cd /var/www/my-app/backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Create `.env` file**:
    ```bash
    nano .env
    ```
    *   Paste your production environment variables here (MONGO_URI, JWT_SECRET, etc.).
    *   Press `Ctrl+X`, `Y`, `Enter` to save.
4.  **Start with PM2**:
    ```bash
    pm2 start server.js --name "inplay-backend"
    # To enable restart on boot:
    pm2 startup
    pm2 save
    ```

### C. Create Required Folders (Important!)
Since `uploads/` are likely ignored in Git, you must create them manually for file uploads to work.
1.  Navigate to backend:
    ```bash
    cd /var/www/my-app/backend
    ```
2.  **Create directories**:
    ```bash
    mkdir -p uploads/images
    mkdir -p uploads/videos
    mkdir -p uploads/audio
    ```
3.  **Set Permissions** (so the app can write to them):
    ```bash
    sudo chmod -R 775 uploads
    sudo chown -R ubuntu:ubuntu uploads
    ```

### D. Frontend Setup
1.  Navigate to frontend folder:
    ```bash
    cd /var/www/my-app/frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Create `.env` setup** (if needed):
    ```bash
    nano .env
    ```
    *   Add `VITE_API_URL=https://yourdomain.com/api` (or just `/api` if on same domain).
4.  **Build the project**:
    ```bash
    npm run build
    ```
    *   This generates a `dist` folder at `/var/www/my-app/frontend/dist`.

---

## 🌐 5. Nginx Configuration (The Bridge)

We need to tell Nginx to serve `frontend/dist` for the website and proxy `/api` requests to the backend authentication.

1.  **Edit Nginx Config**:
    ```bash
    sudo nano /etc/nginx/sites-available/default
    ```
2.  **Replace content with the following**:
    *(Replace `yourdomain.com` with your domain or EC2 Public IP if you don't have one yet)*

    ```nginx
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com; # Or Put your Public IP here

        # Frontend - Serve Static Files
        location / {
            root /var/www/my-app/frontend/dist;
            index index.html;
            try_files $uri $uri/ /index.html; # Critical for React Router
        }

        # Backend - Reverse Proxy
        location /api/ {
            proxy_pass http://localhost:5000/; # Matches your Backend PORT (process.env.PORT)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Serve Uploaded Files (Images/Videos/Audio) - Performance Optimization
        location /uploads/ {
            alias /var/www/my-app/backend/uploads/;
            expires 30d;
            access_log off;
        }
    }
    ```
3.  **Test & Restart Nginx**:
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## 🔒 6. SSL Check (HTTPS) - Optional but Recommended

If you have a domain pointing to the EC2 IP:

1.  **Install Certbot**:
    ```bash
    sudo apt install -y certbot python3-certbot-nginx
    ```
2.  **Get Certificate**:
    ```bash
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```
3.  **Auto-Renew**:
    Certbot handles auto-renewal automatically.

---

## 🔄 7. How to Update Code (Future Deployments)

When you push changes to GitHub, follow these steps to update the live server:

1.  **SSH into server**.
2.  **Go to project folder**:
    ```bash
    cd /var/www/my-app
    ```
3.  **Pull changes**:
    ```bash
    git pull origin main
    ```
4.  **Backend Updates** (if any):
    ```bash
    cd backend
    npm install # If package.json changed
    pm2 restart inplay-backend
    ```
5.  **Frontend Updates** (if any):
    ```bash
    cd ../frontend
    npm install # If package.json changed
    npm run build
    sudo systemctl restart nginx # Usually not needed, but good practice
    ```

---

## 📝 Summary Checklist for Any Project

- [ ] **Code**: Environment variables used? No hardcoded localhost?
- [ ] **Server**: Node.js, Nginx, PM2 installed?
- [ ] **Code Location**: `/var/www/project-name`?
- [ ] **Frontend**: Native `npm run build` works?
- [ ] **Backend**: `pm2` process running?
- [ ] **Nginx**: Configured for `root` (frontend) and `proxy_pass` (backend)?

This SOP can be copied and adapted for any React/Node.js project.
