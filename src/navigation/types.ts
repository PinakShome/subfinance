export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  SubscriptionList: undefined;
  SubscriptionDetail: { id: string };
  AddSubscription: undefined;
  EditSubscription: { id: string };
  Alternatives: { id: string; name: string };
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
};
