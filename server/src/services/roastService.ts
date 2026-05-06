import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";
import { requireBean, requireRoast } from "../lib/guardHelpers.js";
import { parseKlog } from "../lib/klogParser.js";
import { extractKproContent } from "../lib/kproExtractor.js";
import { validateKlogFile } from "../lib/validateKlog.js";
import { getFileContent, uploadFile } from "../utils/r2.js";

// SHA-256 hex digest. Stable across uploads of the same file under different names —
// our primary dedup key for roast .klog content.
function hashKlogContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

type JsonInput = Prisma.InputJsonValue | undefined;

export interface RoastInputBase {
  ambientTemp?: number;
  roastingLevel?: number;
  tastingNotes?: string;
  colourChangeTime?: number;
  firstCrackTime?: number;
  roastEndTime?: number;
  colourChangeTemp?: number;
  firstCrackTemp?: number;
  roastEndTemp?: number;
  developmentTime?: number;
  developmentPercent?: number;
  totalDuration?: number;
  roastDate?: string;
  timeSeriesData?: JsonInput;
  roastProfileCurve?: JsonInput;
  fanProfileCurve?: JsonInput;
  notes?: string;
  rating?: number;
}

export interface CreateRoastInput extends RoastInputBase {
  beanId: string;
}

export type UpdateRoastInput = RoastInputBase;

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// Fields to omit from list queries for performance (large JSON blobs)
const LIST_QUERY_OMIT = {
  timeSeriesData: true,
  roastProfileCurve: true,
  fanProfileCurve: true,
} as const;

const ROAST_INCLUDE = {
  bean: true,
  roastFiles: true,
  roastProfile: true,
  roastFlavors: { include: { descriptor: true } },
} as const;

// Minimum source-token length to consider for community prefix matching.
// Avoids noise from tokens like "a", "de", "of".
const MIN_PREFIX_LEN = 3;

function scoreLibraryMatch(
  ub: { shortName: string | null; bean: { name: string } },
  sources: string[],
): number {
  const shortName = (ub.shortName ?? "").toLowerCase();
  const beanName = ub.bean.name.toLowerCase();
  let score = 0;

  for (const source of sources) {
    if (shortName && shortName === source) score = Math.max(score, 100);
    else if (shortName && source.includes(shortName)) score = Math.max(score, 80);
    else if (shortName && shortName.includes(source)) score = Math.max(score, 70);
    else if (source.includes(beanName) || beanName.includes(source)) score = Math.max(score, 50);
  }

  return score;
}

function scoreCommunityMatch(beanName: string, sourceTokens: Set<string>): number {
  const beanTokens = beanName.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return beanTokens.filter((beanTok) =>
    // srcTok is prefix of beanTok (e.g. "eth" → "ethiopia")
    // or they are equal (e.g. "kenya" === "kenya")
    [...sourceTokens].some((srcTok) => beanTok.startsWith(srcTok)),
  ).length;
}

function upsertRoastProfile(
  tx: TransactionClient | PrismaClient,
  roastId: string,
  data: {
    fileKey: string;
    fileName: string;
    profileShortName?: string | null;
    profileDesigner?: string | null;
  },
) {
  return tx.roastProfile.upsert({
    where: { roastId },
    update: { ...data, profileType: "KAFFELOGIC" },
    create: { roastId, ...data, profileType: "KAFFELOGIC" },
  });
}

export class RoastService {
  constructor(private prisma: PrismaClient) {}

  // --- Query methods ---

