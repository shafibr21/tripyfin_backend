import express from "express";
import router from "./routes";
import cors from "cors";

const app = express();

app.use(cors());

// Parse JSON bodies (but not multipart/form-data - multer will handle those)
app.use(express.json());
// Parse urlencoded bodies (but not multipart/form-data)
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});


export default app;
