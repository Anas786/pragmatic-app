import React from "react";
import { I18nManager, TouchableOpacity } from "react-native";
import {
  Afternoon,
  Back,
  CalculatorIcon,
  Close,
  Coin,
  DeliveryBox,
  DownArrow,
  EmailCircleIcon,
  Evening,
  Event,
  Filter,
  Globe,
  HelpIcon,
  Home,
  HomeIcon,
  InfoIcon,
  LogoutIcon,
  Magnify,
  MapPin,
  MerchandiseIcon,
  Midnight,
  Minus,
  Morning,
  MyUnitsIcon,
  NewIcon,
  NoOrderIcon,
  NoUnitsIcon,
  OrderBoxIcon,
  PhoneCircleIcon,
  Plus,
  PortableStorageIcon,
  PrivacyIcon,
  ProfileIcon,
  Restaurant,
  RightIcon,
  SettingsIcon,
  TermsIcon,
  Tick,
  Trash,
  UserCircleIcon,
  UserProfileIcon,
  Users,
  WalletIcon,
  ECommerce,
} from "src/assets/icons";

import { normalizeWidth, WHITE } from "src/utils";

export const AppIcon = {
  users: Users,
  back: Back,
  home: HomeIcon,
  my_units: MyUnitsIcon,
  new: NewIcon,
  calculator: CalculatorIcon,
  profile: ProfileIcon,
  no_units: NoUnitsIcon,
  plus: Plus,
  minus: Minus,
  portable_storage_icon: PortableStorageIcon,
  merchandise_icon: MerchandiseIcon,
  info_icon: InfoIcon,
  close: Close,
  map_pin: MapPin,
  midnight: Midnight,
  morning: Morning,
  afternoon: Afternoon,
  evening: Evening,
  down_arrow: DownArrow,
  delivery_box: DeliveryBox,
  tick: Tick,
  user_profile: UserProfileIcon,
  wallet: WalletIcon,
  right_icon: RightIcon,
  order_box: OrderBoxIcon,
  settings: SettingsIcon,
  privacy: PrivacyIcon,
  terms: TermsIcon,
  help: HelpIcon,
  logout: LogoutIcon,
  user_circle: UserCircleIcon,
  email_circle: EmailCircleIcon,
  phone_circle: PhoneCircleIcon,
  globe: Globe,
  trash: Trash,
  coin: Coin,
  magnify: Magnify,
  filter: Filter,
  no_order: NoOrderIcon,
  restaurant: Restaurant,
  event: Event,
  home_renovation: Home,
  "e-commerce": ECommerce,
};

export type IconName = keyof typeof AppIcon;

interface CustomIconProps {
  name: IconName;
  size?: number;
  color?: string;
  focused?: boolean;
  onPress?: () => void;
}

const CustomIcon: React.FC<CustomIconProps> = ({
  name,
  size = 24,
  color = WHITE,
  onPress,
  focused = false,
}) => {
  const Icon = AppIcon[name];
  const flipStyle = I18nManager.isRTL
    ? { transform: [{ scaleX: -1 }] }
    : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!Boolean(onPress)}
      style={flipStyle}>
      <Icon size={normalizeWidth(size)} color={color} focused={focused} />
    </TouchableOpacity>
  );
};

export default CustomIcon;
