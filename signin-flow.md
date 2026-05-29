# Sign-in API Flow (for Mobile)

Base URL: `https://da2xkphekuara.cloudfront.net/`

Cognito (Singapore / `ap-southeast-1`):
- User Pool ID: `ap-southeast-1_HvF8AdDd1`
- App Client ID: `20gm9ltjrjv5opft5ca8pcb6gr`
- Identity Pool ID: `ap-southeast-1:3e0c5cdc-877a-4db7-9a77-8f85c668acff`

---

## Step 1 — Before sign-in (login screen load)

Public endpoints. **No Authorization header.** Call in parallel.

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | GET | `public/config/params-mapping` | Parameter metadata |
| 2 | GET | `public/config/report-mapping` | Report config |
| 3 | GET | `public/config/alarms` | Alarm code mapping |

Cache the responses locally; they drive labels/mappings across the app.

---

## Step 2 — Sign-in (Cognito, not REST)

Use AWS Cognito User Pool auth (USER_SRP_AUTH or USER_PASSWORD_AUTH). No REST call for the login itself.

1. `InitiateAuth` with username + password
2. Handle challenges:
   - `NEW_PASSWORD_REQUIRED` → prompt user, then `RespondToAuthChallenge`
3. On success, get tokens: **idToken**, accessToken, refreshToken
4. (Optional) Call Cognito `ConfirmDevice` / remember device if "Remember me" is checked

From this point, every private API call must send:
```
Authorization: Bearer <idToken>
Content-Type: application/json
```

---

## Step 3 — Just after sign-in (bootstrap)

Authenticated. Call 1 and 2 in **parallel**, then call 3 with the `identityId` from Cognito Identity Pool.

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | GET | `private/user/site-list` | Sites this user can access |
| 2 | GET | `private/config/client` | Client-level config (calendar, parameters, branding) |
| 3 | GET | `security/attach-iot-policy?identityId=<cognitoIdentityId>` | Attaches IoT policy so MQTT subscriptions work |

Persist `site-list` and `client` config locally — they're referenced throughout the app.

`identityId` comes from exchanging the Cognito User Pool idToken at the Identity Pool
(`GetId` + `GetCredentialsForIdentity`). The mobile Amplify/Cognito SDK exposes it directly.

---

## Step 4 — MQTT subscription (optional, for live updates)

After `attach-iot-policy` succeeds, open an MQTT-over-WSS connection to AWS IoT using
SigV4-signed Cognito credentials:

```
wss://a1wxyzja5wktis-ats.iot.ap-southeast-1.amazonaws.com/mqtt
```

Subscribe to topic: `user/<clientId>`  
(`clientId` comes from the idToken claim `custom:clientId`.)

Used to receive live site-logo / config updates pushed from the backend.

---

## Full sequence at a glance

```
[Login screen load]
  GET  public/config/params-mapping     (parallel)
  GET  public/config/report-mapping
  GET  public/config/alarms

[User taps Sign in]
  Cognito InitiateAuth  → idToken

[Bootstrap after login]
  GET  private/user/site-list            (parallel, Bearer idToken)
  GET  private/config/client
  GET  security/attach-iot-policy?identityId=...

[Live updates]
  MQTT  subscribe  user/<clientId>
```

---

## Useful idToken claims

Read from the Cognito idToken payload:

- `custom:clientId` — used for MQTT topic and tenant scoping
- `custom:userName` — display name
- `custom:isClientAdmin` — `"True"` / `"False"`
- `custom:isCustomerAdmin` — `"True"` / `"False"`
