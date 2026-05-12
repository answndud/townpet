import { PostScope, PostType, Prisma } from "@prisma/client";

import {
  buildSearchDocumentParts,
  hasChoseongSearchSignal,
  resolveSearchDocumentMatchRank,
} from "@/lib/search-document";
import {
  expandExcludedPostTypes,
  getEquivalentPostTypes,
} from "@/lib/post-type-groups";
import { buildStructuredSearchVariants } from "@/lib/structured-field-normalization";
import type { PostSearchIn } from "./post-search-support";

const SEARCH_SIMILARITY_THRESHOLD = 0.12;

type StructuredSearchSqlVariant = {
  query: string;
  pattern: string;
  compactQuery: string;
  compactPattern: string;
};

export type RankedSearchFallbackCandidateRow = {
  id: string;
  title: string;
  content: string;
  structuredSearchText: string;
  createdAt: Date;
  author: {
    nickname: string | null;
  };
};

export type RankedSearchRow = {
  id: string;
};

export function buildRankedSearchWhereSql({
  scope,
  type,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
  searchSql,
}: {
  scope: PostScope;
  type?: PostType;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
  searchSql: Prisma.Sql;
}) {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`p."status" = 'ACTIVE'::"PostStatus"`,
    Prisma.sql`p."scope"::text = ${scope}`,
    searchSql,
  ];

  if (type) {
    const equivalentTypes = getEquivalentPostTypes(type);
    if (equivalentTypes.length === 1) {
      clauses.push(Prisma.sql`p."type"::text = ${equivalentTypes[0]}`);
    } else {
      clauses.push(Prisma.sql`p."type"::text IN (${Prisma.join(equivalentTypes)})`);
    }
  } else if (excludeTypes.length > 0) {
    const expandedExcludeTypes = expandExcludedPostTypes(excludeTypes);
    const excludedSql = Prisma.join(expandedExcludeTypes);
    clauses.push(Prisma.sql`p."type"::text NOT IN (${excludedSql})`);
  }

  if (scope === PostScope.LOCAL) {
    clauses.push(
      Prisma.sql`p."neighborhoodId" = ${neighborhoodId ?? "__NO_NEIGHBORHOOD__"}`,
    );
  }

  if (hiddenAuthorIds.length > 0) {
    clauses.push(Prisma.sql`p."authorId" NOT IN (${Prisma.join(hiddenAuthorIds)})`);
  }

  clauses.push(
    Prisma.sql`NOT EXISTS (
      SELECT 1
      FROM "UserSanction" us
      WHERE us."userId" = p."authorId"
        AND us."level" IN ('SUSPEND_7D', 'SUSPEND_30D', 'PERMANENT_BAN')
        AND (us."expiresAt" IS NULL OR us."expiresAt" > NOW())
    )`,
  );

  return Prisma.join(clauses, " AND ");
}

export function buildStructuredSearchSqlVariants(query: string) {
  return Array.from(new Set(buildStructuredSearchVariants(query))).map((value) => ({
    query: value,
    pattern: `%${value}%`,
    compactQuery: value.replace(/\s+/g, ""),
    compactPattern: `%${value.replace(/\s+/g, "")}%`,
  }));
}

function buildStructuredSearchTextSql() {
  return Prisma.sql`COALESCE(p."structuredSearchText", '')`;
}

