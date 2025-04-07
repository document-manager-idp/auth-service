import { NextFunction, Request, Response } from "express";
import logger from "../config/logger";
import { TokenSet } from "openid-client";
import { extractBearerToken } from "../routes/management";

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
    req.session.isAuthenticated = !!req.session.userInfo;
    next();
};

export const addTokenToSession = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.tokens || !req.session.tokens.access_token) {
        logger.warn("No access token found in session. Attempting to extract token from Bearer header.");
        req.session.tokens = {} as TokenSet;
        req.session.tokens.access_token = extractBearerToken(req) ?? undefined;

        if (!req.session.tokens.access_token) {
            console.warn("Access token not provided in Bearer header either.");
            res.status(401).json({ error: "Not authenticated" });
            return;
        }
    }

    next();
};
