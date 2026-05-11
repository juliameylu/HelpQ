// require("dotenv").config();
import "dotenv/config";

// const app = require("./app");
import app from "./app.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`App listening at http://localhost:${PORT}`);
});