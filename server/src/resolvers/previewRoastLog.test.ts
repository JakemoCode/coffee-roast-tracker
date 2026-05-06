import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { resolvers } from "./index.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PREVIEW_ROAST_LOG = `
  query PreviewRoastLog($fileName: String!, $fileContent: String!) {
    previewRoastLog(fileName: $fileName, fileContent: $fileContent) {
      roastDate
      ambientTemp
      roastingLevel
      tastingNotes
      profileShortName
      profileDesigner
      colourChangeTime
      firstCrackTime
      roastEndTime
      developmentPercent
      totalDuration
      suggestedBeans {
        id
        shortName
        bean {
          id
          name
        }
      }
      communityBeans {
        id
        name
      }
      parseWarnings
      existingRoastId
    }
  }
`;

let server: ApolloServer<Context>;
let testUserId: string;
let testBeanId: string;
let testUserBeanId: string;
let klogContent: string;

// IDs to track for cleanup
const createdUserBeanIds: string[] = [];

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  // Load fixture
  const klogFixturePath = path.resolve(
    __dirname,
    "../../../mocks/sample-roasts/EGB 0320a.klog"
  );
  klogContent = fs.readFileSync(klogFixturePath, "utf-8");

  // Create test user
  const user = await prisma.user.create({
    data: { clerkId: "test_clerk_preview_roast_log" },
  });
  testUserId = user.id;

  // Create test bean + userBean with matching shortName
  const bean = await prisma.bean.create({
    data: { name: "Ethiopian Guji Batch" },
  });
  testBeanId = bean.id;

  const userBean = await prisma.userBean.create({
    data: { userId: testUserId, beanId: testBeanId, shortName: "EGB" },
  });
  testUserBeanId = userBean.id;
  createdUserBeanIds.push(userBean.id);
});

afterAll(async () => {
  // Clean up
  if (createdUserBeanIds.length > 0) {
    await prisma.userBean.deleteMany({
      where: { id: { in: createdUserBeanIds } },
    });
  }
  await prisma.bean.deleteMany({ where: { id: testBeanId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.$disconnect();
});

type SingleResult = {
  kind: "single";
  singleResult: {
    data: Record<string, unknown> | null;
    errors?: { message: string }[];
  };
};

describe("previewRoastLog query", () => {
  it("returns parsed data with suggestedBeans when shortName matches", async () => {
    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const preview = body.singleResult.data!.previewRoastLog as Record<
      string,
      unknown
    >;

    expect(preview.profileShortName).toBe("EGB");
    expect(preview.firstCrackTime).toBeCloseTo(348.729, 2);

    const suggestedBeans = preview.suggestedBeans as Array<{
      id: string;
      shortName: string;
      bean: { id: string; name: string };
    }>;
    expect(suggestedBeans.length).toBeGreaterThan(0);
    expect(suggestedBeans[0]!.shortName).toBe("EGB");
    expect(suggestedBeans[0]!.bean.name).toBe("Ethiopian Guji Batch");
  });

  it("returns empty suggestedBeans when no shortName matches", async () => {
    // Create a second user with no matching userBean
    const user2 = await prisma.user.create({
      data: { clerkId: "test_clerk_preview_no_match" },
    });

    try {
      const response = await server.executeOperation(
        {
          query: PREVIEW_ROAST_LOG,
          variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
        },
        { contextValue: { prisma, userId: user2.id } }
      );

      const body = response.body as SingleResult;
      expect(body.singleResult.errors).toBeUndefined();

      const preview = body.singleResult.data!.previewRoastLog as Record<
        string,
        unknown
      >;

      expect(preview.suggestedBeans).toEqual([]);
      // Other fields should still be populated
      expect(preview.profileShortName).toBe("EGB");
      expect(preview.roastDate).toBeDefined();
    } finally {
      await prisma.user.delete({ where: { id: user2.id } });
    }
  });

  it("matches shortName case-insensitively", async () => {
    // Create userBean with lowercase shortName
    const bean2 = await prisma.bean.create({
      data: { name: "Case Test Bean" },
    });
    const userBean2 = await prisma.userBean.create({
      data: { userId: testUserId, beanId: bean2.id, shortName: "egb" },
    });
    createdUserBeanIds.push(userBean2.id);

    // Remove the original EGB userBean temporarily so only lowercase matches
    await prisma.userBean.delete({ where: { id: testUserBeanId } });

    try {
      const response = await server.executeOperation(
        {
          query: PREVIEW_ROAST_LOG,
          variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
        },
        { contextValue: { prisma, userId: testUserId } }
      );

      const body = response.body as SingleResult;
      expect(body.singleResult.errors).toBeUndefined();

      const preview = body.singleResult.data!.previewRoastLog as Record<
        string,
        unknown
      >;
      const suggestedBeans = preview.suggestedBeans as Array<{
        id: string;
        shortName: string;
      }>;
      expect(suggestedBeans.length).toBeGreaterThan(0);
      expect(suggestedBeans[0]!.shortName).toBe("egb");
    } finally {
      // Re-create the original userBean
      const restored = await prisma.userBean.create({
        data: {
          userId: testUserId,
          beanId: testBeanId,
          shortName: "EGB",
        },
      });
      // Update tracking: remove old ID, add new one
      const oldIdx = createdUserBeanIds.indexOf(testUserBeanId);
      if (oldIdx >= 0) createdUserBeanIds.splice(oldIdx, 1);
      createdUserBeanIds.push(restored.id);
      // Also clean up bean2 and userBean2
      await prisma.userBean.delete({ where: { id: userBean2.id } });
      const ub2Idx = createdUserBeanIds.indexOf(userBean2.id);
      if (ub2Idx >= 0) createdUserBeanIds.splice(ub2Idx, 1);
      await prisma.bean.delete({ where: { id: bean2.id } });
    }
  });

  it("returns correct parsed metadata values", async () => {
    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const preview = body.singleResult.data!.previewRoastLog as Record<
      string,
      unknown
    >;

    expect(preview.ambientTemp).toBeCloseTo(20.25, 1);
    expect(preview.roastingLevel).toBeCloseTo(4.3, 1);
    expect(preview.roastEndTime).toBeDefined();
    expect(typeof preview.roastEndTime).toBe("number");
    expect(preview.developmentPercent).toBeDefined();
    expect(typeof preview.developmentPercent).toBe("number");
    expect(preview.totalDuration).toBeDefined();
    expect(typeof preview.totalDuration).toBe("number");
    expect(preview.profileDesigner).toBe("jakemo");
  });

  it("returns community bean candidates on token-prefix match when bean not in user library", async () => {
    // Create a community bean with a name that token-prefix matches "EGB"
    // is too short for prefix matching, so use a different fixture:
    // construct a klog whose profileShortName tokenizes to match the bean name.
    const communityUser = await prisma.user.create({
      data: { clerkId: "test_clerk_community_bean_owner" },
    });
    const communityBean = await prisma.bean.create({
      data: { name: "Ethiopia Yirgacheffe Kochere Debo" },
    });
    // Give the bean an owner so it's a genuine community bean
    await prisma.userBean.create({
      data: { userId: communityUser.id, beanId: communityBean.id, shortName: "Eth Yirg" },
    });

    // Make a klog with profileShortName "Eth Yirg" (tokens "eth" + "yirg" both prefix bean tokens)
    const modifiedKlog = klogContent.replace(
      /profile_short_name\s*:.*/,
      "profile_short_name: Eth Yirg",
    );

    try {
      const response = await server.executeOperation(
        {
          query: PREVIEW_ROAST_LOG,
          variables: { fileName: "Eth Yirg 2026-04-20.klog", fileContent: modifiedKlog },
        },
        { contextValue: { prisma, userId: testUserId } },
      );

      const body = response.body as SingleResult;
      expect(body.singleResult.errors).toBeUndefined();

      const preview = body.singleResult.data!.previewRoastLog as Record<string, unknown>;
      const communityBeans = preview.communityBeans as Array<{ id: string; name: string }>;

      expect(communityBeans.length).toBeGreaterThan(0);
      expect(communityBeans[0]!.name).toBe("Ethiopia Yirgacheffe Kochere Debo");
    } finally {
      await prisma.userBean.deleteMany({ where: { beanId: communityBean.id } });
      await prisma.bean.delete({ where: { id: communityBean.id } });
      await prisma.user.delete({ where: { id: communityUser.id } });
    }
  });

  it("excludes beans already in user library from communityBeans", async () => {
    // testUserId already has "Ethiopian Guji Batch" as a userBean, so it
    // should never appear as a community candidate for that user
    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as SingleResult;
    const preview = body.singleResult.data!.previewRoastLog as Record<string, unknown>;
    const communityBeans = preview.communityBeans as Array<{ id: string; name: string }>;

    expect(communityBeans.find((b) => b.id === testBeanId)).toBeUndefined();
  });

  it("rejects invalid file extension", async () => {
    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "test.txt", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain(
      "Invalid file extension"
    );
  });

  it("returns existingRoastId when the user has already uploaded this content", async () => {
    // Upload the file once via createRoast + RoastFile to seed an existing roast
    const seeded = await prisma.roast.create({
      data: {
        userId: testUserId,
        beanId: testBeanId,
        isPublic: true,
        // SHA-256 of klogContent — must match what previewRoastLog computes
        contentHash: createHash("sha256").update(klogContent, "utf8").digest("hex"),
      },
    });

    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: testUserId } }
    );
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    const preview = body.singleResult.data!.previewRoastLog as { existingRoastId: string | null };
    expect(preview.existingRoastId).toBe(seeded.id);

    await prisma.roast.delete({ where: { id: seeded.id } });
  });

  it("returns existingRoastId via filename fallback for legacy NULL-hash roasts", async () => {
    const legacy = await prisma.roast.create({
      data: {
        userId: testUserId,
        beanId: testBeanId,
        isPublic: true,
        contentHash: null,
        roastFiles: {
          create: {
            fileKey: `roasts/${testUserId}/legacy/legacy-preview.klog`,
            fileName: "legacy-preview.klog",
            fileType: "KLOG",
          },
        },
      },
    });

    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "legacy-preview.klog", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: testUserId } }
    );
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    const preview = body.singleResult.data!.previewRoastLog as { existingRoastId: string | null };
    expect(preview.existingRoastId).toBe(legacy.id);

    await prisma.roast.delete({ where: { id: legacy.id } });
  });

  it("returns null existingRoastId for files the user has never uploaded", async () => {
    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: testUserId } }
    );
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    const preview = body.singleResult.data!.previewRoastLog as { existingRoastId: string | null };
    expect(preview.existingRoastId).toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    const response = await server.executeOperation(
      {
        query: PREVIEW_ROAST_LOG,
        variables: { fileName: "EGB 0320a.klog", fileContent: klogContent },
      },
      { contextValue: { prisma, userId: null } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain(
      "Authentication required"
    );
  });
});
