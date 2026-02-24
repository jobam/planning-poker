# Stage 1: Build Angular client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npx ng build

# Stage 2: Build server
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app/server
COPY --from=server-build /app/server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server-build /app/server/dist ./dist
WORKDIR /app
COPY --from=client-build /app/client/dist ./client/dist
RUN chown -R app:app /app
USER app
WORKDIR /app/server
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
