import express from "express";
import router from "./routes";

const app = express();
const PORT = 5000;

app.use(express.json());
app.use("/", (req, res, next) => {
  try {
    router(req, res, next);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`API available on localhost port ${PORT}`);
});

export default app;
