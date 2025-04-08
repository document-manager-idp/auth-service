import { APP_ADDRESS } from "./contants";

const cognitoConfig = {
    client_id: "5l5uqlig4pn7jevhpdd0ddcbkn",
    client_secret: process.env.COGNITO_SECRET,
    redirect_uris: [`${process.env.REDIRECT_URL ?? APP_ADDRESS}/auth/callback`],
    response_types: ["code"],
};

export default cognitoConfig;
