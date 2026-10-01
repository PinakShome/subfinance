/** @type {import('@bacons/apple-targets').Config} */
// WidgetKit extension, wired into the Xcode project by @bacons/apple-targets on
// `expo prebuild`. Shares an app group with the main app so the app can push the
// monthly total + next renewal for the widget to display.
module.exports = {
  type: 'widget',
  name: 'SubFinanceWidget',
  icon: '../../assets/icon.png',
  colors: {
    $accent: '#8b5cf6',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.subfinance.app'],
  },
};
