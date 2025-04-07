export interface User {
    sub: string;
    email_verified: string;
    email: string;
    username: string;
}

export interface Tokens {
    id_token: string;
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: "Bearer";
}
