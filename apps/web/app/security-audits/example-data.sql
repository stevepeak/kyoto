-- Example SQL query to insert test data for security audits
-- 
-- INSTRUCTIONS:
-- 1. Replace <USER_ID> with your actual user ID (from the user table)
-- 2. Replace <REPO_ID> with your actual repo ID (from the repos table)
-- 3. Run this query in your database

-- Step 1: Insert security audits (sites)
-- Note: Replace <USER_ID> and <REPO_ID> with actual values
INSERT INTO security_audits (id, user_id, repo_id, name, target_url, enabled, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    '<USER_ID>',  -- Replace with your user ID
    '<REPO_ID>',  -- Replace with your repo ID
    'Production Site',
    'https://example.com',
    true,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    gen_random_uuid(),
    '<USER_ID>',  -- Replace with your user ID
    '<REPO_ID>',  -- Replace with your repo ID
    'Staging Site',
    'https://staging.example.com',
    true,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

-- Step 2: Insert security audit runs (test suites)
-- Note: Replace <AUDIT_ID> with the ID from the first audit inserted above
-- You can find it by running: SELECT id FROM security_audits WHERE name = 'Production Site' LIMIT 1;

INSERT INTO security_audit_runs (
  id,
  audit_id,
  status,
  score,
  results,
  created_at,
  updated_at
)
VALUES
  (
    gen_random_uuid(),
    '<AUDIT_ID>',  -- Replace with Production Site audit ID
    'completed',
    '85%',
    '{
      "agents": [
        {
          "agent": "Browser Security Agent (DAST)",
          "status": "pass",
          "checks": [
            {
              "check": "HTTPS everywhere",
              "status": "pass",
              "details": "All requests use HTTPS"
            },
            {
              "check": "Security headers present",
              "status": "pass",
              "details": "X-Frame-Options, CSP, HSTS all configured"
            },
            {
              "check": "Cookie security",
              "status": "warning",
              "details": "Some cookies missing SameSite attribute",
              "recommendation": "Add SameSite=Strict to all cookies to prevent CSRF attacks"
            }
          ],
          "logs": [
            "[2025-01-14 10:30:00] Starting browser security audit...",
            "[2025-01-14 10:30:15] Checking HTTPS configuration...",
            "[2025-01-14 10:30:20] Verifying security headers...",
            "[2025-01-14 10:30:45] Audit completed successfully"
          ]
        },
        {
          "agent": "CLI Security Agent",
          "status": "pass",
          "checks": [
            {
              "check": "TLS configuration",
              "status": "pass",
              "details": "TLS 1.3 supported, certificate valid"
            },
            {
              "check": "CORS configuration",
              "status": "pass",
              "details": "CORS properly configured, no wildcard origins"
            },
            {
              "check": "Rate limiting",
              "status": "warning",
              "details": "Rate limiting detected but thresholds may be too high",
              "recommendation": "Consider lowering rate limit thresholds for authentication endpoints"
            }
          ],
          "logs": [
            "[2025-01-14 10:31:00] Running CLI security validation...",
            "[2025-01-14 10:31:10] Testing TLS with openssl...",
            "[2025-01-14 10:31:25] Checking CORS headers with curl...",
            "[2025-01-14 10:31:40] Testing rate limiting...",
            "[2025-01-14 10:32:00] CLI audit completed"
          ]
        },
        {
          "agent": "SAST Security Agent",
          "status": "fail",
          "checks": [
            {
              "check": "SQL injection prevention",
              "status": "pass",
              "details": "ORM usage detected, no raw SQL queries found"
            },
            {
              "check": "Authentication implementation",
              "status": "fail",
              "details": "Missing authentication middleware on /api/admin endpoint",
              "recommendation": "Add authentication middleware to protect admin endpoints"
            },
            {
              "check": "Input validation",
              "status": "warning",
              "details": "Some API endpoints missing input validation",
              "recommendation": "Add Zod schemas or similar validation to all API endpoints"
            }
          ],
          "logs": [
            "[2025-01-14 10:32:00] Starting SAST analysis...",
            "[2025-01-14 10:32:15] Analyzing authentication patterns...",
            "[2025-01-14 10:32:30] Checking for SQL injection vulnerabilities...",
            "[2025-01-14 10:32:45] Reviewing input validation...",
            "[2025-01-14 10:33:00] SAST analysis completed"
          ]
        },
        {
          "agent": "Dependency Security Agent",
          "status": "pass",
          "checks": [
            {
              "check": "Vulnerable dependencies",
              "status": "pass",
              "details": "No critical or high severity vulnerabilities found"
            },
            {
              "check": "Outdated packages",
              "status": "warning",
              "details": "5 packages have minor updates available",
              "recommendation": "Run npm update to get latest security patches"
            }
          ],
          "logs": [
            "[2025-01-14 10:33:00] Running dependency audit...",
            "[2025-01-14 10:33:10] Scanning package.json...",
            "[2025-01-14 10:33:25] Checking for known vulnerabilities...",
            "[2025-01-14 10:33:35] Dependency audit completed"
          ]
        },
        {
          "agent": "Infrastructure Security Agent",
          "status": "pass",
          "checks": [
            {
              "check": "File upload security",
              "status": "pass",
              "details": "File type restrictions and size limits configured"
            },
            {
              "check": "WAF/DDoS protection",
              "status": "warning",
              "details": "No explicit WAF configuration detected",
              "recommendation": "Consider using Cloudflare or similar WAF service for DDoS protection"
            }
          ],
          "logs": [
            "[2025-01-14 10:33:35] Analyzing infrastructure security...",
            "[2025-01-14 10:33:50] Checking file upload handlers...",
            "[2025-01-14 10:34:05] Reviewing deployment configuration...",
            "[2025-01-14 10:34:20] Infrastructure audit completed"
          ]
        },
        {
          "agent": "Data Security Agent",
          "status": "pass",
          "checks": [
            {
              "check": "Password hashing",
              "status": "pass",
              "details": "bcrypt with salt detected, no plaintext passwords"
            },
            {
              "check": "Encryption at rest",
              "status": "pass",
              "details": "Database encryption configured"
            }
          ],
          "logs": [
            "[2025-01-14 10:34:20] Checking data security...",
            "[2025-01-14 10:34:35] Analyzing password handling...",
            "[2025-01-14 10:34:50] Verifying encryption configuration...",
            "[2025-01-14 10:35:05] Data security audit completed"
          ]
        }
      ]
    }'::jsonb,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  (
    gen_random_uuid(),
    '<AUDIT_ID>',  -- Replace with Production Site audit ID
    'running',
    NULL,
    NULL,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes'
  ),
  (
    gen_random_uuid(),
    '<AUDIT_ID>',  -- Replace with Production Site audit ID
    'completed',
    '92%',
    '{
      "agents": [
        {
          "agent": "Browser Security Agent (DAST)",
          "status": "pass",
          "checks": [
            {
              "check": "HTTPS everywhere",
              "status": "pass",
              "details": "All requests use HTTPS"
            },
            {
              "check": "Security headers present",
              "status": "pass",
              "details": "All security headers properly configured"
            },
            {
              "check": "Cookie security",
              "status": "pass",
              "details": "All cookies have secure flags set"
            }
          ],
          "logs": [
            "[2025-01-13 10:30:00] Starting browser security audit...",
            "[2025-01-13 10:30:45] Audit completed successfully"
          ]
        }
      ]
    }'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  );

