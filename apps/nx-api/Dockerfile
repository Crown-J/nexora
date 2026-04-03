FROM node:22-alpine

RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /app

# 複製所有必要檔案（先全部複製再安裝，避免 hoisted 與後續層衝突）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db-core ./packages/db-core
COPY apps/nx-api ./apps/nx-api

# 安裝依賴（hoisted：依賴集中在根 node_modules）
RUN pnpm install --frozen-lockfile --node-linker hoisted

# 產生 Prisma client → packages/db-core/generated/prisma
RUN pnpm exec prisma generate --schema packages/db-core/prisma/schema.prisma

# db-core 的 package.json 將 types 指向 dist/index.d.ts；需 tsc 產出後 nx-api 編譯才能解析完整 PrismaClient
# （hoisted 時 typescript 在根 node_modules，`pnpm run build` 在子套件內找不到本地 tsc）
RUN pnpm exec tsc -p packages/db-core/tsconfig.json

# Build nx-api
WORKDIR /app/apps/nx-api
RUN node ../../node_modules/@nestjs/cli/bin/nest.js build

EXPOSE 3000

CMD ["node", "dist/main"]
