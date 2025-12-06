"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = void 0;
var auth_1 = require("@/lib/auth");
var next_js_1 = require("better-auth/next-js");
// Create handler with lazy auth initialization
// This ensures auth is only initialized when the route is actually called
var authHandler = (0, next_js_1.toNextJsHandler)((0, auth_1.getAuth)());
exports.GET = authHandler.GET;
exports.POST = authHandler.POST;
