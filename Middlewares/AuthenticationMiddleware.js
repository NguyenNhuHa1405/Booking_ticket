import jwt from "jsonwebtoken"

export default function(req, res, next) {
    try {
        var access_token = req?.headers?.authorization?.split(' ')[1];
        if(!access_token) throw new Error()
        const { user, exp } = jwt.verify(access_token, process.env.SecretKey)
        req.User = user;
        var dateExp = new Date(exp * 1000);
        var dateNow = new Date();
        if(dateExp < dateNow) throw new Error()
        next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: "Vui lòng đăng nhập để tiếp tục"
        })
    }
}