export function buildRankedSearchFallbackSource(
  row: RankedSearchFallbackCandidateRow,
  searchIn: PostSearchIn,
) {
  if (searchIn === "TITLE") {
    return row.title;
  }
  if (searchIn === "CONTENT") {
    return row.content;
  }
  if (searchIn === "AUTHOR") {
    return row.author.nickname ?? "";
  }

  return [row.title, row.content, row.author.nickname, row.structuredSearchText]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

export function shouldTryPostSearchDocumentFallback(query: string) {
  const queryDocument = buildSearchDocumentParts(query);
  return (
    hasChoseongSearchSignal(query) ||
    (!query.includes(" ") && queryDocument.compactText.length >= 4)
  );
}

export function rankPostSearchDocumentFallbackRows<
  T extends RankedSearchFallbackCandidateRow,
>({
  rows,
  query,
  searchIn,
  limit,
  preserveInputOrderOnTie,
}: {
  rows: T[];
  query: string;
  searchIn: PostSearchIn;
  limit: number;
  preserveInputOrderOnTie?: boolean;
}) {
  const queryDocument = buildSearchDocumentParts(query);

  return rows
    .map((row, index) => ({
      row,
      index,
      rank: resolveSearchDocumentMatchRank(
        buildRankedSearchFallbackSource(row, searchIn),
        queryDocument,
      ),
      createdAt: row.createdAt.getTime(),
    }))
    .filter((item) => item.rank < 4)
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      if (preserveInputOrderOnTie) {
        return left.index - right.index;
      }
      if (right.createdAt !== left.createdAt) {
        return right.createdAt - left.createdAt;
      }
      return right.row.id.localeCompare(left.row.id, "ko");
    })
    .slice(0, limit)
    .map((item) => item.row);
}

function buildFieldSearchMatchSql(
  fieldSql: Prisma.Sql,
  variants: StructuredSearchSqlVariant[],
) {
  return variants.flatMap(({ query, pattern, compactQuery, compactPattern }) => [
    Prisma.sql`${fieldSql} ILIKE ${pattern}`,
    Prisma.sql`REPLACE(${fieldSql}, ' ', '') ILIKE ${compactPattern}`,
    Prisma.sql`to_tsvector('simple', ${fieldSql}) @@ websearch_to_tsquery('simple', ${query})`,
    Prisma.sql`to_tsvector('simple', REPLACE(${fieldSql}, ' ', '')) @@ websearch_to_tsquery('simple', ${compactQuery})`,
  ]);
}

export function buildStructuredSearchMatchSql(variants: StructuredSearchSqlVariant[]) {
  const clauses = buildFieldSearchMatchSql(buildStructuredSearchTextSql(), variants);

  return clauses.length === 1 ? clauses[0]! : Prisma.sql`(${Prisma.join(clauses, " OR ")})`;
}

export function buildRankedSearchMatchSql(
  searchIn: PostSearchIn,
  query: string,
  pattern: string,
  compactPattern: string,
  useTrigram: boolean,
  structuredSearchVariants: StructuredSearchSqlVariant[],
) {
  const compactQuery = query.replace(/\s+/g, "");
  const titleSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(p."title", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const titleCompactSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(REPLACE(COALESCE(p."title", ''), ' ', ''), ${compactQuery}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const contentSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(p."content", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const authorNicknameSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(u."nickname", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const titleMatch = Prisma.sql`(
    p."title" ILIKE ${pattern}
    OR REPLACE(COALESCE(p."title", ''), ' ', '') ILIKE ${compactPattern}
    OR to_tsvector('simple', COALESCE(p."title", '')) @@ websearch_to_tsquery('simple', ${query})
    OR to_tsvector('simple', REPLACE(COALESCE(p."title", ''), ' ', '')) @@ websearch_to_tsquery('simple', ${compactQuery})
    ${titleSimilaritySql}
    ${titleCompactSimilaritySql}
  )`;

  const contentMatch = Prisma.sql`(
    p."content" ILIKE ${pattern}
    OR to_tsvector('simple', COALESCE(p."content", '')) @@ websearch_to_tsquery('simple', ${query})
    ${contentSimilaritySql}
  )`;

  const authorMatch = Prisma.sql`(
    COALESCE(u."nickname", '') ILIKE ${pattern}
    OR to_tsvector('simple', COALESCE(u."nickname", '')) @@ websearch_to_tsquery('simple', ${query})
    ${authorNicknameSimilaritySql}
  )`;
  const structuredMatch =
    structuredSearchVariants.length > 0
      ? buildStructuredSearchMatchSql(structuredSearchVariants)
      : Prisma.sql`FALSE`;

  if (searchIn === "TITLE") {
    return titleMatch;
  }
  if (searchIn === "CONTENT") {
    return contentMatch;
  }
  if (searchIn === "AUTHOR") {
    return authorMatch;
  }

  return Prisma.sql`(${titleMatch} OR ${contentMatch} OR ${authorMatch} OR ${structuredMatch})`;
}
