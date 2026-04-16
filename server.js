import "dotenv/config";
import app from "./app.js";
import mongoose from "mongoose";

const db = process.env.DATABASE.replace(
  "<DB_PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(db)
  .then(() => {
    console.log("Databse connected successfully..");
  })
  .catch((err) => {
    console.log("Error 💥:", err);
  });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listen on port: ${port}....`);
});
