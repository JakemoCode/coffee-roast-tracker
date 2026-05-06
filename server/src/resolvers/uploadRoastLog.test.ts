import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock the R2 upload module — shared reference so tests can override behavior
const mockUploadFile = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.unstable_mockModule("../utils/r2.js", () => ({
  uploadFile: mockUploadFile,
  r2: {},
  BUCKET: "test-bucket",
  getDownloadUrl: jest.fn<() => Promise<string>>().mockResolvedValue("https://example.com/download"),
  getFileContent: jest.fn<() => Promise<string>>().mockResolvedValue(""),
}));

// Must import resolvers after mocking
const { resolvers } = await import("./index.js");

const UPLOAD_ROAST_LOG = `
  mutation UploadRoastLog($beanId: String!, $fileName: String!, $fileContent: String!) {
    uploadRoastLog(beanId: $beanId, fileName: $fileName, fileContent: $fileContent) {
      roast {
        id
        ambientTemp
        roastingLevel
        tastingNotes
        colourChangeTime
        firstCrackTime
        roastEndTime
        colourChangeTemp
        firstCrackTemp
        roastEndTemp
        developmentTime
        developmentPercent
        totalDuration
        roastDate
        bean {
          id
          name
        }
        roastFiles {
          id
          fileName
          fileKey
          fileType
        }
        roastProfile {
          id
          fileName
          profileShortName
          profileDesigner
        }
      }
      parseWarnings
    }
  }
`;

let server: ApolloServer<Context>;
let testUserId: string;
let testBeanId: string;
const createdRoastIds: string[] = [];

// Load real klog fixture
const klogFixturePath = path.resolve(
  __dirname,
  "../../../mocks/sample-roasts/EGB 0320a.klog"
);
const klogContent = fs.readFileSync(klogFixturePath, "utf-8");

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  // Create test user
  const user = await prisma.user.create({
    data: { clerkId: "test_clerk_upload_roast_log" },
  });
  testUserId = user.id;

  // Create test bean
  const bean = await prisma.bean.create({
    data: { name: "Test Ethiopian Natural" },
  });
  testBeanId = bean.id;
});

afterEach(async () => {
  // Clean up roasts created during tests (cascades to roastFiles, roastProfiles)
  if (createdRoastIds.length > 0) {
    await prisma.roast.deleteMany({
      where: { id: { in: createdRoastIds } },
    });
    createdRoastIds.length = 0;
  }
});

afterAll(async () => {
  // Clean up test data
  await prisma.roast.deleteMany({ where: { userId: testUserId } });
  await prisma.userBean.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.bean.delete({ where: { id: testBeanId } });
  await prisma.$disconnect();
});

