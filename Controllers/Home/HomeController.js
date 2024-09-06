import dbContext from "../../Configs/ConnectDB.js"
import bcrypt from "bcrypt"
import { use } from "bcrypt/promises.js"
import { json } from "express"
import jwt from "jsonwebtoken"

function GenerateToken(user) {
    let options = {
        expiresIn: "10h"
    }

    return jwt.sign({
        user: {
            user_id: user?.user_id,
            user_name: user.user_name,
            email: user.email
        }
    }, process.env.SecretKey, options)
}


class HomeController {
    async Login(req, res) {
        try {
            const { user_nameOrEmail, password } = req.body;
            if(!(typeof user_nameOrEmail === 'string' && typeof password === 'string')) throw new Error("Dữ liệu không hợp lệ")
            if(!(user_nameOrEmail && password)) throw new Error("Nhập đầy đủ dữ liệu")
            const [ users ] = await dbContext.query("select * from users where user_name = ? or email = ?", [ user_nameOrEmail, user_nameOrEmail ]);
            if(users.length <= 0) throw new Error("Tài khoản hoặc mật khẩu không chính xác")
            const matchPassword = bcrypt.compareSync(password, users[0].password)
            if(!matchPassword) throw new Error("Tài khoản hoặc mật khẩu không chính xác")
            let token = GenerateToken(users[0])
            return res.json({
                success: true,
                message: "Đăng nhập tài khoản thành công",
                access_token: token
            })
        }catch(e) {
            return res.status(400).json({
                success: false,
                message: "Đăng nhập tài khoản không thành công",
                description: e.message
            })
        }
    }

