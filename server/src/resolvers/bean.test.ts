import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { resolvers } from "./index.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";

const CREATE_BEAN = `
  mutation CreateBean($input: CreateBeanInput!) {
    createBean(input: $input) {
      id
      shortName
      bean {
        id
        name
      }
    }
  }
`;

const UPDATE_USER_BEAN = `
  mutation UpdateUserBean($id: String!, $shortName: String) {
    updateUserBean(id: $id, shortName: $shortName) {
      id
      shortName
      bean {
        id
        name
      }
    }
  }
`;

const ADD_BEAN_TO_LIBRARY = `
  mutation AddBeanToLibrary($beanId: String!, $shortName: String) {
    addBeanToLibrary(beanId: $beanId, shortName: $shortName) {
      id
      shortName
      bean {
        id
        name
      }
    }
  }
`;

let server: ApolloServer<Context>;
let testUserId: string;
let testUserIdB: string;
const createdUserBeanIds: string[] = [];
const createdBeanIds: string[] = [];

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  const user = await prisma.user.create({
    data: { clerkId: "test_clerk_bean_resolvers" },
  });
  testUserId = user.id;

  const userB = await prisma.user.create({
    data: { clerkId: "test_clerk_bean_resolvers_b" },
  });
  testUserIdB = userB.id;
});

afterAll(async () => {
  // Clean up in correct order
  if (createdUserBeanIds.length > 0) {
    await prisma.userBean.deleteMany({
      where: { id: { in: createdUserBeanIds } },
    });
  }
  if (createdBeanIds.length > 0) {
    await prisma.bean.deleteMany({
      where: { id: { in: createdBeanIds } },
    });
  }
  await prisma.user.deleteMany({
    where: { id: { in: [testUserId, testUserIdB] } },
  });
  await prisma.$disconnect();
});

