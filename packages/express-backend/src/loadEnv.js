import dotenv from "dotenv";

dotenv.config();

if (process.env.LOAD_ENV_LOCAL === "true") {
  dotenv.config({ path: ".env.local", override: true });
}
