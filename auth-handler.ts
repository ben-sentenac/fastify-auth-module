import {FastifyRequest,FastifyReply} from 'fastify';
import { tryLogin,generateJWT,registerUser } from "./auth-services.js";
import { handleError,AuthError } from "./auth-error.js";
import { LoginRequestBody, RegisterRequestBody } from './auth-types.js';


export  async function registerHandler (this: any,  request:FastifyRequest, reply:FastifyReply) {
    const { username, email, password } = request.body as RegisterRequestBody;
    try {
      const user = await registerUser(username, email, password, this.mysql);
      const responsePayload = {
        status:'OK',
        data:{
          id:user.insertId,
          email,
          username
        }
      }
      return reply.status(201).send(responsePayload);
    } catch (error) {
      if(error instanceof Error) {
        return handleError(reply,error);
      }
    }
};
export async function loginHandler (this: any, request:FastifyRequest, reply:FastifyReply) {
    const { email, password } = request.body as LoginRequestBody;
    try {
      const user = await tryLogin(email, password, this.mysql);
      if (!user) {
       throw new AuthError('ERR_INVALID_CREDENTIALS');
      }
      const token = await generateJWT({ id: user.id, email: user.email }, this);
      return reply.status(200).setCookie('token', token,{
        signed:true
      }).send({
        status: 'OK',
        //token do not send token in the response
      });
    } catch (error) {
      if(error instanceof Error) {
         return handleError(reply, error);
      }
    }
};