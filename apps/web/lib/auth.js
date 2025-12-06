"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = getAuth;
var better_auth_1 = require("better-auth");
var kysely_adapter_1 = require("better-auth/adapters/kysely-adapter");
var db_1 = require("@app/db");
// Lazy initialization of database to avoid errors at module load time
var dbInstance = null;
var authInstance = null;
function getDb() {
    if (!dbInstance) {
        var databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is required. Please set it in your .env.local file.');
        }
        dbInstance = (0, db_1.setupDb)(databaseUrl);
    }
    return dbInstance;
}
function getBaseUrl() {
    // Server-side: use environment variable or default
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3001';
    }
    // TODO fix me for preview deploys
    return 'https://usekyoto.com';
}
function getTrustedOrigins() {
    var origins = [];
    // Always include the base URL
    var baseUrl = getBaseUrl();
    if (baseUrl) {
        origins.push(baseUrl);
    }
    // Include production domain
    if (process.env.SITE_PRODUCTION_URL) {
        origins.push("https://".concat(process.env.SITE_PRODUCTION_URL));
    }
    // Include usekyoto.com
    origins.push('https://usekyoto.com', 'http://localhost:3001');
    // Include any additional trusted origins from environment variable
    if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
        var additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(function (origin) { return origin.trim(); });
        origins.push.apply(origins, additionalOrigins);
    }
    // Remove duplicates
    return Array.from(new Set(origins));
}
function getAuth() {
    if (!authInstance) {
        authInstance = (0, better_auth_1.betterAuth)({
            baseURL: getBaseUrl(),
            trustedOrigins: getTrustedOrigins(),
            database: (0, kysely_adapter_1.kyselyAdapter)(getDb(), {
                type: 'postgres',
            }),
            verification: {
                fields: {
                    // Map better-auth's expected field names to our database column names
                    expiresAt: 'expires_at', // better-auth expects 'expiresAt', our table has 'expires_at'
                },
            },
            emailAndPassword: {
                enabled: true,
            },
            socialProviders: {
                github: {
                    clientId: process.env.GITHUB_CLIENT_ID,
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    scope: ['email'],
                },
            },
        });
    }
    return authInstance;
}
