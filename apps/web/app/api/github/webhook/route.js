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
exports.POST = POST;
var sdk_1 = require("@trigger.dev/sdk");
var node_crypto_1 = require("node:crypto");
// Ensure Trigger.dev is configured once per process
var isTriggerConfigured = false;
function ensureTriggerConfigured() {
    if (!isTriggerConfigured) {
        (0, sdk_1.configure)({
            secretKey: process.env.TRIGGER_SECRET_KEY,
        });
        isTriggerConfigured = true;
    }
}
function verifyGitHubSignature(payload, signature, secret) {
    if (!signature) {
        return false;
    }
    var hmac = (0, node_crypto_1.createHmac)('sha256', secret);
    var digest = 'sha256=' + hmac.update(payload).digest('hex');
    // Use timing-safe comparison to prevent timing attacks
    if (signature.length !== digest.length) {
        return false;
    }
    var signatureBuffer = Buffer.from(signature);
    var digestBuffer = Buffer.from(digest);
    return (0, node_crypto_1.timingSafeEqual)(signatureBuffer, digestBuffer);
}
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var githubWebhookSecret, signature, eventType, deliveryId, rawBody, payload, allowedEvents, tags, repo, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    ensureTriggerConfigured();
                    githubWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
                    if (!githubWebhookSecret) {
                        return [2 /*return*/, Response.json({
                                success: false,
                                error: 'GITHUB_WEBHOOK_SECRET is not configured',
                            }, { status: 500 })];
                    }
                    signature = request.headers.get('x-hub-signature-256');
                    eventType = request.headers.get('x-github-event');
                    deliveryId = request.headers.get('x-github-delivery');
                    if (!signature) {
                        return [2 /*return*/, Response.json({
                                success: false,
                                error: 'Missing x-hub-signature-256 header',
                            }, { status: 401 })];
                    }
                    if (!eventType) {
                        return [2 /*return*/, Response.json({
                                success: false,
                                error: 'Missing x-github-event header',
                            }, { status: 400 })];
                    }
                    if (!deliveryId) {
                        return [2 /*return*/, Response.json({
                                success: false,
                                error: 'Missing x-github-delivery header',
                            }, { status: 400 })];
                    }
                    return [4 /*yield*/, request.text()
                        // Verify signature
                    ];
                case 1:
                    rawBody = _a.sent();
                    // Verify signature
                    if (!verifyGitHubSignature(rawBody, signature, githubWebhookSecret)) {
                        return [2 /*return*/, Response.json({
                                success: false,
                                error: 'Invalid signature',
                            }, { status: 401 })];
                    }
                    payload = JSON.parse(rawBody);
                    allowedEvents = [
                        'push',
                        'pull_request',
                        'installation',
                        'installation_repositories',
                        'installation_targets',
                    ];
                    if (!allowedEvents.includes(eventType)) {
                        return [2 /*return*/, Response.json({
                                success: true,
                                eventType: eventType,
                                deliveryId: deliveryId,
                                skipped: true,
                            })];
                    }
                    tags = ["type_".concat(eventType)];
                    if (payload &&
                        typeof payload === 'object' &&
                        'repository' in payload &&
                        payload.repository &&
                        typeof payload.repository === 'object') {
                        repo = payload.repository;
                        if (typeof repo.name === 'string') {
                            tags.push("repo_".concat(repo.name));
                        }
                        if (repo.owner &&
                            typeof repo.owner === 'object' &&
                            'login' in repo.owner &&
                            typeof repo.owner.login === 'string') {
                            tags.push("owner_".concat(repo.owner.login));
                        }
                    }
                    // Trigger the webhook task
                    return [4 /*yield*/, sdk_1.tasks.trigger('handle-github-webhook', {
                            eventType: eventType,
                            deliveryId: deliveryId,
                            payload: payload,
                        }, {
                            tags: tags,
                        })];
                case 2:
                    // Trigger the webhook task
                    _a.sent();
                    return [2 /*return*/, Response.json({
                            success: true,
                            eventType: eventType,
                            deliveryId: deliveryId,
                        })];
                case 3:
                    error_1 = _a.sent();
                    console.error('Failed to handle GitHub webhook:', error_1);
                    return [2 /*return*/, Response.json({
                            success: false,
                            error: error_1 instanceof Error ? error_1.message : 'Failed to handle webhook',
                        }, { status: 500 })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
