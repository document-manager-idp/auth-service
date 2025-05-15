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

const httpRequestDuration = new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "Time taken to fulfil an HTTP request",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5], // tweak for your latency SLOs
});

const httpRequestSize = new promClient.Histogram({
    name: "http_request_size_bytes",
    help: "Size of incoming HTTP request bodies",
    labelNames: ["method", "route"],
    buckets: [100, 1_000, 10_000, 100_000, 1_000_000], // 0.1 KiB → 1 MiB
});

const httpResponseSize = new promClient.Histogram({
    name: "http_response_size_bytes",
    help: "Size of outgoing HTTP responses",
    labelNames: ["method", "route", "status_code"],
    buckets: [100, 1_000, 10_000, 100_000, 1_000_000],
});

export const activeSessions = new promClient.Gauge({
    name: "active_sessions",
    help: "Current express-session objects in memory",
});

app.use((req, _, next) => {
    if (req.session.isNew) activeSessions.inc();
    next();
});

app.use((req, res, next) => {
    const requestBytes = parseInt(req.headers["content-length"] || "0", 10);
    if (!Number.isNaN(requestBytes)) httpRequestSize.observe({ method: req.method, route: req.path }, requestBytes);

    const original = res.write;
    let bytesWritten = 0;
    // monkey-patch res.write/res.end to count outgoing bytes
    res.write = (...args: any[]) => {
        bytesWritten += args[0]?.length ?? 0;
        // @ts-ignore
        return original.apply(res, args);
    };
    res.on("finish", () =>
        httpResponseSize.observe({ method: req.method, route: req.path, status_code: res.statusCode }, bytesWritten)
    );
    next();
});

app.use((req, res, next) => {
    const endTimer = httpRequestDuration.startTimer({ method: req.method, route: req.route?.path || req.path });
    res.on("finish", () => {
        httpRequestsTotal.labels(req.method, req.route?.path || req.path, res.statusCode.toString()).inc();
        endTimer({ status_code: res.statusCode });
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
        isNew: boolean;
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
    logger.info(`Discovered issuer ${issuer.issuer} ${JSON.stringify(issuer.metadata)}`);

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
