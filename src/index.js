import mongoose from "mongoose";
import dotenv from 'dotenv';
import express from 'express'
import { connectDB } from "./db/index.js";
dotenv.config();

const app = express();

connectDB().catch((error) => {
    console.error('Error connecting to db: ', error);
})

app.listen(process.env.PORT, () => {
    console.log("Server started on port ", process.env.PORT)
});
