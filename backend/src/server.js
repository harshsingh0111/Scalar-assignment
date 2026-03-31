const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/boards", require("./routes/boardRoutes"));
app.use("/lists", require("./routes/listRoutes"));
app.use("/cards", require("./routes/cardRoutes"));
app.use("/labels", require("./routes/labelRoutes"));
app.use("/assignees", require("./routes/assigneeRoutes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});