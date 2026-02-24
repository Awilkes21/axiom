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
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, name: "Team Neon", title_id: 1, visibility: "private" }],
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
      visibility: "private",
    });
  });

  it("POST /teams should return 403 for non-manager existing members", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ name: "Team Blocked", titleId: 1 });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team owners/managers can create teams.");
  });

  it("GET /teams/:teamId should return team with members", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, name: "Team Neon", title_id: 1, visibility: "public" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ account_id: 7, team_id: 3, role: "admin" }],
      });

    const res = await request(app)
      .get("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.team).toEqual({ id: 3, name: "Team Neon", titleId: 1, visibility: "public" });
    expect(res.body.members).toEqual([{ accountId: 7, teamId: 3, role: "admin" }]);
  });

  it("PATCH /teams/:teamId should update team", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, name: "Team Neon 2", title_id: 2, visibility: "public" }],
      });

    const res = await request(app)
      .patch("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ name: "Team Neon 2", titleId: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body.team).toEqual({ id: 3, name: "Team Neon 2", titleId: 2, visibility: "public" });
  });

  it("POST /teams/:teamId/members should add a member", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
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

  it("POST /teams/:teamId/members should return 409 when member already exists", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "player" }] });

    const res = await request(app)
      .post("/teams/3/members")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ accountId: 9, role: "coach" });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Member already exists on this team. Use role update endpoint.");
  });

  it("DELETE /teams/:teamId/members/:accountId should remove member", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ account_id: 9, team_id: 3, role: "player" }],
      });

    const res = await request(app)
      .delete("/teams/3/members/9")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Member removed.");
  });

  it("DELETE /teams/:teamId should return 403 for manager (admin only action)", async () => {
    app.locals.pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .delete("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team admins can delete teams.");
  });

  it("POST /teams/:teamId/members should return 403 when manager assigns admin role", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post("/teams/3/members")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ accountId: 9, role: "admin" });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team admins can assign manager/admin roles.");
  });

  it("DELETE /teams/:teamId/members/:accountId should return 403 when manager removes admin", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .delete("/teams/3/members/9")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team admins can remove manager/admin roles.");
  });

  it("DELETE /teams/:teamId/members/:accountId should block removing last admin", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 1 }] });

    const res = await request(app)
      .delete("/teams/3/members/9")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Cannot remove the last team admin.");
  });

  it("DELETE /teams/:teamId should delete team", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3 }],
      });

    const res = await request(app)
      .delete("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Team deleted.");
  });

  it("POST /scrims should create scrim with pending status", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 20,
            team1_id: 3,
            team2_id: 4,
            scheduled_at: "2026-03-01T18:00:00.000Z",
            status: "pending",
          },
        ],
      });

    const res = await request(app)
      .post("/scrims")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({
        team1Id: 3,
        team2Id: 4,
        scheduledAt: "2026-03-01T18:00:00.000Z",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.scrim).toEqual({
      id: 20,
      team1Id: 3,
      team2Id: 4,
      scheduledAt: "2026-03-01T18:00:00.000Z",
      status: "pending",
    });
  });

  it("GET /scrims should list scrims", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, visibility: "public" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 20,
            team1_id: 3,
            team2_id: 4,
            scheduled_at: "2026-03-01T18:00:00.000Z",
            status: "pending",
          },
        ],
      });

    const res = await request(app)
      .get("/scrims?teamId=3&status=pending")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.scrims).toEqual([
      {
        id: 20,
        team1Id: 3,
        team2Id: 4,
        scheduledAt: "2026-03-01T18:00:00.000Z",
        status: "pending",
      },
    ]);
  });

  it("PATCH /scrims/:scrimId should update scrim fields", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 20, team1_id: 3, team2_id: 4 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 20,
            team1_id: 3,
            team2_id: 4,
            scheduled_at: "2026-03-02T18:00:00.000Z",
            status: "pending",
          },
        ],
      });

    const res = await request(app)
      .patch("/scrims/20")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({
        scheduledAt: "2026-03-02T18:00:00.000Z",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.scrim).toEqual({
      id: 20,
      team1Id: 3,
      team2Id: 4,
      scheduledAt: "2026-03-02T18:00:00.000Z",
      status: "pending",
    });
  });

  it("PATCH /scrims/:scrimId should reject partial update that makes same team", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 20, team1_id: 3, team2_id: 4 }],
    });

    const res = await request(app)
      .patch("/scrims/20")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ team1Id: 4 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("team IDs must differ.");
  });

  it("POST /scrims/:scrimId/confirm should confirm scrim", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 20, team1_id: 3, team2_id: 4 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 20,
            team1_id: 3,
            team2_id: 4,
            scheduled_at: "2026-03-01T18:00:00.000Z",
            status: "confirmed",
          },
        ],
      });

    const res = await request(app)
      .post("/scrims/20/confirm")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.scrim).toEqual({
      id: 20,
      team1Id: 3,
      team2Id: 4,
      scheduledAt: "2026-03-01T18:00:00.000Z",
      status: "confirmed",
    });
  });

  it("POST /scrims/:scrimId/cancel should cancel scrim", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 20, team1_id: 3, team2_id: 4 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 20,
            team1_id: 3,
            team2_id: 4,
            scheduled_at: "2026-03-01T18:00:00.000Z",
            status: "canceled",
          },
        ],
      });

    const res = await request(app)
      .post("/scrims/20/cancel")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.scrim).toEqual({
      id: 20,
      team1Id: 3,
      team2Id: 4,
      scheduledAt: "2026-03-01T18:00:00.000Z",
      status: "canceled",
    });
  });

  it("PATCH /teams/:teamId/members/:accountId/role should update role", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ account_id: 9, team_id: 3, role: "player" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ account_id: 9, team_id: 3, role: "coach" }],
      });

    const res = await request(app)
      .patch("/teams/3/members/9/role")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ role: "coach" });

    expect(res.statusCode).toBe(200);
    expect(res.body.membership).toEqual({
      accountId: 9,
      teamId: 3,
      role: "coach",
    });
  });

  it("PATCH /teams/:teamId/members/:accountId/role should require admin for elevated role changes", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ account_id: 9, team_id: 3, role: "player" }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .patch("/teams/3/members/9/role")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ role: "manager" });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team admins can assign or remove manager/admin roles.");
  });

  it("PATCH /teams/:teamId/members/:accountId/role should block demoting the last admin", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ account_id: 9, team_id: 3, role: "admin" }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 1 }] });

    const res = await request(app)
      .patch("/teams/3/members/9/role")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ role: "coach" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Cannot remove the last team admin.");
  });

  it("POST /teams/:teamId/leave should allow non-admin member to leave", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const res = await request(app)
      .post("/teams/3/leave")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("You left the team.");
  });

  it("POST /teams/:teamId/leave should block leaving as last admin", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 1 }] });

    const res = await request(app)
      .post("/teams/3/leave")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Cannot leave team as the last team admin.");
  });

  it("GET /teams/:teamId should block non-members for private teams", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, name: "Team Neon", title_id: 1, visibility: "private" }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .get("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("This team is private.");
  });

  it("GET /teams/:teamId/scrims should return calendar-friendly scrims", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, visibility: "public" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 20,
            scheduled_at: "2026-03-01T18:00:00.000Z",
            status: "confirmed",
            opponent_team_id: 4,
            opponent_team_name: "Team Bravo",
          },
        ],
      });

    const res = await request(app)
      .get("/teams/3/scrims")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.teamId).toBe(3);
    expect(res.body.upcoming).toBe(true);
    expect(res.body.scrims).toEqual([
      {
        id: 20,
        scheduledAt: "2026-03-01T18:00:00.000Z",
        opponent: { id: 4, name: "Team Bravo" },
        status: "confirmed",
      },
    ]);
  });

  it("GET /teams/:teamId/scrims should block private team for non-member", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, visibility: "private" }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .get("/teams/3/scrims")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("This team is private.");
  });

  it("GET /scrims should block team filter on private team for non-members", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 3, visibility: "private" }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .get("/scrims?teamId=3")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("This team is private.");
  });

  it("GET /games should return available games", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { id: 2, name: "Counter-Strike 2", short_name: "CS2" },
        { id: 1, name: "Valorant", short_name: "VAL" },
      ],
    });

    const res = await request(app).get("/games");

    expect(res.statusCode).toBe(200);
    expect(res.body.games).toEqual([
      {
        id: 2,
        slug: "counter-strike-2",
        name: "Counter-Strike 2",
        shortName: "CS2",
      },
      {
        id: 1,
        slug: "valorant",
        name: "Valorant",
        shortName: "VAL",
      },
    ]);
  });

  it("GET /games/:gameId/roles should return roles for a game slug", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { id: 2, name: "Counter-Strike 2", short_name: "CS2" },
        { id: 1, name: "Valorant", short_name: "VAL" },
      ],
    });

    const res = await request(app).get("/games/counter-strike-2/roles");

    expect(res.statusCode).toBe(200);
    expect(res.body.game).toEqual({
      id: 2,
      slug: "counter-strike-2",
      name: "Counter-Strike 2",
      shortName: "CS2",
    });
    expect(res.body.roles).toEqual([
      "entry-fragger",
      "awper",
      "rifler",
      "support",
      "igl",
    ]);
  });

  it("GET /games/:gameId/roles should return 404 for unknown slug", async () => {
    app.locals.pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, name: "Valorant", short_name: "VAL" }],
    });

    const res = await request(app).get("/games/unknown-game/roles");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Game not found.");
  });

  it("PATCH /teams/:teamId should return 403 for non-manager role", async () => {
    app.locals.pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .patch("/teams/3")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ name: "No Access Team" });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team owners/managers can update team settings.");
  });

  it("POST /teams/:teamId/members should return 403 for non-manager role", async () => {
    app.locals.pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post("/teams/3/members")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({ accountId: 9, role: "player" });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team owners/managers can add or invite players.");
  });

  it("POST /scrims should return 403 when user cannot manage either team", async () => {
    app.locals.pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post("/scrims")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({
        team1Id: 3,
        team2Id: 4,
        scheduledAt: "2026-03-01T18:00:00.000Z",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Only team owners/managers can schedule scrims.");
  });
});
