import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RulesOverview'>;
  route: RouteProp<RootStackParamList, 'RulesOverview'>;
};

export default function RulesOverviewScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;

  const ruleCategories = [
    {
      title: 'Screen Time Limits',
      description: 'Set daily limits, per-app limits, and schedules',
      icon: 'time-outline' as const,
      color: COLORS.warning,
      onPress: () => navigation.navigate('ScreenTimeRules', { childId, childName }),
    },
    {
      title: 'App Management',
      description: 'Block or allow specific apps',
      icon: 'apps-outline' as const,
      color: COLORS.primary,
      onPress: () => navigation.navigate('AppRules', { childId, childName }),
    },
    {
      title: 'Web Filtering',
      description: 'Set content categories and custom domain rules',
      icon: 'globe-outline' as const,
      color: COLORS.secondary,
      onPress: () => navigation.navigate('WebFilter', { childId, childName }),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Rules for {childName}</Text>
      <Text style={styles.subtitle}>
        Configure parental controls and restrictions.
      </Text>

      {ruleCategories.map((category, index) => (
        <TouchableOpacity
          key={index}
          style={styles.card}
          onPress={category.onPress}
        >
          <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon} size={28} color={category.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{category.title}</Text>
            <Text style={styles.cardDescription}>{category.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 16,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
