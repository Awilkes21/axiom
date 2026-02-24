import request from "supertest";
import bcrypt from "bcryptjs";
import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import app from "./index.js";

describe("Backend routes", () => {
  function createToken(accountId = 7, email = "player@example.com") {
    return jwt.sign({ sub: String(accountId), email }, app.locals.jwtSecret, {
      expiresIn: "1h",
    });
  }

  beforeEach(() => {
    app.locals.pool = { query: jest.fn() };
    app.locals.jwtSecret = "test-secret";
  });

  it("GET / should return Hello from Backend!", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Hello from Backend!");
  });

  it("GET /health should return { status: 'ok' }", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("POST /auth/signup should create account and return token", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 11, email: "new@example.com", display_name: "New User" }],
      });

    const res = await request(app).post("/auth/signup").send({
      email: "new@example.com",
      password: "password123",
      displayName: "New User",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toEqual({
      id: 11,
      email: "new@example.com",
      displayName: "New User",
    });
    expect(typeof res.body.token).toBe("string");
  });

  it("POST /auth/signup should reject duplicate email", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 11 }],
    });

    const res = await request(app).post("/auth/signup").send({
      email: "new@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Email is already registered.");
  });

  it("POST /auth/login should return token for valid credentials", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 7,
          email: "player@example.com",
          password_hash: passwordHash,
          display_name: "Player",
        },
      ],
    });

    const res = await request(app).post("/auth/login").send({
      email: "player@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      email: "player@example.com",
      displayName: "Player",
    });
    expect(typeof res.body.token).toBe("string");
  });

  it("POST /auth/login should reject invalid credentials", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 7,
          email: "player@example.com",
          password_hash: passwordHash,
          display_name: "Player",
        },
      ],
    });

    const res = await request(app).post("/auth/login").send({
      email: "player@example.com",
      password: "wrong-password",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid credentials.");
  });

  it("GET /profile should require auth token", async () => {
    const res = await request(app).get("/profile");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Authorization token is required.");
  });

  it("GET /profile should return current user", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 7, email: "player@example.com", display_name: "Player" }],
    });

    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      email: "player@example.com",
      displayName: "Player",
    });
  });

  it("PATCH /profile should update profile fields", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 7,
          email: "updated@example.com",
          display_name: "Updated Name",
        },
      ],
    });

    const res = await request(app)
      .patch("/profile")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({
        email: "updated@example.com",
        displayName: "Updated Name",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      email: "updated@example.com",
      displayName: "Updated Name",
    });
  });

  it("PATCH /profile should reject duplicate email", async () => {
    const duplicateError = new Error("duplicate");
    duplicateError.code = "23505";
    app.locals.pool.query.mockRejectedValueOnce(duplicateError);

    const res = await request(app)
      .patch("/profile")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ email: "existing@example.com" });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Email is already registered.");
  });

  it("DELETE /profile should delete current account", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 7 }],
    });

    const res = await request(app)
      .delete("/profile")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Profile deleted.");
  });
});
