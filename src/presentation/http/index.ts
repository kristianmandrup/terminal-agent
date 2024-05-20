import { initContract } from "@ts-rest/core";
import { initServer } from "@ts-rest/fastify";

import { TExecuteCommand } from "~/services/execute/service.js";
import type { DependencyStore } from "~/store.js";

import {
  executeCommandRoute,
  executeRouterContract,
} from "./routes/execute/index.js";
import {
  getHealthcheckRoute,
  healthcheckRouterContract,
} from "./routes/healthcheck/index.js";

const c = initContract();
const s = initServer();

export const contract = {
  ...healthcheckRouterContract,
  ...executeRouterContract,
};

export const routerContract = c.router(contract);

export type AppRouter = ReturnType<typeof createAppRouter>;

export function createAppRouter({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}) {
  return s.router(contract, {
    getHealthcheck: ({ request }) =>
      getHealthcheckRoute({ dependencyStore, requestId: request.id }),
    executeCommand: ({ request }) => {
      const body = request.body as TExecuteCommand;
      return executeCommandRoute(body);
    },
  });
}
