# GTC Project

A full-stack application built with a web frontend and a Node.js/TypeScript backend, leveraging Prisma for robust database interactions and npm for efficient monorepo package management.

## Table of Contents

- [GTC Project](#gtc-project)
  - [Table of Contents](#table-of-contents)
  - [Project Structure](#project-structure)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Dependencies with Docker](#running-dependencies-with-docker)
  - [Database Setup](#database-setup)
  - [Running the Project](#running-the-project)
    - [Start the API](#start-the-api)
    - [Start the Web Application](#start-the-web-application)
    - [Start Both (Development)](#start-both-development)
  - [Scripts](#scripts)
  - [Technologies Used](#technologies-used)

## Project Structure

This project is a monorepo managed with `npm` (using workspaces), containing two main applications:

-   `apps/api`: The backend application, likely built with Node.js and TypeScript, using Prisma for ORM.
-   `apps/web`: The frontend web application, likely built with a modern JavaScript framework (e.g., React/Next.js).

## Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (LTS version recommended)
-   npm (comes bundled with Node.js)
-   Docker and Docker Compose (for running dependencies like the database and cache)

## Getting Started

Follow these steps to get your development environment set up:

## Installation

1.  **Clone the Repository:**
    ```bash
    git clone [<your-repo-url>](https://github.com/eforgecorp/Networkgtc-point.git)
    cd Networkgtc-point
    ```

2.  **Install Dependencies:**
    Navigate to the root of the project and install all dependencies for the monorepo:
    ```bash
    npm install
    ```

## Environment Variables

This project uses environment variables to configure its different parts: the Docker services, the backend API, and the frontend web application.

---------Frontend--------
```.env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

```

---------Backend--------
```.env
PORT=4000
DATABASE_URL="mysql://app:app_pw@127.0.0.1:3307/gtc_local"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="dev_supersecret_change_me"
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_FROM="GTC <noreply@gtc.local>"
APP_BASE_URL="http://localhost:3000"
WEB_BASE_URL="http://localhost:3000"
FILE_STORAGE_ROOT="./uploads"
QUEUE_CONCURRENCY=8
SHADOW_DATABASE_URL="mysql://root:root_pw@127.0.0.1:3307/gtc_shadow"
```

---------Docker--------
```.env.docker
# apps/api/.env.docker  (container dev)
PORT=4000
DATABASE_URL="mysql://app:app_pw@mysql:3306/gtc_local"
REDIS_URL="redis://redis:6379"
JWT_SECRET="dev_supersecret_change_me"
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_FROM="GTC <noreply@gtc.local>"
APP_BASE_URL="http://localhost:3000"
FILE_STORAGE_ROOT="./uploads"
QUEUE_CONCURRENCY=8
SHADOW_DATABASE_URL="mysql://root:root_pw@127.0.0.1:3307/gtc_shadow"
```

**Note:** Adjust `DATABASE_URL` to match your database setup (e.g., PostgreSQL, MySQL, SQLite).

## Running Dependencies with Docker

The simplest way to run the required services (PostgreSQL database and Redis cache) is by using Docker Compose.

1.  **Start the services:**
    From the root of the project, run:
    ```bash
    docker-compose up -d
    ```
    This will start the PostgreSQL and Redis containers in the background. The credentials and ports are pre-configured to match the example `.env` file.

## Database Setup

This project uses Prisma as its ORM.

1.  **Apply Database Migrations:**
    ```bash
    npx prisma migrate dev --name init
    ```
    This command will create the database schema based on your `prisma/schema.prisma` file.
2.  **Seed the Database (optional):**
    If you have a seed script, you can run it:
    ```bash
    npx prisma db seed
    ```

## Running the Project

You can run the API and web applications separately or together.

### Start the API

Navigate to the `apps/api` directory and start the backend server:
```bash
npm run dev --workspace=api
```
The API will typically run on `http://localhost:4000` (or the port specified in `API_PORT`).

### Start the Web Application

Navigate to the `apps/web` directory and start the frontend development server:
```bash
cd apps/web
pnpm dev # Or `pnpm start` for production build
```
The web application will typically run on `http://localhost:3000` (or the port specified in `WEB_PORT`).

### Start Both (Development)

From the root directory, you might have a script to start both applications concurrently (e.g., using `concurrently` or similar tools). If not, you'll need two terminal windows.

**Example (if `package.json` has a root `dev` script):**
```bash
pnpm dev
```
This would typically run `pnpm --filter=./apps/api dev` and `pnpm --filter=./apps/web dev` concurrently.

## Scripts

Common scripts available in `package.json` files:

-   **Root:**
    -   `pnpm install`: Install all dependencies.
    -   `pnpm dev`: Start both API and Web in development mode (if configured).
-   **`apps/api`:**
    -   `pnpm dev`: Start the API in development mode (with hot-reloading).
    -   `pnpm build`: Build the API for production.
    -   `pnpm start`: Start the built API in production mode.
    -   `pnpm lint`: Lint API code.
    -   `pnpm test`: Run API tests.
-   **`apps/web`:**
    -   `pnpm dev`: Start the web app in development mode.
    -   `pnpm build`: Build the web app for production.
    -   `pnpm start`: Start the built web app in production mode.
    -   `pnpm lint`: Lint web app code.
    -   `pnpm test`: Run web app tests.

## Technologies Used

-   **Backend:** Node.js, TypeScript, Prisma, (potentially Express/Fastify/NestJS)
-   **Frontend:** React/Next.js, styled-jsx
-   **Database:** PostgreSQL/MySQL/SQLite (via Prisma)
-   **Package Management:** pnpm
-   **Caching/KV Store:** Keyv (with various adapters like Redis, Mongo, etc.)
-   **Utilities:** braces, micromatch, fill-range, is-number, word-wrap