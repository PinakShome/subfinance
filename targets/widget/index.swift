import WidgetKit
import SwiftUI

private let appGroup = "group.com.subfinance.app"
private let accent = Color(red: 0.545, green: 0.361, blue: 0.965) // #8b5cf6

// Values the app writes into the shared app group (see src/lib/widget.ts).
struct Summary {
  var monthlyTotal: String
  var nextName: String
  var nextWhen: String

  static func load() -> Summary {
    let d = UserDefaults(suiteName: appGroup)
    return Summary(
      monthlyTotal: d?.string(forKey: "monthlyTotal") ?? "—",
      nextName: d?.string(forKey: "nextName") ?? "No upcoming renewals",
      nextWhen: d?.string(forKey: "nextWhen") ?? ""
    )
  }

  static let placeholder = Summary(monthlyTotal: "$155", nextName: "Netflix", nextWhen: "in 3d")
}

struct SummaryEntry: TimelineEntry {
  let date: Date
  let summary: Summary
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SummaryEntry {
    SummaryEntry(date: Date(), summary: .placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (SummaryEntry) -> Void) {
    completion(SummaryEntry(date: Date(), summary: context.isPreview ? .placeholder : .load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SummaryEntry>) -> Void) {
    let entry = SummaryEntry(date: Date(), summary: .load())
    // The app reloads the timeline whenever its data changes; this is just a
    // periodic safety refresh so "in Nd" stays roughly current.
    let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date().addingTimeInterval(21600)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct SubFinanceWidgetEntryView: View {
  var entry: SummaryEntry
  @Environment(\.widgetFamily) var family

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("MONTHLY")
        .font(.system(size: 10, weight: .heavy))
        .tracking(1.5)
        .foregroundColor(.secondary)
      Text(entry.summary.monthlyTotal)
        .font(.system(size: family == .systemSmall ? 26 : 32, weight: .black))
        .foregroundColor(.primary)
        .minimumScaleFactor(0.6)
        .lineLimit(1)

      Spacer(minLength: 6)

      Text("NEXT RENEWAL")
        .font(.system(size: 9, weight: .heavy))
        .tracking(1.2)
        .foregroundColor(.secondary)
      HStack(spacing: 6) {
        Text(entry.summary.nextName)
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.primary)
          .lineLimit(1)
        Spacer(minLength: 2)
        if !entry.summary.nextWhen.isEmpty {
          Text(entry.summary.nextWhen)
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(accent)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

@main
struct SubFinanceWidget: Widget {
  let kind = "SubFinanceWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        SubFinanceWidgetEntryView(entry: entry)
          .padding(14)
          .containerBackground(.fill.tertiary, for: .widget)
      } else {
        SubFinanceWidgetEntryView(entry: entry)
          .padding(14)
      }
    }
    .configurationDisplayName("SubFinance")
    .description("Your monthly total and next renewal, at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
