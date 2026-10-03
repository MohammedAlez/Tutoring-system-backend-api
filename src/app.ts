import authRoutes from "./modules/auth/auth.routes";

import { errorMiddleware } from "./middleware/errorHandler";
import express from "express"
import { sessionRouter } from "./modules/session/session.routes";
import { paymentRouter } from "./modules/payment/payment.routes";
import { dashboardStatsRouter } from "./modules/dashboard-stats/dashboard-stats.routes";



const PORT = process.env.PORT || 8500
const app = express()

app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/dashboard-stats", dashboardStatsRouter);



app.get("/hello",(req, res)=>{
    res.send("it's working fine!!")
});

app.listen(PORT, ()=>{
    console.log("server is running on PORT " + PORT)
})

app.use(errorMiddleware);