  async myRoasts(userId: string) {
    return this.prisma.roast.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      omit: LIST_QUERY_OMIT,
      include: ROAST_INCLUDE,
    });
  }

  async roastById(userId: string, id: string) {
    return this.prisma.roast.findFirst({
      where: { id, userId },
      include: ROAST_INCLUDE,
    });
  }

  async roastsByBean(userId: string, beanId: string) {
    return this.prisma.roast.findMany({
      where: { beanId, userId },
      orderBy: { roastDate: "desc" },
      omit: LIST_QUERY_OMIT,
      include: ROAST_INCLUDE,
    });
  }

  async roastsByIds(userId: string, ids: string[]) {
    return this.prisma.roast.findMany({
      where: { id: { in: ids }, userId },
      orderBy: { roastDate: "desc" },
      include: ROAST_INCLUDE,
    });
  }

  async publicRoast(id: string, userId: string | null) {
    const roast = await this.prisma.roast.findFirst({
      where: { id },
      include: ROAST_INCLUDE,
    });
    if (!roast) return null;
    if (roast.isPublic || roast.userId === userId) return roast;
    return null;
  }

  async publicRoasts(beanId?: string, limit?: number, offset?: number) {
    return this.prisma.roast.findMany({
      where: {
        isPublic: true,
        ...(beanId ? { beanId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit ?? 50,
      skip: offset ?? 0,
      omit: LIST_QUERY_OMIT,
      include: ROAST_INCLUDE,
    });
  }

  async communityStats() {
    const [totalRoasts, totalBeans] = await Promise.all([
      this.prisma.roast.count({ where: { isPublic: true } }),
      this.prisma.bean.count(),
    ]);
    return { totalRoasts, totalBeans };
  }

  async downloadProfile(userId: string | null, roastId: string) {
    // Allow download for public roasts (no auth required) or owner's roasts
    const roast = await this.prisma.roast.findFirst({
      where: {
        id: roastId,
        OR: [
          { isPublic: true },
          ...(userId ? [{ userId }] : []),
        ],
      },
      include: { roastFiles: true, roastProfile: true },
    });
    if (!roast) return null;

    const klogFile = roast.roastFiles.find((f) => f.fileType === "KLOG");
    if (!klogFile) return null;

    let klogContent: string;
    try {
      klogContent = await getFileContent(klogFile.fileKey);
    } catch {
      return null;
    }
    const kproContent = extractKproContent(klogContent);
    if (!kproContent) return null;

    const fileName = roast.roastProfile?.profileShortName
      ? `${roast.roastProfile.profileShortName}.kpro`
      : klogFile.fileName.replace(/\.klog$/i, ".kpro");

    return { fileName, content: kproContent };
  }

  async previewRoastLog(userId: string, fileName: string, fileContent: string) {
    // Validate
    const validation = validateKlogFile(fileName, fileContent);
    if (!validation.valid) {
      throw new GraphQLError(validation.error, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    // Parse
    let parsed;
    try {
      parsed = parseKlog(fileContent);
    } catch (err) {
      throw new GraphQLError(
        err instanceof Error ? err.message : "Failed to parse .klog file",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    // Match beans using profile short name and filename
    const fileNameWithoutExt = fileName.replace(/\.klog$/i, "");
    const { library, community } = await this.findMatchingBeans(
      userId,
      parsed.profileShortName,
      fileNameWithoutExt,
    );

    return {
      roastDate: parsed.roastDate,
      ambientTemp: parsed.ambientTemp,
      roastingLevel: parsed.roastingLevel,
      tastingNotes: parsed.tastingNotes,
      profileShortName: parsed.profileShortName,
      profileDesigner: parsed.profileDesigner,
      colourChangeTime: parsed.colourChangeTime,
      firstCrackTime: parsed.firstCrackTime,
      roastEndTime: parsed.roastEndTime,
      developmentPercent: parsed.developmentPercent,
      totalDuration: parsed.totalDuration,
      suggestedBeans: library,
      communityBeans: community,
      parseWarnings: parsed.parseWarnings,
    };
  }

  /**
   * Find matching beans in two passes:
   *   1. User's library — scored by shortName + bean.name substring match
   *   2. Community catalog — global Beans not yet in user's library,
   *      scored by token-prefix matching of bean name tokens against
   *      source tokens (requires >= 2 token matches, leveraging the
   *      project-wide rule that bean names contain >= 2 words:
   *      Country + Process/Farm/Region)
   *
   * Sources are the klog's profile_short_name and filename (without ext).
   *
   * Returns { library: UserBean[], community: Bean[] }, each capped at 5.
   */
  private async findMatchingBeans(
    userId: string,
    profileShortName: string | null | undefined,
    fileName: string | null | undefined,
  ) {
    const sources = [profileShortName, fileName].filter(Boolean).map((s) => s!.toLowerCase());
    if (sources.length === 0) return { library: [], community: [] };

    // --- Library pass ---
    const userBeans = await this.prisma.userBean.findMany({
      where: { userId },
      include: { bean: true },
    });

    const library = userBeans
      .map((ub) => ({ userBean: ub, score: scoreLibraryMatch(ub, sources) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.userBean);

    // --- Community pass ---
    // Tokenize sources and keep only tokens long enough to be meaningful
    // for prefix matching (skips noise like "a", "of", "de").
    const sourceTokens = new Set(
      sources
        .flatMap((s) => s.match(/[a-z0-9]+/g) ?? [])
        .filter((t) => t.length >= MIN_PREFIX_LEN),
    );
    if (sourceTokens.size === 0) return { library, community: [] };

    // Pre-filter at the DB level: any viable candidate's name must contain
    // at least one source token. Keeps us off a full table scan as the
    // global catalog grows. The `take: 200` cap is a belt-and-suspenders
    // bound — we rank and slice to 5 below.
    const userBeanIds = Array.from(new Set(userBeans.map((ub) => ub.beanId)));
    const communityBeans = await this.prisma.bean.findMany({
      where: {
        AND: [
          { id: { notIn: userBeanIds } },
          { OR: [...sourceTokens].map((t) => ({ name: { contains: t, mode: "insensitive" as const } })) },
        ],
      },
      take: 200,
    });

    const community = communityBeans
      .map((bean) => ({ bean, score: scoreCommunityMatch(bean.name, sourceTokens) }))
      // Require 2+ token matches — exploits the guarantee that bean
      // names have >= 2 words (Country + Process/Farm/Region)
      .filter((s) => s.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.bean);

    return { library, community };
  }

  // --- Mutation methods ---

  async createRoast(userId: string, input: CreateRoastInput) {
    await requireBean(this.prisma, input.beanId);

    return this.prisma.roast.create({
      data: {
        ...input,
        roastDate: input.roastDate ? new Date(input.roastDate) : null,
        userId,
      },
      include: ROAST_INCLUDE,
    });
  }

  async updateRoast(userId: string, id: string, input: UpdateRoastInput) {
    await requireRoast(this.prisma, id, userId);

    return this.prisma.roast.update({
      where: { id },
      data: {
        ...input,
        roastDate: input.roastDate ? new Date(input.roastDate) : undefined,
      },
      include: ROAST_INCLUDE,
    });
  }

  async deleteRoast(userId: string, id: string) {
    await requireRoast(this.prisma, id, userId);

    await this.prisma.roast.delete({ where: { id } });
    return true;
  }

  async toggleRoastPublic(userId: string, id: string) {
    const roast = await requireRoast(this.prisma, id, userId);

    return this.prisma.roast.update({
      where: { id },
      data: { isPublic: !roast.isPublic },
      include: ROAST_INCLUDE,
    });
  }

  async uploadRoastLog(
    userId: string,
    beanId: string,
    fileName: string,
    fileContent: string,
    notes?: string,
  ) {
    // Validate file
    const validation = validateKlogFile(fileName, fileContent);
    if (!validation.valid) {
      throw new GraphQLError(validation.error, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    // Duplicate check. Primary key is the SHA-256 of the file contents — that
    // catches re-uploads under a different filename. We also keep a filename
    // fallback for legacy roasts created before contentHash existed (NULL hash).
    const contentHash = hashKlogContent(fileContent);

    const existingByHash = await this.prisma.roast.findUnique({
      where: { userId_contentHash: { userId, contentHash } },
      include: ROAST_INCLUDE,
    });
    if (existingByHash) {
      return {
        roast: existingByHash,
        parseWarnings: ["This file was previously uploaded — returning existing roast."],
      };
    }

    const existingByName = await this.prisma.roastFile.findFirst({
      where: { fileName, roast: { userId, contentHash: null } },
    });
    if (existingByName) {
      const roast = await this.prisma.roast.findUniqueOrThrow({
        where: { id: existingByName.roastId },
        include: ROAST_INCLUDE,
      });
      return { roast, parseWarnings: ["This file was previously uploaded — returning existing roast."] };
    }

    await requireBean(this.prisma, beanId);

    // Look up user's privacy preference
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isPublic = !user.privateByDefault;

    // Parse the klog file
    let parsed;
    try {
      parsed = parseKlog(fileContent);
    } catch (err) {
      throw new GraphQLError(
        err instanceof Error ? err.message : "Failed to parse .klog file",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    // Wrap DB writes in a transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Auto-link community beans into the user's library so subsequent
      // uploads match locally and the roast appears under "My beans".
      // Upsert avoids a race where two concurrent uploads for the same
      // (userId, beanId) would both see null and both try to create.
      await tx.userBean.upsert({
        where: { userId_beanId: { userId, beanId } },
        update: {},
        create: {
          userId,
          beanId,
          shortName: parsed.profileShortName ?? null,
        },
      });

      const roast = await tx.roast.create({
        data: {
          userId,
          beanId,
          isPublic,
          contentHash,
          roastDate: parsed.roastDate,
          ambientTemp: parsed.ambientTemp,
          roastingLevel: parsed.roastingLevel,
          tastingNotes: parsed.tastingNotes,
          colourChangeTime: parsed.colourChangeTime,
          firstCrackTime: parsed.firstCrackTime,
          roastEndTime: parsed.roastEndTime,
          colourChangeTemp: parsed.colourChangeTemp,
          firstCrackTemp: parsed.firstCrackTemp,
          roastEndTemp: parsed.roastEndTemp,
          developmentTime: parsed.developmentTime,
          developmentPercent: parsed.developmentPercent,
          totalDuration: parsed.totalDuration,
          timeSeriesData: parsed.timeSeriesData ?? undefined,
          roastProfileCurve: parsed.roastProfileCurve ?? undefined,
          fanProfileCurve: parsed.fanProfileCurve ?? undefined,
          notes,
        },
        include: { bean: true },
      });

      const fileKey = `roasts/${userId}/${roast.id}/${fileName}`;

      const roastFile = await tx.roastFile.create({
        data: {
          roastId: roast.id,
          fileKey,
          fileName,
          fileType: "KLOG",
        },
      });

      let roastProfile = null;
      if (parsed.profileFileName) {
        roastProfile = await upsertRoastProfile(tx, roast.id, {
          fileKey: parsed.profileFileName,
          fileName: parsed.profileFileName,
          profileShortName: parsed.profileShortName,
          profileDesigner: parsed.profileDesigner,
        });
      }

      return {
        ...roast,
        roastFiles: [roastFile],
        roastProfile,
      };
    });

    // R2 upload outside transaction (non-fatal)
    const fileKey = `roasts/${userId}/${result.id}/${fileName}`;
    const parseWarnings = [...parsed.parseWarnings];
    try {
      await uploadFile(fileKey, fileContent, "text/plain");
    } catch (err) {
      parseWarnings.push(
        `Warning: failed to upload raw file to storage: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { roast: result, parseWarnings };
  }

  async uploadRoastProfile(
    userId: string,
    input: {
      roastId: string;
      fileKey: string;
      fileName: string;
      profileType?: string;
    },
  ) {
    await requireRoast(this.prisma, input.roastId, userId);

    return upsertRoastProfile(this.prisma, input.roastId, {
      fileKey: input.fileKey,
      fileName: input.fileName,
    });
  }
}
