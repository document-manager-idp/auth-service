import { Request, Response, Router } from "express";
import { client } from "../server";
import { User } from "../types/types";
import logger from "../config/logger";
import { addTokenToSession } from "../middleware/middleware";

const management = Router();

export function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization || "";
    // Typical header format: "Bearer <token>"
    const [scheme, token] = authHeader.split(" ");
    if (scheme === "Bearer" && token) {
        console.log("Extracted Bearer token from header.");
        return token;
    }
    console.warn("Bearer token not found or malformed in the header.");
    return null;
}

management.get("/refresh", addTokenToSession, async (req: Request, res: Response) => {
    logger.info("Received request to refresh token.");
    try {
        const refreshToken = req.session.tokens?.refresh_token ?? "";
        if (!refreshToken) {
            logger.warn("No refresh token found in session.");
            res.status(400).json({ error: "No refresh token in session" });
            return;
        }

        logger.info("Attempting to refresh token with refresh_token");
        // Use the openid-client `refresh` method to call Cognito's /token endpoint with the refresh_token grant.
        const newTokenSet = await client.refresh(refreshToken);
        logger.info("Token refresh successful. New token set");

        // Store new tokens in session.
        req.session.tokens = newTokenSet;

        console.log("Fetching user info with new access token.");
        const userInfo = await client.userinfo<User>(newTokenSet.access_token as string);
        req.session.userInfo = userInfo;

        res.json({
            message: "Tokens refreshed successfully",
            tokens: newTokenSet,
            user: userInfo,
        });
    } catch (error) {
        logger.error("Error refreshing token:", error);
        res.status(401).json({ error: "Failed to refresh token" });
    }
});

management.get("/userinfo", addTokenToSession, async (req: Request, res: Response) => {
    logger.info("Received request to fetch user info.");
    const accessToken = req.session.tokens?.access_token ?? "";

    try {
        logger.info("Calling userinfo endpoint with the access token.");
        const userInfo = await client.userinfo(accessToken);
        logger.info("User info successfully retrieved:", userInfo);

        res.status(200).json(userInfo);
    } catch (error) {
        logger.error("Error fetching userinfo:", error);
        res.status(500).json({ error: "Failed to fetch user info" });
    }
});

export default management;
