#!/bin/bash

BASE_URL="${API_URL:-http://localhost:8080}"
ENDPOINT="$BASE_URL/api/actors"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0

run_test() {
    local description="$1"
    local expected_status="$2"
    local payload="$3"

    response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$payload")

    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)

    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} [$status] $description"
        echo "       $body"
        ((pass++))
    else
        echo -e "${RED}FAIL${NC} [$status expected $expected_status] $description"
        echo "       $body"
        ((fail++))
    fi
    echo ""
}

echo -e "${YELLOW}Testing POST $ENDPOINT${NC}"
echo "────────────────────────────────────────────"
echo ""

# ── 201 Happy path ────────────────────────────────────────────────────────────

run_test "Valid actor (all fields)" 201 '{
    "name":         "Jane Smith",
    "email":        "jane.smith@example.com",
    "phone_number": "555-111-2222",
    "employee_id":  "100000001",
    "workday_name": "Smith, Jane",
    "time_code":    "1234-56",
    "pronouns":     "she/her",
    "age_range":    "30s",
    "notes":        "Available weekends",
    "lead_time_code":        "7890",
    "specialized_time_code": "1111"
}'

run_test "Valid actor (required fields only)" 201 '{
    "name":         "John Doe",
    "email":        "john.doe@example.com",
    "phone_number": "555-333-4444",
    "employee_id":  "100000002",
    "workday_name": "Doe, John",
    "time_code":    "9999-01"
}'

# ── 400 Missing required fields ───────────────────────────────────────────────

run_test "Missing name" 400 '{
    "email":        "no.name@example.com",
    "phone_number": "555-000-0001",
    "employee_id":  "100000003",
    "workday_name": "No Name",
    "time_code":    "1111-11"
}'

run_test "Missing email" 400 '{
    "name":         "No Email",
    "phone_number": "555-000-0002",
    "employee_id":  "100000004",
    "workday_name": "No Email",
    "time_code":    "2222-22"
}'

run_test "Missing phone_number" 400 '{
    "name":         "No Phone",
    "email":        "no.phone@example.com",
    "employee_id":  "100000005",
    "workday_name": "No Phone",
    "time_code":    "3333-33"
}'

run_test "Missing employee_id" 400 '{
    "name":         "No EmpID",
    "email":        "no.empid@example.com",
    "phone_number": "555-000-0003",
    "workday_name": "No EmpID",
    "time_code":    "4444-44"
}'

run_test "Missing time_code" 400 '{
    "name":         "No TimeCode",
    "email":        "no.timecode@example.com",
    "phone_number": "555-000-0004",
    "employee_id":  "100000006",
    "workday_name": "No TimeCode"
}'

run_test "Empty body" 400 '{}'

run_test "Malformed JSON" 400 'not json at all'

# ── 400 SQLite CHECK constraint violations ────────────────────────────────────

run_test "employee_id not 9 digits (too short)" 400 '{
    "name":         "Bad EmpID",
    "email":        "bad.empid@example.com",
    "phone_number": "555-000-0005",
    "employee_id":  "12345",
    "workday_name": "Bad EmpID",
    "time_code":    "5555-55"
}'

run_test "notes exceeds 100 characters" 400 '{
    "name":         "Long Notes",
    "email":        "long.notes@example.com",
    "phone_number": "555-000-0006",
    "employee_id":  "100000007",
    "workday_name": "Long Notes",
    "time_code":    "6666-66",
    "notes":        "This note is intentionally way too long and should be rejected by the database CHECK constraint that limits notes to 100 characters maximum."
}'

# ── 409 Uniqueness conflicts ──────────────────────────────────────────────────

run_test "Duplicate email (conflicts with test 1)" 409 '{
    "name":         "Duplicate Email",
    "email":        "jane.smith@example.com",
    "phone_number": "555-999-8888",
    "employee_id":  "100000008",
    "workday_name": "Duplicate Email",
    "time_code":    "7777-77"
}'

run_test "Duplicate employee_id (conflicts with test 1)" 409 '{
    "name":         "Duplicate EmpID",
    "email":        "unique.email@example.com",
    "phone_number": "555-999-7777",
    "employee_id":  "100000001",
    "workday_name": "Duplicate EmpID",
    "time_code":    "8888-88"
}'

# ── Summary ───────────────────────────────────────────────────────────────────

echo "────────────────────────────────────────────"
echo -e "Results: ${GREEN}$pass passed${NC}, ${RED}$fail failed${NC}"
echo ""
echo "Note: tests 1 & 2 insert real rows. Re-runs will get 409 conflicts on those"
echo "      unless you clear the database between runs."
