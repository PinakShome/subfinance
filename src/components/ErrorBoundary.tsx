import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={48} color="#ef4444" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message ?? 'An unexpected error occurred.'}</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f5f4fb',
    justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16,
  },
  title: { color: '#1b1830', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { color: '#8a8698', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  btn: {
    backgroundColor: '#6366f1', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
