import TicketController from "../Controllers/Admin/TicketController.js"
import express from "express"
var route = express.Router();
route.get("/", TicketController.ReadTicket);
route.post("/create", TicketController.CreateTicket)
route.delete("/delete/:ticket_id", TicketController.DeleteTicket)
route.put("/edit/:ticket_id", TicketController.EditTicket)
export default route;