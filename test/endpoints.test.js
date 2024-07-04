import { expect } from "chai";
import request from "supertest";
import app from "../server"; // Adjust the path to your server file
import dbClient from "../utils/db";

describe("API Endpoints", () => {
  let authToken;

  before(async () => {
    await dbClient.db.collection("users").deleteMany({});
    await dbClient.db.collection("files").deleteMany({});
  });

  it("should return status", (done) => {
    request(app)
      .get("/status")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("redis", true);
        expect(res.body).to.have.property("db", true);
        done();
      });
  });

  it("should return stats", (done) => {
    request(app)
      .get("/stats")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("users").that.is.a("number");
        expect(res.body).to.have.property("files").that.is.a("number");
        done();
      });
  });

  it("should create a new user", (done) => {
    request(app)
      .post("/users")
      .send({ email: "test@example.com", password: "password123" })
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("email", "test@example.com");
        expect(res.body).to.have.property("id");
        done();
      });
  });

  it("should authenticate a user and return a token", (done) => {
    request(app)
      .get("/connect")
      .set(
        "Authorization",
        "Basic " +
          Buffer.from("test@example.com:password123").toString("base64")
      )
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("token");
        authToken = res.body.token;
        done();
      });
  });

  it("should return the authenticated user", (done) => {
    request(app)
      .get("/users/me")
      .set("X-Token", authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("email", "test@example.com");
        expect(res.body).to.have.property("id");
        done();
      });
  });
  let fileId;

  it("should upload a file", (done) => {
    request(app)
      .post("/files")
      .set("X-Token", authToken)
      .send({
        name: "testfile.txt",
        type: "file",
        data: Buffer.from("Hello, world!").toString("base64"),
      })
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("name", "testfile.txt");
        expect(res.body).to.have.property("type", "file");
        expect(res.body).to.have.property("userId");
        fileId = res.body.id;
        done();
      });
  });

  //   Add more tests for remaining endpoints
  it("should get a file by ID", (done) => {
    request(app)
      .get("/files/" + fileId)
      .set("X-Token", authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("name");
        expect(res.body).to.have.property("type");
        expect(res.body).to.have.property("userId");
        done();
      });
  });

  it("should list files with pagination", (done) => {
    request(app)
      .get("/files?page=0&parentId=0")
      .set("X-Token", authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an("array");
        done();
      });
  });

  it("should publish a file", (done) => {
    request(app)
      .put("/files/" + fileId + "/publish")
      .set("X-Token", authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("isPublic", true);
        done();
      });
  });

  it("should unpublish a file", (done) => {
    request(app)
      .put("/files/" + fileId + "/unpublish")
      .set("X-Token", authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property("isPublic", false);
        done();
      });
  });

  it("should get file data", (done) => {
    request(app)
      .get("/files/" + fileId + "/data")
      .set("X-Token", authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.text).to.be.a("string");
        done();
      });
  });

  it("should disconnect the user", (done) => {
    request(app).get("/disconnect").set("X-Token", authToken).expect(204, done);
  });

  it("should return unauthorized for invalid token", (done) => {
    request(app)
      .get("/users/me")
      .set("X-Token", "invalid_token")
      .expect(401, done);
  });
});
