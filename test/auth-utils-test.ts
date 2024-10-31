import { TestContext } from "node:test";
import fastify from 'fastify';
import mysql from 'mysql2/promise';
import authPlugin, { AuthPluginOptions } from "../index.js";
import dotenv from 'dotenv';

dotenv.config({
    path:'test/.env.test'
});

export async function buildAppPluginForTest(options:AuthPluginOptions,t:TestContext) {
    const app = fastify({
    });
    await app.register(authPlugin,options);

    app.get('/protected',{preHandler:app.authenticate}, async (request,reply) => reply.status(200).send({message:'Congrats, you pass the test!'}));
    if(t) {       
        t.after(() => {
            app.close();
        });
    }
    return app;
}


export async function getConnection(database = false) {
    const credentials = {
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        user: process.env.DB_USER
    }
    //database property does not be set to drop or create db 
    if(database) Object.defineProperty(credentials,'database',{value:process.env.DB_NAME,writable:false})
    const conn = await mysql.createConnection(credentials);
    return conn;
}

export async function createDatabase() {
    const conn = await getConnection();
    try {
        const database = process.env.DB_NAME;
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
        console.log(`Database "${database}" created`);
    } catch (error) {
        console.error(`Error creating database`, error);
    } finally {
        await conn.end();
    }
}

export async function dropDatabase() {
    const conn = await getConnection();
    try {
        const database = process.env.DB_NAME;
        await conn.query(`DROP DATABASE \`${database}\``);
        console.log(`Database ${database} has been successfully remove!`);
    } catch (error) {
        console.error(`Error creating database`, error);
    } finally {
        await conn.end();
    }
}

export async function truncateTable(conn: mysql.Connection, table: string) {
    try {
        await conn.query(`TRUNCATE \`${table}\``);
        console.log(`Table ${table} has been successfully reset!`);
    } catch (error) {
        console.error(`Error reseting table ${table}`, error);
    } finally {
        await conn.end();
    }
}