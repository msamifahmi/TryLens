import { createApp } from "./src/app.js";
import { config } from "./src/config.js";

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`TryLens Node API berjalan di http://localhost:${config.port}  (pembayaran: ${config.paymentProvider})`);
});
const stop = () => server.close(() => { app.close(); process.exit(0); });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
