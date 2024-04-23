import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { sql } from "slonik";
import { z } from "zod";

import type { DependencyStore } from "~/store";

export type GetHealthcheckResult = Result<"healthy", "databaseError">;

export async function getHealthcheck({
  dependencyStore,
  requestId,
}: {
  dependencyStore: DependencyStore;
  requestId: string;
}): Promise<GetHealthcheckResult> {
  const createLogger = dependencyStore.get("logger");
  const database = dependencyStore.get("database");

  const logger = createLogger("repository/healthcheck/get-healthcheck");

  try {
    await database.query(sql.type(z.unknown())`select 1`);

    return ok("healthy");
  } catch (error) {
    logger.error("database error", { requestId, error });

    return err("databaseError");
  }
}
