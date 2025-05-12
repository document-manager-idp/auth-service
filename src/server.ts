import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import { Client, custom, Issuer, TokenSet } from "openid-client";
import cognitoConfig from "./config/cognito";
import { User } from "./types/types";
import login from "./routes/login";
import logout from "./routes/logout";
import management from "./routes/management";
import logger from "./config/logger";
import promClient from "prom-client";

const app = express();
app.use(bodyParser.json());
promClient.collectDefaultMetrics();

const httpRequestsTotal = new promClient.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
});

app.use((req, res, next) => {
    res.on("finish", () => {
        httpRequestsTotal.labels(req.method, req.route?.path || req.path, res.statusCode.toString()).inc();
    });
    next();
});

// Configure a session store (in-memory for demo)
app.use(
    session({
        secret: process.env.COGNITO_SECRET ?? "",
        resave: false,
        saveUninitialized: true,
    })
);

declare module "express-session" {
    interface SessionData {
        userInfo: User;
        nonce: string;
        state: string;
        isAuthenticated: boolean;
        tokens: TokenSet;
    }
}

export let client: Client;

async function setupCognitoClient() {
    // For timeouts / HTTP options
    custom.setHttpOptionsDefaults({
        timeout: 10000,
    });

    // Discover Cognito OIDC endpoints
    const issuer = await Issuer.discover("https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_3hAObOpXe");
    logger.info("Discovered issuer %s %O", issuer.issuer, issuer.metadata);

    // Create openid-client instance
    client = new issuer.Client(cognitoConfig);
}

app.use("/auth", login);
app.use("/auth", logout);
app.use("/management", management);

app.get("/auth", (req: Request, res: Response) => {
    res.send(`
    <h1>Welcome</h1>
    <p><a href="/auth/login">Login</a></p>
    <p><a href="/auth/management/userinfo">Info</a></p>
    <p><a href="/auth/logout">Logout</a></p>
    <p>${JSON.stringify(req.session.tokens) ?? "Not logged in"}</p>
  `);
});

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", promClient.register.contentType);
    res.end(await promClient.register.metrics());
});

// START SERVER
async function start() {
    await setupCognitoClient();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

start().catch((err) => {
    console.error("Failed to start server:", err);
});
