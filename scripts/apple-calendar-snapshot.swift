import Darwin
import AppKit
import EventKit
import Foundation

private let snapshotSchemaVersion = 1
private let snapshotEncoding = "day-major-msb0-base64"
private let requiredCoverageDays = 400
private let maximumSnapshotBytes = 8 * 1024
private let maximumCalendarNameBytes = 1024
private let maximumCalendarNameUTF16CodeUnits = 256

private enum SnapshotFailure: Error {
    case invalidInput
    case accessDenied
    case calendarMismatch
    case iCloudSelection
    case invalidEvent
    case encodingFailed
}

private func safeFailureStage(_ error: Error) -> String {
    guard let failure = error as? SnapshotFailure else {
        return "internal"
    }
    switch failure {
    case .invalidInput:
        return "configuration"
    case .accessDenied:
        return "permission"
    case .calendarMismatch:
        return "calendar-selection"
    case .iCloudSelection:
        return "icloud-selection"
    case .invalidEvent:
        return "event-boundary"
    case .encodingFailed:
        return "encoding"
    }
}

private struct DisplayHoursConfig: Decodable {
    let start: String
    let end: String
}

private struct AvailabilityConfig: Decodable {
    let timezone: String
    let slotMinutes: Int
    let displayHours: DisplayHoursConfig
    let ideaSnapshotCoverageDays: Int
    let expectedCaldavCalendarCount: Int

    private enum CodingKeys: String, CodingKey {
        case timezone
        case slotMinutes = "slot_minutes"
        case displayHours = "display_hours"
        case ideaSnapshotCoverageDays = "idea_snapshot_coverage_days"
        case expectedCaldavCalendarCount = "expected_caldav_calendar_count"
    }
}

private struct SnapshotDisplayHours: Encodable {
    let start: String
    let end: String
}

private struct BusySnapshot: Encodable {
    let schemaVersion: Int
    let encoding: String
    let timezone: String
    let slotMinutes: Int
    let displayHours: SnapshotDisplayHours
    let coverageStart: String
    let coverageEnd: String
    let capturedAt: String
    let busyBits: String

    private enum CodingKeys: String, CodingKey {
        case schemaVersion = "schema_version"
        case encoding
        case timezone
        case slotMinutes = "slot_minutes"
        case displayHours = "display_hours"
        case coverageStart = "coverage_start"
        case coverageEnd = "coverage_end"
        case capturedAt = "captured_at"
        case busyBits = "busy_bits"
    }
}

private struct DayWindow {
    let displayStart: Date
    let displayEnd: Date
}

private func validatedCalendarName(
    _ rawValue: String,
    trimmingOuterWhitespace: Bool = true
) throws -> String {
    let trimmedValue = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
    let value = trimmingOuterWhitespace ? trimmedValue : rawValue
    guard !value.isEmpty,
          trimmingOuterWhitespace || value == trimmedValue,
          value.utf16.count <= maximumCalendarNameUTF16CodeUnits,
          value.lengthOfBytes(using: .utf8) <= maximumCalendarNameBytes,
          value.unicodeScalars.allSatisfy({
              $0.value > 0x1f && $0.value != 0x7f
          }) else {
        throw SnapshotFailure.invalidInput
    }
    return value.precomposedStringWithCanonicalMapping
}

private func privateCalendarName() throws -> String {
    let environment = ProcessInfo.processInfo.environment
    if let value = environment["IDEA_CALENDAR_NAME"], !value.isEmpty {
        return try validatedCalendarName(value)
    }

    let defaultPath = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library", isDirectory: true)
        .appendingPathComponent("Application Support", isDirectory: true)
        .appendingPathComponent("io.github.loujc.availability", isDirectory: true)
        .appendingPathComponent("idea-calendar-name", isDirectory: false)
        .path
    let path = environment["IDEA_CALENDAR_NAME_FILE"] ?? defaultPath

    var fileStatus = stat()
    guard lstat(path, &fileStatus) == 0,
          (fileStatus.st_mode & S_IFMT) == S_IFREG,
          fileStatus.st_uid == geteuid(),
          (fileStatus.st_mode & 0o077) == 0,
          fileStatus.st_size > 0,
          fileStatus.st_size <= maximumCalendarNameBytes + 2 else {
        throw SnapshotFailure.invalidInput
    }

    let data = try Data(contentsOf: URL(fileURLWithPath: path), options: [.mappedIfSafe])
    guard let value = String(data: data, encoding: .utf8) else {
        throw SnapshotFailure.invalidInput
    }
    return try validatedCalendarName(value)
}

