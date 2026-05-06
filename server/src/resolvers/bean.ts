import { GraphQLError } from "graphql";
import { Prisma } from "@prisma/client";
import type { Context } from "../context.js";
import { requireAuth } from "../context.js";
import { requireBean, requireUserBean } from "../lib/guardHelpers.js";
import { normalizeName } from "../lib/normalizeName.js";

// Short name is how uploaded roast profiles auto-match to a bean —
// an empty value silently breaks that flow.
function requireShortName(shortName: string | undefined): string {
  const trimmed = shortName?.trim();
  if (!trimmed) {
    throw new GraphQLError(
      "Short name is required so uploaded roast profiles can auto-match to this bean",
      { extensions: { code: "BAD_USER_INPUT" } },
    );
  }
  return trimmed;
}

export const beanResolvers = {
  Query: {
    myBeans: async (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.userBean.findMany({
        where: { userId },
        include: { bean: true },
        orderBy: { createdAt: "desc" },
      });
    },

    bean: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      return ctx.prisma.bean.findUnique({ where: { id } });
    },

    distinctSuppliers: async (_: unknown, __: unknown, ctx: Context) => {
      const beans = await ctx.prisma.bean.findMany({
        where: { supplier: { not: null, notIn: [""] } },
        distinct: ["supplier"],
        select: { supplier: true },
        orderBy: { supplier: "asc" },
      });
      return beans.map((b) => b.supplier!);
    },

    publicBeans: async (
      _: unknown,
      { limit }: { limit?: number },
      ctx: Context,
    ) => {
      // Return beans sorted by roast count (descending), limited
      const beans = await ctx.prisma.bean.findMany({
        include: { _count: { select: { roasts: true } } },
        orderBy: { roasts: { _count: "desc" } },
        take: limit ?? 50,
      });
      return beans;
    },
  },

  Mutation: {
    createBean: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
          origin?: string;
          process?: string;
          cropYear?: number;
          sourceUrl?: string;
          elevation?: string;
          variety?: string;
          bagNotes?: string;
          supplier?: string;
          score?: number;
          notes?: string;
          shortName?: string;
          suggestedFlavors?: string[];
        };
      },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      const { notes, shortName, ...beanData } = input;

      // Real-world green coffee bean names always contain at least two
      // of Country/Process/Farm/Region. Reject single-word names so
      // community matching stays reliable.
      const wordCount = beanData.name.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 2) {
        throw new GraphQLError(
          "Bean name must contain at least 2 words (e.g. country + region/process)",
          { extensions: { code: "BAD_USER_INPUT" } },
        );
      }

      const trimmedShortName = requireShortName(shortName);

      const normalizedName = normalizeName(beanData.name);

      return ctx.prisma.$transaction(async (tx) => {
        // Dedup on the normalized name so case/whitespace variants of the same
        // bean collapse to a single row. The DB has @unique on normalizedName
        // as a safety net against races past this lookup.
        const existing = await tx.bean.findUnique({
          where: { normalizedName },
        });

        const bean =
          existing ??
          (await tx.bean.create({ data: { ...beanData, normalizedName } }));

        // Check if user already has this bean in their library
        const existingUserBean = await tx.userBean.findFirst({
          where: { userId, beanId: bean.id },
          include: { bean: true },
        });

        if (existingUserBean) {
          // Backfill shortName for records created before it was required.
          // Don't overwrite a value the user has already set.
          if (!existingUserBean.shortName) {
            return tx.userBean.update({
              where: { id: existingUserBean.id },
              data: { shortName: trimmedShortName },
              include: { bean: true },
            });
          }
          return existingUserBean;
        }

        return tx.userBean.create({
          data: { userId, beanId: bean.id, notes, shortName: trimmedShortName },
          include: { bean: true },
        });
      });
    },

    addBeanToLibrary: async (
      _: unknown,
      { beanId, notes, shortName }: { beanId: string; notes?: string; shortName?: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const trimmedShortName = requireShortName(shortName);

      await requireBean(ctx.prisma, beanId);

      try {
        return await ctx.prisma.userBean.create({
          data: { userId, beanId, notes, shortName: trimmedShortName },
          include: { bean: true },
        });
      } catch (err) {
        // P2002 = unique constraint violation on (userId, beanId).
        // Surface it as a clean BAD_USER_INPUT instead of an unhandled 500.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw new GraphQLError("This bean is already in your library", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        throw err;
      }
    },

    updateUserBean: async (
      _: unknown,
      { id, notes, shortName }: { id: string; notes?: string; shortName?: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      await requireUserBean(ctx.prisma, id, userId);

      return ctx.prisma.userBean.update({
        where: { id },
        data: { notes, shortName },
        include: { bean: true },
      });
    },

    updateBean: async (
      _: unknown,
      { id, input }: {
        id: string;
        input: {
          name?: string;
          origin?: string | null;
          process?: string | null;
          cropYear?: number | null;
          sourceUrl?: string | null;
          elevation?: string | null;
          variety?: string | null;
          bagNotes?: string | null;
          supplier?: string | null;
          score?: number | null;
        };
      },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      const userBean = await ctx.prisma.userBean.findUnique({
        where: { userId_beanId: { userId, beanId: id } },
      });
      if (!userBean) {
        throw new GraphQLError("Bean not found in your library", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      const { name, origin, process, cropYear, sourceUrl, elevation, variety, bagNotes, supplier, score } = input;
      // Keep normalizedName in lock-step with name so dedup lookups stay accurate.
      const normalizedName = name !== undefined ? normalizeName(name) : undefined;
      return ctx.prisma.bean.update({
        where: { id },
        data: { name, normalizedName, origin, process, cropYear, sourceUrl, elevation, variety, bagNotes, supplier, score },
      });
    },

    updateBeanSuggestedFlavors: async (
      _: unknown,
      { beanId, suggestedFlavors }: { beanId: string; suggestedFlavors: string[] },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      // Verify the user owns this bean
      const userBean = await ctx.prisma.userBean.findUnique({
        where: { userId_beanId: { userId, beanId } },
      });
      if (!userBean) {
        throw new GraphQLError("Bean not found in your library", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      return ctx.prisma.bean.update({
        where: { id: beanId },
        data: { suggestedFlavors },
      });
    },

    removeBeanFromLibrary: async (
      _: unknown,
      { beanId }: { beanId: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const userBean = await ctx.prisma.userBean.findUnique({
        where: { userId_beanId: { userId, beanId } },
      });
      if (!userBean) {
        throw new GraphQLError("Bean not found in your library", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      await ctx.prisma.userBean.delete({ where: { id: userBean.id } });
      return true;
    },
  },
};
