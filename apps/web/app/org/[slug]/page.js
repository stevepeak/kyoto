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
exports.generateMetadata = generateMetadata;
exports.default = OrgPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var headers_1 = require("next/headers");
var OrgPage_1 = require("@/components/pages/OrgPage");
var api_1 = require("@app/api");
var db_1 = require("@app/db");
var auth_1 = require("@/lib/auth");
// Org pages are user-specific and always dynamic
exports.dynamic = 'force-dynamic';
exports.dynamicParams = true;
function getOrgMetadataData(orgName) {
    return __awaiter(this, void 0, void 0, function () {
        var databaseUrl, db, auth, headersList, headersForAuth, _i, _a, _b, key, value, sessionResponse, user, owner, _c;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 5, , 6]);
                    databaseUrl = process.env.DATABASE_URL;
                    if (!databaseUrl) {
                        return [2 /*return*/, null];
                    }
                    db = (0, db_1.setupDb)(databaseUrl);
                    auth = (0, auth_1.getAuth)();
                    return [4 /*yield*/, (0, headers_1.headers)()];
                case 1:
                    headersList = _f.sent();
                    headersForAuth = new Headers();
                    for (_i = 0, _a = headersList.entries(); _i < _a.length; _i++) {
                        _b = _a[_i], key = _b[0], value = _b[1];
                        headersForAuth.set(key, value);
                    }
                    return [4 /*yield*/, auth.api.getSession({
                            headers: headersForAuth,
                        })];
                case 2:
                    sessionResponse = _f.sent();
                    if (!((_d = sessionResponse === null || sessionResponse === void 0 ? void 0 : sessionResponse.user) === null || _d === void 0 ? void 0 : _d.id)) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, (0, api_1.getUser)({ db: db, userId: sessionResponse.user.id })];
                case 3:
                    user = _f.sent();
                    if (!user) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, (0, api_1.findOwnerForUser)(db, {
                            orgName: orgName,
                            userId: user.id,
                        })];
                case 4:
                    owner = _f.sent();
                    return [2 /*return*/, owner
                            ? {
                                name: (_e = owner.name) !== null && _e !== void 0 ? _e : owner.login,
                                slug: owner.login,
                            }
                            : null];
                case 5:
                    _c = _f.sent();
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function generateMetadata(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var slug, orgData;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, params];
                case 1:
                    slug = (_c.sent()).slug;
                    return [4 /*yield*/, getOrgMetadataData(slug)];
                case 2:
                    orgData = _c.sent();
                    if (!orgData) {
                        return [2 /*return*/, {
                                title: "".concat(slug, " - Kyoto"),
                                description: 'Organization page on Kyoto - Intent Testing',
                            }];
                    }
                    return [2 /*return*/, {
                            title: "".concat(orgData.name, " - Kyoto"),
                            description: "View ".concat(orgData.name, " organization on Kyoto - Intent Testing platform"),
                        }];
            }
        });
    });
}
function OrgPage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var resolvedParams, slug;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, params];
                case 1:
                    resolvedParams = _c.sent();
                    slug = resolvedParams.slug;
                    return [2 /*return*/, (0, jsx_runtime_1.jsx)(OrgPage_1.OrgPage, { orgName: slug })];
            }
        });
    });
}
