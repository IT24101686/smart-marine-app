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
    Alert
} from 'react-native';


import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

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
                } catch (e) {
                    console.error("JSON Parse error:", e);
                }
            }
        } catch (error) {
            console.error("AsyncStorage error:", error);
        } finally {
            setLoading(false);
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

                    {/* Recent Activity */}
                    <View style={styles.recentHeader}>
                        <Text style={styles.sectionTitle}>Recent Trips</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
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
    }
});


export default HomeScreen;
