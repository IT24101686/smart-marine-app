import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator,
    Dimensions,
    Linking,
    Alert,
    RefreshControl,
    ScrollView
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const RentalDashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [availableBoats, setAvailableBoats] = useState([]);
    const [myRentedBoats, setMyRentedBoats] = useState([]);
    const [myTrips, setMyTrips] = useState([]);
    const [user, setUser] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) setUser(JSON.parse(userData));

            const [boatsRes, tripsRes, myVesselsRes] = await Promise.all([
                client.get('/api/vessels/available-for-rent'),
                client.get('/api/trips/my-trips'),
                client.get('/api/vessels/my-vessels')
            ]);
            
            setAvailableBoats(Array.isArray(boatsRes.data) ? boatsRes.data : []);
            setMyRentedBoats(myVesselsRes.data.filter(v => v.status === 'rented'));
            setMyTrips(tripsRes.data.filter(t => t.status === 'planned' || t.status === 'ongoing' || t.status === 'completed'));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    const handleRent = async (boat) => {
        Alert.alert(
            "Confirm Rental",
            `Are you sure you want to rent ${boat.name} for LKR ${boat.rentalPrice?.toLocaleString() || 0} per day?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm & Rent", 
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.post(`/api/vessels/${boat._id}/rent`);
                            Alert.alert("Success", "Vessel rented successfully! You can now start trips with this boat.");
                            loadData();
                        } catch (error) {
                            Alert.alert("Error", error.response?.data?.message || "Rental failed");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };


    const renderBoatCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.boatCard}
            onPress={() => handleRent(item)}
        >
            <Image 
                source={item.photos && item.photos.length > 0 ? { uri: item.photos[0] } : require('../../assets/adaptive-icon.png')} 
                style={styles.boatImage} 
            />
            <View style={styles.boatInfo}>
                <View style={styles.boatHeader}>
                    <Text style={styles.boatName}>{item.name}</Text>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="person-outline" size={14} color="#64748b" />
                        <Text style={styles.ownerText}>{item.ownerId?.name || "Owner"}</Text>
                    </View>
                </View>
                
                <Text style={styles.boatDetails}>
                    <Ionicons name="location-outline" size={14} /> Galle • {item.vesselType}
                </Text>

                <View style={styles.priceContainer}>
                    <Text style={styles.priceAmount}>LKR {item.rentalPrice ? item.rentalPrice.toLocaleString() : "0"}</Text>
                    <Text style={styles.priceType}> / Day</Text>
                </View>

                <TouchableOpacity 
                    style={[styles.rentButton, { backgroundColor: '#16a34a' }]}
                    onPress={() => handleRent(item)}
                >
                    <Ionicons name="card-outline" size={18} color="#fff" />
                    <Text style={styles.rentButtonText}>Rent Now</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );


    const debugCheck = () => {
        Alert.alert("Debug Info", `User: ${user?.name}\nDistrict: ${user?.district}\nAvailable Boats: ${availableBoats.length}`);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.welcomeText}>Find a Vessel</Text>
                            <Text style={styles.subText}>Available for rent in your area</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={debugCheck}>
                                <Ionicons name="bug-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                                <Ionicons name="notifications-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={availableBoats}
                    ListHeaderComponent={
                        <View>
                            {myRentedBoats.length > 0 && (
                                <View style={styles.myTripsSection}>
                                    <Text style={styles.sectionTitle}>My Rented Vessels</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripsScroll}>
                                        {myRentedBoats.map((boat) => (
                                            <TouchableOpacity 
                                                key={boat._id} 
                                                style={[styles.tripMiniCard, { borderColor: '#7c3aed' }]}
                                                onPress={() => navigation.navigate('CreateTrip', { vesselId: boat._id })}
                                            >
                                                <View style={styles.tripCardTop}>
                                                    <Ionicons name="boat" size={20} color="#7c3aed" />
                                                    <Text style={styles.miniVesselName}>{boat.name}</Text>
                                                </View>
                                                <Text style={styles.miniCrewStatus}>Ready for Trip • {boat.vesselType}</Text>
                                                <View style={styles.manageLabel}>
                                                    <Text style={[styles.manageLabelText, { color: '#7c3aed' }]}>Start New Trip</Text>
                                                    <Ionicons name="add-circle" size={14} color="#7c3aed" />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {myTrips.length > 0 && (
                                <View style={styles.myTripsSection}>
                                    <Text style={styles.sectionTitle}>My Planned Trips</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripsScroll}>
                                        {myTrips.map((trip) => (
                                            <TouchableOpacity 
                                                key={trip._id} 
                                                style={[
                                                    styles.tripMiniCard, 
                                                    trip.status === 'ongoing' && { borderColor: '#ef4444', borderWidth: 2 },
                                                    trip.status === 'completed' && { borderColor: '#eab308', borderWidth: 2 }
                                                ]}
                                                onPress={() => {
                                                    if (trip.status === 'ongoing') {
                                                        navigation.navigate('ActiveTrip', { tripId: trip._id });
                                                    } else if (trip.status === 'completed') {
                                                        navigation.navigate('TripSummary', { tripId: trip._id });
                                                    } else {
                                                        navigation.navigate('ManageTrip', { tripId: trip._id });
                                                    }
                                                }}
                                            >
                                                <View style={styles.tripCardTop}>
                                                    <Ionicons 
                                                        name={trip.status === 'ongoing' ? "radio-outline" : trip.status === 'completed' ? "checkmark-circle" : "boat"} 
                                                        size={20} 
                                                        color={trip.status === 'ongoing' ? "#ef4444" : trip.status === 'completed' ? "#eab308" : "#2563eb"} 
                                                    />
                                                    <Text style={styles.miniVesselName}>{trip.vesselId?.name || 'Unknown Vessel'}</Text>
                                                </View>
                                                <Text style={styles.miniCrewStatus}>
                                                    {trip.status === 'ongoing' ? "LIVE: At Sea" : trip.status === 'completed' ? "Awaiting Market Prices" : `${trip.crew?.length} / ${trip.maxFishermen} Crew Joined`}
                                                </Text>
                                                <View style={styles.manageLabel}>
                                                    <Text style={[
                                                        styles.manageLabelText, 
                                                        trip.status === 'ongoing' && { color: '#ef4444' },
                                                        trip.status === 'completed' && { color: '#eab308' }
                                                    ]}>
                                                        {trip.status === 'ongoing' ? "Log Live Catch" : trip.status === 'completed' ? "Set Selling Prices 💰" : "Manage Crew"}
                                                    </Text>
                                                    <Ionicons 
                                                        name={trip.status === 'ongoing' ? "add-circle" : "arrow-forward"} 
                                                        size={14} 
                                                        color={trip.status === 'ongoing' ? "#ef4444" : trip.status === 'completed' ? "#eab308" : "#2563eb"} 
                                                    />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Available Boats for Rent</Text>
                        </View>
                    }
                    renderItem={renderBoatCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="boat-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No boats available for rent right now.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    subText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 24,
    },
    boatCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
        width: '100%',
    },
    boatImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#f1f5f9',
    },
    boatInfo: {
        padding: 20,
    },
    boatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    boatName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ownerText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    boatDetails: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20,
    },
    priceAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: '#2563eb',
    },
    priceType: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    rentButton: {
        backgroundColor: '#0f172a',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    rentButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 16,
        color: '#94a3b8',
        fontWeight: '600',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
        marginHorizontal: 4,
    },
    myTripsSection: {
        marginBottom: 20,
    },
    tripsScroll: {
        marginTop: 10,
        marginBottom: 10,
    },
    tripMiniCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginRight: 15,
        width: 220,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    tripCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    miniVesselName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    miniCrewStatus: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    manageLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 4,
    },
    manageLabelText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563eb',
    },
});


export default RentalDashboardScreen;
