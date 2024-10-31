import { MySQLPromisePool, MySQLResultSetHeader, MySQLRowDataPacket } from "@fastify/mysql";

export async function createUser(db:MySQLPromisePool,email:string,username:string,password:string) {
    const [user] = await db.execute<MySQLResultSetHeader>('INSERT INTO users (username,email,password,created_at,updated_at) VALUES(?,?,?,?,?)',[username,email,password,new Date(),new Date()]);
    return user;
}

export async function findByEmail(db:MySQLPromisePool,email:string) {
    const [user] = await db.query<MySQLRowDataPacket[]>('SELECT * FROM users WHERE email = ?',[email]);
    return user[0];
}

export async function findByEmailOrUsername(db:MySQLPromisePool,email:string,username:string) {
    const [user] = await db.execute<MySQLRowDataPacket[]>('SELECT email,username FROM users WHERE email = ? OR username = ?',[email,username]);
    return user[0];
}