private func availabilityConfig() throws -> AvailabilityConfig {
    guard let path = ProcessInfo.processInfo.environment["AVAILABILITY_CONFIG_PATH"],
          !path.isEmpty else {
        throw SnapshotFailure.invalidInput
    }
    let data = try Data(contentsOf: URL(fileURLWithPath: path), options: [.mappedIfSafe])
    return try JSONDecoder().decode(AvailabilityConfig.self, from: data)
}

private func currentICloudCalendarNames() async throws -> Data {
    let config = try availabilityConfig()
    guard config.expectedCaldavCalendarCount > 0,
          config.expectedCaldavCalendarCount <= 10 else {
        throw SnapshotFailure.invalidInput
    }

    let store = EKEventStore()
    guard await requestCalendarAccess(store) else {
        throw SnapshotFailure.accessDenied
    }
    let iCloudSources = store.sources.filter {
        ($0.sourceType == .calDAV || $0.sourceType == .mobileMe)
            && $0.title.compare(
                "iCloud",
                options: [.caseInsensitive, .diacriticInsensitive],
                range: nil,
                locale: Locale(identifier: "en_US_POSIX")
            ) == .orderedSame
    }
    guard iCloudSources.count == 1, let iCloudSource = iCloudSources.first else {
        throw SnapshotFailure.iCloudSelection
    }

    let names = try store.calendars(for: .event)
        .filter { $0.source?.sourceIdentifier == iCloudSource.sourceIdentifier }
        .map {
            try validatedCalendarName(
                $0.title,
                trimmingOuterWhitespace: false
            )
        }
    guard names.count == config.expectedCaldavCalendarCount,
          Set(names).count == names.count else {
        throw SnapshotFailure.iCloudSelection
    }
    return try JSONEncoder().encode(names)
}

private func clockMinutes(_ value: String) throws -> Int {
    let bytes = Array(value.utf8)
    guard bytes.count == 5,
          bytes[0] >= 48, bytes[0] <= 57,
          bytes[1] >= 48, bytes[1] <= 57,
          bytes[2] == 58,
          bytes[3] >= 48, bytes[3] <= 57,
          bytes[4] >= 48, bytes[4] <= 57 else {
        throw SnapshotFailure.invalidInput
    }
    let hour = Int(bytes[0] - 48) * 10 + Int(bytes[1] - 48)
    let minute = Int(bytes[3] - 48) * 10 + Int(bytes[4] - 48)
    guard hour <= 23, minute <= 59 else {
        throw SnapshotFailure.invalidInput
    }
    return hour * 60 + minute
}

private func utcTimestamp(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
    return formatter.string(from: date)
}

private func localDateString(_ date: Date, calendar: Calendar) throws -> String {
    let components = calendar.dateComponents([.year, .month, .day], from: date)
    guard let year = components.year, let month = components.month, let day = components.day else {
        throw SnapshotFailure.invalidInput
    }
    return String(format: "%04d-%02d-%02d", year, month, day)
}

private func localDate(
    for dayStart: Date,
    minutesAfterMidnight: Int,
    calendar: Calendar
) throws -> Date {
    let day = calendar.dateComponents([.year, .month, .day], from: dayStart)
    var components = DateComponents()
    components.calendar = calendar
    components.timeZone = calendar.timeZone
    components.year = day.year
    components.month = day.month
    components.day = day.day
    components.hour = minutesAfterMidnight / 60
    components.minute = minutesAfterMidnight % 60
    components.second = 0
    guard let date = calendar.date(from: components) else {
        throw SnapshotFailure.invalidInput
    }

    let roundTrip = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
    guard roundTrip.year == components.year,
          roundTrip.month == components.month,
          roundTrip.day == components.day,
          roundTrip.hour == components.hour,
          roundTrip.minute == components.minute,
          roundTrip.second == 0 else {
        throw SnapshotFailure.invalidInput
    }
    return date
}

