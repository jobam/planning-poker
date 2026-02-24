import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './game-manager.js';
import { registerSocketHandlers } from './socket-handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env['PORT'] || 3000;

const app = express();
const rawOrigin = process.env['CORS_ORIGIN'];
const allowedOrigins = rawOrigin?.trim()
  ? rawOrigin.split(',').map((o) => o.trim())
  : ['http://localhost:4200'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

const gameManager = new GameManager();
registerSocketHandlers(io, gameManager);

// Serve Angular build in production
const clientDist = path.join(__dirname, '../../client/dist/client/browser');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
