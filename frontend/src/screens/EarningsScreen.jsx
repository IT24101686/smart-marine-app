import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    ActivityIndicator, 
    TouchableOpacity,
    Dimensions,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const { width } = Dimensions.get('window');

const EarningsScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [payouts, setPayouts] = useState([]);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [monthlyStats, setMonthlyStats] = useState({ count: 0, highest: 0 });

    useEffect(() => {
        fetchPayouts();
    }, []);

    const fetchPayouts = async () => {
        try {
            const response = await client.get('/api/trips/payouts');
            const data = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPayouts(data);
            
            const total = data.reduce((acc, curr) => acc + curr.amount, 0);
            setTotalEarnings(total);

            // Calculate some basic stats
            if (data.length > 0) {
                const highest = Math.max(...data.map(p => p.amount));
                setMonthlyStats({ count: data.length, highest });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderPayoutCard = ({ item }) => (
        <View style={styles.payoutCard}>
            <View style={[styles.payoutIcon, { backgroundColor: item.type === 'commission' ? '#f0f9ff' : '#f0fdf4' }]}>
                <Ionicons 
                    name={item.role === 'boat_owner' ? 'boat' : item.role === 'trip_planner' ? 'briefcase' : 'person'} 
                    size={22} 
                    color={item.type === 'commission' ? '#0369a1' : '#166534'} 
                />
            </View>
            <View style={styles.payoutDetails}>
                <Text style={styles.payoutType}>{item.role.replace('_', ' ').toUpperCase()}</Text>
                <Text style={styles.payoutInfo}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.amountBox}>
                <Text style={styles.amountValue}>+ {item.amount.toLocaleString()}</Text>
                <View style={styles.statusDotRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Settled</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Earnings Center</Text>
                        <TouchableOpacity onPress={fetchPayouts} style={styles.refreshBtn}>
                            <Ionicons name="reload" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mainBalance}>
                        <Text style={styles.balanceLabel}>Total Profit Share</Text>
                        <View style={styles.balanceRow}>
                            <Text style={styles.currency}>LKR</Text>
                            <Text style={styles.balanceValue}>{totalEarnings.toLocaleString()}</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Trips</Text>
                            <Text style={styles.statValue}>{monthlyStats.count}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Highest Payout</Text>
                            <Text style={styles.statValue}>LKR {monthlyStats.highest.toLocaleString()}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.body}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Recent Transactions</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                ) : (
                    <FlatList
                        data={payouts}
                        renderItem={renderPayoutCard}
                        keyExtractor={item => item._id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="wallet-outline" size={40} color="#94a3b8" />
                                </View>
                                <Text style={styles.emptyTitle}>No earnings yet</Text>
                                <Text style={styles.emptySub}>Your trip payouts will appear here once catches are sold.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    mainBalance: { alignItems: 'center', marginTop: 30 },
    balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 5 },
    currency: { color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '700', marginRight: 8 },
    balanceValue: { color: '#fff', fontSize: 42, fontWeight: '900' },
    statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 24, marginTop: 30, borderRadius: 20, paddingVertical: 15, alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    divider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
    statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    statValue: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 4 },
    body: { flex: 1, marginTop: 20 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15 },
    listTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    seeAll: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
    listContent: { paddingHorizontal: 24, paddingBottom: 30 },
    payoutCard: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    payoutIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    payoutDetails: { flex: 1, marginLeft: 16 },
    payoutType: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    payoutInfo: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 4 },
    amountBox: { alignItems: 'flex-end' },
    amountValue: { fontSize: 16, fontWeight: '900', color: '#16a34a' },
    statusDotRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#16a34a', marginRight: 4 },
    statusText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 }
});

export default EarningsScreen;
