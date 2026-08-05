import { useEffect } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HomeScreen } from '@/screens/HomeScreen';
import { UI_COLORS } from '@/constants';

export default function App() {
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(UI_COLORS.background);
    StatusBar.setTranslucent(true);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <HomeScreen />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
  },
});