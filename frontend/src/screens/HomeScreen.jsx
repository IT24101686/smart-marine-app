import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    Dimensions,
    TextInput,
    ActivityIndicator,
    Alert,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [finishedTrips, setFinishedTrips] = React.useState([]);
    const [tripsLoading, setTripsLoading] = React.useState(false);

    React.useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    setUser(parsed);
                    if (parsed.role === 'trip_planner') {
                        fetchFinishedTrips();
                    }
                } catch (e) {
                    console.error('JSON Parse error:', e);
                }
            }
        } catch (error) {
            console.error('AsyncStorage error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFinishedTrips = async () => {
        setTripsLoading(true);
        try {
            const res = await client.get('/api/trips/my-trips');
            const all = Array.isArray(res.data) ? res.data : [];
            // Show completed + sold trips only
            const finished = all.filter(t => ['completed', 'sold'].includes(t.status));
            setFinishedTrips(finished);
        } catch (e) {
            console.warn('Could not load trips:', e.message);
        } finally {
            setTripsLoading(false);
        }
    };



    return (
        <View style={styles.container}>
            {/* Header Section */}
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.welcomeText}>Hello, {user?.name || 'User'}</Text>
                            <Text style={styles.subText}>{user?.role?.replace('_', ' ')} • {user?.district}</Text>
                        </View>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                                <Ionicons name="notifications-outline" size={26} color="#fff" />
                                <View style={styles.badge} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                                <Ionicons name="person-circle-outline" size={32} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <Image 
                            source={require('../../assets/logo.png')} 
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading your dashboard...</Text>
                </View>
            ) : (
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#64748b" />
                        <TextInput 
                            placeholder="Search for boats, trips, or buyers..." 
                            style={styles.searchInput}
                        />
                    </View>

                    {/* Quick Actions Grid */}
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.grid}>
                        {user?.role === 'boat_owner' && (
                            <>
                                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('BoatOwnerDashboard')}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                                        <Ionicons name="boat" size={24} color="#2563eb" />
                                    </View>
                                    <Text style={styles.gridLabel}>My Boats</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Earnings')}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                                        <Ionicons name="wallet" size={24} color="#16a34a" />
                                    </View>
                                    <Text style={styles.gridLabel}>My Earnings</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {user?.role === 'trip_planner' && (
                            <>
                                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('RentalDashboard')}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#f5f3ff' }]}>
                                        <Ionicons name="key" size={24} color="#7c3aed" />
                                    </View>
                                    <Text style={styles.gridLabel}>Rent Vessel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Earnings')}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
                                        <Ionicons name="stats-chart" size={24} color="#ef4444" />
                                    </View>
                                    <Text style={styles.gridLabel}>My Profits</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {user?.role === 'fisherman' && (
                            <>
                                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('FishermanDashboard')}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                                        <Ionicons name="search" size={24} color="#2563eb" />
                                    </View>
                                    <Text style={styles.gridLabel}>Find Trips</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Earnings')}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                                        <Ionicons name="cash" size={24} color="#16a34a" />
                                    </View>
                                    <Text style={styles.gridLabel}>My Salary</Text>
                                </TouchableOpacity>
                            </>
                        )}


                        {user?.role === 'main_buyer' && (
                            <>
                                <TouchableOpacity 
                                    style={styles.gridItem} 
                                    onPress={() => navigation.navigate('BuyerDashboard')}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
                                        <Ionicons name="cart" size={24} color="#ea580c" />
                                    </View>
                                    <Text style={styles.gridLabel}>Market Hub</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.gridItem} 
                                    onPress={() => navigation.navigate('OrderManagement')}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                                        <Ionicons name="receipt" size={24} color="#16a34a" />
                                    </View>
                                    <Text style={styles.gridLabel}>Manage Sales</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {user?.role === 'customer' && (
                            <>
                                <TouchableOpacity 
                                    style={styles.gridItem} 
                                    onPress={() => navigation.navigate('CustomerDashboard')}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                                        <Ionicons name="basket" size={24} color="#16a34a" />
                                    </View>
                                    <Text style={styles.gridLabel}>Fish Market</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.gridItem} 
                                    onPress={() => navigation.navigate('OrderManagement')}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                                        <Ionicons name="list" size={24} color="#2563eb" />
                                    </View>
                                    <Text style={styles.gridLabel}>My Orders</Text>
                                </TouchableOpacity>
                            </>
                        )}

                    </View>




                    {/* Live Sea Status Card */}
                    <View style={styles.statusCard}>
                        <LinearGradient
                            colors={['#3b82f6', '#2563eb']}
                            style={styles.statusGradient}
                        >
                            <View style={styles.statusInfo}>
                                <Text style={styles.statusLabel}>Live Sea Status</Text>
                                <Text style={styles.statusValue}>Calm & Safe</Text>
                                <Text style={styles.statusSub}>Galle Harbor Area</Text>
                            </View>
                            <Ionicons name="water" size={60} color="rgba(255,255,255,0.3)" />
                        </LinearGradient>
                    </View>

                    {/* Finished Trips Section — trip_planner only */}
                    {user?.role === 'trip_planner' && (
                        <View>
                            <View style={styles.recentHeader}>
                                <Text style={styles.sectionTitle}>Previous Trips</Text>
                                <TouchableOpacity onPress={fetchFinishedTrips}>
                                    <Ionicons name="refresh" size={20} color="#2563eb" />
                                </TouchableOpacity>
                            </View>

                            {tripsLoading ? (
                                <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 10 }} />
                            ) : finishedTrips.length === 0 ? (
                                <View style={styles.emptyTrips}>
                                    <Ionicons name="boat-outline" size={48} color="#cbd5e1" />
                                    <Text style={styles.emptyTripsText}>No completed trips yet.</Text>
                                </View>
                            ) : (
                                finishedTrips.map((trip) => {
                                    const isSold   = trip.status === 'sold';
                                    const date     = new Date(trip.departureTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    const crewCount = (trip.crew || []).length;
                                    const revenue  = trip.totalRevenue || trip.estimatedRevenue || 0;
                                    return (
                                        <TouchableOpacity
                                            key={trip._id}
                                            style={styles.tripCard}
                                            onPress={() => navigation.navigate('TripSummary', { tripId: trip._id })}
                                            activeOpacity={0.85}
                                        >
                                            {/* Status badge */}
                                            <View style={[styles.tripStatusBadge, { backgroundColor: isSold ? '#dcfce7' : '#fef9c3' }]}>
                                                <Text style={[styles.tripStatusText, { color: isSold ? '#166534' : '#854d0e' }]}>
                                                    {isSold ? '✅ SOLD' : '🔵 COMPLETED'}
                                                </Text>
                                            </View>

                                            {/* Vessel + date */}
                                            <View style={styles.tripCardHeader}>
                                                <View style={styles.tripIconBox}>
                                                    <Ionicons name="boat" size={22} color="#2563eb" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.tripVesselName}>{trip.vesselId?.name || 'Unknown Vessel'}</Text>
                                                    <Text style={styles.tripDate}>📅 {date}</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                                            </View>

                                            {/* Stats row */}
                                            <View style={styles.tripStatsRow}>
                                                <View style={styles.tripStat}>
                                                    <Text style={styles.tripStatLabel}>Crew</Text>
                                                    <Text style={styles.tripStatValue}>👥 {crewCount}</Text>
                                                </View>
                                                <View style={styles.tripStatDivider} />
                                                <View style={styles.tripStat}>
                                                    <Text style={styles.tripStatLabel}>Type</Text>
                                                    <Text style={styles.tripStatValue}>🎣 {trip.tripType || 'Standard'}</Text>
                                                </View>
                                                <View style={styles.tripStatDivider} />
                                                <View style={styles.tripStat}>
                                                    <Text style={styles.tripStatLabel}>{isSold ? 'Revenue' : 'Est. Value'}</Text>
                                                    <Text style={[styles.tripStatValue, { color: '#16a34a' }]}>
                                                        {revenue > 0 ? `LKR ${Math.round(revenue).toLocaleString()}` : 'See summary'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {/* Generic Recent Activity for other roles */}
                    {user?.role !== 'trip_planner' && (
                        <View>
                            <View style={styles.recentHeader}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                            </View>
                            <View style={styles.activityCard}>
                                <View style={styles.activityIcon}>
                                    <Ionicons name="boat-outline" size={20} color="#2563eb" />
                                </View>
                                <View style={styles.activityText}>
                                    <Text style={styles.activityTitle}>Ocean Queen Arrived</Text>
                                    <Text style={styles.activityTime}>2 hours ago • Galle Harbor</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                            </View>
                            <View style={styles.activityCard}>
                                <View style={styles.activityIcon}>
                                    <Ionicons name="people" size={20} color="#16a34a" />
                                </View>
                                <View style={styles.activityText}>
                                    <Text style={styles.activityTitle}>Crew Request Received</Text>
                                    <Text style={styles.activityTime}>5 hours ago • 3 applicants</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                            </View>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
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
        paddingBottom: 30,
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
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconBtn: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#1e3a8a',
    },

    welcomeText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
    },
    userName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        marginTop: 2,
    },
    notifBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 10,
        height: 10,
        backgroundColor: '#ef4444',
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#1e3a8a',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    logo: {
        width: width * 0.5,
        height: 80,
    },
    content: {
        padding: 24,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginTop: -50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
        marginTop: 30,
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    gridItem: {
        width: (width - 64) / 2,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    statusCard: {
        marginTop: 30,
        borderRadius: 24,
        overflow: 'hidden',
    },
    statusGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
    },
    statusLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 4,
    },
    statusSub: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginTop: 2,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 16,
    },
    seeAll: {
        color: '#2563eb',
        fontWeight: '700',
        fontSize: 14,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    activityIcon: {
        width: 40,
        height: 40,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    activityText: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
    },
    activityTime: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    centerLoader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    // ── Finished trip cards ─────────────────────────────────
    tripCard: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    tripStatusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    tripStatusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    tripCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    tripIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tripVesselName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    tripDate: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 2,
    },
    tripStatsRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
    },
    tripStat: {
        flex: 1,
        alignItems: 'center',
    },
    tripStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#e2e8f0',
    },
    tripStatLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    tripStatValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
    },
    emptyTrips: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyTripsText: {
        marginTop: 10,
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '600',
    },
});


export default HomeScreen;
