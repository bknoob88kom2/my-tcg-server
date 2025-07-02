// server.js

const net = require('net');
const mysql = require('mysql2/promise'); // <-- ใช้ mysql2
const bcrypt = require('bcryptjs'); // <-- ใช้ bcryptjs

// --- การตั้งค่าการเชื่อมต่อฐานข้อมูล ---
// (ใส่รหัสผ่านที่คุณตั้งไว้ในขั้นตอนที่ 5.2)
const dbConfig = {
    host: 'localhost',
    user: 'tcg_user',
    password: 'W@rasit686', // <-- ใส่รหัสผ่าน DB ของคุณตรงนี้
    database: 'tcg_db'
};

// สร้าง pool การเชื่อมต่อเพื่อประสิทธิภาพที่ดีกว่า
const dbPool = mysql.createPool(dbConfig);


// --- ส่วนจัดการการเชื่อมต่อของผู้เล่น (เหมือนเดิม) ---
const clients = [];

const server = net.createServer(socket => {
    console.log('มี Client ใหม่เชื่อมต่อเข้ามา!');
    clients.push(socket);

    // เมื่อได้รับข้อมูลจาก Client
    socket.on('data', data => {
        // ลองแปลงข้อมูลที่ได้รับเป็น JSON
        try {
            const message = JSON.parse(data.toString());

            // ตรวจสอบว่า Client ต้องการทำอะไร
            if (message.action === 'register') {
                handleRegister(socket, message.payload);
            } else {
                // ถ้าไม่ใช่คำสั่งที่รู้จัก ก็ส่งต่อข้อมูลแบบเดิม (สำหรับเกม)
                broadcast(data, socket);
            }

        } catch (error) {
            // ถ้าข้อมูลไม่ใช่ JSON (เป็นข้อมูลเกม) ให้ส่งต่อเลย
            console.log('ได้รับข้อมูลเกม (Game Packet)');
            broadcast(data, socket);
        }
    });

    socket.on('close', () => {
        console.log('Client ตัดการเชื่อมต่อ');
        clients.splice(clients.indexOf(socket), 1);
    });

    socket.on('error', err => {
        console.error('Client เกิดข้อผิดพลาด:', err.message);
    });
});

// ฟังก์ชันสำหรับส่งข้อมูลไปให้ทุกคน ยกเว้นคนส่ง
function broadcast(data, senderSocket) {
    clients.forEach(client => {
        if (client !== senderSocket) {
            client.write(data);
        }
    });
}

// --- ฟังก์ชันใหม่: จัดการการลงทะเบียน ---
async function handleRegister(socket, payload) {
    const { username, email, password } = payload;

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!username || !email || !password) {
        return socket.write(JSON.stringify({ status: 'error', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }));
    }

    try {
        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10); // 10 คือค่าความซับซ้อน

        // เพิ่มผู้ใช้ใหม่ลงในฐานข้อมูล
        const [result] = await dbPool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        console.log(`ผู้ใช้ใหม่ลงทะเบียนสำเร็จ: ${username} (ID: ${result.insertId})`);

        // ส่งข้อความกลับไปบอก Client ว่าสำเร็จ
        socket.write(JSON.stringify({ status: 'success', message: 'ลงทะเบียนสำเร็จ!' }));

    } catch (dbError) {
        console.error('เกิดข้อผิดพลาดกับฐานข้อมูล:', dbError.message);

        // เช็คว่าชื่อผู้ใช้หรืออีเมลซ้ำหรือไม่
        if (dbError.code === 'ER_DUP_ENTRY') {
            socket.write(JSON.stringify({ status: 'error', message: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' }));
        } else {
            socket.write(JSON.stringify({ status: 'error', message: 'เกิดข้อผิดพลาดในการลงทะเบียน' }));
        }
    }
}


// --- สั่งให้ Server เริ่มทำงาน (เหมือนเดิม) ---
const PORT = 8080;
server.listen(PORT, async () => {
    // ทดสอบการเชื่อมต่อฐานข้อมูลเมื่อ Server เริ่มทำงาน
    try {
        const connection = await dbPool.getConnection();
        console.log('เชื่อมต่อฐานข้อมูล MySQL สำเร็จ!');
        connection.release(); // คืนการเชื่อมต่อกลับสู่ pool
    } catch (err) {
        console.error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', err.message);
        process.exit(1); // ปิด Server ถ้าต่อ DB ไม่ได้
    }
    console.log(`Server กำลังรอการเชื่อมต่อที่ Port ${PORT}`);
});