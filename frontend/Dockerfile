# Image du frontend FamilyBalance (Angular 17 servi par nginx)
# Construction : docker build -t familybalance-frontend frontend

# ---------- Étape 1 : build Angular ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# ---------- Étape 2 : nginx ----------
FROM nginx:1.27-alpine

# Adresse du backend, injectée dans la configuration au démarrage (envsubst de
# l'image nginx officielle). Par défaut : le Service Kubernetes du backend.
ENV BACKEND_UPSTREAM=http://familybalance-backend:3000

# nginx.conf est copié comme modèle : /docker-entrypoint.d/20-envsubst-on-templates.sh
# y remplace ${BACKEND_UPSTREAM} et écrit /etc/nginx/conf.d/default.conf au démarrage.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Angular 17 (builder « application ») produit dist/familybalance-frontend/browser
COPY --from=build /app/dist/familybalance-frontend/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1/healthz"]

CMD ["nginx", "-g", "daemon off;"]
