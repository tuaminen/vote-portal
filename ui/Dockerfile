# ---- build stage ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Adjust if your Angular CLI script name differs
RUN npm run build -- --configuration production

# ---- serve stage ----
FROM nginx:alpine

# Simple SPA fallback + gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy Angular dist (replace 'dist/vote-portal/browser' with your dist path if different)
COPY --from=build /app/dist/vote-portal/browser /usr/share/nginx/html
EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]
