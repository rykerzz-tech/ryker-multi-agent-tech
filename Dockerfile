FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY . .

FROM node:20-slim
WORKDIR /app

# Create non-root user for security
RUN groupadd -r ryker && useradd -r -g ryker -d /app -s /sbin/nologin ryker

COPY --from=builder /app ./

# Ensure non-root owns the app directory
RUN chown -R ryker:ryker /app

USER ryker

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
  CMD node -e "const h=require('http');const r=h.request('http://localhost:3000/health',res=>process.exit(res.statusCode<500?0:1));r.on('error',()=>process.exit(1));r.setTimeout(3000,()=>{r.destroy();process.exit(1)});r.end()"

CMD ["node", "bin/server.js"]
