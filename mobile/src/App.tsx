import React, {useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ThemeProvider} from '@aws-amplify/ui-react-native';
import './lib/amplify/config';
import {useAuth} from './hooks/useAuth';
import {useUsers} from './hooks/useUsers';
import {LoginScreen, RegisterScreen} from './screens';

const Stack = createNativeStackNavigator();

function HomeScreen() {
  const {logout} = useAuth();
  const {user, isLoading: userLoading} = useUsers();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>AI SaaS Bootstrap</Text>
          <Text style={styles.subtitle}>Welcome to your mobile app</Text>
          {userLoading ? (
            <ActivityIndicator size="large" color="#2563eb" />
          ) : (
            <>
              {user && (
                <>
                  <Text style={styles.userInfo}>
                    User: {user.name} ({user.email})
                  </Text>
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  const {initialize, isAuthenticated, isLoading: authLoading} = useAuth();

  useEffect(() => {
    // Initialize auth state from AsyncStorage on app start
    initialize();
  }, [initialize]);

  // Show loading screen while initializing auth
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}>
          {isAuthenticated ? (
            <Stack.Screen name="Home" component={HomeScreen} />
          ) : (
            <>
              <Stack.Screen name="Login">
                {({navigation}) => (
                  <LoginScreen
                    onNavigateToRegister={() => navigation.navigate('Register')}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Register">
                {({navigation}) => (
                  <RegisterScreen
                    onNavigateToLogin={() => navigation.navigate('Login')}
                  />
                )}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  userInfo: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#fee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  logoutText: {
    fontSize: 16,
    color: '#c00',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default App;

