# This is a project built for Technical test.

This repository contains a full-stack implementation of a real-time customer-to-business chat service, developed as a technical assessment. It includes a Fastify (Node.js/TypeScript) backend and a React (TypeScript/Tailwind CSS) chat widget frontend.

## 📂 Project Structure

.
├── client
│   └── servihub-client
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── src
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── pages
│   │   │   ├── Chat.tsx
│   │   │   └── Index.tsx
│   │   ├── vite-env.d.ts
│   │   └── widgets
│   │   ├── ChatWidget.tsx
│   │   ├── FilePickeWidget.tsx
│   │   └── Login.tsx
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── docker-compose.yaml
├── README.md
├── Retrospective.md
└── server
├── Dockerfile
├── package-lock.json
├── package.json
├── prisma
│   ├── schema.prisma
│   └── seed.ts
├── README.md
├── src
│   ├── app.ts
│   ├── plugins
│   │   ├── chat.ts
│   │   ├── jwtValidate.ts
│   │   ├── login.ts
│   │   └── README.md
│   ├── services
│   │   ├── conversationService.ts
│   │   └── websocketService.ts
│   └── test
│   ├── helper.ts
│   └── plugins
│   ├── chat.test.ts
│   └── login.test.ts
└── tsconfig.json

13 directories, 40 files

## 🚀 Local Development Setup

To get the entire application running on your local machine using Docker Compose:

### Prerequisites

-   **Git**: For cloning the repository.
-   **Node.js** (v22 LTS recommended): Required for `npm` and running frontend/backend scripts.
-   **Docker Desktop**: Includes Docker Engine and Docker Compose. Ensure it's running.

## Requirements:

-   Need to setup the Postgresql database and Redis first.
-   The user credential can be found in server/.env

## Deploy the projects

-   For the frontend, run

```bash
npm run dev
```

-   For the backend, run

```bash
npm run build
npm run dev

npm run test # for running test
```

-   In docker, can just run

```bash
docker compose up
```
