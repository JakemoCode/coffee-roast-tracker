import graphqlTag from "graphql-tag";
const gql = graphqlTag.gql ?? graphqlTag;

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  enum TempUnit {
    CELSIUS
    FAHRENHEIT
  }

  enum FileType {
    KLOG
    CSV
  }

  enum ProfileType {
    KAFFELOGIC
  }

  enum FlavorCategory {
    FRUITY SOUR_FERMENTED GREEN_VEGETATIVE OTHER ROASTED SPICES NUTTY_COCOA SWEET FLORAL OFF_FLAVOR
  }

  type User {
    id: ID!
    clerkId: String!
    tempUnit: TempUnit!
    theme: String!
    privateByDefault: Boolean!
    userBeans: [UserBean!]!
    roasts: [Roast!]!
    createdAt: DateTime!
  }

  type Bean {
    id: ID!
    name: String!
    origin: String
    process: String
    cropYear: Int
    sourceUrl: String
    elevation: String
    variety: String
    bagNotes: String
    supplier: String
    score: Float
    suggestedFlavors: [String!]!
    roasts: [Roast!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserBean {
    id: ID!
    notes: String
    shortName: String
    bean: Bean!
    createdAt: DateTime!
  }

  type Roast {
    id: ID!
    userId: ID!
    # Header metadata from .klog
    ambientTemp: Float
    roastingLevel: Float
    tastingNotes: String
    # Event marker timestamps
    colourChangeTime: Float
    firstCrackTime: Float
    roastEndTime: Float
    # Temperatures at event markers
    colourChangeTemp: Float
    firstCrackTemp: Float
    roastEndTemp: Float
    # Phase data
    developmentTime: Float
    developmentPercent: Float
    totalDuration: Float
    roastDate: DateTime
    # Time-series and curve data for chart rendering
    timeSeriesData: JSON
    roastProfileCurve: JSON
    fanProfileCurve: JSON
    # User notes and visibility
    notes: String
    isPublic: Boolean!
    rating: Float
    flavors: [FlavorDescriptor!]!
    offFlavors: [FlavorDescriptor!]!
    bean: Bean!
    roastFiles: [RoastFile!]!
    roastProfile: RoastProfile
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RoastFile {
    id: ID!
    fileKey: String!
    fileName: String!
    fileType: FileType!
    createdAt: DateTime!
  }

  type RoastProfile {
    id: ID!
    fileKey: String!
    fileName: String!
    profileType: ProfileType!
    profileShortName: String
    profileDesigner: String
    createdAt: DateTime!
  }

  type FlavorDescriptor {
    id: ID!
    name: String!
    category: FlavorCategory!
    isOffFlavor: Boolean!
    isParent: Boolean!
    isQuality: Boolean!
    isCustom: Boolean!
    color: String!
  }

  type BeanScrapeResult {
    name: String
    origin: String
    process: String
    elevation: String
    variety: String
    bagNotes: String
    score: Float
    cropYear: Int
    suggestedFlavors: [String!]
  }

  type UploadRoastResult {
    roast: Roast!
    parseWarnings: [String!]!
    # True when the file matched an existing roast (by content hash, or by
    # filename for legacy roasts). The returned roast is the existing one;
    # no new row was created.
    wasDuplicate: Boolean!
  }

  input RoastLogInput {
    fileName: String!
    fileContent: String!
  }

  type RoastLogPreviewResult {
    fileName: String!
    preview: RoastLogPreview
    error: String
  }

  type RoastLogPreview {
    roastDate: DateTime
    ambientTemp: Float
    roastingLevel: Float
    tastingNotes: String
    profileShortName: String
    profileDesigner: String
    colourChangeTime: Float
    firstCrackTime: Float
    roastEndTime: Float
    developmentPercent: Float
    totalDuration: Float
    suggestedBeans: [UserBean!]!
    communityBeans: [Bean!]!
    parseWarnings: [String!]!
    # ID of an existing roast in the user's library that matches this file's
    # content hash. Null when the file is new. Lets the client show
    # "already in library" before the user commits the upload.
    existingRoastId: String
  }

  type ProfileDownload {
    fileName: String!
    content: String!
  }

  type CommunityStats {
    totalRoasts: Int!
    totalBeans: Int!
  }

  # --- Inputs ---

  input CreateBeanInput {
    name: String!
    origin: String
    process: String
    cropYear: Int
    sourceUrl: String
    elevation: String
    variety: String
    bagNotes: String
    supplier: String
    score: Float
    notes: String
    shortName: String
    suggestedFlavors: [String!]
  }

  # Bean identity fields (name, origin, process, variety) are locked after
  # creation — they're what makes a bean *that bean* and edits would corrupt
  # the shared catalog. If an entry is wrong, create a new bean and delete
  # the old one. The remaining fields describe usage and stay community-editable.
  input UpdateBeanInput {
    cropYear: Int
    sourceUrl: String
    elevation: String
    bagNotes: String
    supplier: String
    score: Float
  }

  input CreateRoastInput {
    beanId: String!
    ambientTemp: Float
    roastingLevel: Float
    tastingNotes: String
    colourChangeTime: Float
    firstCrackTime: Float
    roastEndTime: Float
    colourChangeTemp: Float
    firstCrackTemp: Float
    roastEndTemp: Float
    developmentTime: Float
    developmentPercent: Float
    totalDuration: Float
    roastDate: DateTime
    timeSeriesData: JSON
    roastProfileCurve: JSON
    fanProfileCurve: JSON
    notes: String
  }

  input UpdateRoastInput {
    ambientTemp: Float
    roastingLevel: Float
    tastingNotes: String
    colourChangeTime: Float
    firstCrackTime: Float
    roastEndTime: Float
    colourChangeTemp: Float
    firstCrackTemp: Float
    roastEndTemp: Float
    developmentTime: Float
    developmentPercent: Float
    totalDuration: Float
    roastDate: DateTime
    timeSeriesData: JSON
    roastProfileCurve: JSON
    fanProfileCurve: JSON
    notes: String
    rating: Float
  }

  input UploadRoastProfileInput {
    roastId: String!
    fileKey: String!
    fileName: String!
    profileType: ProfileType
  }

  # --- Queries ---

  type Query {
    # Authenticated
    userSettings: User!
    previewRoastLog(fileName: String!, fileContent: String!): RoastLogPreview!
    previewRoastLogs(files: [RoastLogInput!]!): [RoastLogPreviewResult!]!
    downloadProfile(roastId: String!): ProfileDownload
    myBeans: [UserBean!]!
    myRoasts: [Roast!]!
    roastById(id: String!): Roast
    roastsByBean(beanId: String!): [Roast!]!
    roastsByIds(ids: [String!]!): [Roast!]!

    # Flavors (public — reference data)
    flavorDescriptors(isOffFlavor: Boolean): [FlavorDescriptor!]!
    parseSupplierNotes(text: String!): [FlavorDescriptor!]!
    scrapeBeanUrl(url: String!): BeanScrapeResult!
    parseBeanPage(html: String!): BeanScrapeResult!

    # Public
    communityStats: CommunityStats!
    distinctSuppliers: [String!]!
    publicBeans(limit: Int): [Bean!]!
    publicRoasts(beanId: String, limit: Int, offset: Int): [Roast!]!
    bean(id: String!): Bean
    roast(id: String!): Roast
  }

  # --- Mutations ---

  type Mutation {
    createBean(input: CreateBeanInput!): UserBean!
    addBeanToLibrary(beanId: String!, notes: String, shortName: String): UserBean!
    updateUserBean(id: String!, notes: String, shortName: String): UserBean!
    removeBeanFromLibrary(beanId: String!): Boolean!
    createRoast(input: CreateRoastInput!): Roast!
    updateRoast(id: String!, input: UpdateRoastInput!): Roast!
    deleteRoast(id: String!): Boolean!
    toggleRoastPublic(id: String!): Roast!
    uploadRoastProfile(input: UploadRoastProfileInput!): RoastProfile!
    uploadRoastLog(beanId: String!, fileName: String!, fileContent: String!, notes: String): UploadRoastResult!
    updateTempUnit(tempUnit: TempUnit!): User!
    updateTheme(theme: String!): User!
    updatePrivacyDefault(privateByDefault: Boolean!): User!
    createFlavorDescriptor(name: String!, category: FlavorCategory!): FlavorDescriptor!
    setRoastFlavors(roastId: String!, descriptorIds: [String!]!): Roast!
    setRoastOffFlavors(roastId: String!, descriptorIds: [String!]!): Roast!
    updateBean(id: String!, input: UpdateBeanInput!): Bean!
    updateBeanSuggestedFlavors(beanId: String!, suggestedFlavors: [String!]!): Bean!
  }
`;
