import { FastifyInstance } from "fastify";
import { createUser, findByEmail, findByEmailOrUsername } from './auth-queries.js';
import { MySQLPromisePool } from "@fastify/mysql";
import { AuthError } from "./auth-error.js";
import fastifyJwt from "@fastify/jwt";
import{hash, compare } from 'bcrypt';
import { User } from "./auth-types.js";
/*TODO
* Salt rounds can be configurable based on environment (e.g., from env variables)
*/
const saltRounds = 10;


/*TODO
* JWT Expiration:
* Add expiresIn: '1h' to the JWT token to ensure tokens expire after 1 hour. This is essential for security to prevent the misuse of old tokens.
* Password Validation:
* Added an example of simple password validation (password must be at least 8 characters). You could further improve this by requiring specific characters (e.g., numbers, special characters) using a regex.
* Salt Rounds Configuration:
* Made the salt rounds a constant that can be configured globally or set via environment variables (saltRounds is currently set to 10). Depending on the environment (development vs production), you may want to adjust this for security vs performance trade-offs.
*/

export async function hashPassword(password: string) {
    return hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string) {
    return compare(password, hash);
}

export async function generateJWT(user: Partial<User>, fastify: FastifyInstance) {
    return fastify.jwt.sign({ id: user.id, email: user.email })
}

export function verifyToken(fastify:FastifyInstance,token:string,options?:Partial<fastifyJwt.VerifyOptions>,) {
    const decoded = fastify.jwt.verify(token,options);
    if(!decoded) throw new AuthError('ERR_TOKEN');
    return decoded;
}

export async function registerUser(username: string, email: string, password: string, db: MySQLPromisePool) {
    const user = await findByEmailOrUsername(db,email,username);
    if(!user) {
         const hash = await hashPassword(password);
        return await createUser(db, email, username, hash);
    } 
    throw new AuthError('ERR_DUPLICATE_ENTRY');
}

export async function tryLogin(email: string, password: string, db: MySQLPromisePool) {
    const user = await findByEmail(db, email);
    if (!user) throw new AuthError('ERR_INVALID_CREDENTIALS');
    const isValid = await verifyPassword(password, user.password);
    if(!isValid) throw new AuthError('ERR_INVALID_CREDENTIALS');
    return user;
}