private func buildDayWindows(
    coverageStart: Date,
    coverageDays: Int,
    displayStartMinutes: Int,
    displayEndMinutes: Int,
    calendar: Calendar
) throws -> [DayWindow] {
    let expectedDuration = TimeInterval((displayEndMinutes - displayStartMinutes) * 60)
    var windows: [DayWindow] = []
    windows.reserveCapacity(coverageDays)

    for dayIndex in 0..<coverageDays {
        guard let dayStart = calendar.date(byAdding: .day, value: dayIndex, to: coverageStart) else {
            throw SnapshotFailure.invalidInput
        }
        let displayStart = try localDate(
            for: dayStart,
            minutesAfterMidnight: displayStartMinutes,
            calendar: calendar
        )
        let displayEnd = try localDate(
            for: dayStart,
            minutesAfterMidnight: displayEndMinutes,
            calendar: calendar
        )
        guard displayEnd > displayStart,
              displayEnd.timeIntervalSince(displayStart) == expectedDuration else {
            // A fixed wall-clock bitset is ambiguous across an offset transition.
            throw SnapshotFailure.invalidInput
        }
        windows.append(DayWindow(displayStart: displayStart, displayEnd: displayEnd))
    }
    return windows
}

private func requestCalendarAccess(_ store: EKEventStore) async -> Bool {
    if #available(macOS 14.0, *) {
        if EKEventStore.authorizationStatus(for: .event) == .fullAccess {
            return true
        }
        return await withCheckedContinuation { continuation in
            store.requestFullAccessToEvents { granted, _ in
                continuation.resume(returning: granted)
            }
        }
    }

    if EKEventStore.authorizationStatus(for: .event) == .authorized {
        return true
    }
    return await withCheckedContinuation { continuation in
        store.requestAccess(to: .event) { granted, _ in
            continuation.resume(returning: granted)
        }
    }
}

private func setBusyBit(_ bitIndex: Int, in bytes: inout [UInt8]) throws {
    guard bitIndex >= 0, bitIndex < bytes.count * 8 else {
        throw SnapshotFailure.encodingFailed
    }
    bytes[bitIndex / 8] |= UInt8(1 << (7 - (bitIndex % 8)))
}

