'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryTemplatesPanel = StoryTemplatesPanel;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var tiptap_editor_1 = require("@/components/tiptap-editor");
var utils_1 = require("@/lib/utils");
var STORY_TEMPLATES = [
    {
        id: 'classic',
        title: '🧩 Classic User Story Format (Agile Standard)',
        content: "<h3>Structure</h3><p>As a <strong>[type of user]</strong>,<br>I want <strong>[some goal]</strong>,<br>so that <strong>[some reason]</strong>.</p><h3>Example</h3><p>As a registered user,<br>I want to reset my password,<br>so that I can regain access to my account if I forget it.</p><h4>Acceptance Criteria</h4><ul><li>User can request a password reset via email.</li><li>Email contains a unique, one-time-use link.</li><li>Link expires after 15 minutes.</li></ul>",
    },
    {
        id: 'gherkin',
        title: '🧠 Gherkin / BDD (Behavior-Driven Development)',
        content: "<h3>Structure</h3><pre><code>Feature: [Feature Name]\n  As a [user type]\n  I want [goal]\n  So that [benefit]\n\n  Scenario: [Scenario Name]\n    Given [initial context]\n    When [event or action]\n    Then [expected outcome]</code></pre><h3>Example</h3><pre><code>Feature: Password Reset\n  As a registered user\n  I want to reset my password\n  So that I can regain access to my account\n\n  Scenario: Successful password reset\n    Given I am on the \"Forgot Password\" page\n    When I enter my email and click \"Send Reset Link\"\n    Then I should receive a reset link in my email</code></pre><h4>Acceptance Criteria</h4><ul><li>All \"Given/When/Then\" scenarios pass via automated tests.</li></ul>",
    },
    {
        id: 'feature-story',
        title: '🧱 Feature Story with Acceptance Criteria (Structured List)',
        content: "<h3>Structure</h3><p><strong>Title:</strong> [Feature Title]<br><strong>Description:</strong> [Short summary]<br><strong>User Story:</strong> As a [user], I want [goal], so that [reason]</p><h4>Acceptance Criteria:</h4><ul><li>[Criterion 1]</li><li>[Criterion 2]</li><li>[Criterion 3]</li></ul><h3>Example</h3><p><strong>Title:</strong> Email Verification<br><strong>Description:</strong> Require users to verify email after registration.<br><strong>User Story:</strong> As a new user, I want to verify my email, so that my account is confirmed.</p><h4>Acceptance Criteria:</h4><ul><li>Verification link sent upon registration</li><li>Clicking link sets 'email_verified = true'</li><li>Expired links show an error message</li></ul>",
    },
    {
        id: 'job-story',
        title: '⚙️ "Job Story" Format (Intercom-style, Context-driven)',
        content: "<h3>Structure</h3><p>When <strong>[situation]</strong>,<br>I want to <strong>[motivation]</strong>,<br>so I can <strong>[expected outcome]</strong>.</p><h3>Example</h3><p>When I forget my password,<br>I want to receive a reset link instantly,<br>so I can quickly log back into my account.</p><blockquote><p><strong>Use Case</strong><br>Job stories focus on context and motivation rather than persona; great for product UX work.</p></blockquote>",
    },
    {
        id: 'bdd-extended',
        title: '💬 BDD Extended (Given/When/Then + And)',
        content: "<h3>Structure</h3><pre><code>Scenario: [Scenario Name]\n  Given [precondition]\n  And [another precondition]\n  When [action]\n  And [another action]\n  Then [expected outcome]\n  And [another outcome]</code></pre><h3>Example</h3><pre><code>Scenario: Multiple invalid login attempts\n  Given I am on the login page\n  And I have entered an incorrect password 3 times\n  When I try to log in again\n  Then my account should be temporarily locked\n  And I should see an error message</code></pre>",
    },
    {
        id: 'spec-by-example',
        title: '🧩 Specification by Example (Concrete Use Cases)',
        content: "<h3>Structure</h3><p>A table or matrix of concrete examples used to define behavior.</p><h3>Example</h3><p><strong>Feature:</strong> Login validation</p><pre><code>Example:\n| Input Email        | Input Password | Expected Result        |\n|--------------------|----------------|------------------------|\n| valid@email.com    | correct123     | Login successful       |\n| valid@email.com    | wrongpass      | Error: Invalid password|\n| invalid@email      | anypass        | Error: Invalid email   |</code></pre><p>Used with Cucumber, FitNesse, or other executable spec tools.</p>",
    },
    {
        id: 'invest',
        title: '📋 INVEST-compliant Story Format',
        content: "<h3>Structure</h3><p>Ensures stories are:</p><p><strong>Independent</strong>, <strong>Negotiable</strong>, <strong>Valuable</strong>, <strong>Estimable</strong>, <strong>Small</strong>, <strong>Testable</strong></p><h4>Template</h4><p><strong>Story:</strong> [Title]<br><strong>Value:</strong> [Business reason or impact]<br><strong>Estimation:</strong> [Story points or complexity]</p><h4>Acceptance Tests:</h4><ul><li>[Behavior test or rule]</li></ul><h4>Notes:</h4><ul><li>[Open questions or dependencies]</li></ul>",
    },
    {
        id: 'use-case',
        title: '💡 Use Case Narrative (UML-style)',
        content: "<h3>Structure</h3><p><strong>Use Case:</strong> [Name]<br><strong>Actor:</strong> [User or System]<br><strong>Preconditions:</strong> [What must be true before]</p><h4>Main Flow:</h4><ol><li>[Action 1]</li><li>[Action 2]</li></ol><h4>Alternative Flows:</h4><p>A1. [Error or edge case]</p><p><strong>Postconditions:</strong> [What must be true after]</p><h3>Example</h3><p><strong>Use Case:</strong> Reset Password<br><strong>Actor:</strong> User<br><strong>Precondition:</strong> User must have a valid registered email</p><h4>Main Flow:</h4><ol><li>User requests reset</li><li>System sends link</li><li>User resets password</li></ol><p><strong>Postcondition:</strong> Password updated successfully</p>",
    },
    {
        id: 'atdd',
        title: '🧭 Acceptance Test-Driven Development (ATDD) Story',
        content: "<h3>Structure</h3><p><strong>Story:</strong> [Goal]<br><strong>Test:</strong> [Acceptance test description]<br><strong>Expected Outcome:</strong> [Result]</p><h3>Example</h3><p><strong>Story:</strong> Reset Password via Email<br><strong>Test:</strong> Send reset link to registered email<br><strong>Expected Outcome:</strong> User receives email with valid link</p>",
    },
    {
        id: 'hybrid',
        title: '🧰 Hybrid Story (for Agile AI / Agentic Systems)',
        content: "<h3>Structure</h3><p><strong>Story:</strong><br>  <strong>As:</strong> AI reviewer agent<br>  <strong>I want:</strong> verify repository implements user story<br>  <strong>So that:</strong> developers can confirm feature completion</p><h4>Acceptance Criteria:</h4><ul><li>Search finds relevant code symbols</li><li>Each step is evaluated with evidence</li><li>Verdict is structured JSON with explanation</li></ul>",
    },
];
function StoryTemplatesPanel(_a) {
    var onSelectTemplate = _a.onSelectTemplate;
    var _b = (0, react_1.useState)(null), openTemplateId = _b[0], setOpenTemplateId = _b[1];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex-1 flex flex-col overflow-hidden border rounded-md min-h-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-4 py-3 border-b", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-sm font-medium text-foreground", children: "Story Templates" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground mt-1", children: ["The templates below are suggested to help you get started, but you are", (0, jsx_runtime_1.jsx)("b", { children: "free to write your story in any format you like" }), ". None of these are required, but you can use them as a starting point."] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto", children: STORY_TEMPLATES.map(function (template) {
                    var isOpen = openTemplateId === template.id;
                    var contentId = "story-template-".concat(template.id);
                    return ((0, jsx_runtime_1.jsxs)("div", { className: "border-b last:border-b-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2 px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: function () { return setOpenTemplateId(isOpen ? null : template.id); }, className: (0, utils_1.cn)('flex-1 text-left text-sm font-medium text-foreground', 'flex items-center gap-2', 'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm'), "aria-expanded": isOpen, "aria-controls": contentId, children: [(0, jsx_runtime_1.jsx)("span", { className: "flex-1", children: template.title }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, utils_1.cn)('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen ? '' : '-rotate-90') })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", size: "sm", variant: "outline", onClick: function () { return onSelectTemplate(template); }, children: "Use Template" })] }), isOpen ? ((0, jsx_runtime_1.jsx)("div", { id: contentId, className: "px-4 pb-4", children: (0, jsx_runtime_1.jsx)(tiptap_editor_1.TiptapEditor, { value: template.content, onChange: function () { }, readOnly: true, className: "min-h-[200px]" }) })) : null] }, template.id));
                }) })] }));
}
