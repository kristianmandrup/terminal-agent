import { initContract } from "@ts-rest/core";
import { initServer } from "@ts-rest/fastify";

import { DependencyStore } from "~/store.js";

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
  const healthcheckRouter = bindHealthcheckRoutes({
    dependencyStore,
  });

  return s.router(contract, {
    ...healthcheckRouter,
  });
}
