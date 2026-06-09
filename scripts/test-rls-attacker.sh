#!/usr/bin/env bash
# ============================================================
# BeniFonla — RLS attacker scenarios via PostgREST
# Exercises the live Data API as `anon` (no auth) and asserts
# every sensitive write/read is rejected.
#
# Usage:
#   ./scripts/test-rls-attacker.sh
#
# Requires only the publishable/anon key (already in .env).
# ============================================================
set -euo pipefail

source .env
SUPA="${SUPABASE_URL}"
KEY="${SUPABASE_PUBLISHABLE_KEY}"
H=( -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" )

PASS=0
FAIL=0

expect_empty() {
  local label="$1" url="$2"
  local body
  body=$(curl -s "${H[@]}" "$SUPA/rest/v1/$url")
  if [[ "$body" == "[]" ]]; then
    echo "  ok  $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label → $body"
    FAIL=$((FAIL+1))
  fi
}

expect_denied() {
  local label="$1" method="$2" url="$3" payload="$4"
  local body code
  body=$(curl -s -X "$method" "${H[@]}" -d "$payload" "$SUPA/rest/v1/$url")
  code=$(echo "$body" | grep -oE '"code":"[0-9]+"' | head -1 || true)
  if [[ "$code" == '"code":"42501"' ]]; then
    echo "  ok  $label (RLS rejected)"
    PASS=$((PASS+1))
  elif echo "$body" | grep -q 'permission denied'; then
    echo "  ok  $label (permission denied)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label → $body"
    FAIL=$((FAIL+1))
  fi
}

expect_ok_rpc() {
  local label="$1" rpc="$2" payload="$3"
  local body
  body=$(curl -s -X POST "${H[@]}" -d "$payload" "$SUPA/rest/v1/rpc/$rpc")
  if [[ "$body" == "true" || "$body" == "false" ]]; then
    echo "  ok  $label → $body"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label → $body"
    FAIL=$((FAIL+1))
  fi
}

echo "=== RLS-ANON-READ: sensitive tables return [] ==="
expect_empty "audit_logs"               "audit_logs?select=id&limit=1"
expect_empty "payment_transactions"     "payment_transactions?select=id&limit=1"
expect_empty "refunds"                  "refunds?select=id&limit=1"
expect_empty "payouts"                  "payouts?select=id&limit=1"
expect_empty "platform_fees"            "platform_fees?select=id&limit=1"
expect_empty "financial_ledger_entries" "financial_ledger_entries?select=id&limit=1"
expect_empty "webhook_events"           "webhook_events?select=id&limit=1"
expect_empty "idempotency_keys"         "idempotency_keys?select=id&limit=1"
expect_empty "notifications"            "notifications?select=id&limit=1"
expect_empty "contributions (raw)"      "contributions?select=id&limit=1"
expect_empty "campaign_reviews"         "campaign_reviews?select=id&limit=1"
expect_empty "user_roles"               "user_roles?select=user_id&limit=1"
expect_empty "profiles (raw, only is_public via view)" "profiles?select=id&limit=1"
expect_empty "campaigns (none live in fixtures)"        "campaigns?select=id&limit=1"

echo ""
echo "=== RLS-ANON-WRITE: insert attempts rejected ==="
expect_denied "user_roles self-admin"   POST "user_roles"   '{"user_id":"11111111-1111-1111-1111-111111111111","role":"admin"}'
expect_denied "notifications spam"      POST "notifications" '{"user_id":"11111111-1111-1111-1111-111111111111","type":"x","title":"x","body":"x"}'
expect_denied "payment_transactions"    POST "payment_transactions" '{"contribution_id":"11111111-1111-1111-1111-111111111111","provider":"fake","amount_minor":100,"currency":"TRY","status":"pending","environment":"sandbox"}'
expect_denied "ledger entry"            POST "financial_ledger_entries" '{"entry_type":"charge","amount_minor":100,"currency":"TRY","environment":"sandbox"}'
expect_denied "audit_logs"              POST "audit_logs" '{"action":"hack","entity_type":"campaign","entity_id":"11111111-1111-1111-1111-111111111111"}'
expect_denied "favorites for other user" POST "favorites" '{"user_id":"11111111-1111-1111-1111-111111111111","campaign_id":"11111111-1111-1111-1111-111111111111"}'

echo ""
echo "=== RLS-RPC-GRANTS: forbidden RPCs rejected ==="
expect_denied "is_admin RPC"            POST "rpc/is_admin" '{}'
expect_denied "claim_username RPC"      POST "rpc/claim_username" '{"_username":"hacker"}'
expect_denied "my_contributions RPC"    POST "rpc/my_contributions" '{}'

echo ""
echo "=== RLS-RPC-ALLOWED: public RPCs work ==="
expect_ok_rpc "check_username_available" "check_username_available" '{"_username":"someuser"}'

echo ""
echo "=== SUMMARY ==="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
[[ $FAIL -eq 0 ]] || exit 1
