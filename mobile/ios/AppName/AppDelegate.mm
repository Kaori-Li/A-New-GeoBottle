#import <UIKit/UIKit.h> // 引入 iOS UIKit。
#import <React/RCTBridge.h> // 引入 RN Bridge。
#import <React/RCTBundleURLProvider.h> // 引入 JS Bundle URL 提供器。
#import <React/RCTRootView.h> // 引入 RN RootView。

/**
 * AppDelegate：iOS 应用入口。
 */
@interface AppDelegate : UIResponder <UIApplicationDelegate> // 声明 AppDelegate 接口。
@property (nonatomic, strong) UIWindow *window; // 声明窗口属性。
@end

@implementation AppDelegate // 实现 AppDelegate。

// 应用启动回调。
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // 选择 JS Bundle 地址：开发环境走 Metro，发布环境走内置 bundle。
  NSURL *jsCodeLocation;
#if DEBUG
  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  jsCodeLocation = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif

  // 创建 RN RootView，注册组件名需与 index.js 保持一致。
  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"GeoBottle"
                                               initialProperties:nil
                                                   launchOptions:launchOptions];

  // 设置默认背景色。
  rootView.backgroundColor = [UIColor whiteColor];

  // 初始化 UIWindow。
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];

  // 创建根控制器。
  UIViewController *rootViewController = [UIViewController new];

  // 挂载 RootView。
  rootViewController.view = rootView;

  // 设置窗口根控制器。
  self.window.rootViewController = rootViewController;

  // 显示窗口。
  [self.window makeKeyAndVisible];

  // 返回启动成功。
  return YES;
}

@end
