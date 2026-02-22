import React from "react";
import { TouchableOpacity } from "react-native";
import {
  Back,
  CalculatorIcon,
  Close,
  DownArrow,
  EmailCircleIcon,
  Filter,
  HelpIcon,
  HomeIcon,
  InfoIcon,
  LogoutIcon,
  Magnify,
  Minus,
  Plus,
  PrivacyIcon,
  ProfileIcon,
  RightIcon,
  SettingsIcon,
  TermsIcon,
  Tick,
  Trash,
  UserProfileIcon,
  Users,
} from 'src/assets/icons';

import { normalizeWidth, WHITE } from 'src/utils';

export const AppIcon = {
  users: Users,
  back: Back,
  home: HomeIcon,
  calculator: CalculatorIcon,
  profile: ProfileIcon,
  plus: Plus,
  minus: Minus,
  info_icon: InfoIcon,
  close: Close,
  down_arrow: DownArrow,
  tick: Tick,
  user_profile: UserProfileIcon,
  right_icon: RightIcon,
  settings: SettingsIcon,
  privacy: PrivacyIcon,
  terms: TermsIcon,
  help: HelpIcon,
  logout: LogoutIcon,
  email_circle: EmailCircleIcon,
  trash: Trash,
  magnify: Magnify,
  filter: Filter,
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

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{ transform: [{ scaleX: 1 }] }}>
      <Icon size={normalizeWidth(size)} color={color} focused={focused} />
    </TouchableOpacity>
  );
};

export default CustomIcon;
