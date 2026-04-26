import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

export const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList>;
};

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  titleKey: string;
  subtitleKey: string;
  bullets?: { icon: keyof typeof Ionicons.glyphMap; textKey: string }[];
}

const slideDefinitions: Slide[] = [
  {
    id: 'welcome',
    icon: 'shield-checkmark',
    iconBg: C.nest50,
    iconColor: C.nest500,
    titleKey: 'onboarding.welcomeTitle',
    subtitleKey: 'onboarding.welcomeSubtitle',
  },
  {
    id: 'add-child',
    icon: 'people',
    iconBg: C.warm50,
    iconColor: C.warm500,
    titleKey: 'onboarding.addChildTitle',
    subtitleKey: 'onboarding.addChildSubtitle',
    bullets: [
      { icon: 'person-add-outline', textKey: 'onboarding.addChildBullet1' },
      { icon: 'settings-outline', textKey: 'onboarding.addChildBullet2' },
      { icon: 'people-outline', textKey: 'onboarding.addChildBullet3' },
    ],
  },
  {
    id: 'pair-device',
    icon: 'phone-portrait',
    iconBg: C.safe50,
    iconColor: C.safe500,
    titleKey: 'onboarding.pairDeviceTitle',
    subtitleKey: 'onboarding.pairDeviceSubtitle',
    bullets: [
      { icon: 'download-outline', textKey: 'onboarding.pairDeviceBullet1' },
      { icon: 'key-outline', textKey: 'onboarding.pairDeviceBullet2' },
      { icon: 'qr-code-outline', textKey: 'onboarding.pairDeviceBullet3' },
    ],
  },
  {
    id: 'features',
    icon: 'sparkles',
    iconBg: '#fef3f2',
    iconColor: C.danger500,
    titleKey: 'onboarding.featuresTitle',
    subtitleKey: 'onboarding.featuresSubtitle',
    bullets: [
      { icon: 'time-outline', textKey: 'onboarding.featuresBullet1' },
      { icon: 'navigate-outline', textKey: 'onboarding.featuresBullet2' },
      { icon: 'notifications-outline', textKey: 'onboarding.featuresBullet3' },
      { icon: 'ban-outline', textKey: 'onboarding.featuresBullet4' },
    ],
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isLast = activeIndex === slideDefinitions.length - 1;

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    navigation.replace('MainTabs');
  };

  const handleNext = () => {
    if (isLast) {
      finishOnboarding();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 28 }}>
      {/* Icon — welcome slide shows the brand mark, others use semantic icons */}
      {item.id === 'welcome' ? (
        <Image
          source={require('../../../assets/branding/logo-mark.png')}
          style={{ width: 110, height: 110, marginBottom: 24 }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: item.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <Ionicons name={item.icon} size={36} color={item.iconColor} />
        </View>
      )}

      {/* Title */}
      <Text
        style={{
          fontFamily: 'Outfit_700Bold',
          fontSize: 30,
          color: C.gray900,
          lineHeight: 36,
          marginBottom: 14,
        }}
      >
        {t(item.titleKey)}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 15,
          color: C.gray500,
          lineHeight: 23,
          marginBottom: 24,
        }}
      >
        {t(item.subtitleKey)}
      </Text>

      {/* Bullets */}
      {item.bullets?.map((b) => (
        <View
          key={b.textKey}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 14,
            gap: 14,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: C.gray50,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={b.icon} size={20} color={C.gray600} />
          </View>
          <Text style={{ fontSize: 14, color: C.gray700, flex: 1 }}>{t(b.textKey)}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: top }}>
      {/* Skip button */}
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 12 }}>
        <TouchableOpacity onPress={finishOnboarding} hitSlop={12}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.gray400 }}>
            {t('onboarding.skip')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slideDefinitions}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={{ paddingTop: 40 }}
      />

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: 28,
          paddingBottom: bottom + 20,
          paddingTop: 16,
        }}
      >
        {/* Dots */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {slideDefinitions.map((s, i) => (
            <View
              key={s.id}
              style={{
                width: i === activeIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === activeIndex ? C.nest500 : C.gray200,
              }}
            />
          ))}
        </View>

        {/* Next / Finish button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={{
            backgroundColor: C.nest500,
            borderRadius: 16,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
            {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
