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

  it("POST /teams should create team and add creator as admin member", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, name: "Team Neon", title_id: 1 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const res = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ name: "Team Neon", titleId: 1 });

    expect(res.statusCode).toBe(201);
    expect(res.body.team).toEqual({
      id: 3,
      name: "Team Neon",
      titleId: 1,
    });
  });

  it("GET /teams/:teamId should return team with members", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, name: "Team Neon", title_id: 1 }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ account_id: 7, team_id: 3, role: "admin" }],
      });

    const res = await request(app)
      .get("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.team).toEqual({ id: 3, name: "Team Neon", titleId: 1 });
    expect(res.body.members).toEqual([{ accountId: 7, teamId: 3, role: "admin" }]);
  });

  it("PATCH /teams/:teamId should update team", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 3, name: "Team Neon 2", title_id: 2 }],
    });

    const res = await request(app)
      .patch("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ name: "Team Neon 2", titleId: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body.team).toEqual({ id: 3, name: "Team Neon 2", titleId: 2 });
  });

  it("POST /teams/:teamId/members should add a member", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ account_id: 9, team_id: 3, role: "player" }],
    });

    const res = await request(app)
      .post("/teams/3/members")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ accountId: 9, role: "player" });

    expect(res.statusCode).toBe(201);
    expect(res.body.membership).toEqual({
      accountId: 9,
      teamId: 3,
      role: "player",
    });
  });

  it("DELETE /teams/:teamId/members/:accountId should remove member", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ account_id: 9, team_id: 3, role: "player" }],
    });

    const res = await request(app)
      .delete("/teams/3/members/9")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Member removed.");
  });

  it("DELETE /teams/:teamId should delete team", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 3 }],
    });

    const res = await request(app)
      .delete("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Team deleted.");
  });
});
