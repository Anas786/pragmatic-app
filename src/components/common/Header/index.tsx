/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { Image, SafeAreaView, StyleSheet, View } from 'react-native';
import { normalizeHeight, normalizeWidth, BLUE } from 'src/utils';
import CustomIcon, { IconName } from '../CustomIcon';
import { Logo } from 'src/assets';
import { useNavigation } from '@react-navigation/native';
import AppText from '../AppText';

interface HeaderProps {
  left?: IconName;
  leftOnPress?: () => void;
  logo?: 'right' | 'left';
  title?: string;
}

const Header: FC<HeaderProps> = ({ left, logo, title, leftOnPress }) => {
  const { goBack } = useNavigation();
  const onLeft = () => {
    if (leftOnPress) {
      leftOnPress();
    } else if (left === 'back') {
      goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View>
          {left ? (
            <CustomIcon
              name={left}
              onPress={onLeft}
              color={left === 'close' ? BLUE : undefined}
              size={left === 'close' ? 20 : undefined}
            />
          ) : (
            logo === 'left' && (
              <Image
                source={Logo}
                style={{
                  width: normalizeWidth(68.8),
                  height: normalizeHeight(32.1),
                  resizeMode: 'contain',
                }}
              />
            )
          )}
        </View>

        {title && (
          <View>
            <AppText fontSize={16} semi_bold>
              {title}
            </AppText>
          </View>
        )}

        <View>
          {logo === 'right' && (
            <Image
              source={Logo}
              style={{
                width: normalizeWidth(68.8),
                height: normalizeHeight(32.1),
                resizeMode: 'contain',
              }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: normalizeHeight(44),
    justifyContent: 'center',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: normalizeWidth(359),
    justifyContent: 'space-between',
    alignSelf: 'center',
  },
});

export default Header;
