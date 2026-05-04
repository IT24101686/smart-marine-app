import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const { width } = Dimensions.get('window');

const FishermanDashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [availableTrips, setAvailableTrips] = useState([]);
    const [activeTrip, setActiveTrip] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUserAndTrips();
    }, []);

    const loadUserAndTrips = async () => {
        try {
            // Fetch fresh profile for rating
            const profileRes = await client.get('/api/users/profile');
            setUser(profileRes.data);
            fetchData(profileRes.data.district);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const fetchData = async (district) => {
        try {
            // Fetch available trips
            const response = await client.get(`/api/trips/available/${district}`);
            setAvailableTrips(response.data);

            // Fetch my active trips (where I am crew)
            const myTripsResponse = await client.get('/api/trips/my-trips');
            const active = myTripsResponse.data.find(t => t.status === 'planned' || t.status === 'ongoing');
            
            if (active) {
                // Fetch full details of the active trip to get crew names
                const detailsResponse = await client.get(`/api/trips/${active._id}`);
                setActiveTrip(detailsResponse.data);
            }

            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };



    const handleJoinRequest = async (tripId) => {
        try {
            setLoading(true);
            await client.post(`/api/trips/${tripId}/join`);
            setLoading(false);
            Alert.alert("Success", "Your join request has been sent to the trip planner!");
            fetchData(user?.district || 'Galle'); // Refresh the list with district

        } catch (error) {
            setLoading(false);
            Alert.alert("Error", error.response?.data?.message || "Failed to send request");
        }
    };

    const renderTripCard = ({ item }) => (
        <View style={styles.tripCard}>
            <Image 
                source={item.vesselId.image ? { uri: item.vesselId.image } : require('../../assets/adaptive-icon.png')} 
                style={styles.vesselImage} 
            />
            <View style={styles.cardOverlay}>
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                >
                    <View style={styles.cardHeader}>
                        <Text style={styles.vesselName}>{item.vesselId.name}</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>PLANNED</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
            
            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                    <Text style={styles.infoText}>
                        {new Date(item.departureTime).toLocaleDateString()} at {new Date(item.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={18} color="#2563eb" />
                    <Text style={styles.infoText}>Planner: {item.plannerId.name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={18} color="#2563eb" />
                    <Text style={styles.infoText}>{item.plannerId.district} Harbor Area</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={18} color="#2563eb" />
                    <Text style={styles.infoText}>Duration: {item.plannedDuration || '3 Days'}</Text>
                </View>


                <View style={styles.crewInfo}>
                    <Text style={styles.crewLabel}>Crew Needed: {item.maxFishermen}</Text>
                    <Text style={styles.crewSub}>Current requests: {item.requests.length}</Text>
                </View>

                <TouchableOpacity 
                    style={[styles.joinButton, activeTrip && styles.disabledJoinButton]}
                    onPress={() => !activeTrip && handleJoinRequest(item._id)}
                    disabled={!!activeTrip}
                >
                    <LinearGradient
                        colors={activeTrip ? ['#94a3b8', '#64748b'] : ['#2563eb', '#1d4ed8']}
                        style={styles.joinButtonGradient}
                    >
                        <Text style={styles.joinButtonText}>{activeTrip ? 'Unavailable' : 'Join This Trip'}</Text>
                        <Ionicons name={activeTrip ? "lock-closed-outline" : "add-circle-outline"} size={20} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.welcomeText}>Hello, {user?.name?.split(' ')[0]}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Text style={styles.ratingText}>
                                    {user?.rating ? user.rating.toFixed(1) : 'N/A'} ({user?.totalRatings || 0} reviews)
                                </Text>
                            </View>
                            <Text style={styles.subText}>Find a trip to join in {user?.district}</Text>
                        </View>

                        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
                            <Ionicons name="person-circle-outline" size={40} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={availableTrips}
                    ListHeaderComponent={
                        activeTrip && (
                            <View style={styles.activeTripContainer}>
                                <Text style={styles.sectionTitle}>My Current Trip</Text>
                                <View style={styles.activeTripCard}>
                                    <Image 
                                        source={activeTrip.vesselId.image ? { uri: activeTrip.vesselId.image } : require('../../assets/adaptive-icon.png')} 
                                        style={styles.activeVesselImage} 
                                    />
                                    <View style={styles.activeCardContent}>
                                        <Text style={styles.activeVesselName}>{activeTrip.vesselId.name}</Text>
                                        <Text style={styles.activeTripStatus}>Status: {activeTrip.status.toUpperCase()}</Text>
                                        
                                        <View style={styles.crewSection}>
                                            <Text style={styles.crewHeader}>My Crew Members:</Text>
                                            <View style={styles.crewList}>
                                                {activeTrip.crew.map((member) => (
                                                    <View key={member._id} style={styles.crewMemberTag}>
                                                        <Ionicons name="person" size={14} color="#2563eb" />
                                                        <Text style={styles.crewMemberName}>{member.name === user?.name ? "You" : member.name}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Available Trips to Join</Text>
                            </View>
                        )
                    }
                    renderItem={renderTripCard}

                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="boat-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No available trips in your district right now.</Text>
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
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    ratingText: {
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: '700',
    },
    profileBtn: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 24,
    },
    tripCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginBottom: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    vesselImage: {
        width: '100%',
        height: 180,
    },
    cardOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 180,
        justifyContent: 'flex-end',
    },
    gradient: {
        padding: 20,
        height: 100,
        justifyContent: 'flex-end',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    vesselName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    statusBadge: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    cardBody: {
        padding: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    infoText: {
        fontSize: 15,
        color: '#475569',
        fontWeight: '600',
    },
    crewInfo: {
        backgroundColor: '#f1f5f9',
        padding: 16,
        borderRadius: 16,
        marginVertical: 10,
    },
    crewLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    crewSub: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    joinButton: {
        marginTop: 10,
    },
    joinButtonGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
    },
    joinButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    disabledJoinButton: {
        opacity: 0.8,
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
        paddingHorizontal: 40,
    },
    activeTripContainer: {
        marginBottom: 10,
    },
    activeTripCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#2563eb',
        elevation: 5,
    },
    activeVesselImage: {
        width: '100%',
        height: 150,
    },
    activeCardContent: {
        padding: 16,
    },
    activeVesselName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    activeTripStatus: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '700',
        marginTop: 2,
    },
    crewSection: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 10,
    },
    crewHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
    },
    crewList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    crewMemberTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 5,
    },
    crewMemberName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2563eb',
    },
});


export default FishermanDashboardScreen;
