import React from 'react';
import { View, Text, Image, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { extractYouTubeVideoId, youTubeThumbnailUrl } from '../utils/youtube';

type Props = {
  /** YouTube URL (watch?v=, youtu.be/, shorts/ ... forms all work). */
  readonly url: string;
};

/**
 * "Заавар видео" card: YouTube thumbnail with a play overlay.
 * Tapping opens the video in the YouTube app / browser.
 */
export default function TutorialVideoCard({ url }: Props) {
  const { t } = useTranslation();
  const videoId = extractYouTubeVideoId(url);

  return (
    <Pressable onPress={() => { Linking.openURL(url).catch(() => {}); }} className="mb-3">
      {({ pressed }) => (
        <View className={`bg-white rounded-3xl border border-gray-100 p-4 ${pressed ? 'opacity-85' : ''}`}>
          <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-3">
            {t('dashboard.tutorialVideo')}
          </Text>
          <View className="rounded-2xl overflow-hidden bg-gray-900" style={{ aspectRatio: 16 / 9 }}>
            {videoId && (
              <Image
                source={{ uri: youTubeThumbnailUrl(videoId) }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}
            {/* Play overlay */}
            <View className="absolute inset-0 items-center justify-center">
              <View className="w-14 h-14 rounded-full bg-black/50 items-center justify-center">
                <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
              </View>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}
