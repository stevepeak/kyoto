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
exports.dynamicParams = exports.dynamic = void 0;
exports.default = SetupPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var navigation_1 = require("next/navigation");
var headers_1 = require("next/headers");
var SetupPageWrapper_1 = require("@/components/pages/SetupPageWrapper");
var auth_1 = require("@/lib/auth");
// Setup page is user-specific and always dynamic
exports.dynamic = 'force-dynamic';
exports.dynamicParams = true;
/**
 * SetupPage handles the post-authentication setup or app installation redirect.
 *
 * - If `installation_id` is present in the query params, renders the installation flow for the app.
 * - Otherwise, validates session and redirects the user to the main app (`/app`).
 *
 * @param searchParams - Promise resolving to an object with an optional `installation_id` field from the query string.
 * @returns JSX element for installation flow or a redirect; never undefined.
 */
function SetupPage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var params, installationIdParam, installationId, auth, headersList, headersForAuth, _i, _c, _d, key, value, session, _e;
        var searchParams = _b.searchParams;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, searchParams];
                case 1:
                    params = _f.sent();
                    installationIdParam = params.installation_id;
                    // If installation_id is provided, use the install flow
                    if (installationIdParam) {
                        installationId = Number.parseInt(installationIdParam, 10);
                        if (!Number.isNaN(installationId)) {
                            return [2 /*return*/, (0, jsx_runtime_1.jsx)(SetupPageWrapper_1.SetupPageWrapper, { installationId: installationId })];
                        }
                    }
                    auth = (0, auth_1.getAuth)();
                    return [4 /*yield*/, (0, headers_1.headers)()];
                case 2:
                    headersList = _f.sent();
                    headersForAuth = new Headers();
                    for (_i = 0, _c = headersList.entries(); _i < _c.length; _i++) {
                        _d = _c[_i], key = _d[0], value = _d[1];
                        headersForAuth.set(key, value);
                    }
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, auth.api.getSession({
                            headers: headersForAuth,
                        })
                        // If no valid session, redirect to auth page
                    ];
                case 4:
                    session = _f.sent();
                    // If no valid session, redirect to auth page
                    if (!(session === null || session === void 0 ? void 0 : session.user)) {
                        (0, navigation_1.redirect)('/auth?redirect=/setup');
                    }
                    return [3 /*break*/, 6];
                case 5:
                    _e = _f.sent();
                    // If session check fails, redirect to auth page
                    (0, navigation_1.redirect)('/auth?redirect=/setup');
                    return [3 /*break*/, 6];
                case 6:
                    // Session is valid, redirect to /app
                    (0, navigation_1.redirect)('/app');
                    return [2 /*return*/];
            }
        });
    });
}
