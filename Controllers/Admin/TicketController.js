import dbContext from "../../Configs/ConnectDB.js"

class TicketController {
    async CreateTicket(req, res) {
        try {
            const { ticket_name, price, total_quantity } = req.body;
            if(!(ticket_name && price && total_quantity)) throw new Error("Nhập đầy dủ dữ liệu")
            if(!(Number(price) && Number(total_quantity))) throw new Error("Kiểu dử liệu không hợp lệ")
            try {
                await dbContext.query("Insert into tickets (ticket_name, price, total_quantity, available_quantity, created_at) values (?, ?, ?, ?, ?)", [ticket_name, price, total_quantity, total_quantity, new Date().toISOString()])
            }catch(e) {
                return res.status(500).json({
                    success: false,
                    message: e.message
                })
            }

            return res.json({
                success: true,
                message: "Thêm ticket thành công"
            })
        }catch (e) {
            return res.status(404).json({
                success: false,
                message: e.message
            })
        }
    }

    async ReadTicket(req, res) {
        try {
            const [results, fields] = await dbContext.query("SELECT * FROM tickets");
            return res.json({
                success: true,
                data: results
            });
        } catch (e) {
            
        }
    }

    async DeleteTicket(req, res) {
        try {
            const ticket_id = req.params.ticket_id;
            var [results] = await dbContext.query("SELECT * FROM tickets where ticket_id = " + ticket_id);
            if(results.length <= 0) throw new Error("Ticket không tồn tại");
            try {
                await dbContext.query("DELETE FROM tickets WHERE ticket_id = " + ticket_id);
            }catch(e) {
                return res.status(500).json({
                    success: false, 
                    message: e.message
                })
            }

            return res.json({
                success: true,
                message: "Xóa ticket thành công"
            })
        } catch (e) {
            return res.status(404).json({
                success: false,
                message: e.message
            })
        }
    }

    async EditTicket(req, res) {
        try {
            const ticket_id = req.params.ticket_id;
            const { ticket_name, price, total_quantity, available_quantity } = req.body;
            var [results] = await dbContext.query("SELECT * FROM tickets where ticket_id = " + ticket_id);
            if(results.length <= 0) throw new Error("Ticket không tồn tại");
            if(!(ticket_name && price && total_quantity && available_quantity)) throw new Error("Nhập đầy dủ dữ liệu")
            if(!(Number(price) && Number(total_quantity) && Number(available_quantity))) throw new Error("Kiểu dử liệu không hợp lệ")
            if(Number(total_quantity) < Number(available_quantity)) throw new Error("Số lượng có sẵn không được lớn hơn tổng số lượng")
            try {
                await dbContext.query("update tickets set ticket_name = ?, price = ?, total_quantity = ?, available_quantity = ?, updated_at = ? where ticket_id = ?", [ticket_name, price, total_quantity, available_quantity, new Date().toISOString(), ticket_id]);
            } catch (e) {
                return res.status(500).json({
                    success: false,
                    message: e.message
                })
            }

            return res.json({
                success: true,
                message: "Chỉnh sửa ticket thành công"
            })
        } catch (e) {
            return res.status(404).json({
                success: false,
                message: e.message
            })
        }
    }
}

export default new TicketController();