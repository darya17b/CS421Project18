  #!/bin/bash

  BASE_URL="${API_URL:-http://localhost:8080}"
  ENDPOINT="$BASE_URL/api/actors"

  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'

  pass=0
  fail=0

  run_test() {
      local description="$1"
      local expected_status="$2"
      local url="$3"
      local expected_count="$4"  # optional: expected number of results

      response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
          -H "Content-Type: application/json")

      body=$(echo "$response" | head -n -1)
      status=$(echo "$response" | tail -n 1)

      if [ "$status" -eq "$expected_status" ]; then
          # Count results if body is a JSON array
          count=$(echo "$body" | grep -o '"id"' | wc -l | tr -d ' ')
          status_msg="${GREEN}PASS${NC} [$status] $description — $count result(s)"

          if [ -n "$expected_count" ] && [ "$count" -ne "$expected_count" ]; then
              status_msg="${RED}FAIL${NC} [$status] $description — got $count result(s), expected $expected_count"
              ((fail++))
          else
              ((pass++))
          fi
          echo -e "$status_msg"
          # Pretty-print names found
          names=$(echo "$body" | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//')
          if [ -n "$names" ]; then
              echo "       Found: $names"
          fi
      else
          echo -e "${RED}FAIL${NC} [$status expected $expected_status] $description"
          echo "       $body"
          ((fail++))
      fi
      echo ""
  }

  echo -e "${YELLOW}Testing GET $ENDPOINT${NC}"
  echo -e "${CYAN}Note: these tests assume test_post_actors.sh has been run first${NC}"
  echo "────────────────────────────────────────────"
  echo ""

  # ── No filters (all actors) ───────────────────────────────────────────────────

  run_test "Get all actors (no filters)" 200 \
      "$ENDPOINT" \
      2   # Jane Smith + John Doe inserted by post script

  # ── Name filter ───────────────────────────────────────────────────────────────

  run_test "Search name: 'jane' (partial, lowercase)" 200 \
      "$ENDPOINT?name=jane" \
      1

  run_test "Search name: 'SMITH' (partial, uppercase)" 200 \
      "$ENDPOINT?name=SMITH" \
      1

  run_test "Search name: 'doe' (partial match)" 200 \
      "$ENDPOINT?name=doe" \
      1

  run_test "Search name: 'o' (matches both John Doe and John)" 200 \
      "$ENDPOINT?name=o"

  run_test "Search name: 'zzznomatch' (no results expected)" 200 \
      "$ENDPOINT?name=zzznomatch" \
      0

  # ── Pronouns filter ───────────────────────────────────────────────────────────

  run_test "Filter pronouns: 'she/her' (exact match)" 200 \
      "$ENDPOINT?pronouns=she%2Fher" \
      1

  run_test "Filter pronouns: 'SHE/HER' (case-insensitive)" 200 \
      "$ENDPOINT?pronouns=SHE%2FHER" \
      1

  run_test "Filter pronouns: 'they/them' (no results expected)" 200 \
      "$ENDPOINT?pronouns=they%2Fthem" \
      0

  # ── Age range filter ──────────────────────────────────────────────────────────

  run_test "Filter age_range: '30s' (exact match)" 200 \
      "$ENDPOINT?age_range=30s" \
      1

  run_test "Filter age_range: '20s' (no results expected)" 200 \
      "$ENDPOINT?age_range=20s" \
      0

  # ── Combined filters (AND) ────────────────────────────────────────────────────

  run_test "name='jane' AND pronouns='she/her'" 200 \
      "$ENDPOINT?name=jane&pronouns=she%2Fher" \
      1

  run_test "name='jane' AND age_range='30s'" 200 \
      "$ENDPOINT?name=jane&age_range=30s" \
      1

  run_test "name='jane' AND age_range='20s' (mismatched — no results)" 200 \
      "$ENDPOINT?name=jane&age_range=20s" \
      0

  run_test "name='smith' AND pronouns='she/her' AND age_range='30s'" 200 \
      "$ENDPOINT?name=smith&pronouns=she%2Fher&age_range=30s" \
      1

  # ── Get by ID ─────────────────────────────────────────────────────────────────

  run_test "Get actor by ID 1" 200 \
      "$ENDPOINT/1"

  run_test "Get actor by ID that does not exist" 404 \
      "$ENDPOINT/999999"

  run_test "Get actor by invalid ID (string)" 400 \
      "$ENDPOINT/notanid"

  # ── Summary ───────────────────────────────────────────────────────────────────

  echo "────────────────────────────────────────────"
  echo -e "Results: ${GREEN}$pass passed${NC}, ${RED}$fail failed${NC}"
  echo ""
  echo "Tip: if result counts are off, your DB may have extra rows from previous"
  echo "     runs. Clear it and re-run test_post_actors.sh first for clean counts."
