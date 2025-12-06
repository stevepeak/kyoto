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
exports.getTRPCCaller = getTRPCCaller;
var headers_1 = require("next/headers");
var react_1 = require("react");
var api_1 = require("@app/api");
var api_2 = require("@app/api");
var config_1 = require("@app/config");
var db_1 = require("@app/db");
var auth_1 = require("@/lib/auth");
/**
 * Create tRPC context for Server Components
 * Uses React cache to deduplicate requests
 */
var createContext = (0, react_1.cache)(function () { return __awaiter(void 0, void 0, void 0, function () {
    var env, db, auth, headersList, headersForAuth, _i, _a, _b, key, value, session, sessionResponse, _error_1, user, error_1;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                env = (0, config_1.getConfig)();
                db = (0, db_1.setupDb)(env.DATABASE_URL);
                auth = (0, auth_1.getAuth)();
                return [4 /*yield*/, (0, headers_1.headers)()
                    // better-auth's getSession expects a Headers-like object
                    // Next.js headers() returns ReadonlyHeaders, so we create a mutable Headers object
                ];
            case 1:
                headersList = _d.sent();
                headersForAuth = new Headers();
                for (_i = 0, _a = headersList.entries(); _i < _a.length; _i++) {
                    _b = _a[_i], key = _b[0], value = _b[1];
                    headersForAuth.set(key, value);
                }
                session = null;
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                return [4 /*yield*/, auth.api.getSession({
                        headers: headersForAuth,
                    })];
            case 3:
                sessionResponse = _d.sent();
                session = sessionResponse
                    ? {
                        user: sessionResponse.user
                            ? {
                                id: sessionResponse.user.id,
                            }
                            : null,
                    }
                    : null;
                return [3 /*break*/, 5];
            case 4:
                _error_1 = _d.sent();
                return [3 /*break*/, 5];
            case 5:
                user = null;
                if (!((_c = session === null || session === void 0 ? void 0 : session.user) === null || _c === void 0 ? void 0 : _c.id)) return [3 /*break*/, 9];
                _d.label = 6;
            case 6:
                _d.trys.push([6, 8, , 9]);
                return [4 /*yield*/, (0, api_2.getUser)({ db: db, userId: session.user.id })];
            case 7:
                user = _d.sent();
                return [3 /*break*/, 9];
            case 8:
                error_1 = _d.sent();
                // User might not exist in database yet, that's okay
                console.error('Failed to get user from database:', error_1);
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/, {
                    db: db,
                    env: env,
                    session: session,
                    user: user,
                }];
        }
    });
}); });
/**
 * Get server-side tRPC caller for use in Server Components
 */
function getTRPCCaller() {
    return __awaiter(this, void 0, void 0, function () {
        var ctx, caller;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, createContext()];
                case 1:
                    ctx = _a.sent();
                    caller = api_1.appRouter.createCaller(ctx);
                    return [2 /*return*/, caller];
            }
        });
    });
}
