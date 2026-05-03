import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import RentalDashboardScreen from './src/screens/RentalDashboardScreen';
import FishermanDashboardScreen from './src/screens/FishermanDashboardScreen';
import ManageTripScreen from './src/screens/ManageTripScreen';
import ActiveTripScreen from './src/screens/ActiveTripScreen';
import TripSummaryScreen from './src/screens/TripSummaryScreen';
import BuyerDashboardScreen from './src/screens/BuyerDashboardScreen';
import HomeScreen from './src/screens/HomeScreen';
import BoatOwnerDashboardScreen from './src/screens/BoatOwnerDashboardScreen';
import RegisterVesselScreen from './src/screens/RegisterVesselScreen';
import CustomerDashboardScreen from './src/screens/CustomerDashboardScreen';
import OrderManagementScreen from './src/screens/OrderManagementScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import CartScreen from './src/screens/CartScreen';



const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
          <Stack.Screen name="RentalDashboard" component={RentalDashboardScreen} />
          <Stack.Screen name="FishermanDashboard" component={FishermanDashboardScreen} />
          <Stack.Screen name="ManageTrip" component={ManageTripScreen} />
          <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
          <Stack.Screen name="TripSummary" component={TripSummaryScreen} />
          <Stack.Screen name="BuyerDashboard" component={BuyerDashboardScreen} />
          <Stack.Screen name="BoatOwnerDashboard" component={BoatOwnerDashboardScreen} />
          <Stack.Screen name="RegisterVessel" component={RegisterVesselScreen} />
          <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} />
          <Stack.Screen name="OrderManagement" component={OrderManagementScreen} />
          <Stack.Screen name="Earnings" component={EarningsScreen} />
          <Stack.Screen name="Notifications" component={NotificationScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
        </Stack.Navigator>





      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
