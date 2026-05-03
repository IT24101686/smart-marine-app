import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapComponent from '../components/MapComponent';

const { width } = Dimensions.get('window');

const OrderManagementScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [user, setUser] = useState(null);
    const [expandedMapId, setExpandedMapId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                fetchOrders(parsedUser.role);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchOrders = async (role) => {
        setLoading(true);
        try {
            const endpoint = role === 'main_buyer' ? '/orders/received' : '/orders/my';
            const response = await client.get(endpoint);
            setOrders(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        Alert.alert(
            "Cancel Order",
            "Are you sure you want to cancel this order?",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await client.put(`/orders/${orderId}/cancel`);
                            Alert.alert("Success", "Order cancelled");
                            fetchOrders(user.role);
                        } catch (error) {
                            Alert.alert("Error", "Failed to cancel order");
                        }
                    }
                }
            ]
        );
    };


    const updateStatus = async (orderId, newStatus) => {
        try {
            await client.put(`/orders/${orderId}/status`, { status: newStatus });
            Alert.alert("Success", `Order marked as ${newStatus}`);
            fetchOrders(user.role);
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'confirmed': return '#3b82f6';
            case 'delivered': return '#10b981';
            case 'cancelled': return '#ef4444';
            default: return '#64748b';
        }
    };

    const renderOrderCard = ({ item }) => (
        <View style={styles.orderCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.orderId}>Order #{item._id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.itemsSection}>
                {item.items.map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                        <Ionicons name="fish" size={16} color="#64748b" />
                        <Text style={styles.itemText}>{it.fishType} ({it.weight}kg)</Text>
                    </View>
                ))}
            </View>

            <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="person" size={14} color="#2563eb" />
                    </View>
                    <Text style={styles.detailText}>
                        {user?.role === 'main_buyer' ? `From: ${item.customerId?.name}` : `From: ${item.buyerId?.name}`}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="location" size={14} color="#2563eb" />
                    </View>
                    <Text style={styles.detailText} numberOfLines={1}>{item.deliveryAddress}</Text>
                </View>
            </View>

            <View style={styles.footerRow}>
                <View>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalPrice}>LKR {item.totalPrice?.toLocaleString()}</Text>
                </View>
                
                {user?.role === 'customer' && item.status === 'pending' && (
                    <TouchableOpacity 
                        style={styles.customerCancelBtn}
                        onPress={() => handleCancelOrder(item._id)}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                )}
                
                {user?.role === 'customer' && (
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.trackBtn, { width: 140 }]}
                        onPress={() => setExpandedMapId(expandedMapId === item._id ? null : item._id)}
                    >
                        <Ionicons name="map-outline" size={18} color="#2563eb" />
                        <Text style={[styles.btnText, { color: '#2563eb' }]}>
                            {expandedMapId === item._id ? "Close Map" : "Track"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {user?.role === 'main_buyer' && item.status === 'pending' && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.confirmBtn]}
                        onPress={() => updateStatus(item._id, 'confirmed')}
                    >
                        <Text style={styles.btnText}>Accept Order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.cancelBtn]}
                        onPress={() => updateStatus(item._id, 'cancelled')}
                    >
                        <Text style={[styles.btnText, { color: '#64748b' }]}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}

            {user?.role === 'main_buyer' && item.status === 'confirmed' && (
                <TouchableOpacity 
                    style={[styles.actionBtn, styles.deliverBtn]}
                    onPress={() => updateStatus(item._id, 'delivered')}
                >
                    <Ionicons name="bicycle" size={20} color="#fff" />
                    <Text style={styles.btnText}>Mark as Delivered</Text>
                </TouchableOpacity>
            )}

            {expandedMapId === item._id && (
                <View style={styles.mapWrapper}>
                    <MapComponent 
                        address1={item.buyerId?.address} 
                        address2={item.deliveryAddress} 
                    />
                    <View style={styles.mapLabel}>
                        <Text style={styles.mapLabelText}>Tracking Delivery Route</Text>
                    </View>
                </View>
            )}
        </View>
    );


    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1e3a8a', '#1e40af']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{user?.role === 'main_buyer' ? 'Order Management' : 'My Orders'}</Text>
                        <TouchableOpacity onPress={() => fetchOrders(user?.role)}>
                            <Ionicons name="refresh" size={24} color="#fff" />
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
                    data={orders}
                    renderItem={renderOrderCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="basket-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No orders found yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 10 },
    title: { color: '#fff', fontSize: 22, fontWeight: '800' },
    listContent: { padding: 24 },
    orderCard: { backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    orderId: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    orderDate: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '800' },
    detailsSection: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 15, marginBottom: 15 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
    iconCircle: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    detailText: { fontSize: 14, color: '#475569', fontWeight: '600', flex: 1 },
    itemsSection: { marginBottom: 15, paddingHorizontal: 5 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    itemText: { fontSize: 15, color: '#1e293b', fontWeight: '700' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
    totalLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    totalPrice: { fontSize: 20, fontWeight: '900', color: '#1e3a8a' },
    customerCancelBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
    cancelText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },
    actionButtons: { flexDirection: 'row', gap: 12, marginTop: 15 },
    actionBtn: { flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
    confirmBtn: { backgroundColor: '#2563eb' },
    cancelBtn: { backgroundColor: '#f1f5f9' },
    deliverBtn: { backgroundColor: '#16a34a', marginTop: 15 },
    trackBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', marginTop: 15 },
    mapWrapper: {
        marginTop: 15,
        height: 250,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    mapLabel: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        right: 15,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 8,
        borderRadius: 12,
        alignItems: 'center'
    },
    mapLabelText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563eb'
    },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#94a3b8', fontSize: 16, fontWeight: '700' }
});

export default OrderManagementScreen;
