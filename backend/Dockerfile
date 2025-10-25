FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only for smaller image)
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory and set ownership for non-root user
RUN mkdir -p uploads && chown -R node:node /app/uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {let d='';r.on('data',c=>d+=c);r.on('end',()=>process.exit(r.statusCode===200&&JSON.parse(d).status==='ok'?0:1))})"

# Run as non-root user for security
USER node

CMD ["npm", "start"]
