# Auth Service

A lightweight authentication layer that sits in front of your application and delegates sign‑in/out, token refresh and user‑info retrieval to **Amazon Cognito** using the **OpenID Connect** flow.  
It is written in **TypeScript**, runs on **Express**, and ships with a production‑ready Docker image plus a GitHub Actions workflow that automatically builds and publishes that image.

---

## Purpose

* Provide a simple, self‑contained service that:
    * Redirects users to Cognito for login and receives the authorization code callback  
      (`/auth/login`, `/auth/callback`)
    * Handles logout through Cognito’s `/logout` endpoint  
      (`/auth/logout`)
    * Exposes management endpoints for refreshing tokens and retrieving user‑info  
      (`/management/refresh`, `/management/userinfo`)
* Store tokens and user data in an **Express session** (in‑memory by default) so the rest of your stack can stay stateless.
* Log all significant events with **Winston** for easier troubleshooting.

---

## Tech stack

We are using Express, combined with openid‑client which connects the Cognito service
to our auth service, in order to allow users to sign-up and authenticate.

---

## Running locally

### 1. Prerequisites

* Node 18+
* npm (ships with Node)
* A Cognito User Pool and App Client  
  (Note the **client ID**, **client secret**, and your pool’s issuer URL)

### 2. Environment variables

Create an `.env` file or export the following variables:

```env
COGNITO_SECRET=<app_client_secret>
HOSTNAME=http://localhost
PORT=3000               # or any free port
REDIRECT_URL=http://localhost:3000/auth/callback   # optional; defaults to HOSTNAME:PORT
```

### 3. Install and start in watch mode

```bash
npm install
npm run dev   # nodemon + ts-node
```

Open `http://localhost:3000/` and click **Login** to start the flow.

### 4. Production build

```bash
npm run build          # transpiles TypeScript to dist/
npm start              # runs node dist/server.js
```

---

## Running with Docker

```bash
# build the image
docker build -t auth-service .

# run it
docker run --env-file .env -p 3000:3000 auth-service
```

The multi‑stage Dockerfile installs only production dependencies in the final image for a small footprint.

---

## CI / CD

A GitHub Actions workflow:

1. Builds the Docker image on every push to `main`.
2. Publishes it to GitHub Container Registry (`ghcr.io`).
3. Updates the image tag in the downstream Kubernetes manifest (see `update-manifest` job).
