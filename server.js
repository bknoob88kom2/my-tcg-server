// server.js

// 1. เรียกใช้ 'net' ซึ่งเป็นโมดูลสำหรับสร้างระบบเครือข่าย TCP ของ Node.js
const net = require('net');

// 2. สร้างอาร์เรย์ (ลิสต์) ว่างๆ เพื่อเอาไว้เก็บรายชื่อ client ที่เชื่อมต่อเข้ามา
const clients = [];

// 3. สร้าง Server ขึ้นมา
const server = net.createServer(socket => {
    // โค้ดในนี้จะทำงานทุกครั้งที่มี Client ใหม่เชื่อมต่อเข้ามาสำเร็จ
    // 'socket' คือตัวแทนของ Client คนนั้นๆ

    console.log('มี Client ใหม่เชื่อมต่อเข้ามา!');

    // เพิ่ม Client ที่เพิ่งเชื่อมต่อเข้ามาเก็บไว้ในลิสต์
    clients.push(socket);

    // 4. เมื่อ Server ได้รับข้อมูลจาก Client คนนี้
    socket.on('data', data => {
        console.log('ได้รับข้อมูลจาก Client:', data.toString());

        // 5. ส่งข้อมูลที่ได้รับไปให้ Client "ทุกคน" ที่อยู่ในลิสต์
        clients.forEach(client => {
            // เช็คว่า Client ในลิสต์ไม่ใช่คนเดียวกับที่ส่งข้อมูลมา
            if (client !== socket) {
                client.write(data);
            }
        });
    });

    // 6. เมื่อ Client คนนี้ตัดการเชื่อมต่อ
    socket.on('close', () => {
        console.log('Client ตัดการเชื่อมต่อ');
        // ลบ Client คนที่ออกไปแล้วออกจากลิสต์
        clients.splice(clients.indexOf(socket), 1);
    });

    // จัดการ Error (หากมี)
    socket.on('error', err => {
        console.error('Client เกิดข้อผิดพลาด:', err.message);
    });
});

// 7. สั่งให้ Server เริ่มทำงานและรอการเชื่อมต่อที่ Port 8080
const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server กำลังรอการเชื่อมต่อที่ Port ${PORT}`);
});