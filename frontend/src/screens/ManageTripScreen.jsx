import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import MapComponent from '../components/MapComponent';


const ManageTripScreen = ({ route, navigation }) => {
    const { tripId } = route.params;
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState({});

    useEffect(() => {
        fetchTripDetails();
    }, []);

    const fetchTripDetails = async () => {
        try {
            const response = await client.get(`/api/trips/${tripId}`);
            setTrip(response.data);
            
            // Initialize attendance state
            const initialAttendance = {};
            response.data.crew.forEach(member => {
                initialAttendance[member._id] = true; // Default to present
            });
            setAttendance(initialAttendance);
            
            setLoading(false);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not fetch trip details");
            navigation.goBack();
        }
    };

    const handleApprove = async (userId, userName) => {
        try {
            setLoading(true);
            await client.put(`/api/trips/${tripId}/approve/${userId}`);
            Alert.alert("Success", `${userName} has been added to the crew!`);
            fetchTripDetails();
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", error.response?.data?.message || "Failed to approve fisherman");
        }
    };

    const handleReject = async (userId, userName) => {
        try {
            setLoading(true);
            await client.put(`/api/trips/${tripId}/reject/${userId}`);
            Alert.alert("Rejected", `${userName}'s request has been declined.`);
            fetchTripDetails();
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Failed to reject fisherman");
        }
    };

    const toggleAttendance = (userId) => {
        setAttendance(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };
    const handleStartJourney = async () => {
        const presentCrewCount = Object.values(attendance).filter(val => val === true).length;
        const minRequired = trip.minFishermen || 1;

        if (presentCrewCount < minRequired) {
            Alert.alert(
                "Insufficient Crew", 
                `This trip requires at least ${minRequired} fishermen to start. Currently, only ${presentCrewCount} are marked as present.`
            );
            return;
        }

        try {
            setLoading(true);
            
            // 1. Mark Attendance first
            const attendanceData = Object.keys(attendance).map(userId => ({
                userId,
                isPresent: attendance[userId]
            }));
            
            await client.put(`/api/trips/${tripId}/attendance`, { attendance: attendanceData });

            // 2. Start Trip
            await client.put(`/api/trips/${tripId}/start`);
            navigation.replace('ActiveTrip', { tripId });
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Failed to start trip");
        }
    };

    const handleReschedule = async () => {
        // For simplicity, we'll just set it to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        try {
            setLoading(true);
            await client.put(`/api/trips/${tripId}/reschedule`, { newDate: tomorrow });
            Alert.alert("Rescheduled", "Trip has been moved to tomorrow.");
            fetchTripDetails();
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Failed to reschedule");
        }
    };

    if (loading && !trip) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Manage Crew</Text>
                        <View style={{ width: 28 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Trip Status Info */}
                <View style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <View>
                            <Text style={styles.vesselLabel}>Vessel</Text>
                            <Text style={styles.vesselValue}>{trip.vesselId?.name || "Unknown Vessel"}</Text>

                        </View>
                        <View style={[styles.crewCountBadge, trip.status === 'sold' && { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.crewCountText, trip.status === 'sold' && { color: '#166534' }]}>
                                {trip.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Buyer Info Section (If Sold) */}
                {trip.status === 'sold' && trip.buyerId && (
                    <View style={styles.buyerCard}>
                        <Text style={styles.sectionTitle}>Purchased By (Main Buyer)</Text>
                        <View style={styles.buyerInfoRow}>
                            <Ionicons name="person-circle" size={40} color="#2563eb" />
                            <View style={styles.buyerText}>
                                <Text style={styles.buyerName}>{trip.buyerId.name}</Text>
                                <Text style={styles.buyerPhone}>{trip.buyerId.phone}</Text>
                            </View>
                        </View>
                        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Buyer Location</Text>
                        <MapComponent address1={trip.buyerId.address} />
                    </View>
                )}


                {/* Pending Requests Section */}
                <Text style={styles.sectionTitle}>Join Requests ({trip.requests.length})</Text>
                {trip.requests.length > 0 ? (
                    trip.requests.map((request) => (
                        <View key={request._id} style={styles.userCard}>
                            <Image 
                                source={request.profileImage ? { uri: request.profileImage } : require('../../assets/adaptive-icon.png')} 
                                style={styles.userAvatar} 
                            />
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{request.name}</Text>
                                <Text style={styles.userDistrict}>{request.district}</Text>
                            </View>
                            <View style={styles.requestActions}>
                                <TouchableOpacity 
                                    style={styles.approveBtn}
                                    onPress={() => handleApprove(request._id, request.name)}
                                >
                                    <Text style={styles.approveBtnText}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.rejectBtn}
                                    onPress={() => handleReject(request._id, request.name)}
                                >
                                    <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No pending requests.</Text>
                )}

                {/* Current Crew & Attendance Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Crew Attendance</Text>
                    <View style={styles.infoBadge}>
                        <Ionicons name="information-circle-outline" size={14} color="#2563eb" />
                        <Text style={styles.infoBadgeText}>Mark who joined today</Text>
                    </View>
                </View>

                {trip.crew.length > 0 ? (
                    trip.crew.map((member) => (
                        <TouchableOpacity 
                            key={member._id} 
                            style={[styles.userCard, !attendance[member._id] && styles.absentCard]}
                            onPress={() => toggleAttendance(member._id)}
                            activeOpacity={0.7}
                        >
                            <Image 
                                source={member.profileImage ? { uri: member.profileImage } : require('../../assets/adaptive-icon.png')} 
                                style={[styles.userAvatar, !attendance[member._id] && { opacity: 0.5 }]} 
                            />
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, !attendance[member._id] && { color: '#94a3b8' }]}>{member.name}</Text>
                                <Text style={styles.userDistrict}>{member.district}</Text>
                            </View>
                            
                            <View style={[styles.attendanceToggle, attendance[member._id] ? styles.presentToggle : styles.absentToggle]}>
                                <Ionicons 
                                    name={attendance[member._id] ? "checkmark-circle" : "close-circle"} 
                                    size={24} 
                                    color={attendance[member._id] ? "#22c55e" : "#ef4444"} 
                                />
                                <Text style={[styles.attendanceText, { color: attendance[member._id] ? "#166534" : "#991b1b" }]}>
                                    {attendance[member._id] ? "PRESENT" : "ABSENT"}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No crew members joined yet.</Text>
                )}

                {trip.crew.length < (trip.minFishermen || 1) && (
                    <View style={styles.warningBox}>
                        <Ionicons name="warning" size={18} color="#ef4444" />
                        <Text style={styles.warningText}>
                            At least {trip.minFishermen || 1} approved fishermen are required. You have {trip.crew.length}.
                        </Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.rescheduleBtn]} 
                        onPress={handleReschedule}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#64748b" />
                        <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.actionBtn, 
                            styles.startBtn, 
                            trip.crew.length === 0 && { opacity: 0.5 }
                        ]} 
                        onPress={handleStartJourney}
                        disabled={trip.crew.length < (trip.minFishermen || 1)}
                    >
                        <LinearGradient
                            colors={trip.crew.length === 0 ? ['#94a3b8', '#64748b'] : ['#22c55e', '#16a34a']}
                            style={styles.startBtnGradient}
                        >
                            <Ionicons name="play" size={20} color="#fff" />
                            <Text style={styles.startBtnText}>Start Journey</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    scrollContent: {
        padding: 24,
    },
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    vesselLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    vesselValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
        marginTop: 4,
    },
    crewCountBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    crewCountText: {
        color: '#2563eb',
        fontWeight: '700',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 30,
        marginBottom: 16,
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    infoBadgeText: {
        fontSize: 10,
        color: '#2563eb',
        fontWeight: '700',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f1f5f9',
    },
    userInfo: {
        flex: 1,
        marginLeft: 16,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    userDistrict: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    approveBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    approveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    requestActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rejectBtn: {
        padding: 4,
    },
    confirmedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    confirmedText: {
        color: '#22c55e',
        fontWeight: '700',
        fontSize: 14,
    },
    attendanceToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
    },
    presentToggle: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    absentToggle: {
        backgroundColor: '#fef2f2',
        borderColor: '#fee2e2',
    },
    attendanceText: {
        fontSize: 10,
        fontWeight: '800',
    },
    absentCard: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderWidth: 1,
    },
    emptyText: {
        fontSize: 14,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 40,
        marginBottom: 20,
    },
    actionBtn: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    rescheduleBtn: {
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    rescheduleBtnText: {
        color: '#64748b',
        fontWeight: '700',
        fontSize: 15,
    },
    startBtn: {
        flex: 1.5,
    },
    startBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    startBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyerCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    buyerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 16,
    },
    buyerText: {
        flex: 1,
    },
    buyerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    buyerPhone: {
        fontSize: 14,
        color: '#64748b',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 16,
        marginTop: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    warningText: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '700',
        flex: 1,
    }
});


export default ManageTripScreen;
