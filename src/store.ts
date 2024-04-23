import type { DependencyStore as SdkDependencyStore } from "@gjuchault/typescript-service-sdk";
import { createDependencyStore } from "@gjuchault/typescript-service-sdk";

import type {
  HealthcheckRepository,
  UserRepository,
} from "~/repository/index.js";

type ExtraDependencies = {
  healthcheckRepository: HealthcheckRepository;
  userRepository: UserRepository;
};

export const createAppDependencyStore =
  createDependencyStore<ExtraDependencies>;

export const dependencyStore = createAppDependencyStore();

export type DependencyStore = SdkDependencyStore<ExtraDependencies>;
