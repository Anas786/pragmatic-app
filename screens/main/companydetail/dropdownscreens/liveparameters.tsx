import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import Themestore from '../../../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../../../assets/utils/fontfamily';
import { Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LiveparametersScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const inset = useSafeAreaInsets();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.bordercolor,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
              borderRadius: !isExpanded ? 16 : 0,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <FontAwesome6
              name="bolt"
              iconStyle="solid"
              size={20}
              color={theme.colors.iconcolor}
              style={{ marginRight: 6, width: 20, height: 20 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              Inverter
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.liveparametersearchbg,
                  borderColor: theme.colors.bordercolor,
                },
              ]}
            >
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
                    size={12}
                    style={{ width: 12, height: 12 }}
                    name="magnifying-glass"
                  />
                )}
                inputStyle={[styles.searchtext, { color: theme.colors.text }]}
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  borderColor: theme.colors.bordercolor,
                  borderRadius: 100,
                  width: 120,
                  borderWidth: 1,
                  height: 44,
                }}
              />
            </View>
            <FontAwesome6
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              iconStyle="solid"
              size={14}
              color={theme.colors.title}
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <>
            <View
              style={[
                styles.cardBody,
                { backgroundColor: theme.colors.overlaybackground },
              ]}
            >
              <View
                style={[
                  styles.tabsRow,
                  { borderBottomColor: theme.colors.bordercolor },
                ]}
              >
                <View style={styles.pillContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tabPill,
                      {
                        borderColor: theme.colors.inputborder,
                        backgroundColor: theme.colors.liveparameterpillsbg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: theme.colors.title,
                        },
                      ]}
                    >
                      Energy
                    </Text>
                  </TouchableOpacity>
                  <FontAwesome6
                    name="chevron-right"
                    iconStyle="solid"
                    size={12}
                    color={theme.colors.title}
                    style={{ marginHorizontal: 6 }}
                  />
                  <TouchableOpacity
                    style={[
                      styles.tabPill,
                      {
                        borderColor: theme.colors.buttonbg,
                        backgroundColor: theme.colors.liveparameterpillsbg,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.tabText, { color: theme.colors.title }]}
                    >
                      Power
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.chartLink}>
                  <FontAwesome6
                    name="chart-line"
                    iconStyle="solid"
                    size={12}
                    color={theme.colors.highlightedsecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: theme.colors.highlightedsecondary,
                      fontSize: 8,
                      fontFamily: getFontFamily('true', 'medium'),
                    }}
                  >
                    Chart
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dataRow}>
                <View>
                  <Text style={[styles.dateText, { color: theme.colors.text }]}>
                    17/12/2025, 9:39:03 pm
                  </Text>
                  <Text
                    style={[styles.dataLabel, { color: theme.colors.title }]}
                  >
                    DG 1 energy power [kWh]
                  </Text>
                </View>
                <Text style={[styles.dataValue, { color: theme.colors.title }]}>
                  55683420.16
                </Text>
              </View>

              <View style={styles.dataRow}>
                <View>
                  <Text style={[styles.dateText, { color: theme.colors.text }]}>
                    18/12/2025, 10:15:42 pm
                  </Text>
                  <Text
                    style={[styles.dataLabel, { color: theme.colors.title }]}
                  >
                    DG 2 energy power [kWh]
                  </Text>
                </View>
                <Text style={[styles.dataValue, { color: theme.colors.title }]}>
                  44012345.78
                </Text>
              </View>

              <View style={styles.dataRow}>
                <View>
                  <Text style={[styles.dateText, { color: theme.colors.text }]}>
                    19/12/2025, 11:05:10 pm
                  </Text>
                  <Text
                    style={[styles.dataLabel, { color: theme.colors.title }]}
                  >
                    DG 3 energy power [kWh]
                  </Text>
                </View>
                <Text style={[styles.dataValue, { color: theme.colors.title }]}>
                  67891234.54
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.cardBody,
                { backgroundColor: theme.colors.overlaybackground },
              ]}
            >
              <View
                style={[
                  styles.categoryPillActive,
                  {
                    backgroundColor: theme.colors.liveparameterpillsbg,
                    borderColor: theme.colors.highlightedsecondary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.title,
                    fontSize: 8,
                    fontFamily: getFontFamily('true', 'medium'),
                  }}
                >
                  Temperature (7)
                </Text>
              </View>
              <View
                style={[
                  styles.chipGrid,
                  { borderTopColor: theme.colors.bordercolor },
                ]}
              >
                {[
                  'Ambient Temperature 3',
                  'Ambient Temperature 4',
                  'Max Temperature',
                  'Module Temperature 2',
                  'Ambient Temperature 2',
                ].map((chip, index) => (
                  <View
                    key={index}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.liveparameterpillsbg,
                        borderColor: theme.colors.inputborder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.chipText, { color: theme.colors.title }]}
                    >
                      {chip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.cardBody,
                { backgroundColor: theme.colors.overlaybackground },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.collapsedCategory,
                  {
                    borderColor: theme.colors.inputborder,
                    backgroundColor: theme.colors.liveparameterpillsbg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.collapsedCategoryText,
                    { color: theme.colors.title },
                  ]}
                >
                  System (2)
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.cardBody,
                { backgroundColor: theme.colors.overlaybackground },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.collapsedCategory,
                  {
                    borderColor: theme.colors.inputborder,
                    backgroundColor: theme.colors.liveparameterpillsbg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.collapsedCategoryText,
                    { color: theme.colors.title },
                  ]}
                >
                  Irradiance (4)
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.cardBody,
                {
                  backgroundColor: theme.colors.overlaybackground,
                  marginBottom: 8,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.collapsedCategory,
                  {
                    borderColor: theme.colors.inputborder,
                    backgroundColor: theme.colors.liveparameterpillsbg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.collapsedCategoryText,
                    { color: theme.colors.title },
                  ]}
                >
                  Load (2)
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.bordercolor,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
              borderRadius: !isExpanded ? 16 : 16,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <FontAwesome6
              name="chart-line"
              iconStyle="solid"
              size={20}
              color={theme.colors.iconcolor}
              style={{ marginRight: 6, width: 20, height: 20 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              DG
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.liveparametersearchbg,
                  borderColor: theme.colors.bordercolor,
                },
              ]}
            >
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
                    size={12}
                    style={{ width: 12, height: 12 }}
                    name="magnifying-glass"
                  />
                )}
                inputStyle={[styles.searchtext, { color: theme.colors.text }]}
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  borderColor: theme.colors.bordercolor,
                  borderRadius: 100,
                  width: 120,
                  borderWidth: 1,
                  height: 44,
                }}
              />
            </View>
            <FontAwesome6
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              iconStyle="solid"
              size={14}
              color={theme.colors.title}
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.bordercolor,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
              borderRadius: !isExpanded ? 16 : 16,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <FontAwesome6
              name="fan"
              iconStyle="solid"
              size={20}
              color={theme.colors.cardscolorlightblue}
              style={{ marginRight: 6, width: 20, height: 20 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              Wind
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.liveparametersearchbg,
                  borderColor: theme.colors.bordercolor,
                },
              ]}
            >
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
                    size={12}
                    style={{ width: 12, height: 12 }}
                    name="magnifying-glass"
                  />
                )}
                inputStyle={[styles.searchtext, { color: theme.colors.text }]}
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  borderColor: theme.colors.bordercolor,
                  borderRadius: 100,
                  width: 120,
                  borderWidth: 1,
                  height: 44,
                }}
              />
            </View>
            <FontAwesome6
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              iconStyle="solid"
              size={14}
              color={theme.colors.title}
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.bordercolor,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
              borderRadius: !isExpanded ? 16 : 16,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <FontAwesome6
              name="bolt"
              iconStyle="solid"
              size={20}
              color='#e8f80c'
              style={{ marginRight: 6, width: 20, height: 20 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              PCS
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.liveparametersearchbg,
                  borderColor: theme.colors.bordercolor,
                },
              ]}
            >
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
                    size={12}
                    style={{ width: 12, height: 12 }}
                    name="magnifying-glass"
                  />
                )}
                inputStyle={[styles.searchtext, { color: theme.colors.text }]}
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  borderColor: theme.colors.bordercolor,
                  borderRadius: 100,
                  width: 120,
                  borderWidth: 1,
                  height: 44,
                }}
              />
            </View>
            <FontAwesome6
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              iconStyle="solid"
              size={14}
              color={theme.colors.title}
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.bordercolor,
            marginBottom: isExpanded ? inset.bottom + 12 : 0,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
              borderRadius: !isExpanded ? 16 : 16,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <FontAwesome6
              name="solar-panel"
              iconStyle="solid"
              size={20}
              color={theme.colors.iconcolor}
              style={{marginRight: 6, width: 25, height: 20 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              Solar
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.liveparametersearchbg,
                  borderColor: theme.colors.bordercolor,
                },
              ]}
            >
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
                    size={12}
                    style={{ width: 12, height: 12 }}
                    name="magnifying-glass"
                  />
                )}
                inputStyle={[styles.searchtext, { color: theme.colors.text }]}
                style={{
                  backgroundColor: theme.colors.overlaybackground,
                  borderColor: theme.colors.bordercolor,
                  borderRadius: 100,
                  width: 120,
                  borderWidth: 1,
                  height: 44,
                }}
              />
            </View>
            <FontAwesome6
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              iconStyle="solid"
              size={14}
              color={theme.colors.title}
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default LiveparametersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
  },
  searchtext: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    marginTop: -5,
  },
  cardBody: {
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 16,
    padding: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 5,
    borderBottomWidth: 1,
    paddingBottom: 20,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tabPill: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 65,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'medium'),
  },
  chartLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  dateText: {
    fontSize: 8,
    marginBottom: 2,
    fontFamily: getFontFamily('true', 'regular'),
  },
  dataLabel: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
  },
  dataValue: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
  },
  categoryPillActive: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 65,
    borderWidth: 1,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 10,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 65,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'medium'),
  },
  collapsedCategory: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 65,
    borderWidth: 1,
  },
  collapsedCategoryText: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'medium'),
  },
});
