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

// Real-world green coffee bean names always contain at least two
// of Country/Process/Farm/Region. Reject single-word names so
// community matching stays reliable.
function requireMultiWordName(name: string): void {
  const wordCount = name.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 2) {
    throw new GraphQLError(
      "Bean name must contain at least 2 words (e.g. country + region/process)",
      { extensions: { code: "BAD_USER_INPUT" } },
    );
  }
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
      // Suppliers are per-user (UserBean.supplier) — return only the
      // current user's suppliers so the autocomplete reflects their history.
      const userId = requireAuth(ctx);
      const userBeans = await ctx.prisma.userBean.findMany({
        where: { userId, supplier: { not: null, notIn: [""] } },
        distinct: ["supplier"],
        select: { supplier: true },
        orderBy: { supplier: "asc" },
      });
      return userBeans.map((ub) => ub.supplier!);
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
      // supplier is per-user — route it to the UserBean, not the shared Bean.
      const { notes, shortName, supplier, ...beanData } = input;

      requireMultiWordName(beanData.name);

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
          // Re-running createBean acts as an upsert: backfill shortName
          // when missing, and apply a newly supplied supplier (e.g. user
          // re-bought the same bean from a different seller). Don't
          // overwrite a non-empty existing value with a missing one.
          const updates: { shortName?: string; supplier?: string } = {};
          if (!existingUserBean.shortName) updates.shortName = trimmedShortName;
          if (supplier) updates.supplier = supplier;
          if (Object.keys(updates).length > 0) {
            return tx.userBean.update({
              where: { id: existingUserBean.id },
              data: updates,
              include: { bean: true },
            });
          }
          return existingUserBean;
        }

        return tx.userBean.create({
          data: { userId, beanId: bean.id, notes, shortName: trimmedShortName, supplier },
          include: { bean: true },
        });
      });
    },

    addBeanToLibrary: async (
      _: unknown,
      { beanId, notes, shortName, supplier }: { beanId: string; notes?: string; shortName?: string; supplier?: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const trimmedShortName = requireShortName(shortName);

      await requireBean(ctx.prisma, beanId);

      try {
        return await ctx.prisma.userBean.create({
          data: { userId, beanId, notes, shortName: trimmedShortName, supplier },
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
      { id, notes, shortName, supplier }: { id: string; notes?: string; shortName?: string; supplier?: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      await requireUserBean(ctx.prisma, id, userId);

      return ctx.prisma.userBean.update({
        where: { id },
        data: { notes, shortName, supplier },
        include: { bean: true },
      });
    },

    updateBean: async (
      _: unknown,
      { id, input }: {
        id: string;
        input: {
          cropYear?: number | null;
          sourceUrl?: string | null;
          elevation?: string | null;
          bagNotes?: string | null;
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
      // Identity fields are locked after creation — see UpdateBeanInput.
      return ctx.prisma.bean.update({ where: { id }, data: input });
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
