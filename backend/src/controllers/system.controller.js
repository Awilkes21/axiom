export function rootHandler(_req, res) {
  res.send("Hello from Backend!");
}

export function healthHandler(_req, res) {
  res.status(200).json({ status: "ok" });
}