describe("uploadRoastLog mutation", () => {
  it("uploads a real .klog file and returns parsed roast data", async () => {
    const response = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "EGB 0320a.klog",
          fileContent: klogContent,
        },
      },
      {
        contextValue: { prisma, userId: testUserId },
      }
    );

    expect(response.body.kind).toBe("single");
    const body = response.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null; errors?: unknown[] } };
    const result = body.singleResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();

    const { roast, parseWarnings } = result.data!.uploadRoastLog as {
      roast: Record<string, unknown>;
      parseWarnings: string[];
    };

    // Track for cleanup
    createdRoastIds.push(roast.id as string);

    // Verify parsed scalar fields
    expect(roast.ambientTemp).toBeCloseTo(20.25, 1);
    expect(roast.roastingLevel).toBeCloseTo(4.3, 1);
    expect(roast.tastingNotes).toBe("103.2g out");
    expect(roast.roastDate).toBeDefined();

    // Verify event markers exist (exact values depend on fixture)
    expect(roast.colourChangeTime).toBeDefined();
    expect(roast.firstCrackTime).toBeDefined();
    expect(roast.roastEndTime).toBeDefined();
    expect(roast.totalDuration).toBeDefined();
    expect(roast.developmentTime).toBeDefined();

    // Verify bean association
    expect(roast.bean).toEqual(
      expect.objectContaining({ id: testBeanId, name: "Test Ethiopian Natural" })
    );

    // Verify RoastFile created
    const roastFiles = roast.roastFiles as { fileName: string; fileType: string; fileKey: string }[];
    expect(roastFiles).toHaveLength(1);
    expect(roastFiles[0]!.fileName).toBe("EGB 0320a.klog");
    expect(roastFiles[0]!.fileType).toBe("KLOG");
    expect(roastFiles[0]!.fileKey).toContain(roast.id as string);

    // Verify RoastProfile created (fixture has profile_file_name)
    const roastProfile = roast.roastProfile as { fileName: string; profileShortName: string; profileDesigner: string } | null;
    expect(roastProfile).not.toBeNull();
    expect(roastProfile!.fileName).toBe("EGB.kpro");
    expect(roastProfile!.profileShortName).toBe("EGB");
    expect(roastProfile!.profileDesigner).toBe("jakemo");

    // parseWarnings should be an array (may be empty)
    expect(Array.isArray(parseWarnings)).toBe(true);
  });

  it("returns existing roast with warning for duplicate filename", async () => {
    // First upload
    const firstResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "duplicate-test.klog",
          fileContent: klogContent,
        },
      },
      {
        contextValue: { prisma, userId: testUserId },
      }
    );

    const firstBody = firstResponse.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null } };
    const firstResult = firstBody.singleResult.data!.uploadRoastLog as { roast: { id: string }; parseWarnings: string[] };
    createdRoastIds.push(firstResult.roast.id);

    // Second upload with same filename — returns existing roast, not an error
    const secondResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "duplicate-test.klog",
          fileContent: klogContent,
        },
      },
      {
        contextValue: { prisma, userId: testUserId },
      }
    );

    const secondBody = secondResponse.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null } };
    const secondResult = secondBody.singleResult.data!.uploadRoastLog as { roast: { id: string }; parseWarnings: string[] };
    // Should return the same roast
    expect(secondResult.roast.id).toBe(firstResult.roast.id);
    // Should include a warning about the duplicate
    expect(secondResult.parseWarnings).toContain("This file was previously uploaded — returning existing roast.");
  });

  it("auto-creates a UserBean link when uploading against a community bean", async () => {
    // testBeanId exists but testUserId has never linked it to their library
    // (the existing "uploads a real .klog" test uses testBeanId first and
    // implicitly creates the link, but afterEach only wipes roasts — not
    // userBeans — so we scope this test to a freshly-created community bean)
    const communityBean = await prisma.bean.create({
      data: { name: "Panama Boquete Auto Link Test" },
    });

    try {
      const preExisting = await prisma.userBean.findFirst({
        where: { userId: testUserId, beanId: communityBean.id },
      });
      expect(preExisting).toBeNull();

      const response = await server.executeOperation(
        {
          query: UPLOAD_ROAST_LOG,
          variables: {
            beanId: communityBean.id,
            fileName: "community-link-test.klog",
            fileContent: klogContent,
          },
        },
        { contextValue: { prisma, userId: testUserId } },
      );

      const body = response.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null; errors?: unknown[] } };
      expect(body.singleResult.errors).toBeUndefined();

      const { roast } = body.singleResult.data!.uploadRoastLog as { roast: { id: string } };
      createdRoastIds.push(roast.id);

      // UserBean should now exist with shortName pulled from the klog
      const linked = await prisma.userBean.findFirst({
        where: { userId: testUserId, beanId: communityBean.id },
      });
      expect(linked).not.toBeNull();
      expect(linked!.shortName).toBe("EGB");
    } finally {
      await prisma.userBean.deleteMany({
        where: { userId: testUserId, beanId: communityBean.id },
      });
      await prisma.bean.delete({ where: { id: communityBean.id } });
    }
  });

  it("rejects files with wrong extension", async () => {
    const response = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "roast.csv",
          fileContent: klogContent,
        },
      },
      {
        contextValue: { prisma, userId: testUserId },
      }
    );

    const body = response.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] } };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Invalid file extension");
  });

  it("still creates roast when R2 upload fails, with warning in parseWarnings", async () => {
    mockUploadFile.mockRejectedValueOnce(new Error("R2 connection failed"));

    const response = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "r2-failure-test.klog",
          fileContent: klogContent,
        },
      },
      {
        contextValue: { prisma, userId: testUserId },
      }
    );

    const body = response.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null; errors?: unknown[] } };
    const result = body.singleResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();

    const { roast, parseWarnings } = result.data!.uploadRoastLog as {
      roast: Record<string, unknown>;
      parseWarnings: string[];
    };

    createdRoastIds.push(roast.id as string);

    // Roast should still be created successfully
    expect(roast.id).toBeDefined();
    expect(roast.bean).toEqual(
      expect.objectContaining({ id: testBeanId })
    );

    // parseWarnings should contain the R2 failure warning
    expect(parseWarnings.some((w: string) => w.includes("R2 connection failed"))).toBe(true);
  });

  it("creates roast with no roastProfile when klog has no profile_file_name", async () => {
    const klogNoProfile = `ambient_temperature:22.5\nroasting_level:4.0\n\ntime\tbean_temp\n0\t25\n10\t180\n`;

    const response = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "no-profile-test.klog",
          fileContent: klogNoProfile,
        },
      },
      {
        contextValue: { prisma, userId: testUserId },
      }
    );

    const body = response.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null; errors?: unknown[] } };
    const result = body.singleResult;

    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();

    const { roast } = result.data!.uploadRoastLog as {
      roast: Record<string, unknown>;
    };

    createdRoastIds.push(roast.id as string);

    expect(roast.id).toBeDefined();
    expect(roast.ambientTemp).toBeCloseTo(22.5, 1);
    expect(roast.roastProfile).toBeNull();
  });

  it("rejects non-existent bean", async () => {
    const response = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: "nonexistent-bean-id",
          fileName: "test.klog",
          fileContent: klogContent,
        },
      },
      {
        contextValue: { prisma, userId: testUserId },
      }
    );

    const body = response.body as { kind: "single"; singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] } };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Bean not found");
  });

  it("dedups by content hash when the same file is re-uploaded under a different name", async () => {
    const firstResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "original-name.klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );
    const firstBody = firstResponse.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null };
    };
    const firstResult = firstBody.singleResult.data!.uploadRoastLog as {
      roast: { id: string };
      parseWarnings: string[];
    };
    createdRoastIds.push(firstResult.roast.id);

    // Same bytes, completely different filename — must resolve to the same roast
    const secondResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "renamed-copy (1).klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );
    const secondBody = secondResponse.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null };
    };
    const secondResult = secondBody.singleResult.data!.uploadRoastLog as {
      roast: { id: string };
      parseWarnings: string[];
    };
    expect(secondResult.roast.id).toBe(firstResult.roast.id);
    expect(secondResult.parseWarnings).toContain(
      "This file was previously uploaded — returning existing roast.",
    );

    // And only one roast row should exist for this user
    const roastCount = await prisma.roast.count({
      where: { userId: testUserId, beanId: testBeanId },
    });
    expect(roastCount).toBe(1);
  });

  it("falls back to filename match for legacy roasts without contentHash", async () => {
    // Simulate a roast created before contentHash existed: NULL hash plus a
    // RoastFile row. The upload path should still find it by filename.
    const legacyRoast = await prisma.roast.create({
      data: {
        userId: testUserId,
        beanId: testBeanId,
        isPublic: true,
        contentHash: null,
        roastFiles: {
          create: {
            fileKey: `roasts/${testUserId}/legacy/legacy-roast.klog`,
            fileName: "legacy-roast.klog",
            fileType: "KLOG",
          },
        },
      },
    });
    createdRoastIds.push(legacyRoast.id);

    const response = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "legacy-roast.klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );
    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null };
    };
    const result = body.singleResult.data!.uploadRoastLog as {
      roast: { id: string };
      parseWarnings: string[];
    };
    expect(result.roast.id).toBe(legacyRoast.id);
    expect(result.parseWarnings).toContain(
      "This file was previously uploaded — returning existing roast.",
    );
  });
});
