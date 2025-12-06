"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
var fetch_1 = require("@trpc/server/adapters/fetch");
var Sentry = require("@sentry/nextjs");
var api_1 = require("@app/api");
var api_2 = require("@app/api");
var config_1 = require("@app/config");
var db_1 = require("@app/db");
var auth_1 = require("@/lib/auth");
function createContext(req) {
    return __awaiter(this, void 0, void 0, function () {
        var env, db, auth, session, sessionResponse, _error_1, user, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    env = (0, config_1.getConfig)();
                    db = (0, db_1.setupDb)(env.DATABASE_URL);
                    auth = (0, auth_1.getAuth)();
                    session = null;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, auth.api.getSession({
                            headers: req.headers,
                        })];
                case 2:
                    sessionResponse = _b.sent();
                    session = sessionResponse
                        ? {
                            user: sessionResponse.user
                                ? {
                                    id: sessionResponse.user.id,
                                }
                                : null,
                        }
                        : null;
                    return [3 /*break*/, 4];
                case 3:
                    _error_1 = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    user = null;
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) return [3 /*break*/, 8];
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, (0, api_2.getUser)({ db: db, userId: session.user.id })];
                case 6:
                    user = _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _b.sent();
                    // User might not exist in database yet, that's okay
                    console.error('Failed to get user from database:', error_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, {
                        db: db,
                        env: env,
                        session: session,
                        user: user,
                    }];
            }
        });
    });
}
function onError(_a) {
    var path = _a.path, error = _a.error;
    // Log detailed error information to Vercel logs
    console.error("[tRPC Error] ".concat(path !== null && path !== void 0 ? path : 'unknown', ":"), {
        message: error instanceof Error ? error.message : String(error),
        code: error && typeof error === 'object' && 'code' in error
            ? error.code
            : undefined,
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? error.cause : undefined,
    });
    // Send error to Sentry with full traceback
    if (error instanceof Error) {
        Sentry.captureException(error, {
            tags: {
                trpc: true,
                trpcPath: path !== null && path !== void 0 ? path : 'unknown',
                errorCode: error && typeof error === 'object' && 'code' in error
                    ? String(error.code)
                    : undefined,
            },
        });
    }
    else {
        Sentry.captureException(new Error(String(error)), {
            tags: {
                trpc: true,
                trpcPath: path !== null && path !== void 0 ? path : 'unknown',
            },
            extra: {
                originalError: error,
            },
        });
    }
}
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    return [4 /*yield*/, (0, fetch_1.fetchRequestHandler)({
                            endpoint: '/api/trpc',
                            req: request,
                            router: api_1.appRouter,
                            createContext: function () { return createContext(request); },
                            onError: onError,
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_2 = _a.sent();
                    // Capture any unhandled errors
                    Sentry.captureException(error_2 instanceof Error ? error_2 : new Error(String(error_2)));
                    // Ensure Sentry has time to send the error before the function exits
                    return [4 /*yield*/, Sentry.flush(2000)];
                case 3:
                    // Ensure Sentry has time to send the error before the function exits
                    _a.sent();
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    return [4 /*yield*/, (0, fetch_1.fetchRequestHandler)({
                            endpoint: '/api/trpc',
                            req: request,
                            router: api_1.appRouter,
                            createContext: function () { return createContext(request); },
                            onError: onError,
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_3 = _a.sent();
                    // Capture any unhandled errors
                    Sentry.captureException(error_3 instanceof Error ? error_3 : new Error(String(error_3)));
                    // Ensure Sentry has time to send the error before the function exits
                    return [4 /*yield*/, Sentry.flush(2000)];
                case 3:
                    // Ensure Sentry has time to send the error before the function exits
                    _a.sent();
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
