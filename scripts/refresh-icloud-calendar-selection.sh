#!/bin/bash

set +x
set -euo pipefail

readonly APP_PATH="${IDEA_SNAPSHOT_APP_PATH:-${HOME}/Applications/Loujc Availability Snapshot.app}"
readonly HELPER_PATH="${APP_PATH}/Contents/MacOS/loujc-availability-snapshot"
readonly SECRET_NAME="ICLOUD_CALDAV_CALENDAR_NAMES_JSON"
readonly GITHUB_REPOSITORY="loujc/loujc.github.io"

SCRIPT_DIR="$(/usr/bin/dirname "$0")"
REPOSITORY_ROOT="$(/usr/bin/git -C "${SCRIPT_DIR}/.." rev-parse --show-toplevel 2>/dev/null)"
CONFIG_PATH="${REPOSITORY_ROOT}/data/availability.json"

if [[ ! -x "${HELPER_PATH}" || ! -f "${CONFIG_PATH}" ]]; then
  /usr/bin/printf '%s\n' 'iCloud calendar selection helper is not installed or configured.' >&2
  exit 1
fi
if ! command -v gh >/dev/null 2>&1; then
  /usr/bin/printf '%s\n' 'iCloud calendar selection dependency is unavailable.' >&2
  exit 1
fi

if ! CALENDAR_NAMES_JSON="$(
  AVAILABILITY_CONFIG_PATH="${CONFIG_PATH}" "${HELPER_PATH}" \
    --export-icloud-calendar-names
)"; then
  /usr/bin/printf '%s\n' 'iCloud calendar selection could not be refreshed safely.' >&2
  exit 1
fi
if [[ -z "${CALENDAR_NAMES_JSON}" ]]; then
  /usr/bin/printf '%s\n' 'iCloud calendar selection could not be refreshed safely.' >&2
  exit 1
fi

/usr/bin/printf '%s' "${CALENDAR_NAMES_JSON}" \
  | /usr/bin/env gh secret set "${SECRET_NAME}" --repo "${GITHUB_REPOSITORY}" >/dev/null
unset CALENDAR_NAMES_JSON

/usr/bin/printf '%s\n' 'iCloud calendar selection secret updated.' >&2
