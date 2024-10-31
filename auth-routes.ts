import { FastifyInstance, RouteShorthandOptions } from "fastify";
import { loginHandler, registerHandler } from "./auth-handler.js";
 // Define the schema for request validation
 const registerOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string',minLength:9 },
      },
      required: ['username', 'email', 'password']
    },
    response: {
      "201": {
        type: 'object',
        properties: {
          status: {
            type: 'string'
          },
          data: {
            type: 'object',
            properties:{
              id:{
                type:'number',
              },
              email:{
                type:'string'
              },
              username:{
                type:'string'
              }
            }
          }
        }
      }
    }
  }
};

const loginOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: {
          type: 'string'
        },
        password: {
          type: 'string'
        }
      },
      required: ['email', 'password']
    },
    response: {
      "200": {
        type: 'object',
        properties: {
          status: {
            type: 'string',
          },
          token: {
            type: 'string'
          }
        }
      }
    }
  }
};

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/ping', (request,reply) => reply.send({status:'OK'}));
  fastify.post('/register',registerOpts,registerHandler);
  fastify.post('/login',loginOpts,loginHandler);
}