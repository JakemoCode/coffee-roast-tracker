import { GraphQLScalarType, Kind } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { beanResolvers } from "./bean.js";
import { flavorResolvers } from "./flavor.js";
import { roastResolvers } from "./roast.js";
import { userResolvers } from "./user.js";

const dateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 date-time string",
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    throw new Error("DateTime serialization error: unexpected value type");
  },
  parseValue(value) {
    if (typeof value === "string") return new Date(value);
    throw new Error("DateTime must be a string");
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    throw new Error("DateTime must be a string");
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,
  JSON: GraphQLJSON,

  Query: {
    ...beanResolvers.Query,
    ...roastResolvers.Query,
    ...flavorResolvers.Query,
    ...userResolvers.Query,
  },

  Mutation: {
    ...beanResolvers.Mutation,
    ...roastResolvers.Mutation,
    ...userResolvers.Mutation,
    ...flavorResolvers.Mutation,
  },

  Roast: {
    ...flavorResolvers.Roast,
  },

  Bean: {
    ...beanResolvers.Bean,
  },
};
