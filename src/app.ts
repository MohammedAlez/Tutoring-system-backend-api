import authRoutes from "./modules/auth/auth.routes";

import { errorMiddleware } from "./middleware/errorHandler";
import express from "express"



const PORT = process.env.PORT || 8500
const app = express()

app.use(express.json());


app.use("/api/auth", authRoutes);



app.get("/hello",(req, res)=>{
    res.send("it's working fine!!")
});

app.listen(PORT, ()=>{
    console.log("server is running on PORT " + PORT)
})

app.use(errorMiddleware);