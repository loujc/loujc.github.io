#!/bin/bash

set +x
set -euo pipefail

readonly BUNDLE_IDENTIFIER="io.github.loujc.availability-snapshot"
readonly APP_NAME="Loujc Availability Snapshot.app"
readonly EXECUTABLE_NAME="loujc-availability-snapshot"
readonly INSTALL_PARENT="${IDEA_SNAPSHOT_INSTALL_PARENT:-${HOME}/Applications}"
readonly INSTALL_PATH="${INSTALL_PARENT}/${APP_NAME}"
readonly SIGNING_IDENTITY="${IDEA_SNAPSHOT_CODESIGN_IDENTITY:--}"

SCRIPT_DIR="$(/usr/bin/dirname "$0")"
REPOSITORY_ROOT="$(/usr/bin/git -C "${SCRIPT_DIR}/.." rev-parse --show-toplevel 2>/dev/null)"
SOURCE_PATH="${REPOSITORY_ROOT}/scripts/apple-calendar-snapshot.swift"

BUILD_ROOT="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/loujc-availability-helper.XXXXXX")"
STAGED_APP="${BUILD_ROOT}/${APP_NAME}"

cleanup() {
  case "${BUILD_ROOT}" in
    "${TMPDIR:-/tmp}"/loujc-availability-helper.*)
      if [[ -d "${BUILD_ROOT}" ]]; then
        /bin/rm -R "${BUILD_ROOT}"
      fi
      ;;
  esac
}
trap cleanup EXIT HUP INT TERM

/bin/mkdir -p "${STAGED_APP}/Contents/MacOS"
/usr/bin/plutil -create xml1 "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundleDevelopmentRegion -string en "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundleExecutable -string "${EXECUTABLE_NAME}" "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundleIdentifier -string "${BUNDLE_IDENTIFIER}" "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundleInfoDictionaryVersion -string 6.0 "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundleName -string "Loujc Availability Snapshot" "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundlePackageType -string APPL "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundleShortVersionString -string 1.0 "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert CFBundleVersion -string 1 "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert LSMinimumSystemVersion -string 13.0 "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert LSUIElement -bool true "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert NSCalendarsFullAccessUsageDescription -string \
  "Create a local anonymous occupied-time snapshot from one selected calendar." \
  "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert NSCalendarsUsageDescription -string \
  "Create a local anonymous occupied-time snapshot from one selected calendar." \
  "${STAGED_APP}/Contents/Info.plist"
/usr/bin/plutil -insert NSPrincipalClass -string NSApplication "${STAGED_APP}/Contents/Info.plist"

/usr/bin/xcrun --sdk macosx swiftc \
  -O \
  -parse-as-library \
  -framework AppKit \
  -framework EventKit \
  "${SOURCE_PATH}" \
  -o "${STAGED_APP}/Contents/MacOS/${EXECUTABLE_NAME}"

/bin/chmod 755 "${STAGED_APP}/Contents/MacOS/${EXECUTABLE_NAME}"
/usr/bin/codesign \
  --force \
  --sign "${SIGNING_IDENTITY}" \
  --identifier "${BUNDLE_IDENTIFIER}" \
  --timestamp=none \
  "${STAGED_APP}" >/dev/null 2>&1
/usr/bin/codesign --verify --deep --strict "${STAGED_APP}" >/dev/null 2>&1

/bin/mkdir -p "${INSTALL_PARENT}"
/usr/bin/ditto "${STAGED_APP}" "${INSTALL_PATH}"
/usr/bin/codesign --verify --deep --strict "${INSTALL_PATH}" >/dev/null 2>&1

/usr/bin/printf '%s\n' 'Availability snapshot helper installed.' >&2
