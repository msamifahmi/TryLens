import express from "express";
import cors from "cors";
import apiRouter from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "TryLens API (Node.js)",
    status: "ok",
    endpoints: [
      "GET /api/products",
      "GET /api/products/:id",
      "GET /api/merchants",
      "GET /api/categories",
      "GET /api/wishlist/:userId",
      "POST /api/wishlist/:userId"
    ]
  });
});

app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan" });
});

app.listen(PORT, () => {
  console.log(`TryLens Node API berjalan di http://localhost:${PORT}`);
});
