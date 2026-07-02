import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
  type ExecutionResult,
} from "graphql";
import { getStoreSingleton } from "./runtime";
import type { StoreCore } from "./store-core";
import type {
  DashboardBootstrap,
  Subscription,
  SubscriptionFilterStatus,
  TransactionFeedItem,
} from "../../shared/subscriptions/types";

const subscriptionFilterStatusEnum = new GraphQLEnumType({
  name: "SubscriptionFilterStatus",
  values: {
    ACTIVE: {
      value: "ACTIVE",
    },
  },
});

const subscriptionType = new GraphQLObjectType<Subscription>({
  name: "Subscription",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    planName: { type: new GraphQLNonNull(GraphQLString) },
    amountCents: { type: new GraphQLNonNull(GraphQLInt) },
    currency: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    billingIntervalMs: { type: new GraphQLNonNull(GraphQLInt) },
    nextBillingAt: { type: new GraphQLNonNull(GraphQLString) },
    pausedAt: { type: GraphQLString },
    pauseUntil: { type: GraphQLString },
    canceledAt: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const transactionFeedItemType = new GraphQLObjectType<TransactionFeedItem>({
  name: "TransactionFeedItem",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    subscriptionId: { type: new GraphQLNonNull(GraphQLID) },
    planName: { type: new GraphQLNonNull(GraphQLString) },
    amountCents: { type: new GraphQLNonNull(GraphQLInt) },
    currency: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const subscriptionConnectionType = new GraphQLObjectType({
  name: "SubscriptionConnection",
  fields: {
    items: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(subscriptionType)),
      ),
    },
    limit: { type: new GraphQLNonNull(GraphQLInt) },
    nextCursor: { type: GraphQLString },
  },
});

const transactionConnectionType = new GraphQLObjectType({
  name: "TransactionConnection",
  fields: {
    items: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(transactionFeedItemType)),
      ),
    },
    limit: { type: new GraphQLNonNull(GraphQLInt) },
    nextCursor: { type: GraphQLString },
  },
});

const dashboardBootstrapType = new GraphQLObjectType<DashboardBootstrap>({
  name: "DashboardBootstrap",
  fields: {
    snapshotEventId: { type: new GraphQLNonNull(GraphQLID) },
    subscriptions: { type: new GraphQLNonNull(subscriptionConnectionType) },
    transactions: { type: new GraphQLNonNull(transactionConnectionType) },
  },
});

const queryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    dashboardBootstrap: {
      type: new GraphQLNonNull(dashboardBootstrapType),
      args: {
        status: { type: subscriptionFilterStatusEnum },
        subscriptionLimit: { type: new GraphQLNonNull(GraphQLInt) },
        transactionLimit: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, args, context: { store: StoreCore }) =>
        context.store.getDashboardBootstrap({
          status: (args.status as SubscriptionFilterStatus | null | undefined) ?? null,
          subscriptionLimit: args.subscriptionLimit,
          transactionLimit: args.transactionLimit,
        }),
    },
    subscriptions: {
      type: new GraphQLNonNull(subscriptionConnectionType),
      args: {
        status: { type: subscriptionFilterStatusEnum },
        limit: { type: GraphQLInt },
        cursor: { type: GraphQLString },
      },
      resolve: (_, args, context: { store: StoreCore }) =>
        context.store.listSubscriptions({
          status: (args.status as SubscriptionFilterStatus | null | undefined) ?? null,
          limit: args.limit ?? null,
          cursor: args.cursor ?? null,
        }),
    },
    transactions: {
      type: new GraphQLNonNull(transactionConnectionType),
      args: {
        limit: { type: GraphQLInt },
        cursor: { type: GraphQLString },
      },
      resolve: (_, args, context: { store: StoreCore }) =>
        context.store.listTransactions({
          limit: args.limit ?? null,
          cursor: args.cursor ?? null,
        }),
    },
  },
});

const schema = new GraphQLSchema({
  query: queryType,
});

export async function executeSubscriptionsGraphQL<TData>(
  query: string,
  variableValues?: Record<string, unknown>,
  store: StoreCore = getStoreSingleton().core,
): Promise<ExecutionResult<TData>> {
  const result = await graphql({
    schema,
    source: query,
    variableValues,
    contextValue: {
      store,
    },
  });

  return result as ExecutionResult<TData>;
}
