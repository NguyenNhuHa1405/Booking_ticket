import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt'
const connection = await mysql.createConnection({
    host: 'localhost',
    database: "ticket",
    user: 'root',
})

try {
    const [results] = await connection.query("select * from users where user_name = 'admin' and email = 'admin@gmail.com'")
    if(results.length <= 0) {
        let hash_password = bcrypt.hashSync("admin", Number(process.env.SaltRounds));
        await connection.query("Insert into users (user_name, email, password, created_at) values (?, ?, ?, ?)", ["admin", "admin@gmail.com", hash_password, new Date().toISOString()])
    }
} catch (e) {
    console.log(e.message)
}

export default connection;