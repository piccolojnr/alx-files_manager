import { expect } from "chai";
import dbClient from "../utils/db";

describe("DBClient", () => {
  it("should be alive", async () => {
    const isAlive = dbClient.isAlive();
    expect(isAlive).to.be.true;
  });

  it("should return number of users", async () => {
    const nbUsers = await dbClient.nbUsers();
    expect(nbUsers).to.be.a("number");
  });

  it("should return number of files", async () => {
    const nbFiles = await dbClient.nbFiles();
    expect(nbFiles).to.be.a("number");
  });
});
