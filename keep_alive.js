const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Repl is alive!");
});

function keepAlive() {
  app.listen(5000, "0.0.0.0", () => {
    console.log("Keep Alive Server is ready on port 5000!");
  });
}

module.exports = keepAlive;
