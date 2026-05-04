import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const BoatOwnerDashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [myVessels, setMyVessels] = useState([]);
    const [myTrips, setMyTrips] = useState([]);
    const [user, setUser] = useState(null);

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
            
            const [vesselsRes, tripsRes] = await Promise.all([
                client.get('/api/vessels/my-vessels'),
                client.get('/api/trips/my-trips')
            ]);
            
            setMyVessels(vesselsRes.data);
            setMyTrips(tripsRes.data.filter(t => t.status === 'planned' || t.status === 'ongoing'));
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleRentOut = async (vesselId, currentStatus, currentRentStatus) => {
        try {
            setLoading(true);
            const newRentStatus = !currentRentStatus;
            const newStatus = newRentStatus ? 'available' : 'in-sea';
            
            await client.put(`/api/vessels/${vesselId}/status`, { 
                status: newStatus,
                isAvailableForRent: newRentStatus
            });
            
            Alert.alert("Success", `Boat is now ${newRentStatus ? 'listed for rent' : 'not listed for rent'}.`);
            loadData();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update boat status");
        } finally {
            setLoading(false);
        }
    };


    const renderVesselCard = ({ item }) => {
        const getStatusInfo = (status, isRentable) => {
            if (status === 'maintenance') return { label: 'IN MAINTENANCE (අලුත්වැඩියාවේ)', color: '#f97316', bg: '#fff7ed' };
            if (status === 'service-due') return { label: 'SERVICE DUE (සර්විස් අවශ්‍යයි)', color: '#dc2626', bg: '#fef2f2' };
            if (status === 'in-sea') return { label: 'ON TRIP (මුහුදු ගොස් ඇත)', color: '#ef4444', bg: '#fef2f2' };
            if (status === 'rented') return { label: 'RENTED (කුලියට දී ඇත)', color: '#7c3aed', bg: '#f5f3ff' };
            if (isRentable) return { label: 'FOR RENT (කුලියට දීමට ඇත)', color: '#2563eb', bg: '#eff6ff' };
            return { label: 'AVAILABLE (තිබේ)', color: '#16a34a', bg: '#f0fdf4' };
        };

        const getMaintenanceInfo = (nextDate) => {
            if (!nextDate) return { label: 'No Schedule', color: '#64748b', bg: '#f1f5f9' };
            const today = new Date();
            today.setHours(0,0,0,0);
            const due = new Date(nextDate);
            due.setHours(0,0,0,0);
            const diff = due - today;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            
            if (days < 0) return { label: 'OVERDUE (ප්‍රමාද වී ඇත)', color: '#ef4444', bg: '#fee2e2' };
            if (days <= 7) return { label: days === 0 ? 'DUE TODAY' : `DUE IN ${days} DAYS`, color: '#f59e0b', bg: '#fef3c7' };
            return { label: `Next: ${due.toLocaleDateString()}`, color: '#16a34a', bg: '#dcfce7' };
        };

        const statusInfo = getStatusInfo(item.status, item.isAvailableForRent);
        const maintInfo  = getMaintenanceInfo(item.nextMaintenanceDate);
        const isIncomplete = !item.photos || item.photos.length === 0 || !item.capacity;

        return (
            <TouchableOpacity 
                style={[styles.vesselCard, isIncomplete && styles.incompleteCard]} 
                activeOpacity={0.9}
            >
                {isIncomplete && (
                    <View style={styles.incompleteBanner}>
                        <Ionicons name="alert-circle" size={16} color="#fff" />
                        <Text style={styles.incompleteBannerText}>Please complete your boat profile to start trips</Text>
                    </View>
                )}
                
                <View style={styles.imageContainer}>
                    <Image 
                        source={item.image ? { uri: item.image } : require('../../assets/adaptive-icon.png')} 
                        style={styles.vesselImage} 
                    />
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                    
                    {/* Maintenance Tag */}
                    <View style={[styles.maintBadge, { backgroundColor: maintInfo.bg }]}>
                        <Ionicons name="construct" size={10} color={maintInfo.color} />
                        <Text style={[styles.maintText, { color: maintInfo.color }]}>{maintInfo.label}</Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.vesselName}>{item.name}</Text>
                    <Text style={styles.vesselType}>{item.vesselType.toUpperCase()} • {item.licenseNumber}</Text>

                    <View style={styles.detailsGrid}>
                        <View style={styles.detailBox}>
                            <Ionicons name="barbell" size={16} color="#64748b" />
                            <Text style={styles.detailVal}>{item.capacity || 0}kg</Text>
                            <Text style={styles.detailLabel}>Capacity</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Ionicons name="people" size={16} color="#64748b" />
                            <Text style={styles.detailVal}>{item.crewCommission || 50}%</Text>
                            <Text style={styles.detailLabel}>Crew Share</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        {isIncomplete ? (
                            <TouchableOpacity 
                                style={[styles.mainAction, { backgroundColor: '#f97316' }]}
                                onPress={() => navigation.navigate('RegisterVessel', { vessel: item })}
                            >
                                <Ionicons name="create" size={18} color="#fff" />
                                <Text style={styles.mainActionText}>Complete Profile</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={[
                                    styles.mainAction, 
                                    { backgroundColor: item.isAvailableForRent || item.status === 'rented' ? '#cbd5e1' : '#2563eb' }
                                ]}
                                onPress={() => {
                                    if (item.isAvailableForRent || item.status === 'rented') {
                                        Alert.alert("Boat Listed for Rent", "This boat is currently listed for rent. To plan your own trips, please remove it from the rental market first.");
                                    } else {
                                        navigation.navigate('CreateTrip', { vessel: item });
                                    }
                                }}
                            >
                                <Text style={styles.mainActionText}>Plan Trip</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.secondaryAction}
                            onPress={() => handleRentOut(item._id, item.status, item.isAvailableForRent)}
                        >
                            <Ionicons name={item.isAvailableForRent ? "eye-off" : "megaphone"} size={20} color="#64748b" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.secondaryAction}
                            onPress={() => handleMaintenance(item)}
                        >
                            <Ionicons name="construct-outline" size={20} color="#f59e0b" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.secondaryAction}
                            onPress={() => handleDelete(item._id, item.status)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const handleMaintenance = (vessel) => {
        Alert.alert(
            "Maintenance Record",
            `Update maintenance for ${vessel.name}`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Record Service Today", 
                    onPress: async () => {
                        const today = new Date();
                        const nextMonth = new Date();
                        nextMonth.setMonth(today.getMonth() + 1); // Default next service in 1 month

                        try {
                            setLoading(true);
                            await client.post(`/api/vessels/${vessel._id}/maintenance`, {
                                lastMaintenanceDate: today,
                                nextMaintenanceDate: nextMonth,
                                notes: "Routine maintenance",
                                status: 'available'
                            });
                            Alert.alert("Success", "Maintenance recorded. Next service scheduled in 1 month.");
                            loadData();
                        } catch (e) {
                            Alert.alert("Error", "Failed to update record");
                        } finally {
                            setLoading(false);
                        }
                    }
                },
                {
                    text: "Start Repairs",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.put(`/api/vessels/${vessel._id}/status`, { status: 'maintenance' });
                            Alert.alert("Success", "Vessel status set to Maintenance");
                            loadData();
                        } catch (e) {
                            Alert.alert("Error", "Failed to update status");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = async (vesselId, status) => {
        if (status === 'in-sea' || status === 'rented') {
            Alert.alert("Error", "Cannot delete a vessel that is currently active.");
            return;
        }

        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to remove this vessel from your fleet?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await client.delete(`/api/vessels/${vesselId}`);
                            Alert.alert("Success", "Vessel removed");
                            loadData();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete vessel");
                        }
                    }
                }
            ]
        );
    };



    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.welcomeText}>Vessel Manager</Text>
                            <Text style={styles.subText}>Manage your fleet</Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                            <Ionicons name="person-circle-outline" size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('RegisterVessel')}
                    >
                        <Ionicons name="add-circle" size={24} color="#fff" />
                        <Text style={styles.addBtnText}>Register New Boat</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={myVessels}
                    ListHeaderComponent={
                        myTrips.length > 0 && (
                            <View style={styles.myTripsSection}>
                                <Text style={styles.sectionTitle}>My Active Trips</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripsScroll}>
                                    {myTrips.map((trip) => (
                                        <TouchableOpacity 
                                            key={trip._id} 
                                            style={styles.tripMiniCard}
                                            onPress={() => navigation.navigate('ManageTrip', { tripId: trip._id })}
                                        >
                                            <View style={styles.tripCardTop}>
                                                <Ionicons name="boat" size={20} color="#2563eb" />
                                                <Text style={styles.miniVesselName}>{trip.vesselId?.name}</Text>
                                            </View>
                                            <Text style={styles.miniCrewStatus}>{trip.crew?.length} / {trip.maxFishermen} Crew Joined</Text>
                                            {trip.requests?.length > 0 && (
                                                <View style={styles.requestBadge}>
                                                    <Text style={styles.requestBadgeText}>{trip.requests.length} NEW REQUESTS</Text>
                                                </View>
                                            )}
                                            <View style={styles.manageLabel}>
                                                <Text style={styles.manageLabelText}>Manage Crew</Text>
                                                <Ionicons name="arrow-forward" size={14} color="#2563eb" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <Text style={[styles.sectionTitle, { marginTop: 10 }]}>My Vessels</Text>
                            </View>
                        )
                    }
                    renderItem={renderVesselCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="boat-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyText}>You haven't registered any boats yet.</Text>
                            <TouchableOpacity 
                                style={styles.emptyAddBtn}
                                onPress={() => navigation.navigate('RegisterVessel')}
                            >
                                <Text style={styles.emptyAddBtnText}>Register Your First Boat</Text>
                            </TouchableOpacity>
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
        paddingBottom: 25,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTop: {
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
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginHorizontal: 24,
        marginTop: 20,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        gap: 10,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    listContent: {
        padding: 24,
    },
    vesselCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    incompleteCard: {
        borderColor: '#f97316',
        borderWidth: 1,
    },
    incompleteBanner: {
        backgroundColor: '#f97316',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 6,
    },
    incompleteBannerText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    vesselImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#f1f5f9',
    },
    cardContent: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    vesselName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    vesselType: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 2,
    },
    statusBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    maintBadge: {
        position: 'absolute',
        top: 15,
        left: 15,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    maintText: {
        fontSize: 9,
        fontWeight: '800',
    },
    actionGrid: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 5,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
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
    emptyAddBtn: {
        marginTop: 20,
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyAddBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 12,
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
    requestBadge: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    requestBadgeText: {
        color: '#ef4444',
        fontSize: 9,
        fontWeight: '800',
    },
});

export default BoatOwnerDashboardScreen;
