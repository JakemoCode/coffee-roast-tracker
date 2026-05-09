import { graphql as mswGraphql, HttpResponse } from "msw";
import {
  graphql as executeGraphQL,
  parse,
  validate,
  type DocumentNode,
} from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { addMocksToSchema } from "@graphql-tools/mock";
import { typeDefs } from "../../../server/src/schema/typeDefs.js";

// ---- Realistic mock data keyed by type ----

const mockBeans = [
  {
    id: "bean-1",
    name: "Ethiopia Yirgacheffe",
    origin: "Ethiopia",
    process: "Washed",
    elevation: "1800m",
    sourceUrl: "https://example.com/beans/ethiopia",
    bagNotes: null,
    supplier: "Sweet Maria's",
    variety: "Heirloom",
    score: 88,
    cropYear: 2025,
    suggestedFlavors: ["Jasmine", "Blueberry"],
    roasts: [],
    isLocked: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "bean-2",
    name: "Colombia Huila",
    origin: "Colombia",
    process: "Natural",
    elevation: "1600m",
    sourceUrl: null,
    bagNotes: null,
    supplier: null,
    variety: null,
    score: null,
    cropYear: null,
    suggestedFlavors: [],
    roasts: [],
    isLocked: true,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

const mockUserBeans = [
  {
    id: "ub-1",
    shortName: "Yirg",
    notes: "Light roast preferred",
    bean: mockBeans[0],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ub-2",
    shortName: "Huila",
    notes: null,
    bean: mockBeans[1],
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

const mockFlavorDescriptors = [
  { id: "fd-1", name: "Jasmine", category: "FLORAL", isOffFlavor: false, isCustom: false, color: "#db7093" },
  { id: "fd-2", name: "Rose", category: "FLORAL", isOffFlavor: false, isCustom: false, color: "#db7093" },
  { id: "fd-3", name: "Dark Chocolate", category: "NUTTY_COCOA", isOffFlavor: false, isCustom: false, color: "#8b5e4b" },
  { id: "fd-4", name: "Blueberry", category: "FRUITY", isOffFlavor: false, isCustom: false, color: "#6a5acd" },
  { id: "fd-5", name: "Caramel", category: "SWEET", isOffFlavor: false, isCustom: false, color: "#a88545" },
  { id: "fd-6", name: "Honey", category: "SWEET", isOffFlavor: false, isCustom: false, color: "#daa520" },
];

const mockOffFlavorDescriptors = [
  { id: "ofd-1", name: "Grassy", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#6b8e23" },
  { id: "ofd-2", name: "Roasty", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#c44a3b" },
  { id: "ofd-3", name: "Ashy", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#808080" },
];

const allFlavorDescriptors = [...mockFlavorDescriptors, ...mockOffFlavorDescriptors];

const baseFlavors = [
  { id: "f1", name: "Dark Chocolate", category: "NUTTY_COCOA", isOffFlavor: false, isCustom: false, color: "#8b5e4b" },
  { id: "f2", name: "Blueberry", category: "FRUITY", isOffFlavor: false, isCustom: false, color: "#6a5acd" },
  { id: "f3", name: "Honey", category: "SWEET", isOffFlavor: false, isCustom: false, color: "#daa520" },
  { id: "f4", name: "Floral", category: "FLORAL", isOffFlavor: false, isCustom: false, color: "#db7093" },
];

const mockRoasts = [
  {
    __typename: "Roast",
    id: "roast-1",
    userId: "user-1",
    roastDate: "2026-03-15T00:00:00.000Z",
    notes: "Great first crack, smooth development",
    ambientTemp: 22.5,
    roastingLevel: 55,
    tastingNotes: null,
    developmentTime: 75,
    developmentPercent: 18.5,
    totalDuration: 405,
    colourChangeTime: 240,
    colourChangeTemp: 150,
    firstCrackTime: 330,
    firstCrackTemp: 196,
    roastEndTime: 405,
    roastEndTemp: 210,
    timeSeriesData: [],
    roastProfileCurve: [],
    fanProfileCurve: [],
    rating: 4,
    isPublic: true,
    bean: mockBeans[0],
    flavors: [baseFlavors[0], baseFlavors[1], baseFlavors[2], baseFlavors[3]],
    offFlavors: [],
    roastFiles: [],
    roastProfile: { id: "profile-1", fileKey: "profiles/ethiopia.kpro", fileName: "ethiopia-light.kpro", profileType: "KAFFELOGIC", profileShortName: "Yirg", profileDesigner: "Jake", createdAt: "2026-03-15T00:00:00.000Z" },
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
  },
  {
    __typename: "Roast",
    id: "roast-2",
    userId: "user-1",
    roastDate: "2026-03-10T00:00:00.000Z",
    notes: "Slightly underdeveloped",
    ambientTemp: 21,
    roastingLevel: 50,
    tastingNotes: null,
    developmentTime: 60,
    developmentPercent: 15.0,
    totalDuration: 400,
    colourChangeTime: 235,
    colourChangeTemp: 148,
    firstCrackTime: 340,
    firstCrackTemp: 195,
    roastEndTime: 400,
    roastEndTemp: 205,
    timeSeriesData: [],
    roastProfileCurve: [],
    fanProfileCurve: [],
    rating: null,
    isPublic: true,
    bean: mockBeans[1],
    flavors: [
      { id: "f5", name: "Caramel", category: "SWEET", isOffFlavor: false, isCustom: false, color: "#a88545" },
    ],
    offFlavors: [
      { id: "f6", name: "Grassy", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#6b8e23" },
    ],
    roastFiles: [],
    roastProfile: null,
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
  },
];

const mockRoastDetail = {
  ...mockRoasts[0],
  id: "test-id",
};

const mockCompareRoasts = [
  {
    ...mockRoasts[0],
    timeSeriesData: [
      { time: 0, temp: 25 },
      { time: 60, temp: 100 },
      { time: 120, temp: 150 },
    ],
  },
  {
    ...mockRoasts[1],
    timeSeriesData: [
      { time: 0, temp: 24 },
      { time: 60, temp: 98 },
      { time: 120, temp: 148 },
    ],
  },
  {
    ...mockRoasts[0],
    id: "roast-3",
    roastDate: "2026-03-20T00:00:00.000Z",
    developmentTime: 80,
    developmentPercent: 19.5,
    totalDuration: 410,
    firstCrackTemp: 198,
    roastEndTemp: 212,
    colourChangeTime: 245,
    colourChangeTemp: 152,
    firstCrackTime: 335,
    roastEndTime: 410,
    rating: 5,
    timeSeriesData: [
      { time: 0, temp: 26 },
      { time: 60, temp: 102 },
      { time: 120, temp: 152 },
    ],
  },
];

// ---- Build executable schema with mock resolvers ----

const baseSchema = makeExecutableSchema({
  typeDefs: typeDefs as DocumentNode,
});

const resolvers = {
  Query: {
    userSettings: () => ({
      id: "user-1",
      clerkId: "clerk-user-1",
      tempUnit: "CELSIUS",
      theme: "system",
      privateByDefault: false,
      userBeans: mockUserBeans,
      roasts: mockRoasts,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    myBeans: () => mockUserBeans,
    myRoasts: () => mockRoasts,
    roastById: (_: unknown, { id }: { id: string }) => {
      if (id === "test-id") return mockRoastDetail;
      const found = mockRoasts.find((r) => r.id === id);
      return found ?? null;
    },
    roastsByBean: (_: unknown, { beanId }: { beanId: string }) =>
      mockRoasts.filter((r) => r.bean?.id === beanId),
    roastsByIds: (_: unknown, { ids }: { ids: string[] }) =>
      mockCompareRoasts.filter((r) => ids.includes((r as { id: string }).id)),
    flavorDescriptors: (_: unknown, { isOffFlavor }: { isOffFlavor?: boolean }) => {
      if (isOffFlavor === true) return mockOffFlavorDescriptors;
      if (isOffFlavor === false) return mockFlavorDescriptors;
      return allFlavorDescriptors;
    },
    previewRoastLog: () => ({
      roastDate: "2026-03-20T00:00:00.000Z",
      ambientTemp: 22.0,
      roastingLevel: 55.0,
      tastingNotes: null,
      profileShortName: "Yirg",
      profileDesigner: "Jake",
      colourChangeTime: 240,
      firstCrackTime: 330,
      roastEndTime: 405,
      developmentPercent: 18.5,
      totalDuration: 405,
      suggestedBeans: [mockUserBeans[0]],
      parseWarnings: ["Ambient temp not recorded"],
    }),
    previewRoastLogs: (_: unknown, { files }: { files: Array<{ fileName: string; fileContent: string }> }) =>
      files.map((f) => ({
        fileName: f.fileName,
        preview: {
          roastDate: "2026-03-20T00:00:00.000Z",
          ambientTemp: 22.0,
          roastingLevel: 55.0,
          tastingNotes: null,
          profileShortName: "Yirg",
          profileDesigner: "Jake",
          colourChangeTime: 240,
          firstCrackTime: 330,
          roastEndTime: 405,
          developmentPercent: 18.5,
          totalDuration: 405,
          suggestedBeans: [mockUserBeans[0]],
          parseWarnings: [],
        },
        error: null,
      })),
    scrapeBeanUrl: () => ({
      name: "Colombia China Alta Jose Buitrago",
      origin: "Huila, Colombia",
      process: "Washed",
      elevation: "1800-2000m",
      variety: null,
      bagNotes: "A clean and balanced cup with caramel sweetness and milk chocolate body.",
      score: null,
      cropYear: null,
      suggestedFlavors: ["Caramel", "Milk Chocolate", "Apple"],
    }),
    parseBeanPage: () => ({
      name: null,
      origin: null,
      process: null,
      elevation: null,
      variety: null,
      bagNotes: null,
      score: null,
      cropYear: null,
      suggestedFlavors: null,
    }),
    downloadProfile: () => ({
      fileName: "ethiopia-light.kpro",
      content: "base64content",
    }),
    communityStats: () => ({
      totalRoasts: 42,
      totalBeans: 15,
    }),
    publicBeans: () => mockBeans,
    publicRoasts: () => mockRoasts,
    bean: (_: unknown, { id }: { id: string }) =>
      mockBeans.find((b) => b.id === id) ?? null,
    roast: (_: unknown, { id }: { id: string }) => {
      if (id === "test-id") return mockRoastDetail;
      return mockRoasts.find((r) => r.id === id) ?? null;
    },
    parseSupplierNotes: (_: unknown, { text }: { text: string }) => {
      const lower = text.toLowerCase();
      return allFlavorDescriptors.filter((f) => lower.includes(f.name.toLowerCase()));
    },
    distinctSuppliers: () => ["Happy Mug", "Sweet Maria's"],
  },
  Mutation: {
    createBean: (_: unknown, { input }: { input: Record<string, unknown> }) => ({
      id: "ub-new-1",
      shortName: input.shortName ?? null,
      notes: input.notes ?? null,
      bean: {
        id: "bean-new-1",
        name: input.name,
        origin: input.origin ?? null,
        process: input.process ?? null,
        elevation: input.elevation ?? null,
        sourceUrl: input.sourceUrl ?? null,
        bagNotes: input.bagNotes ?? null,
        variety: input.variety ?? null,
        score: input.score ?? null,
        cropYear: input.cropYear ?? null,
        suggestedFlavors: input.suggestedFlavors ?? [],
        roasts: [],
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
      createdAt: "2026-03-20T00:00:00.000Z",
    }),
    addBeanToLibrary: (_: unknown, { beanId, notes, shortName }: { beanId: string; notes?: string; shortName?: string }) => ({
      id: "ub-added-1",
      shortName: shortName ?? null,
      notes: notes ?? null,
      bean: mockBeans.find((b) => b.id === beanId) ?? mockBeans[0],
      createdAt: "2026-03-20T00:00:00.000Z",
    }),
    updateUserBean: (_: unknown, { id, notes, shortName }: { id: string; notes?: string; shortName?: string }) => ({
      id,
      notes: notes ?? null,
      shortName: shortName ?? null,
      bean: mockBeans[0],
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    removeBeanFromLibrary: () => true,
    createRoast: (_: unknown, { input }: { input: Record<string, unknown> }) => ({
      ...mockRoasts[0],
      id: "roast-new-1",
      ...input,
    }),
    updateRoast: (_: unknown, { id, input }: { id: string; input: Record<string, unknown> }) => {
      const existing = mockRoasts.find((r) => r.id === id) ?? mockRoastDetail;
      return { ...existing, id, ...input };
    },
    deleteRoast: () => true,
    toggleRoastPublic: (_: unknown, { id }: { id: string }) => {
      const existing = mockRoasts.find((r) => r.id === id) ?? mockRoastDetail;
      const isPublic = (existing as unknown as { isPublic: boolean }).isPublic;
      return { ...existing, id, isPublic: !isPublic };
    },
    uploadRoastProfile: (_: unknown, { input }: { input: Record<string, unknown> }) => ({
      id: "profile-new-1",
      fileKey: input.fileKey,
      fileName: input.fileName,
      profileType: input.profileType ?? "KAFFELOGIC",
      profileShortName: null,
      profileDesigner: null,
      createdAt: "2026-03-20T00:00:00.000Z",
    }),
    uploadRoastLog: (_: unknown, args: Record<string, unknown>) => ({
      roast: { ...mockRoasts[0], id: "roast-new-1" },
      parseWarnings: [],
    }),
    updateTempUnit: (_: unknown, { tempUnit }: { tempUnit: string }) => ({
      id: "user-1",
      clerkId: "clerk-user-1",
      tempUnit,
      theme: "system",
      privateByDefault: false,
      userBeans: mockUserBeans,
      roasts: mockRoasts,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    updateTheme: (_: unknown, { theme }: { theme: string }) => ({
      id: "user-1",
      clerkId: "clerk-user-1",
      tempUnit: "CELSIUS",
      theme,
      privateByDefault: false,
      userBeans: mockUserBeans,
      roasts: mockRoasts,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    updatePrivacyDefault: (_: unknown, { privateByDefault }: { privateByDefault: boolean }) => ({
      id: "user-1",
      clerkId: "clerk-user-1",
      tempUnit: "CELSIUS",
      theme: "system",
      privateByDefault,
      userBeans: mockUserBeans,
      roasts: mockRoasts,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    createFlavorDescriptor: (_: unknown, { name, category }: { name: string; category: string }) => ({
      id: "custom-new-1",
      name,
      category,
      isCustom: true,
      color: "#888888",
      isOffFlavor: category === "OFF_FLAVOR",
    }),
    setRoastFlavors: (_: unknown, { roastId, descriptorIds }: { roastId: string; descriptorIds: string[] }) => {
      const roast = mockRoasts.find((r) => r.id === roastId) ?? mockRoastDetail;
      return {
        ...roast,
        id: roastId,
        flavors: descriptorIds.map((id) => {
          const d = allFlavorDescriptors.find((f) => f.id === id);
          return d ?? { id, name: "Unknown", category: "OTHER", isOffFlavor: false, isCustom: false, color: "#888888" };
        }),
      };
    },
    setRoastOffFlavors: (_: unknown, { roastId, descriptorIds }: { roastId: string; descriptorIds: string[] }) => {
      const roast = mockRoasts.find((r) => r.id === roastId) ?? mockRoastDetail;
      return {
        ...roast,
        id: roastId,
        offFlavors: descriptorIds.map((id) => {
          const d = allFlavorDescriptors.find((f) => f.id === id);
          return d ?? { id, name: "Unknown", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#c44a3b" };
        }),
      };
    },
    updateBean: (_: unknown, { id, input }: { id: string; input: Record<string, unknown> }) => {
      const bean = mockBeans.find((b) => b.id === id) ?? mockBeans[0];
      return { ...bean, id, ...input };
    },
    updateBeanSuggestedFlavors: (_: unknown, { beanId, suggestedFlavors }: { beanId: string; suggestedFlavors: string[] }) => {
      const bean = mockBeans.find((b) => b.id === beanId) ?? mockBeans[0];
      return { ...bean, suggestedFlavors };
    },
  },
  // Scalar resolvers
  DateTime: {
    __serialize: (value: unknown) => value,
    __parseValue: (value: unknown) => value,
    __parseLiteral: (ast: unknown) => (ast as { value: string }).value,
  },
  JSON: {
    __serialize: (value: unknown) => value,
    __parseValue: (value: unknown) => value,
    __parseLiteral: (ast: unknown) => (ast as { value: unknown }).value,
  },
};

const mockedSchema = addMocksToSchema({
  schema: baseSchema,
  resolvers: () => resolvers,
  preserveResolvers: false,
});

// ---- MSW catch-all handler ----

export const schemaHandler = mswGraphql.operation(async ({ request }) => {
  const body = await request.json() as unknown as {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  };

  let document: DocumentNode;
  try {
    document = parse(body.query);
  } catch (parseError) {
    return HttpResponse.json({
      errors: [{ message: `GraphQL parse error: ${(parseError as Error).message}` }],
    });
  }

  const validationErrors = validate(baseSchema, document);
  if (validationErrors.length > 0) {
    return HttpResponse.json({
      errors: validationErrors.map((e) => ({
        message: e.message,
        locations: e.locations,
      })),
    });
  }

  const result = await executeGraphQL({
    schema: mockedSchema,
    source: body.query,
    variableValues: body.variables ?? {},
    operationName: body.operationName,
  });

  return HttpResponse.json({
    data: result.data ?? null,
    errors: result.errors?.map((e) => ({
      message: e.message,
      locations: e.locations,
      path: e.path,
    })),
  });
});
