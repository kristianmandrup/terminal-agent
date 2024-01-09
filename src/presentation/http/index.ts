import { DependencyStore } from "@gjuchault/typescript-service-sdk";
import { initContract } from "@ts-rest/core";
import { initServer } from "@ts-rest/fastify";

import type { HealthcheckApplication } from "~/application/healthcheck/index.js";

import {
  bindHealthcheckRoutes,
  healthcheckRouterContract,
} from "./routes/healthcheck/index.js";

const c = initContract();
const s = initServer();

export const contract = {
  ...healthcheckRouterContract,
};

export const routerContract = c.router(contract);

export type AppRouter = ReturnType<typeof createAppRouter>;

export function createAppRouter({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}) {
  const healthcheckApplication =
    dependencyStore.retrieve<HealthcheckApplication>("healthcheckApplication");

  const healthcheckRouter = bindHealthcheckRoutes({
    healthcheckApplication,
  });

  return s.router(contract, {
    ...healthcheckRouter,
  });
}
