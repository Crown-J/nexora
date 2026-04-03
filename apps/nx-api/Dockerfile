FROM node:22-alpine

# Prisma on Alpine：engines 需要 OpenSSL
RUN apk add --no-cache openssl libc6-compat

# 安裝 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 複製 monorepo 根與 nx-api／db-core 完整原始碼（先複製再 install，避免 hoisted 在 package 下產生 node_modules 後與後續 COPY 衝突）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db-core ./packages/db-core
COPY apps/nx-api ./apps/nx-api

# 安裝依賴（hoisted：集中於根 node_modules；Prisma 用根 CLI，Nest 見下一段明確路徑）
RUN pnpm install --frozen-lockfile --node-linker hoisted

# 產生 Prisma client（使用根目錄的 prisma CLI + 明確 schema；pnpm hoisted 下 filter exec 仍可能找不到 package 內 prisma）
RUN pnpm exec prisma generate --schema packages/db-core/prisma/schema.prisma

# Build nx-api（pnpm 產生的 nest shim 仍指向子目錄 node_modules；改以根 hoisted 的 CLI 路徑呼叫）
WORKDIR /app/apps/nx-api
RUN node ../../node_modules/@nestjs/cli/bin/nest.js build

EXPOSE 3000

CMD ["node", "dist/main"]
