import { Request, Response, Router } from "express";
import { generators } from "openid-client";
import { client } from "../server";
import { User } from "../types/types";
import { APP_ADDRESS } from "../config/contants";
import logger from "../config/logger";

const login = Router();

login.get("/login", (req: Request, res: Response) => {
    logger.info("Initiating login flow.");
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
        scope: "phone openid email",
        state: state,
        nonce: nonce,
    });

    logger.info(`Redirecting to authorization URL: ${authUrl}`);
    res.redirect(authUrl);
});

login.get("/callback", async (req: Request, res: Response) => {
    logger.info("Received callback from authorization server.");
    try {
        const params = client.callbackParams(req);
        logger.info("Extracted callback parameters from request.");

        const tokenSet = await client.callback(`${APP_ADDRESS}/auth/callback`, params, {
            nonce: req.session.nonce,
            state: req.session.state,
        });

        const userInfo = await client.userinfo<User>(tokenSet.access_token ?? "");
        logger.info("User info successfully retrieved from userinfo endpoint.");
        req.session.userInfo = userInfo;

        res.status(200).send({ tokenSet, userInfo });
    } catch (err) {
        logger.error(`Callback error: ${err}`);
        res.redirect("/");
    }
});

export default login;