private func captureSnapshot() async throws -> Data {
    let config = try availabilityConfig()
    guard config.ideaSnapshotCoverageDays == requiredCoverageDays,
          config.slotMinutes > 0,
          60 % config.slotMinutes == 0,
          let timeZone = TimeZone(identifier: config.timezone),
          timeZone.identifier == config.timezone else {
        throw SnapshotFailure.invalidInput
    }

    let displayStartMinutes = try clockMinutes(config.displayHours.start)
    let displayEndMinutes = try clockMinutes(config.displayHours.end)
    let displayDurationMinutes = displayEndMinutes - displayStartMinutes
    guard displayDurationMinutes > 0,
          displayDurationMinutes % config.slotMinutes == 0 else {
        throw SnapshotFailure.invalidInput
    }
    let slotsPerDay = displayDurationMinutes / config.slotMinutes
    let totalBits = try Math.multiplyExact(requiredCoverageDays, slotsPerDay)
    var busyBytes = [UInt8](repeating: 0, count: (totalBits + 7) / 8)

    var calendar = Calendar(identifier: .gregorian)
    calendar.locale = Locale(identifier: "en_US_POSIX")
    calendar.timeZone = timeZone

    let capturedDate = Date(timeIntervalSince1970: floor(Date().timeIntervalSince1970))
    let coverageStart = calendar.startOfDay(for: capturedDate)
    guard let coverageEnd = calendar.date(
        byAdding: .day,
        value: requiredCoverageDays,
        to: coverageStart
    ) else {
        throw SnapshotFailure.invalidInput
    }
    let dayWindows = try buildDayWindows(
        coverageStart: coverageStart,
        coverageDays: requiredCoverageDays,
        displayStartMinutes: displayStartMinutes,
        displayEndMinutes: displayEndMinutes,
        calendar: calendar
    )

    let store = EKEventStore()
    guard await requestCalendarAccess(store) else {
        throw SnapshotFailure.accessDenied
    }
    let calendarName = try privateCalendarName()
    let matchingCalendars = store.calendars(for: .event).filter {
        $0.type == .calDAV
            && $0.title.precomposedStringWithCanonicalMapping == calendarName
    }
    guard matchingCalendars.count == 1, let targetCalendar = matchingCalendars.first else {
        throw SnapshotFailure.calendarMismatch
    }

    let predicate = store.predicateForEvents(
        withStart: coverageStart,
        end: coverageEnd,
        calendars: [targetCalendar]
    )
    let events = store.events(matching: predicate)
    let slotDuration = TimeInterval(config.slotMinutes * 60)

    for event in events {
        let status = event.status
        let availability = event.availability
        if status == .canceled || availability == .free {
            continue
        }
        guard let eventStart = event.startDate,
              let eventEnd = event.endDate,
              eventEnd > eventStart else {
            throw SnapshotFailure.invalidEvent
        }
        if eventEnd <= coverageStart || eventStart >= coverageEnd {
            continue
        }

        for (dayIndex, dayWindow) in dayWindows.enumerated() {
            if eventStart >= dayWindow.displayEnd || eventEnd <= dayWindow.displayStart {
                continue
            }
            let clippedStart = max(eventStart, dayWindow.displayStart)
            let clippedEnd = min(eventEnd, dayWindow.displayEnd)
            let firstSlot = max(
                0,
                Int(floor(clippedStart.timeIntervalSince(dayWindow.displayStart) / slotDuration))
            )
            let lastSlotExclusive = min(
                slotsPerDay,
                Int(ceil(clippedEnd.timeIntervalSince(dayWindow.displayStart) / slotDuration))
            )
            guard firstSlot < lastSlotExclusive else {
                throw SnapshotFailure.invalidEvent
            }
            for slotIndex in firstSlot..<lastSlotExclusive {
                try setBusyBit(dayIndex * slotsPerDay + slotIndex, in: &busyBytes)
            }
        }
    }

    if totalBits % 8 != 0, let lastByte = busyBytes.last {
        let unusedBits = 8 - (totalBits % 8)
        let unusedMask = UInt8((1 << unusedBits) - 1)
        guard (lastByte & unusedMask) == 0 else {
            throw SnapshotFailure.encodingFailed
        }
    }

    let payload = BusySnapshot(
        schemaVersion: snapshotSchemaVersion,
        encoding: snapshotEncoding,
        timezone: config.timezone,
        slotMinutes: config.slotMinutes,
        displayHours: SnapshotDisplayHours(
            start: config.displayHours.start,
            end: config.displayHours.end
        ),
        coverageStart: try localDateString(coverageStart, calendar: calendar),
        coverageEnd: try localDateString(coverageEnd, calendar: calendar),
        capturedAt: utcTimestamp(capturedDate),
        busyBits: Data(busyBytes).base64EncodedString()
    )
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.withoutEscapingSlashes]
    let data = try encoder.encode(payload)
    guard data.count <= maximumSnapshotBytes else {
        throw SnapshotFailure.encodingFailed
    }
    return data
}

private enum Math {
    static func multiplyExact(_ left: Int, _ right: Int) throws -> Int {
        let result = left.multipliedReportingOverflow(by: right)
        guard !result.overflow, result.partialValue > 0 else {
            throw SnapshotFailure.invalidInput
        }
        return result.partialValue
    }
}

@main
private struct AppleCalendarSnapshot {
    static func main() async {
        do {
            _ = NSApplication.shared
            NSApplication.shared.setActivationPolicy(.accessory)
            NSApplication.shared.activate(ignoringOtherApps: true)
            if CommandLine.arguments.count == 2,
               CommandLine.arguments[1] == "--authorize-only" {
                let store = EKEventStore()
                guard await requestCalendarAccess(store) else {
                    throw SnapshotFailure.accessDenied
                }
                return
            }
            if CommandLine.arguments.count == 2,
               CommandLine.arguments[1] == "--export-icloud-calendar-names" {
                let data = try await currentICloudCalendarNames()
                FileHandle.standardOutput.write(data)
                return
            }
            guard CommandLine.arguments.count == 1 else {
                throw SnapshotFailure.invalidInput
            }
            let data = try await captureSnapshot()
            FileHandle.standardOutput.write(data)
        } catch {
            fputs("IDEA snapshot export failed at \(safeFailureStage(error)).\n", stderr)
            exit(EXIT_FAILURE)
        }
    }
}
