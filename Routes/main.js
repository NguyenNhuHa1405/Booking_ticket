import adminRoute from "./admin.js"
import homeRoute from "./home.js"
import AuthenticationMiddleware from "../Middlewares/AuthenticationMiddleware.js";

var Routes = function(app) {
    app.use("/admin/ticket", AuthenticationMiddleware, adminRoute);
    app.use("/", homeRoute)
}

export default Routes;