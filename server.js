import express from "express";
import Routes from "./Routes/main.js"
import 'dotenv/config';
const app = express();
const port = "5005";
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
Routes(app);
app.listen(port, () => {
    console.log("App listening on port: http://localhost:" + port)
})