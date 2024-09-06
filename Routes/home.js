import HomeController from "../Controllers/Home/HomeController.js"
import express from "express"
import AuthenticationMiddleware from "../Middlewares/AuthenticationMiddleware.js";

var route = express.Router();
route.get("/tickets", AuthenticationMiddleware, HomeController.GetTickets)
route.post("/booking", AuthenticationMiddleware, HomeController.BookingTicket)
route.post("/confirmed-booking", AuthenticationMiddleware, HomeController.ConfirmBookingTicket)
route.post("/cancel-booking", AuthenticationMiddleware, HomeController.CancelBooking)
route.post("/payment-booking", AuthenticationMiddleware, HomeController.PaymentTicket)
route.post("/register", HomeController.Register)
route.post("/login", HomeController.Login)
export default route