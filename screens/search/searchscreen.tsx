import { StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import Themestore from '../../store/themestore';
import { IconButton, Searchbar } from 'react-native-paper';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../assets/utils/fontfamily';
import { RootStackParamList } from '../../types/navigation';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SearchScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.searchscreenview,
        { backgroundColor: theme.colors.background },
      ]}
    >
        <View style={styles.searchbarcontainer}>
          <Searchbar
            placeholder="Search"
            rippleColor={'transparent'}
            placeholderTextColor={theme.colors.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={() => (
              <FontAwesome6
                iconStyle="solid"
                color={theme.colors.text}
                size={20}
                style={{ width: 20, height: 20 }}
                name="magnifying-glass"
              />
            )}
            inputStyle={[styles.searchtext, { color: theme.colors.text }]}
            style={[
              styles.searchbar,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.inputborder,
              },
            ]}
          />
          <IconButton
            icon={() => (
              <FontAwesome6
                iconStyle="solid"
                color={theme.colors.iconsecondary}
                size={20}
                style={{
                  width: 20,
                  height: 20,
                  transform: [{ rotate: '90deg' }],
                }}
                name="xmark"
              />
            )}
            onPress={() => navigation.goBack()}
            style={[
              styles.searchfilterbutton,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.inputborder,
              },
            ]}
          />
        </View>
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  searchscreenview: {
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 24,
    flex: 1,
  },
  searchbarcontainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  searchbar: {
    flex: 1,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 20,
    height: 44,
  },
  searchtext: {
    fontSize: 12,
    lineHeight: 12,
    fontFamily: getFontFamily('true', 'regular'),
    paddingBottom: 20,
  },
  searchfilterbutton: {
    borderRadius: 100,
    borderWidth: 1,
    height: 44,
    width: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