describe("bean resolvers — shortName", () => {
  it("createBean with shortName", async () => {
    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: {
          input: { name: "Test Bean ShortName", shortName: "TEST" },
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    expect(response.body.kind).toBe("single");
    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const userBean = body.singleResult.data!.createBean as {
      id: string;
      shortName: string;
      bean: { id: string; name: string };
    };

    expect(userBean.shortName).toBe("TEST");
    expect(userBean.bean.name).toBe("Test Bean ShortName");

    createdUserBeanIds.push(userBean.id);
    createdBeanIds.push(userBean.bean.id);
  });

  it("updateUserBean with shortName", async () => {
    // Create a bean + userBean first
    const bean = await prisma.bean.create({
      data: { name: "Update ShortName Bean" },
    });
    createdBeanIds.push(bean.id);

    const userBean = await prisma.userBean.create({
      data: { userId: testUserId, beanId: bean.id, shortName: "OLD" },
    });
    createdUserBeanIds.push(userBean.id);

    const response = await server.executeOperation(
      {
        query: UPDATE_USER_BEAN,
        variables: { id: userBean.id, shortName: "NEW" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const updated = body.singleResult.data!.updateUserBean as {
      id: string;
      shortName: string;
    };
    expect(updated.shortName).toBe("NEW");
  });

  it("addBeanToLibrary with shortName", async () => {
    const bean = await prisma.bean.create({
      data: { name: "Library ShortName Bean" },
    });
    createdBeanIds.push(bean.id);

    const response = await server.executeOperation(
      {
        query: ADD_BEAN_TO_LIBRARY,
        variables: { beanId: bean.id, shortName: "LIB" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const userBean = body.singleResult.data!.addBeanToLibrary as {
      id: string;
      shortName: string;
      bean: { id: string; name: string };
    };
    expect(userBean.shortName).toBe("LIB");
    expect(userBean.bean.name).toBe("Library ShortName Bean");

    createdUserBeanIds.push(userBean.id);
  });

  it("createBean rejects missing shortName", async () => {
    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: {
          input: { name: "Test Bean No ShortName" },
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] };
    };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Short name is required");
  });

  it("createBean rejects whitespace-only shortName", async () => {
    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: {
          input: { name: "Test Bean Whitespace", shortName: "   " },
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] };
    };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Short name is required");
  });

  it("createBean backfills shortName onto pre-existing UserBean with null shortName", async () => {
    // Simulate a record created before shortName became required
    const bean = await prisma.bean.create({
      data: { name: "Backfill Source Bean" },
    });
    createdBeanIds.push(bean.id);
    const userBean = await prisma.userBean.create({
      data: { userId: testUserId, beanId: bean.id, shortName: null },
    });
    createdUserBeanIds.push(userBean.id);

    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: {
          input: { name: "Backfill Source Bean", shortName: "Backfilled" },
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] };
    };
    expect(body.singleResult.errors).toBeUndefined();
    const result = body.singleResult.data!.createBean as {
      id: string;
      shortName: string | null;
    };
    expect(result.id).toBe(userBean.id);
    expect(result.shortName).toBe("Backfilled");
  });

  it("createBean preserves existing UserBean shortName instead of overwriting", async () => {
    const bean = await prisma.bean.create({
      data: { name: "Preserve Existing Bean" },
    });
    createdBeanIds.push(bean.id);
    const userBean = await prisma.userBean.create({
      data: { userId: testUserId, beanId: bean.id, shortName: "Original" },
    });
    createdUserBeanIds.push(userBean.id);

    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: {
          input: { name: "Preserve Existing Bean", shortName: "Updated" },
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] };
    };
    expect(body.singleResult.errors).toBeUndefined();
    const result = body.singleResult.data!.createBean as {
      id: string;
      shortName: string | null;
    };
    expect(result.shortName).toBe("Original");
  });

  it("addBeanToLibrary rejects missing shortName", async () => {
    const bean = await prisma.bean.create({
      data: { name: "Library No ShortName" },
    });
    createdBeanIds.push(bean.id);

    const response = await server.executeOperation(
      {
        query: ADD_BEAN_TO_LIBRARY,
        variables: { beanId: bean.id },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] };
    };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Short name is required");
  });

  it("createBean rejects single-word bean names", async () => {
    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: { input: { name: "Ethiopia" } },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] };
    };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("at least 2 words");
  });

  it("createBean rejects whitespace-only names and names with trailing spaces counted as one word", async () => {
    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: { input: { name: "   Colombia   " } },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: { data: Record<string, unknown> | null; errors?: { message: string }[] };
    };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("at least 2 words");
  });

  it("addBeanToLibrary rejects duplicate userId+beanId", async () => {
    const bean = await prisma.bean.create({
      data: { name: "Duplicate Library Bean" },
    });
    createdBeanIds.push(bean.id);

    // First add succeeds
    const firstResponse = await server.executeOperation(
      {
        query: ADD_BEAN_TO_LIBRARY,
        variables: { beanId: bean.id, shortName: "DUP" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const firstBody = firstResponse.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };
    expect(firstBody.singleResult.errors).toBeUndefined();
    const firstUserBean = firstBody.singleResult.data!.addBeanToLibrary as { id: string };
    createdUserBeanIds.push(firstUserBean.id);

    // Second add with same bean should fail
    const secondResponse = await server.executeOperation(
      {
        query: ADD_BEAN_TO_LIBRARY,
        variables: { beanId: bean.id, shortName: "DUP2" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const secondBody = secondResponse.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };
    expect(secondBody.singleResult.errors).toBeDefined();
  });

  it("distinctSuppliers returns unique non-null supplier values", async () => {
    const result = await server.executeOperation(
      {
        query: `query { distinctSuppliers }`,
      },
      { contextValue: { prisma } },
    );

    expect(result.body.kind).toBe("single");
    const data = (result.body as any).singleResult.data;
    expect(Array.isArray(data.distinctSuppliers)).toBe(true);
    // Should contain no duplicates
    const set = new Set(data.distinctSuppliers);
    expect(set.size).toBe(data.distinctSuppliers.length);
    // Should not contain null
    expect(data.distinctSuppliers).not.toContain(null);
  });

  it("updateUserBean rejects cross-user access", async () => {
    const bean = await prisma.bean.create({
      data: { name: "Cross User Bean" },
    });
    createdBeanIds.push(bean.id);

    // Create userBean for user A
    const userBean = await prisma.userBean.create({
      data: { userId: testUserId, beanId: bean.id, shortName: "XU" },
    });
    createdUserBeanIds.push(userBean.id);

    // Try to update as user B
    const response = await server.executeOperation(
      {
        query: UPDATE_USER_BEAN,
        variables: { id: userBean.id, shortName: "HACKED" },
      },
      { contextValue: { prisma, userId: testUserIdB } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("not found");

    // Verify the original shortName is unchanged
    const unchanged = await prisma.userBean.findUnique({
      where: { id: userBean.id },
    });
    expect(unchanged!.shortName).toBe("XU");
  });
});
