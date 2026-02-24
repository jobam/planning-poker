# Planning Poker

Real-time Planning Poker app for Agile teams. Estimate stories together with your team — no account required.

## Features

- Create games with custom names and deck types
- Join via shareable URL with a name of your choice
- Real-time multiplayer voting with WebSocket
- Multiple deck types: Fibonacci, Modified Fibonacci, T-Shirt Sizes, Powers of Two
- Vote reveal with statistics (average, median, distribution, consensus)
- Spectator mode
- Built-in timer
- Responsive design

## Tech Stack

- **Frontend:** Angular 19 + Tailwind CSS v4
- **Backend:** Express + Socket.io
- **Language:** TypeScript throughout
- **Deployment:** Docker + GitHub Actions

## Development

```bash
# Install dependencies
npm install && cd client && npm install && cd ../server && npm install && cd ..

# Run both client and server in dev mode
npm run dev
```

Client runs on `http://localhost:4200`, server on `http://localhost:3000`.

## Production

```bash
# Build Docker image
docker build -t planning-poker .

# Run
docker run -p 3000:3000 -e CORS_ORIGIN=https://your-domain.com planning-poker
```

Or with Docker Compose:

```bash
docker compose up -d
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed origins (comma-separated) |

## License

MIT
