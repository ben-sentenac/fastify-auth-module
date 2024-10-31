import { FastifyInstance, RouteHandlerMethod, FastifyRequest, FastifyReply } from 'fastify';
import fastifyMysql, { FastifyMySQLOptions, MySQLPromisePool } from "@fastify/mysql";
import fastifyCookie, { FastifyCookieOptions, SerializeOptions } from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { AuthError, handleError } from './auth-error.js';
import { verifyToken } from './auth-services.js';
import { authRoutes } from './auth-routes.js';
//TODO validate plugin options with avj
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: RouteHandlerMethod,
        mysql: MySQLPromisePool
    }
}

export interface AuthPluginOptions {
    routePrefix?: string,
    jwtSecret: string,
    databasePoolConnection: FastifyMySQLOptions
    cookieOptions: CookieOptions
};

export interface CookieOptions extends SerializeOptions {
    secret: string | Buffer,
    expires?: Date,
    maxAge?: number,
    secure?: boolean,
    path?: string,
    domain?: string,
    sameSite?: 'strict' | 'lax' | 'none',
    partitionned?: boolean
};

export function deepMerge(target: any, source: any) {
    // Iterate over all keys in the source object
    for (const key of Object.keys(source)) {
        const targetValue = target[key]; // safely access target value
        const sourceValue = source[key]; // safely access source value

        // If the value is an object (and not null or an array), then merge recursively
        if (
            typeof sourceValue === 'object' &&
            sourceValue !== null &&
            !Array.isArray(sourceValue)
        ) {
            // If target doesn't have the key, initialize it as an empty object
            if (!targetValue) {
                target[key] = {};
            }
            // Recursively merge objects
            deepMerge(target[key], sourceValue);
        } else {
            // Otherwise, directly assign the source value to the target
            target[key] = sourceValue;
        }
    }

    return target;
}

export async function validatePluginOpts(options: Partial<AuthPluginOptions>): Promise<void> {
    const allowedKeys = ['routePrefix', 'jwtSecret', 'databasePoolConnection', 'cookieOptions'];
    for (const key of Object.keys(options)) {
        if (!allowedKeys.includes(key)) {
            throw new AuthError('ERR_INVALID_OPTS');
        }
        if ((key === 'databasePoolConnection' || key === 'cookieOptions') && typeof options[key] !== 'object') {
            //TODO
            //perform validation on cookieOptions authorized keys ?
            throw new AuthError('ERR_INVALID_OPTS', `Property ${key} must be an object`);
        }
    }
}

async function authPlugin(fastify: FastifyInstance, options: AuthPluginOptions) {

    const defaultOptions: AuthPluginOptions = {
        routePrefix: '/auth',
        jwtSecret: 'mysupersecret',
        databasePoolConnection: null as unknown as FastifyMySQLOptions,
        cookieOptions: {
            secret: Buffer.from('secret-cookie'),
            secure: true,
            sameSite: 'strict',
            path: '/'
        }
    };

    await validatePluginOpts(options);
    const pluginOptions = deepMerge({ ...defaultOptions }, options) as AuthPluginOptions;
    const { jwtSecret, routePrefix, databasePoolConnection, cookieOptions } = pluginOptions;
    const { secret, ...allTheRest } = cookieOptions;
    const fastifyCookieOpts: FastifyCookieOptions = {
        secret,
        parseOptions: {
            httpOnly: true,
            ...allTheRest
        }
    }

    // Validate options schema
    if (!databasePoolConnection) {
        throw new AuthError('ERR_POOLCONN_MISSING');
    }

    try {
        // Register fastify-mysql if not already registered
        if (!fastify.mysql) {
            await fastify.register(fastifyMysql, { promise: true, ...databasePoolConnection });
        }

        //await fastify.mysql.query('DROP TABLE IF EXISTS users');//testing purpose
        
        await fastify.mysql.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
        
        // Register JWT plugin with secret
        if(!fastify.jwt) {
            fastify.register(fastifyJwt, { secret: jwtSecret });
        }
        if(!fastify.serializeCookie) {
            fastify.register(fastifyCookie, fastifyCookieOpts);
        }
        // jwt authentication decorators
        fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const token = request.cookies.token;
                if (!token) throw new AuthError('ERR_UNAUTH');//TODO change to ERR_MISSING_COOKIE in test
                const { valid, value } = fastify.unsignCookie(token);
                if (!valid) {
                    throw new AuthError('ERR_UNAUTH');
                }
                const decodedToken = verifyToken(fastify, value);
                request.user = decodedToken;
            } catch (error) {
                if (error instanceof Error) {
                    return handleError(reply, error);
                }
            }
        });

        // Regiser authentication routes
        fastify.register(authRoutes, { prefix: routePrefix });
        //TODO
        //test if it handle error properly in app context
        fastify.setErrorHandler((error, request, reply) => {
                return handleError(reply,new AuthError(error.code,error.message));
        });

    } catch (error) {
        if (error instanceof Error) {
            if (('code' in error) && error['code'] === 'ER_ACCESS_DENIED_ERROR') {
                throw new AuthError('ERR_DB_ACCESS');
            }
            throw new AuthError('ERR_INTERNAL', `Error while registering authentication plugin: ${error.message}`);
        }
    }
}

export default fp(authPlugin);