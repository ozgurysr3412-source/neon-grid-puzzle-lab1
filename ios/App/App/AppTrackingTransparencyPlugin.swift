import AdSupport
import AppTrackingTransparency
import Capacitor
import Foundation

@objc(AppTrackingTransparencyPlugin)
public class AppTrackingTransparencyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppTrackingTransparencyPlugin"
    public let jsName = "AppTrackingTransparency"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise)
    ]

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve(["status": trackingStatusString()])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        if #available(iOS 14, *) {
            DispatchQueue.main.async {
                ATTrackingManager.requestTrackingAuthorization { status in
                    call.resolve(["status": self.trackingStatusString(status)])
                }
            }
        } else {
            call.resolve(["status": "authorized"])
        }
    }

    private func trackingStatusString() -> String {
        if #available(iOS 14, *) {
            return trackingStatusString(ATTrackingManager.trackingAuthorizationStatus)
        }
        return "authorized"
    }

    @available(iOS 14, *)
    private func trackingStatusString(_ status: ATTrackingManager.AuthorizationStatus) -> String {
        switch status {
        case .authorized:
            return "authorized"
        case .denied:
            return "denied"
        case .restricted:
            return "restricted"
        case .notDetermined:
            return "notDetermined"
        @unknown default:
            return "unknown"
        }
    }
}
