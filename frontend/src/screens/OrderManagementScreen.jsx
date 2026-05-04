import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    TextInput
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
    const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
    const [invoiceVisible, setInvoiceVisible] = useState(false);

    // ── Edit Order States ────────────────────────────────────
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editedItems, setEditedItems] = useState([]); // [{ fishType, grade, weight, price }]
    const [updating, setUpdating] = useState(false);

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
            const endpoint = role === 'main_buyer' ? '/api/orders/received' : '/api/orders/my';
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
                            await client.put(`/api/orders/${orderId}/cancel`);
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

    const handlePayOrder = async (orderId) => {
        try {
            setLoading(true);
            await client.put(`/api/orders/${orderId}/pay`);
            Alert.alert("Success 🎉", "Payment successful! Your order is now being processed for delivery.");
            fetchOrders(user.role);
        } catch (error) {
            console.error("Payment error:", error);
            Alert.alert("Error", error.response?.data?.message || "Payment failed");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await client.put(`/api/orders/${orderId}/status`, { status: newStatus });
            Alert.alert("Success", `Order marked as ${newStatus}`);
            fetchOrders(user.role);
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    // ── Update Items Submit ───────────────────────────────────
    const handleUpdateItems = async () => {
        setUpdating(true);
        try {
            await client.put(`/api/orders/${editingOrder._id}/items`, { items: editedItems });
            Alert.alert("Success", "Order items updated successfully");
            setEditModalVisible(false);
            fetchOrders(user.role);
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Failed to update order");
        } finally {
            setUpdating(false);
        }
    };

    const openEditModal = (order) => {
        setEditingOrder(order);
        setEditedItems(JSON.parse(JSON.stringify(order.items))); // Deep copy
        setEditModalVisible(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'confirmed': return '#3b82f6';
            case 'paid': return '#8b5cf6';
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
                        {item.status === 'processing' ? 'PROCESSING' : item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.itemsSection}>
                {item.items.map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons name="fish" size={16} color="#64748b" />
                            <Text style={styles.itemText}>{it.fishType} ({it.weight}kg)</Text>
                        </View>
                        <Text style={styles.itemPriceText}>LKR {it.price?.toLocaleString()}/kg</Text>
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

                {user?.role === 'main_buyer' && (item.status === 'pending' || item.status === 'processing') && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => openEditModal(item)}
                    >
                        <Ionicons name="create-outline" size={18} color="#2563eb" />
                        <Text style={[styles.btnText, { color: '#2563eb' }]}>Edit</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.actionButtons}>
                {user?.role === 'customer' && item.status === 'confirmed' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#8b5cf6', flex: 1 }]}
                        onPress={() => handlePayOrder(item._id)}
                    >
                        <Ionicons name="card-outline" size={20} color="#fff" />
                        <Text style={styles.btnText}>Pay Now</Text>
                    </TouchableOpacity>
                )}

                {user?.role === 'customer' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.invoiceBtn]}
                        onPress={() => {
                            setSelectedOrderForInvoice(item);
                            setInvoiceVisible(true);
                        }}
                    >
                        <Ionicons name="receipt-outline" size={18} color="#059669" />
                        <Text style={[styles.btnText, { color: '#059669' }]}>Invoice</Text>
                    </TouchableOpacity>
                )}

                {user?.role === 'customer' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.trackBtn, { flex: 1 }]}
                        onPress={() => setExpandedMapId(expandedMapId === item._id ? null : item._id)}
                    >
                        <Ionicons name="map-outline" size={18} color="#2563eb" />
                        <Text style={[styles.btnText, { color: '#2563eb' }]}>
                            {expandedMapId === item._id ? "Close" : "Track"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {user?.role === 'main_buyer' && (item.status === 'pending' || item.status === 'processing') && (
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
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => updateStatus(item._id, 'delivered')}
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.btnText}>Delivered</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.trackBtn, { flex: 1 }]}
                        onPress={() => setExpandedMapId(expandedMapId === item._id ? null : item._id)}
                    >
                        <Ionicons name="map-outline" size={18} color="#2563eb" />
                        <Text style={[styles.btnText, { color: '#2563eb' }]}>Route</Text>
                    </TouchableOpacity>
                </View>
            )}

            {expandedMapId === item._id && (
                <View style={styles.mapWrapper}>
                    <MapComponent
                        address1={item.buyerId?.address}
                        address2={item.deliveryAddress}
                        coord1={item.buyerId?.latitude ? { lat: item.buyerId.latitude, lon: item.buyerId.longitude } : null}
                        coord2={item.customerId?.latitude ? { lat: item.customerId.latitude, lon: item.customerId.longitude } : null}
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

            {/* ══════════ EDIT ORDER ITEMS MODAL ══════════ */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.editModal}>
                        <View style={styles.invoiceHeader}>
                            <Text style={styles.invoiceTitle}>ADJUST QUANTITIES</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close-circle" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {editedItems.map((item, index) => (
                                <View key={index} style={styles.editRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemText}>{item.fishType}</Text>
                                        <Text style={styles.orderDate}>{item.grade}</Text>
                                    </View>
                                    <View style={styles.weightInputWrapper}>
                                        <TextInput
                                            style={styles.weightInput}
                                            value={String(item.weight)}
                                            keyboardType="numeric"
                                            onChangeText={(val) => {
                                                const newItems = [...editedItems];
                                                newItems[index].weight = parseFloat(val) || 0;
                                                setEditedItems(newItems);
                                            }}
                                        />
                                        <Text style={styles.kgLabel}>kg</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveBtn, updating && { opacity: 0.7 }]}
                            onPress={handleUpdateItems}
                            disabled={updating}
                        >
                            {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Order Items</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ══════════ DIGITAL INVOICE MODAL ══════════ */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={invoiceVisible}
                onRequestClose={() => setInvoiceVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.invoiceModal}>
                        <View style={styles.invoiceHeader}>
                            <TouchableOpacity onPress={() => setInvoiceVisible(false)}>
                                <Ionicons name="close-circle" size={30} color="#64748b" />
                            </TouchableOpacity>
                            <Text style={styles.invoiceTitle}>DIGITAL INVOICE</Text>
                            <TouchableOpacity onPress={() => Alert.alert("Download", "Invoice downloaded to your device!")}>
                                <Ionicons name="download-outline" size={24} color="#2563eb" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Brand Header */}
                            <View style={styles.brandHeader}>
                                <LinearGradient colors={['#1e3a8a', '#1e40af']} style={styles.logoCircle}>
                                    <Ionicons name="fish" size={30} color="#fff" />
                                </LinearGradient>
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={styles.brandName}>මාළු කඩේ</Text>
                                    <Text style={styles.brandTagline}>Fresh from the ocean to your home</Text>
                                </View>
                            </View>

                            <View style={styles.invoiceMeta}>
                                <View>
                                    <Text style={styles.metaLabel}>INVOICE TO</Text>
                                    <Text style={styles.metaValue}>{user?.name}</Text>
                                    <Text style={styles.metaSub}>{selectedOrderForInvoice?.deliveryAddress}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.metaLabel}>INVOICE NO</Text>
                                    <Text style={styles.metaValue}>#{selectedOrderForInvoice?._id.slice(-8).toUpperCase()}</Text>
                                    <Text style={styles.metaLabel}>DATE</Text>
                                    <Text style={styles.metaValue}>{new Date(selectedOrderForInvoice?.createdAt).toLocaleDateString()}</Text>
                                </View>
                            </View>

                            <View style={styles.invoiceTable}>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>DESCRIPTION</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
                                </View>

                                {selectedOrderForInvoice?.items.map((it, idx) => (
                                    <View key={idx} style={styles.tableRow}>
                                        <Text style={[styles.tableRowText, { flex: 2 }]}>{it.fishType}</Text>
                                        <Text style={[styles.tableRowText, { flex: 1, textAlign: 'center' }]}>{it.weight} kg</Text>
                                        <Text style={[styles.tableRowText, { flex: 1, textAlign: 'right', fontWeight: '900' }]}>
                                            LKR {(it.price * it.weight).toLocaleString()}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.invoiceSummary}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Subtotal</Text>
                                    <Text style={styles.summaryValue}>LKR {selectedOrderForInvoice?.totalPrice?.toLocaleString()}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Delivery Fee</Text>
                                    <Text style={styles.summaryValue}>LKR 250</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { fontSize: 18, color: '#0f172a' }]}>Total</Text>
                                    <Text style={[styles.summaryValue, { fontSize: 22, color: '#1e3a8a', fontWeight: '900' }]}>
                                        LKR {(selectedOrderForInvoice?.totalPrice + 250).toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.paymentInfo}>
                                <Text style={styles.payLabel}>Payment Method: {selectedOrderForInvoice?.status === 'paid' ? 'Paid via Online' : 'Cash on Delivery'}</Text>
                                <View style={styles.statusStamp}>
                                    <Text style={[styles.statusStampText, { color: selectedOrderForInvoice?.status === 'paid' ? '#10b981' : '#f59e0b' }]}>
                                        {selectedOrderForInvoice?.status === 'paid' ? 'PAID' : 'PENDING'}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.thankYouText}>Thank you for your purchase! Come again.</Text>
                        </ScrollView>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setInvoiceVisible(false)}>
                            <Text style={styles.closeBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20 },
    headerContent: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 24, 
        paddingTop: 10 
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
    listContent: { padding: 20 },
    orderCard: { 
        backgroundColor: '#fff', 
        borderRadius: 28, 
        padding: 20, 
        marginBottom: 20,
        elevation: 8,
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderId: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
    orderDate: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    statusBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 12,
        gap: 6,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '800' },
    detailsSection: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 15, marginBottom: 15 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
    iconCircle: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    detailText: { fontSize: 14, color: '#475569', fontWeight: '600', flex: 1 },
    itemsSection: { marginBottom: 15, paddingHorizontal: 5 },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    itemText: { fontSize: 14, color: '#1e293b', fontWeight: '700' },
    itemPriceText: { fontSize: 13, color: '#2563eb', fontWeight: '800' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
    totalLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    totalPrice: { fontSize: 20, fontWeight: '900', color: '#1e3a8a' },
    customerCancelBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
    cancelText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },
    actionButtons: { flexDirection: 'row', gap: 12, marginTop: 15 },
    actionBtn: { height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 15 },
    confirmBtn: { backgroundColor: '#2563eb', flex: 1 },
    cancelBtn: { backgroundColor: '#f1f5f9', flex: 1 },
    editBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
    trackBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
    invoiceBtn: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', flex: 1 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    invoiceModal: { backgroundColor: '#fff', borderRadius: 32, padding: 24, maxHeight: '90%' },
    editModal: { backgroundColor: '#fff', borderRadius: 24, padding: 24, maxHeight: '70%' },
    editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 15 },
    weightInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    weightInput: { fontSize: 16, fontWeight: '800', color: '#1e3a8a', width: 60, paddingVertical: 8, textAlign: 'center' },
    kgLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginLeft: 5 },
    saveBtn: { backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    invoiceTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b', letterSpacing: 1 },
    brandHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    logoCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    brandName: { fontSize: 24, fontWeight: '900', color: '#1e3a8a' },
    brandTagline: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    invoiceMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    metaLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '800', marginBottom: 2 },
    metaValue: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    metaSub: { fontSize: 12, color: '#64748b', fontWeight: '500', width: 150 },
    invoiceTable: { marginBottom: 25 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#f1f5f9', paddingBottom: 10, marginBottom: 10 },
    tableHeaderText: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
    tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    tableRowText: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
    invoiceSummary: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 24, marginBottom: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    summaryLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    summaryValue: { fontSize: 14, color: '#1e293b', fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
    paymentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    payLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', flex: 1 },
    statusStamp: { borderWidth: 2, borderColor: '#10b981', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 8, transform: [{ rotate: '-10deg' }] },
    statusStampText: { fontSize: 18, fontWeight: '900' },
    thankYouText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 20 },
    closeBtn: { backgroundColor: '#1e3a8a', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