    async Register(req, res) {
        try {
            const { user_name, email, password, confirm_password } = req.body;
            if(!(typeof user_name === 'string'
                && typeof password === 'string'
                && typeof email === 'string'
                && typeof confirm_password === 'string'
            )) throw new Error("Dữ liệu không hợp lệ")

            if(!(user_name && email && password && confirm_password)) throw new Error("Nhập đầy đủ dữ liệu")
            if(password !== confirm_password) throw new Error("Xác nhận mật khẩu không khớp")
            const [ users ] = await dbContext.query("select * from users where user_name = ? or email = ?", [ user_name, email ]);
            if(users.length > 0) throw new Error("Tài khoản đã tồn tại")
            try {
                let hash_password = bcrypt.hashSync(password, Number(process.env.SaltRounds))
                await dbContext.query("Insert into users (user_name, email, password, created_at) values( ?, ?, ?, ? )", [user_name, email, hash_password, new Date().toISOString()])
            } catch (e) {
                return res.status(500).json({
                    success: false,
                    message: "Đăng ký tài khoản không thành công",
                    description: e.message
                })
            }

            const [ user ] = await dbContext.query("select * from users where user_name = ? and email = ?", [user_name, email])
            let token = GenerateToken(user[0]);
            return res.json({
                success: true,
                message: "Đăng ký tài khoàn thành công",
                access_token: token
            });
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Đăng ký tài khoản không thành công",
                description: e.message
            })
        }
    }

    async GetTickets(req, res) {
        try {
            const [tickets, fields] = await dbContext.query("SELECT * FROM tickets");
            const user = req.User;

            return res.json({
                success: true,
                data: tickets
            });
        }catch (e) {

        }
    }

    async BookingTicket(req, res) {
        try {
            let user = req.User;
            const { ticket_id } = req.body;
            var date = new Date();
            const dateNow = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`
            if(!(typeof ticket_id === 'string' && Number(ticket_id))) throw new Error("Dữ liệu không hợp lệ")
            if(!ticket_id) throw new Error("Nhập dữ liệu đầy đủ")
            const [ tickets ] = await dbContext.query(`select * from tickets where ticket_id = ${ticket_id} and available_quantity > 0`)
            if(tickets.length <= 0) throw new Error("Ticket không tồn tại hoặc số lượng không đủ")
            const [ user_booking_ticket ] = await dbContext.query("select * from bookings where user_id = ? and ticket_id = ? and status = ?", [user.user_id, ticket_id, process.env.Booking_Pending]);
            if(user_booking_ticket.length > 0) throw new Error("Bạn đã booking ticket này rồi");
            await dbContext.query(`insert into bookings (user_id, ticket_id, status, booking_time) values (
                ${user.user_id}, ${ticket_id}, '${process.env.Booking_Pending}', '${dateNow}'   
            )`)
            await dbContext.query("Update tickets set available_quantity = available_quantity - 1 where ticket_id = ?", [ticket_id])
            setTimeout(async () => {
                const [ bookings ] = await dbContext.query("select * from bookings where user_id = ? and ticket_id = ? and booking_time = ?", [user.user_id, ticket_id, dateNow])
                const [ ticket_confirmeds ] = await dbContext.query(`select * from bookings where booking_id = ? and confirmed = ? and status = ?`, [bookings[0].booking_id, 1, process.env.Booking_Confirmed])
                if(ticket_confirmeds.length <= 0) {
                    await dbContext.query("Update bookings SET confirmed = 0, updated_at = ?, status = ? where ticket_id = ? and user_id = ? and status = ?", [new Date().toISOString(), process.env.Booking_SystemCancelled, ticket_id, user.user_id, process.env.Booking_Pending])
                    await dbContext.query("update tickets set available_quantity = available_quantity + 1 where ticket_id = ?", [ticket_id]);
                }
            }, 5 * 60 * 1000)

            const [ bookings ] = await dbContext.query("select * from bookings where user_id = ? and ticket_id = ? and status = ? and booking_time = ?", [user.user_id, ticket_id, process.env.Booking_Pending, dateNow])
            return res.json({
                success: true,
                message: "Booking thành công",
                description: "Vui lòng xác nhận Booking trong vòng 5 phút",
                data_booking: bookings[0]
            })
        }catch (e) {
            return res.status(400).json({
                success: false,
                message: "Booking ticket không thành công",
                description: e.message
            })
        }
    }

    async PaymentTicket(req, res) {
        try {
            const { booking_id, payment_token } = req.body;
            const user = req.User;
            const date = new Date();
            const dateNow = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`
            const [ bookings ] = await dbContext.query("select * from bookings as b inner join tickets as t on b.ticket_id = t.ticket_id where booking_id = ? and user_id = ?", [ booking_id, user.user_id ])
            if(bookings.length <= 0) throw new Error("Booking không tồn tại")
            if(bookings[0].confirmed === 1 && bookings[0].status === process.env.Booking_Confirmed) throw new Error("Booking đã được thanh toán và xác nhận")
            if(bookings[0].status === process.env.Booking_SystemCancelled) throw new Error("Booking đã quá thời gian thanh toán")
            if(bookings[0].status === process.env.Booking_Cancelled) throw new Error("Bạn đã hủy booking trước đó")
            if(!payment_token) throw new Error()
            try {
                /*
                    Kiểm tra thanh toán
                */

                await dbContext.query("update bookings set payment_detail = ?, is_payment = ?, total_payment = ?, payment_at = ? where booking_id = ? and user_id = ?"
                    [ payment_token, 1, bookings[0].price , dateNow, booking_id, user.user_id ]
                )
            } catch (e) {
                return res.status(500).json({
                    success: false,
                    message: "Thanh toán thất bại",
                    description: e.message
                })
            }

            return res.json({
                success: true,
                message: "Thanh toán thành công",
                data_payment: payment_token
            })
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Thanh toán thất bại",
                description: e.message
            })
        }
    }

    async ConfirmBookingTicket(req, res) {
        try {
            const { booking_id, payment_token } = req.body;
            const user = req.User;
            const date = new Date();
            const dateNow = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`
            const [ bookings ] = await dbContext.query("select * from bookings as b inner join tickets as t on b.ticket_id = t.ticket_id where booking_id = ? and user_id = ?", [ booking_id, user.user_id ])
            if(bookings.length <= 0) throw new Error("Booking không tồn tại")
            if(bookings[0].confirmed === 1 && bookings[0].status === process.env.Booking_Confirmed) throw new Error("Booking đã được xác nhận")
            if(bookings[0].status === process.env.Booking_SystemCancelled) throw new Error("Booking đã quá thời gian xác nhận")
            if(bookings[0].status === process.env.Booking_Cancelled) throw new Error("Bạn đã hủy booking trước đó")
            if(payment_token !== bookings[0].payment_detail || bookings[0].is_payment !== 1) throw new Error("Vui lòng thanh toán trước khi xác nhận")
            try {
               await dbContext.query("update bookings set status = ?, confirmed = ?, confirmed_time = ?, updated_at = ? where booking_id = ? and user_id = ?",
                    [process.env.Booking_Confirmed, 1, dateNow, dateNow, booking_id, user.user_id]
               ) 
            } catch (e) {
                return res.status(500).json({
                    success: false,
                    message: "Xác nhận booking không thành công",
                    description: e.message
                })
            }

            const [ bookings_confirmed ] = await dbContext.query("select * from bookings where booking_id = ? and user_id = ?", [ booking_id, user.user_id ])
            return res.json({
                success: true,
                message: "Xác nhận booking thành công",
                booking_data: bookings_confirmed[0]
            })
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Xác nhận booking không thành công",
                description: e.message
            })
        }
    }

    async CancelBooking(req, res) {
        try {
            const { booking_id } = req.body;
            const user = req.User;
            const date = new Date();
            const dateNow = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`;
            const [ bookings ] = await dbContext.query("select * from bookings as b inner join tickets as t on b.ticket_id = t.ticket_id where booking_id = ? and user_id = ?", [ booking_id, user.user_id ])
            if(bookings.length <= 0) throw new Error("Booking không tồn tại")
            if(bookings[0].confirmed === 1 && bookings[0].status === process.env.Booking_Confirmed) throw new Error("Booking đã được xác nhận, không thể hủy")
            if(bookings[0].status === process.env.Booking_SystemCancelled) throw new Error("Booking đã quá thời gian và đã bị hủy")
            if(bookings[0].status === process.env.Booking_Cancelled) throw new Error("Bạn đã hủy booking trước đó")
            var refund_price = 0
            if(bookings[0].is_payment === 1) refund_price = Number(bookings[0].total_payment) * 90 / 100;
            try {
                /*
                    Xử lý hoàn tiền 

                */
                await dbContext.query("update bookings set refund_price = ?, cancel_at = ?, status = ? where booking_id = ? and user_id = ?",
                    [ refund_price, dateNow, process.env.Booking_Cancelled, booking_id, user.user_id ]
                )
            } catch (e) {
                return res.status(500).json({
                    success: false,
                    message: "Hủy booking không thành công",
                    description: e.message
                })
            }

            return res.json({
                success: true,
                message: "Hủy booking thành công"
            })
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Hủy booking không thành công",
                description: e.message
            })
        }
    }
}

export default new HomeController();