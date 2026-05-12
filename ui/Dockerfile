FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer-cache friendly)
COPY package.json ./
RUN npm install

# Build the React app
COPY . .
RUN npm run build

# Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
