import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

/** Small EN | MN pill. Used on auth screens so the language can be changed before login. */
export default function LanguageToggle({ style }: { style?: object }) {
  const { i18n } = useTranslation();
  const current = i18n.language === 'mn' ? 'mn' : 'en';
  const Item = ({ code, label }: { code: 'mn' | 'en'; label: string }) => {
    const active = current === code;
    return (
      <TouchableOpacity
        onPress={() => { if (!active) changeLanguage(code); }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={code === 'mn' ? 'Монгол' : 'English'}
        className={`px-3 py-1.5 rounded-full ${active ? 'bg-nest-500' : 'bg-transparent'}`}
      >
        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-500'}`}>{label}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <View style={style} className="flex-row bg-gray-100 rounded-full p-1 self-end">
      <Item code="mn" label="МН" />
      <Item code="en" label="EN" />
    </View>
  );
}
