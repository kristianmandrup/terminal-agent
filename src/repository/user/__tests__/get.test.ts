import {
  createMockDatabase,
  createMockLogger,
} from "@gjuchault/typescript-service-sdk";
import { beforeAll, describe, it, expect, vi } from "vitest";
import { createUserRepository, GetResult } from "../index.js";

describe("get()", () => {
  describe("given a database with users", () => {
    const { query, database } = createMockDatabase(vi, [
      {
        id: 1,
        name: "John",
        email: "john@mail.com",
      },
      {
        id: 2,
        name: "Doe",
        email: "doe@mail.com",
      },
    ]);

    const repository = createUserRepository({
      database,
      logger: createMockLogger(),
    });

    describe("when called", () => {
      let result: GetResult;

      beforeAll(async () => {
        result = await repository.get();
      });

      it("returns the data", () => {
        expect(result.ok).toBe(true);

        if (!result.ok) {
          expect.fail();
        }

        expect(result.val.some).toBe(true);

        if (!result.val.some) {
          expect.fail();
        }

        expect(result.val.val).toEqual([
          {
            id: 1,
            name: "John",
            email: "john@mail.com",
          },
          {
            id: 2,
            name: "Doe",
            email: "doe@mail.com",
          },
        ]);
      });

      it("called the database with the appropriate query", () => {
        expect(query).toBeCalledTimes(1);
        expect(query.mock.calls[0][0].trim()).toEqual("select * from users");
      });
    });
  });
});
