import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export async function connectDB() {
    try {
        const connection = await mongoose.connect(
            process.env.MONGODB_URI + "/" + DB_NAME
        );
        console.log("Connected to DB!! HOST:", connection.connection.host);
    } catch (error) {
        console.error("Error: ", error);
    }
}
