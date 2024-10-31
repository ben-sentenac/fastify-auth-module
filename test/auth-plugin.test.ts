import test from "node:test";
import assert from "node:assert";
import { FastifyMySQLOptions } from '@fastify/mysql';
import { AuthError } from "../auth-error.js";
import { getConnection, truncateTable,buildAppPluginForTest } from './auth-utils-test.js';

test('Auth-Plugin Test', async (t) => {

    const mysqlPoolOptions: FastifyMySQLOptions = {
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
    };

    await t.test('it should trows an error if wrong database credentials', async (t) => {
        const wrongPoolConnection: FastifyMySQLOptions = {
            host: 'localhost',
            database: 'wrong_db',
            password: 'wrong_password',
            user: 'user'
        };
        try {
            await buildAppPluginForTest({
                jwtSecret: 'my-jwt-secret',
                databasePoolConnection: wrongPoolConnection,
                cookieOptions: { secret: 'my-secret' }
            }, t);

        } catch (error) {
            assert.strictEqual(error instanceof AuthError, true);
            if (error instanceof AuthError) {
                assert.strictEqual(error.code, 'ERR_DB_ACCESS');
                assert.strictEqual(error.message, 'Wrong or missing database credentials');
            }
        }
    });

    await t.test(' GET /$prefix/ping', async (t) => {
        const prefix = '/api/auth';
        const app = await buildAppPluginForTest({
            jwtSecret: 'supersecret',
            databasePoolConnection: mysqlPoolOptions,
            routePrefix: prefix,
            cookieOptions: { secret: 'my-secret' }
        }, t);
        const response = await app.inject({
            method: 'GET',
            url: `${prefix}/ping`
        });
        assert.strictEqual(response.statusCode, 200);
        assert.equal(response.json().status, 'OK', 'Expected: OK');
    });

    await t.test('POST api/auth/register', async (t) => {

        t.before(async () => {
            const conn = await getConnection(true);
            await truncateTable(conn, 'users');
        });

        const user = {
            email: 'user@emailexemple.com',
            username: 'user1',
            password: 'myAwesomePassword'
        };

        const app = await buildAppPluginForTest({
            jwtSecret: 'supersecret',
            databasePoolConnection: mysqlPoolOptions,
            routePrefix: '/api/auth',
            cookieOptions: { secret: 'my-secret' }
        }, t);

        await t.test('it should register', async (t) => {

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                body: user
            });
            assert.equal(response.statusCode, 201);
            assert.deepStrictEqual(response.json(), { status: 'OK', data: { id: 1, email: 'user@emailexemple.com', username: 'user1' } });
        });

        await t.test('it should respond 400 if password length < 9 ', async () => {
            const response = await app.inject({
                method: 'POST',
                url: 'api/auth/register',
                body: {
                    email: 'another@email.com',
                    password: '12',
                    username: 'userfail'
                }
            });
            assert.strictEqual(response.statusCode, 400);
            assert.deepStrictEqual(response.json(), {
                status:'ERROR',
                code: 'FST_ERR_VALIDATION',
                message: 'body/password must NOT have fewer than 9 characters'
            });
        });

        await t.test('it should respond 400 if already exists', async () => {
            const response = await app.inject({
                method: 'POST',
                url: 'api/auth/register',
                body: {
                    email: user.email,
                    password: 'hdyehudhdndhdhd',
                    username: user.username
                }
            });
            assert.strictEqual(response.statusCode, 400);
            assert.deepStrictEqual(response.json(), {
                status: 'ERROR',
                code: 'ERR_DUPLICATE_ENTRY',
                message: 'Duplicate entry [email or username must be unique]'
            });

        });

    });

    await t.test('POST api/auth/login', async (t) => {

        const app = await buildAppPluginForTest({
            jwtSecret: 'supersecret',
            databasePoolConnection: mysqlPoolOptions,
            routePrefix: '/api/auth',
            cookieOptions: { secret: 'my-secret' }
        }, t);

        let token:string;
        await t.test('it should login', async (t) => {
            const user = {
                email: 'user@emailexemple.com',
                password: 'myAwesomePassword'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                body: user
            });
           token = response.cookies[0].value;
            assert.equal(response.statusCode, 200);
            assert.ok(Object.keys(response.headers).includes('set-cookie'));
            if (response.headers['set-cookie']) {
                assert.ok(response.headers['set-cookie'].includes('HttpOnly;'));
            }
            assert.deepStrictEqual(response.json(), { status: 'OK' });
        });

        await t.test('should not login if invalid credentials', async (t) => {
            const wrongUserBody = {
                email: 'jdo@riuty.com',
                password: 'rtyuiohhh'
            };
            const response = await app.inject({
                method: 'POST',
                url: 'api/auth/login',
                body: wrongUserBody
            });
            assert.strictEqual(response.statusCode, 400);
            assert.deepStrictEqual(response.json(), { status: 'ERROR', code: 'ERR_INVALID_CREDENTIALS', message: 'Invalid credentials' })
        });

        await t.test('GET /protected ' , async (t) => {
            await t.test('should not access', async () => {
                const response = await app.inject({
                    method: 'GET',
                    url: '/protected',
                });
                assert.deepStrictEqual(response.json(), { status: 'ERROR',code: 'ERR_UNAUTH', message: 'Unauthorized' });
            });

            await t.test('should access', async () => {
                const response = await app.inject({
                    method: 'GET',
                    url: '/protected',
                    cookies:{token}
                });
                assert.deepStrictEqual(response.json(), { message: 'Congrats, you pass the test!' });
            });

            //TODO test token expiration
            t.todo('TESTING TOKEN REFRESH');
        });
    });
});

