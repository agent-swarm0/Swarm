# SWARM backend container.
#
# IMPORTANT: build with the REPO ROOT as context (not server/), so the agent
# registry + prompts can be bundled:
#
#   docker build -f server/Dockerfile -t swarm-server .
#   docker run -p 8787:8787 swarm-server
#
# --- build stage -------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# --- runtime stage -----------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
# Agent registry lives outside server/; point the app at the bundled copy.
ENV SWARM_CONFIG_PATH=/app/swarm.config.json

COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist ./dist

# Read-only agent registry + system prompts (resolved relative to the config).
COPY swarm.config.json /app/swarm.config.json
COPY agents /app/agents

EXPOSE 8787
USER node
CMD ["node", "dist/index.js"]
