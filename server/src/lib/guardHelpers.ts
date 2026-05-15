import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";

export async function requireRoast(prisma: PrismaClient, id: string, userId: string) {
  const roast = await prisma.roast.findFirst({ where: { id, userId } });
  if (!roast) {
    throw new GraphQLError("Roast not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return roast;
}

export async function requireBean(prisma: PrismaClient, beanId: string) {
  const bean = await prisma.bean.findUnique({ where: { id: beanId } });
  if (!bean) {
    throw new GraphQLError("Bean not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return bean;
}

export async function requireUserBean(prisma: PrismaClient, id: string, userId: string) {
  const userBean = await prisma.userBean.findFirst({ where: { id, userId } });
  if (!userBean) {
    throw new GraphQLError("Bean not found in your library", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return userBean;
}

export async function requireUserBeanByBeanId(
  prisma: PrismaClient,
  beanId: string,
  userId: string,
) {
  const userBean = await prisma.userBean.findUnique({
    where: { userId_beanId: { userId, beanId } },
  });
  if (!userBean) {
    throw new GraphQLError("Bean not found in your library", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return userBean;
}
