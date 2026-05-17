// apps/nx-api/src/nx09/fulltext-search/fulltext-search.service.ts
// NX09 Postgres FTS 全文搜尋 service（Crown Q3=b ⭐ 業界中小 ERP 罕見）
//
// 對齊：
//   - overview v1.0 §5（Postgres 原生、不裝 Elasticsearch）
//   - audit-01 §6 全文搜尋候選 #16
//   - Hank Q-H5 拍板 simple 分詞（不裝 pg_jieba）
//   - Prisma 對 tsvector 型別支援不完整 → 走 $queryRawUnsafe（plan §7 風險 mitigation）
//
// 業務語意：
//   - GET /nx09/search?q=...&scope=km|doc|manual|all
//   - 跨 3 主檔（KmArticle / Document / SystemManual）SQL FTS
//   - ts_rank 排序、ts_headline 提供 snippet
//
// 安全：
//   - 對 q 純 plainto_tsquery 處理（避免 tsquery 注入）
//   - tenant 隔離 + scope filter

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

export type SearchScope = 'km' | 'doc' | 'manual' | 'all';

interface SearchRow {
  source: 'km' | 'doc' | 'manual';
  id: string;
  title: string;
  snippet: string;
  rank: number;
}

@Injectable()
export class Nx09FulltextSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(user: RequestUser, q: string, scope: SearchScope = 'all', limit = 20) {
    const tenantId = requireTenantId(user);
    const query = q?.trim();
    if (!query) throw new BadRequestException('q (query) is required');

    const cappedLimit = Math.min(Math.max(limit, 1), 100);
    const validScopes: SearchScope[] = ['km', 'doc', 'manual', 'all'];
    if (!validScopes.includes(scope)) {
      throw new BadRequestException(`scope must be one of: ${validScopes.join(' / ')}`);
    }

    const results: SearchRow[] = [];

    // 走 $queryRawUnsafe（Prisma 對 tsvector 不完全支援）+ parameterized values（防 SQL injection）
    if (scope === 'km' || scope === 'all') {
      const kmRows = await this.prisma.$queryRaw<Array<{ id: string; title: string; snippet: string; rank: number }>>(
        PrismaNs.sql`
          SELECT
            id,
            LEFT(question, 100) AS title,
            ts_headline('simple', COALESCE(question, '') || ' ' || COALESCE(answer, ''), plainto_tsquery('simple', ${query}), 'MaxFragments=2,MaxWords=20,MinWords=5') AS snippet,
            ts_rank(search_vector, plainto_tsquery('simple', ${query})) AS rank
          FROM nx09_km_article
          WHERE tenant_id = ${tenantId}
            AND is_active = true
            AND search_vector @@ plainto_tsquery('simple', ${query})
          ORDER BY rank DESC
          LIMIT ${cappedLimit}
        `,
      );
      for (const r of kmRows) {
        results.push({ source: 'km', id: r.id, title: r.title, snippet: r.snippet, rank: Number(r.rank) });
      }
    }

    if (scope === 'doc' || scope === 'all') {
      const docRows = await this.prisma.$queryRaw<Array<{ id: string; title: string; snippet: string; rank: number }>>(
        PrismaNs.sql`
          SELECT
            id,
            title,
            ts_headline('simple', COALESCE(title, '') || ' ' || COALESCE(remark, ''), plainto_tsquery('simple', ${query}), 'MaxFragments=2,MaxWords=20,MinWords=5') AS snippet,
            ts_rank(search_vector, plainto_tsquery('simple', ${query})) AS rank
          FROM nx09_document
          WHERE tenant_id = ${tenantId}
            AND is_active = true
            AND search_vector @@ plainto_tsquery('simple', ${query})
          ORDER BY rank DESC
          LIMIT ${cappedLimit}
        `,
      );
      for (const r of docRows) {
        results.push({ source: 'doc', id: r.id, title: r.title, snippet: r.snippet, rank: Number(r.rank) });
      }
    }

    if (scope === 'manual' || scope === 'all') {
      const manualRows = await this.prisma.$queryRaw<Array<{ id: string; title: string; snippet: string; rank: number }>>(
        PrismaNs.sql`
          SELECT
            id,
            title,
            ts_headline('simple', COALESCE(title, '') || ' ' || COALESCE(content, ''), plainto_tsquery('simple', ${query}), 'MaxFragments=2,MaxWords=20,MinWords=5') AS snippet,
            ts_rank(search_vector, plainto_tsquery('simple', ${query})) AS rank
          FROM nx09_system_manual
          WHERE tenant_id = ${tenantId}
            AND is_active = true
            AND search_vector @@ plainto_tsquery('simple', ${query})
          ORDER BY rank DESC
          LIMIT ${cappedLimit}
        `,
      );
      for (const r of manualRows) {
        results.push({ source: 'manual', id: r.id, title: r.title, snippet: r.snippet, rank: Number(r.rank) });
      }
    }

    // scope=all 時：跨 3 source 合併、按 rank 重排
    results.sort((a, b) => b.rank - a.rank);
    return {
      ok: true,
      query,
      scope,
      count: results.length,
      results: results.slice(0, cappedLimit),
    };
  }
}
