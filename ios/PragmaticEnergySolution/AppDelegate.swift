import UIKit
import React_RCTAppDelegate
import ReactAppDependencyProvider
import React

/// Cold-start board colour (#0B0F14). Must match `splashPalette.bg` in JS,
/// LaunchScreen.storyboard, and Android `@color/splashBg`, so the native
/// launch screen -> RN root view -> JS splash handoff has no colour flash.
private let splashBg = UIColor(red: 11.0 / 255.0, green: 15.0 / 255.0, blue: 20.0 / 255.0, alpha: 1.0)

@main
class AppDelegate: RCTAppDelegate {
  override var moduleName: String! {
    get { "PragmaticEnergySolution" }
    set {}
  }

  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    self.dependencyProvider = RCTAppDependencyProvider()
    let didLaunch = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    // RCTAppDelegate creates the window inside super (loadReactNativeWindow).
    (self.window as UIWindow?)?.backgroundColor = splashBg
    return didLaunch
  }

  // RCTRootViewFactory sets systemBackgroundColor (white in light mode) and then
  // calls this hook; override it so the root view stays on the splash board colour.
  override func customize(_ rootView: RCTRootView!) {
    super.customize(rootView)
    rootView.backgroundColor = splashBg
  }

  override func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
    return Orientation.getOrientation()
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
