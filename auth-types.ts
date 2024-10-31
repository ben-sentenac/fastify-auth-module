export interface User {
    id:number,
    email:string,
    password:string,
    createdAt?:Date,
    updatedAt?:Date
};

export interface RegisterRequestBody {
    username:string,
    email:string,
    password:string,
}

export interface LoginRequestBody {
    email:string,
    password:string
}