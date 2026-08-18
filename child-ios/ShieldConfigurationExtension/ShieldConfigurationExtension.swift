import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Customises the system shield shown over apps/websites restricted by the parent.
final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    private let defaults = AppGroup.defaults

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        make(title: application.localizedDisplayName)
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        make(title: application.localizedDisplayName)
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        make(title: webDomain.domain)
    }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        make(title: webDomain.domain)
    }

    // MARK: -

    private func make(title: String?) -> ShieldConfiguration {
        let reason = ShieldCopy.reason(
            paused: defaults.bool(forKey: SharedKeys.devicePaused),
            scheduleActive: defaults.string(forKey: SharedKeys.activeScheduleName) != nil,
            limitReached: defaults.bool(forKey: SharedKeys.dailyLimitReached)
        )
        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: UIColor(red: 0.01, green: 0.24, blue: 0.41, alpha: 1), // #023c69 brand navy
            icon: UIImage(named: "LogoMark"),
            title: ShieldConfiguration.Label(text: reason.title, color: .white),
            subtitle: ShieldConfiguration.Label(text: reason.subtitle(for: title), color: UIColor.white.withAlphaComponent(0.85)),
            primaryButtonLabel: ShieldConfiguration.Label(text: ShieldCopy.close, color: UIColor(red: 0.01, green: 0.24, blue: 0.41, alpha: 1)),
            primaryButtonBackgroundColor: .white,
            secondaryButtonLabel: ShieldConfiguration.Label(text: ShieldCopy.askParent, color: .white)
        )
    }
}

/// Bilingual copy (EN / MN) — picks by the device's preferred language.
/// Real localisation via String Catalogs comes with Phase 2 (2D).
enum ShieldCopy {
    private static var mn: Bool { Locale.preferredLanguages.first?.hasPrefix("mn") == true }

    static var close: String { mn ? "Хаах" : "Close" }
    static var askParent: String { mn ? "Эцэг эхээс асуух" : "Ask parent" }

    struct Reason {
        let title: String
        let subtitleEN: String
        let subtitleMN: String
        func subtitle(for name: String?) -> String {
            let n = name ?? ""
            return (ShieldCopy.mn ? subtitleMN : subtitleEN).replacingOccurrences(of: "%@", with: n)
        }
    }

    static func reason(paused: Bool, scheduleActive: Bool, limitReached: Bool) -> Reason {
        if paused {
            return Reason(title: mn ? "Түр зогсоосон" : "Device paused",
                          subtitleEN: "Your parent has paused this device for now.",
                          subtitleMN: "Эцэг эх чинь төхөөрөмжийг түр зогсоосон байна.")
        }
        if scheduleActive {
            return Reason(title: mn ? "Амралтын цаг" : "Not right now",
                          subtitleEN: "%@ is unavailable during this time.",
                          subtitleMN: "%@ энэ цагт ашиглах боломжгүй.")
        }
        if limitReached {
            return Reason(title: mn ? "Өнөөдрийн хугацаа дууслаа" : "Daily limit reached",
                          subtitleEN: "You've used today's screen time. See you tomorrow!",
                          subtitleMN: "Өнөөдрийн дэлгэцийн цаг дууслаа. Маргааш уулзъя!")
        }
        return Reason(title: mn ? "Хязгаарлагдсан" : "Blocked by Prime Kids",
                      subtitleEN: "%@ is blocked by your parent.",
                      subtitleMN: "%@-г эцэг эх чинь хаасан байна.")
    }
}
