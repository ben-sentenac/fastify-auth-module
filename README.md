# Auth Module

A modular Fastify authentication plugin that provides essential authentication features such as user registration, login, JWT-based sessions, and cookie handling. Built with flexibility and reusability in mind, this module can be integrated into any Fastify project with a few simple configurations.

## Features

- **User Registration & Login**: Routes for creating new users and authenticating existing users.
- **JWT Authentication**: Token-based authentication with customizable secret keys.
- **Cookie Management**: Secure cookies with customizable options for authentication sessions.
- **MySQL Database Support**: Integration with MySQL for user data storage.
- **Error Handling**: Centralized error management for authentication errors.

## Installation

### 1. Local Installation (Development)

Link the module to your Fastify project for local development:

```sh
# In the auth-module directory
npm link

# In your main project directory
npm link auth-module
```
2. Add Dependency to package.json
For a clear record of dependencies, add auth-module to your package.json:
```json
{
  "dependencies": {
    "auth-module": "file:../path/to/auth-module"
  }
}

```
## dependencies 

- fastify: Fastify framework (v4+ recommended).
- @fastify/jwt: JSON Web Token support for session management.
- @fastify/cookie: Cookie support for secure storage of JWT tokens.
- @fastify/mysql: MySQL database support for user data.


```ts 
import Fastify from 'fastify';
import authPlugin from 'auth-module';

const server = Fastify();

server.register(authPlugin, {
  routePrefix: '/auth',
  jwtSecret: process.env.JWT_SECRET,
  databasePoolConnection: { host: 'localhost', user: 'root', database: 'mydb' },
  cookieOptions: {
    secret: process.env.COOKIE_SECRET,
    secure: true,
    maxAge: 86400 // 1 day
  }
});

server.listen({ port: 3000 }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});

```

## Routes Provided by auth-module
The plugin registers the following routes under the configured routePrefix (default is /auth):
- `POST /auth/register`: Registers a new user with a username and password.
    ###  Request body
    ```json
    {
    "username": "string",
    "email": "string",
    "password": "string"
    }
    ```
    ### Response:
    `201 Created` on success
    `400 Bad Request` for validation errors

- `POST /auth/login`: Authenticates a user and issues a JWT token stored in a cookie.
    ### Request body 
        ```json
        {
        "username": "string",
        "password": "string"
        }
        ```
    ### Response:
    `200 OK` with a JWT token on success
    `401 Unauthorized` if authentication fails

## Plugin options

| Option                  | Type                     | Description                                                 |
|-------------------------|--------------------------|-------------------------------------------------------------|
| `routePrefix`           | `string`                 | Prefix for all auth-related routes. Default is `/auth`.     |
| `jwtSecret`             | `string`                 | Secret key for signing JWT tokens. Required.                |
| `databasePoolConnection`| `FastifyMySQLOptions`    | Configuration for MySQL database connection. Required.      |
| `cookieOptions`         | `CookieOptions`          | Options for configuring secure cookies. Required.           |

### CookieOptions
The cookieOptions object allows for customization of secure cookie behavior.
| Option         | Type                  | Description                                                         |
|----------------|-----------------------|---------------------------------------------------------------------|
| `secret`       | `string | Buffer`     | Secret key for cookie signing. Required.                            |
| `expires`      | `Date`                | Expiration date of the cookie. Optional.                            |
| `maxAge`       | `number`              | Maximum age of the cookie in seconds. Optional.                     |
| `secure`       | `boolean`             | Only send cookies over HTTPS if true.                               |
| `path`         | `string`              | Path where the cookie is accessible. Default is `/`.                |
| `domain`       | `string`              | Domain where the cookie is accessible. Optional.                    |
| `sameSite`     | `'strict' | 'lax' | 'none'` | SameSite policy. Default is `strict`.                              |

### Authentication Decorators
This plugin decorates the Fastify instance with the following:

`fastify.authenticate`: A route-level decorator that verifies user authentication by checking JWT tokens in cookies.
`fastify.mysql`: Provides MySQL query capabilities if not already registered.
## TODO
- [ ]refactor error handling
- [ ] Enhance plugin validation
- [ ] Implement token-based password reset
- [ ] Create a static registration page
- [ ] Add email verification for new user registrations
- [ ] Implement user roles and permissions
- [ ] Integrate OAuth2 support


> **Warning:** This plugin is currently under development. Features and APIs may change.
