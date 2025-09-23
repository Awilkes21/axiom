const request = require("supertest");
const app = require("./index");

describe("Backend routes", () => {
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
});
