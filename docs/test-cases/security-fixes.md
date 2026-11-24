# Test cases: security fixes

| ID | Case | Expected | Where |
|---|---|---|---|
| TC-SF-1 | Volunteer and admin call `/v1/%61dmin/overview`, `/v1/adm%69n/parties`, fully encoded `/v1/%61%64%6d%69%6e/customers`, `/v1/admin/%6fverview`; POST `/v1/%61dmin/parties` | 403 each; super-admin gets 200 | backend-v2/test/96b-security.test.ts |
| TC-SF-2 | No token: `/health`, `/v1/auth/otp/request`, `/files/nope.png`, `/v1/%61dmin/overview`, `/v1/me` | 200, 200, 404, 401, 401 | backend-v2/test/96b-security.test.ts |
| TC-SF-3 | A volunteer searches polling-day find 31 times in a minute | first 30 → 200, 31st → 429 `find_rate` | backend-v2/test/96b-security.test.ts |
| TC-SF-4 | Map HTML | all 4 https scripts/stylesheets carry sha384 `integrity` and `crossorigin="anonymous"`; map still loads | src/features/map/mapHtml.test.ts + local admin map |
