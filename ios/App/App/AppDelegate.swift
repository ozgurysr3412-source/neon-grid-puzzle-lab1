import UIKit
import Capacitor
import AppTrackingTransparency
import AVFoundation
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UIScrollViewDelegate {

    var window: UIWindow?
    private var trackingAuthorizationRequestScheduled = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("Audio session setup failed: \(error.localizedDescription)")
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            self.lockWebViewNativeGestures()
        }
        return true
    }

    private func lockWebViewNativeGestures() {
        guard let bridgeViewController = window?.rootViewController as? CAPBridgeViewController else {
            return
        }
        guard let webView = bridgeViewController.webView else {
            return
        }
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsLinkPreview = false

        let scrollView = webView.scrollView
        scrollView.delegate = self
        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 1.0
        scrollView.zoomScale = 1.0
        scrollView.bouncesZoom = false
        scrollView.pinchGestureRecognizer?.isEnabled = false
        scrollView.panGestureRecognizer.maximumNumberOfTouches = 1
        scrollView.delaysContentTouches = false
        scrollView.canCancelContentTouches = true

        (webView.gestureRecognizers ?? []).forEach(disableSelectionGesture)
        (scrollView.gestureRecognizers ?? []).forEach(disableSelectionGesture)
    }

    private func disableSelectionGesture(_ gesture: UIGestureRecognizer) {
        if gesture is UILongPressGestureRecognizer {
            gesture.isEnabled = false
        }
        if gesture is UIPinchGestureRecognizer {
            gesture.isEnabled = false
        }
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        return nil
    }

    private func requestTrackingAuthorizationOnFirstLaunch() {
        guard #available(iOS 14, *) else {
            return
        }
        guard !trackingAuthorizationRequestScheduled else {
            return
        }
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else {
            return
        }
        trackingAuthorizationRequestScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
            guard UIApplication.shared.applicationState == .active else {
                self.trackingAuthorizationRequestScheduled = false
                return
            }
            guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else {
                return
            }
            ATTrackingManager.requestTrackingAuthorization { status in
                print("ATT authorization status: \(status.rawValue)")
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        requestTrackingAuthorizationOnFirstLaunch()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.lockWebViewNativeGestures()
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
