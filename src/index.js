import dotenv from 'dotenv';
import { connectDB } from "./db/index.js";
import { app } from './app.js';
dotenv.config();

const port = process.env.PORT

connectDB()
.then(()=> {
    app.listen(port, () => {
        console.log("Server started on port ", port)
    });
})
.catch((error) => {
    console.error('Error connecting to db: ', error);
})
