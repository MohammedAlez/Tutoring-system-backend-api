import authRoutes from "./modules/auth/auth.routes";

import { errorMiddleware } from "./middleware/errorHandler";
import express from "express"
import { sessionRouter } from "./modules/session/session.routes";
import { paymentRouter } from "./modules/payment/payment.routes";
import { dashboardStatsRouter } from "./modules/dashboard-stats/dashboard-stats.routes";
import { studentRouter } from "./modules/student/student.routes";
import { groupRouter } from "./modules/group/group.routes";
import { scheduleRouter } from "./modules/schedule/schedule.routes";
import { profileRouter } from "./modules/user/user.routes";
import { enrollmentRouter } from "./modules/enrollment/enrollment.routes";
import { invoiceRouter } from "./modules/invoice/invoice.routes";



const PORT = 9500
// const PORT = process.env.PORT || 8500
const app = express()

app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/students", studentRouter);
app.use("/api/groups", groupRouter);
app.use("/api/schedules", scheduleRouter);
app.use("/api/dashboard-stats", dashboardStatsRouter);
app.use("/api/user/profile", profileRouter);
app.use("/api/enrollments", enrollmentRouter);
app.use("/api/invoices", invoiceRouter);



app.get("/hello",(req, res)=>{
    res.send("it's working fine!!")
});

app.listen(PORT, ()=>{
    console.log("server is running on PORT " + PORT)
})

app.use(errorMiddleware);