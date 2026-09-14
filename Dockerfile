# better-sqlite3 modul native — butuh toolchain build di image builder.
FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
RUN npm install --ignore-scripts
COPY . .
RUN npx nuxt prepare && npx nuxt build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
# Migrasi dijalankan di runtime lewat `db:migrate` — file SQL dan skripnya ikut.
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=build /app/node_modules/bindings ./node_modules/bindings
COPY --from=build /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=build /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build /app/node_modules/nodemailer ./node_modules/nodemailer
RUN mkdir -p /app/data
EXPOSE 2112
CMD ["node", ".output/server/index.mjs"]
