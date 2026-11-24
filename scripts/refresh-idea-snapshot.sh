#!/bin/bash

set +x
set -euo pipefail

readonly APP_PATH="${IDEA_SNAPSHOT_APP_PATH:-${HOME}/Applications/Loujc Availability Snapshot.app}"
readonly HELPER_PATH="${APP_PATH}/Contents/MacOS/loujc-availability-snapshot"
readonly SECRET_NAME="IDEA_BUSY_SNAPSHOT"
readonly GITHUB_REPOSITORY="loujc/loujc.github.io"

SCRIPT_DIR="$(/usr/bin/dirname "$0")"
REPOSITORY_ROOT="$(/usr/bin/git -C "${SCRIPT_DIR}/.." rev-parse --show-toplevel 2>/dev/null)"
CONFIG_PATH="${REPOSITORY_ROOT}/data/availability.json"
VALIDATOR_PATH="${REPOSITORY_ROOT}/scripts/idea-snapshot.mjs"

if [[ ! -x "${HELPER_PATH}" || ! -f "${CONFIG_PATH}" || ! -f "${VALIDATOR_PATH}" ]]; then
  /usr/bin/printf '%s\n' 'IDEA snapshot refresh is not installed or configured.' >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v gh >/dev/null 2>&1; then
  /usr/bin/printf '%s\n' 'IDEA snapshot refresh dependencies are unavailable.' >&2
  exit 1
fi

# Finish capture and validation before starting a Secret write. A single
# pipeline would start gh even if capture fails, potentially replacing the
# previous usable Secret with empty input. Keep the anonymous bitmap in memory.
SNAPSHOT="$(
  AVAILABILITY_CONFIG_PATH="${CONFIG_PATH}" "${HELPER_PATH}" \
    | /usr/bin/env node "${VALIDATOR_PATH}" --validate-stdin --config "${CONFIG_PATH}"
)"
/usr/bin/printf '%s' "${SNAPSHOT}" \
  | /usr/bin/env gh secret set "${SECRET_NAME}" --repo "${GITHUB_REPOSITORY}" >/dev/null
unset SNAPSHOT

/usr/bin/printf '%s\n' 'IDEA snapshot secret updated.' >&2
