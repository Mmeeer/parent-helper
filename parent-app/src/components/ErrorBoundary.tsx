import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC' }}>
          <Ionicons name="warning-outline" size={56} color="#E11D48" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            An unexpected error occurred. Please try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            style={{
              marginTop: 24, backgroundColor: '#4F46E5', paddingHorizontal: 24,
              paddingVertical: 12, borderRadius: 12,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
