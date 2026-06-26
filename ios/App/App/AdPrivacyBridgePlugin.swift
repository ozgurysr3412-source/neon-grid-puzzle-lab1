import Capacitor
import Foundation
import UnityAds

@objc(AdPrivacyBridgePlugin)
public class AdPrivacyBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AdPrivacyBridgePlugin"
    public let jsName = "AdPrivacyBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setUnityPrivacyConsent", returnType: CAPPluginReturnPromise)
    ]

    @objc func setUnityPrivacyConsent(_ call: CAPPluginCall) {
        let gdprConsent = call.getBool("gdprConsent") ?? false
        let privacyConsent = call.getBool("privacyConsent") ?? gdprConsent

        let gdprMetadata = UADSMetaData()
        gdprMetadata.set("gdpr.consent", value: gdprConsent)
        gdprMetadata.commit()

        let privacyMetadata = UADSMetaData()
        privacyMetadata.set("privacy.consent", value: privacyConsent)
        privacyMetadata.commit()

        call.resolve([
            "gdprConsent": gdprConsent,
            "privacyConsent": privacyConsent,
            "bridgeAvailable": true,
            "set": true
        ])
    }
}
