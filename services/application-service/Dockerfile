# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.base.json ./
COPY services/application-service ./services/application-service

RUN npm install
RUN npm run build --workspace=@jwt-drop/application-service

# Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/services/application-service/dist/server.cjs ./dist/server.cjs
COPY keys/public.key ./keys/public.key

USER node

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
