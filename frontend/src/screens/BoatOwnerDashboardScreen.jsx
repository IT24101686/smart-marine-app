import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    ScrollView, 
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import client from '../api/client';

const { width, height } = Dimensions.get('window');

const BoatOwnerDashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [myVessels, setMyVessels] = useState([]);
    const [myTrips, setMyTrips] = useState([]);
    const [rentalRequests, setRentalRequests] = useState([]);
    const [user, setUser] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [viewerVisible, setViewerVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) setUser(JSON.parse(userData));

            // Load Vessels
            try {
                const vesselsRes = await client.get('/api/vessels/my-vessels');
                setMyVessels(vesselsRes.data);
            } catch (vErr) {
                console.error("Vessels Load Error:", vErr);
            }

            // Load Trips
            try {
                const tripsRes = await client.get('/api/trips/my-trips');
                setMyTrips(tripsRes.data.filter(t => t.status === 'planned' || t.status === 'ongoing'));
            } catch (tErr) {
                console.error("Trips Load Error:", tErr);
            }

            // Load Rental Requests
            try {
                const requestsRes = await client.get('/api/vessels/rental-requests');
                setRentalRequests(requestsRes.data.filter(r => r.status === 'pending'));
            } catch (rErr) {
                console.error("Rental Requests Load Error:", rErr);
            }

        } catch (error) {
            console.error("Dashboard Global Error:", error);
            Alert.alert("Error", "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestResponse = async (requestId, status) => {
        try {
            setLoading(true);
            await client.put(`/api/vessels/rental-requests/${requestId}/respond`, { status });
            Alert.alert("Success", `Rental request ${status}ed successfully.`);
            loadData();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Failed to respond");
        } finally {
            setLoading(false);
        }
    };

    const handleRentOut = async (vesselId, currentRentStatus) => {
        try {
            setLoading(true);
            const newRentStatus = !currentRentStatus;
            await client.put(`/api/vessels/${vesselId}/status`, {
                isAvailableForRent: newRentStatus
            });
            Alert.alert("Success", `Boat is now ${newRentStatus ? 'listed for rent' : 'removed from rent list'}.`);
            loadData();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update boat status");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVessel = async (vesselId) => {
        Alert.alert(
            "Delete Boat",
            "Are you sure you want to delete this boat? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.delete(`/api/vessels/${vesselId}`);
                            Alert.alert("Success", "Vessel deleted successfully.");
                            loadData();
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", error.response?.data?.message || "Failed to delete");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderVesselCard = ({ item }) => {
        const getStatusInfo = (status, isRentable) => {
            if (status === 'maintenance') return { label: 'In Maintenance', color: '#f97316', bg: '#fff7ed' };
            if (status === 'service-due') return { label: 'Service Due', color: '#dc2626', bg: '#fef2f2' };
            if (status === 'in-sea') return { label: 'On Trip', color: '#3b82f6', bg: '#eff6ff' };
            if (status === 'rented') return { label: 'Rented Out', color: '#7c3aed', bg: '#f5f3ff' };
            if (isRentable) return { label: 'For Rent', color: '#2563eb', bg: '#eff6ff' };
            return { label: 'Available', color: '#16a34a', bg: '#f0fdf4' };
        };

        const statusInfo = getStatusInfo(item.status, item.isAvailableForRent);

        return (
            <View style={styles.vesselCard}>
                <TouchableOpacity 
                    onPress={() => {
                        if (item.image) {
                            setSelectedImage(item.image);
                            setViewerVisible(true);
                        }
                    }}
                    activeOpacity={0.9}
                >
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.vesselImage} />
                    ) : (
                        <View style={[styles.vesselImage, styles.vesselPlaceholder]}>
                            <Ionicons name="boat-outline" size={60} color="#cbd5e1" />
                        </View>
                    )}
                    
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay}>
                        <View style={styles.overlayBottom}>
                            <Text style={styles.vesselName}>{item.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.cardContent}>
                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="barbell-outline" size={14} color="#64748b" />
                            <Text style={styles.detailText}>{item.capacity}kg</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="cash-outline" size={14} color="#64748b" />
                            <Text style={styles.detailText}>{item.isAvailableForRent ? `LKR ${item.rentalPrice?.toLocaleString()}/d` : 'Personal'}</Text>
                        </View>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity 
                            style={[styles.actionIconBtn, { backgroundColor: '#f1f5f9' }]}
                            onPress={() => handleRentOut(item._id, item.isAvailableForRent)}
                        >
                            <Ionicons name={item.isAvailableForRent ? "eye-off-outline" : "megaphone-outline"} size={20} color="#475569" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionIconBtn, { backgroundColor: '#f1f5f9' }]}
                            onPress={() => navigation.navigate('RegisterVessel', { vessel: item })}
                        >
                            <Ionicons name="settings-outline" size={20} color="#475569" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionIconBtn, { backgroundColor: '#fee2e2' }]}
                            onPress={() => handleDeleteVessel(item._id)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                        {item.status !== 'rented' ? (
                            <TouchableOpacity 
                                style={styles.planTripBtn}
                                onPress={() => navigation.navigate('CreateTrip', { vessel: item })}
                            >
                                <Text style={styles.planTripText}>Plan Trip</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.planTripBtn, { backgroundColor: '#cbd5e1' }]}>
                                <Text style={styles.planTripText}>Rented Out</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>Fleet Manager</Text>
                            <Text style={styles.headerSub}>Manage your sea operations</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.profileBtn}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <Ionicons name="person-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.registerVesselBtn}
                        onPress={() => navigation.navigate('RegisterVessel')}
                    >
                        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.regGradient}>
                            <Ionicons name="add-circle" size={20} color="#fff" />
                            <Text style={styles.regText}>Register New Boat</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </SafeAreaView>
            </LinearGradient>

            {loading && !myVessels.length ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={myVessels}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            {/* Rental Requests Section */}
                            {rentalRequests.length > 0 && (
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Rental Requests</Text>
                                        <View style={styles.countBadge}><Text style={styles.countText}>{rentalRequests.length}</Text></View>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                        {rentalRequests.map((req) => (
                                            <View key={req._id} style={styles.reqCard}>
                                                <View style={styles.reqHeader}>
                                                    <View style={styles.renterAvatar}>
                                                        <Text style={styles.avatarText}>{req.renterId?.name?.charAt(0)}</Text>
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                                        <Text style={styles.renterName}>{req.renterId?.name}</Text>
                                                        <Text style={styles.reqMeta}>Boat: {req.vesselId?.name}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.reqPriceRow}>
                                                    <Text style={styles.reqPriceLabel}>Daily Rate:</Text>
                                                    <Text style={styles.reqPriceVal}>LKR {req.rentalPrice?.toLocaleString()}</Text>
                                                </View>
                                                <View style={styles.reqActions}>
                                                    <TouchableOpacity 
                                                        style={[styles.reqBtn, { backgroundColor: '#fee2e2' }]} 
                                                        onPress={() => handleRequestResponse(req._id, 'rejected')}
                                                    >
                                                        <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>Reject</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={[styles.reqBtn, { backgroundColor: '#10b981' }]} 
                                                        onPress={() => handleRequestResponse(req._id, 'approved')}
                                                    >
                                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Approve</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Active Trips Section */}
                            {myTrips.length > 0 && (
                                <View style={styles.sectionContainer}>
                                    <Text style={[styles.sectionTitle, { marginHorizontal: 24, marginBottom: 15 }]}>Active Trips</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                        {myTrips.map((trip) => (
                                            <TouchableOpacity 
                                                key={trip._id} 
                                                style={styles.tripMiniCard}
                                                onPress={() => {
                                                    if (trip.status === 'ongoing') {
                                                        navigation.navigate('ActiveTrip', { tripId: trip._id });
                                                    } else {
                                                        navigation.navigate('ManageTrip', { tripId: trip._id });
                                                    }
                                                }}
                                            >
                                                <View style={styles.tripMiniHeader}>
                                                    <Ionicons name="navigate-circle" size={24} color={trip.status === 'ongoing' ? "#ef4444" : "#3b82f6"} />
                                                    <Text style={styles.miniTripName}>{trip.vesselId?.name}</Text>
                                                </View>
                                                <Text style={styles.miniTripMeta}>{trip.crew?.length} fishermen • {trip.status.toUpperCase()}</Text>
                                                <TouchableOpacity 
                                                    style={styles.manageBtn}
                                                    onPress={() => {
                                                        if (trip.status === 'ongoing') {
                                                            navigation.navigate('ActiveTrip', { tripId: trip._id });
                                                        } else {
                                                            navigation.navigate('ManageTrip', { tripId: trip._id });
                                                        }
                                                    }}
                                                >
                                                    <Text style={styles.manageBtnText}>{trip.status === 'ongoing' ? 'View Live' : 'Manage'}</Text>
                                                    <Ionicons name="chevron-forward" size={14} color="#2563eb" />
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <Text style={[styles.sectionTitle, { marginHorizontal: 24, marginTop: 10, marginBottom: 15 }]}>My Vessels</Text>
                        </View>
                    }
                    renderItem={renderVesselCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="boat-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No Vessels Registered</Text>
                            <Text style={styles.emptySub}>Register your first boat to start managing trips and rentals.</Text>
                        </View>
                    }
                />
            )}

            {/* Image Viewer Modal */}
            <Modal
                visible={viewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setViewerVisible(false)}
            >
                <View style={styles.viewerContainer}>
                    <TouchableOpacity 
                        style={styles.closeViewer}
                        onPress={() => setViewerVisible(false)}
                    >
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image 
                            source={{ uri: selectedImage }} 
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 10 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    profileBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    registerVesselBtn: { marginHorizontal: 24, marginTop: 25, borderRadius: 18, overflow: 'hidden', elevation: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    regGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 },
    regText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listHeader: { paddingTop: 20 },
    sectionContainer: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 15, gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    countBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    countText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    horizontalScroll: { paddingLeft: 24 },
    reqCard: { backgroundColor: '#fff', width: 260, borderRadius: 24, padding: 16, marginRight: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    reqHeader: { flexDirection: 'row', alignItems: 'center' },
    renterAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#2563eb', fontSize: 18, fontWeight: '800' },
    renterName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    reqMeta: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    reqPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, backgroundColor: '#f8fafc', padding: 8, borderRadius: 12 },
    reqPriceLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    reqPriceVal: { fontSize: 13, fontWeight: '900', color: '#1e293b' },
    reqActions: { flexDirection: 'row', gap: 8, marginTop: 15 },
    reqBtn: { flex: 1, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    tripMiniCard: { backgroundColor: '#fff', width: 220, borderRadius: 24, padding: 16, marginRight: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    tripMiniHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
    miniTripName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    miniTripMeta: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    manageBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
    manageBtnText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
    vesselCard: { marginHorizontal: 24, marginBottom: 20, borderRadius: 28, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
    vesselImage: { width: '100%', height: 200 },
    vesselPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, justifyContent: 'flex-end' },
    overlayBottom: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    vesselName: { fontSize: 22, fontWeight: '900', color: '#fff', flex: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    cardContent: { padding: 15 },
    detailsRow: { flexDirection: 'row', gap: 20, marginBottom: 15 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 13, fontWeight: '700', color: '#475569' },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionIconBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    planTripBtn: { flex: 1, height: 44, backgroundColor: '#0f172a', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    planTripText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    // Image Viewer Styles
    viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    closeViewer: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    fullImage: { width: width, height: height * 0.8 }
});

export default BoatOwnerDashboardScreen;
