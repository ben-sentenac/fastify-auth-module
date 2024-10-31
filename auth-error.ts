import { FastifyReply } from "fastify";

//TODO refactor autherror class with proper message
interface AuthErrorResponsePayload {
    status:string
    code:string,
    message:string
};

const errors:Record<string,string> = {
    'ERR_INVALID_OPTS':'Plugin options are invalid',
    'ERR_POOL_CONN_MISSING':'Missing database pool connection',
    'ERR_DB_ACCESS':'Wrong or missing database credentials',
    'ERR_INVALID_CREDENTIALS':'Invalid credentials',//400
    'ERR_DUPLICATE_ENTRY':'Duplicate entry [email or username must be unique]', //400
    'ERR_VALIDATION':'Validation Error',
    'ERR_TOKEN':'Invalid or expired token',//401
    'ERR_MISSING_COOKIE':'Signed cookie string must be provided',
    'ERR_UNAUTH':'Unauthorized',//401
    'ERR_INTERNAL':'Internal Server Error', //500
    'ERR_NOT_FOUND':'Resource not found' //404
};


function setStatusCode(code:string):number {
    if(code === 'ERR_DUPLICATE_ENTRY' || code === 'ERR_INVALID_CREDENTIALS' || code === 'ERR_VALIDATION' || code === 'FST_ERR_VALIDATION') {
      return 400;
    }
    else if (code === 'ERR_TOKEN') {
      return 401;
    }
    else if(code === 'ERR_NOT_FOUND') {
      return 404;
    } 
    else return 500;
}


export function handleError(reply:FastifyReply,error:Error) {
  if(error instanceof AuthError) {
    const statusCode = setStatusCode(error.code);
    return reply.status(statusCode).send(error.payload);
  }
  return reply.status(500).send({
    status:'ERROR',
    code:'ERR_INTERNAL',
    message:'Internal Server Error'
  });
}


export class AuthError extends Error 
{
    message:string;
    code:string;
    payload:AuthErrorResponsePayload;

    constructor(code:string,message?:string) {
       super(message || errors[code] || 'Unknwon error');
        this.code = code;
        this.message = message || this.setMessage();
        this.payload = this.setResponsePayload()
        Error.captureStackTrace(this,this.constructor);
        // Ensure the name property is correctly set for error handling
        this.name = this.constructor.name;
    }

    setMessage() {
        return errors[this.code] || 'Unknown error';
    }

    setResponsePayload() {
        return {
            status:'ERROR',
            code:this.code,
            message:this.message
        }
    }
}